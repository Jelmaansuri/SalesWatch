import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, index, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  company: text("company"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  description: text("description"),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").default(0).notNull(),
  status: text("status").default("active").notNull(), // active, inactive
  imageUrl: text("image_url"), // URL for product image
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  profit: decimal("profit", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(), // unpaid, paid, pending_shipment, shipped, completed
  saleDate: timestamp("sale_date").defaultNow().notNull(),
  platformSource: text("platform_source").notNull(), // tiktok, facebook, whatsapp, others
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const plots = pgTable("plots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  polybagCount: integer("polybag_count").notNull(), // number of polybags
  location: text("location").notNull(),
  cropType: text("crop_type").notNull(), // ginger, etc.
  plantingDate: timestamp("planting_date").notNull(),
  expectedHarvestDate: timestamp("expected_harvest_date").notNull(),
  actualHarvestDate: timestamp("actual_harvest_date"),
  daysToMaturity: integer("days_to_maturity").notNull(), // user-defined maturity period
  daysToOpenNetting: integer("days_to_open_netting").notNull(), // days after planting to open netting
  nettingOpenDate: timestamp("netting_open_date"), // calculated: planting date + days to open netting
  status: text("status").notNull().default("planted"), // planted, growing, ready_for_harvest, harvested, dormant
  notes: text("notes"),
  // Cycle tracking fields
  currentCycle: integer("current_cycle").notNull().default(1), // Current cycle number (1, 2, 3, etc.)
  totalCycles: integer("total_cycles").notNull().default(1), // Total planned cycles for this plot
  cycleHistory: text("cycle_history").default("[]"), // JSON array of previous cycle data with harvest amounts
  nextPlantingDate: timestamp("next_planting_date"), // Calculated next planting date for multi-cycle
  restPeriodDays: integer("rest_period_days").default(30), // Days to rest between cycles
  isMultiCycle: boolean("is_multi_cycle").default(false), // Whether this plot supports multiple cycles
  // Harvest tracking fields
  harvestAmountKg: decimal("harvest_amount_kg", { precision: 10, scale: 2 }), // Current cycle harvest amount in kg
  totalHarvestedKg: decimal("total_harvested_kg", { precision: 10, scale: 2 }).default("0"), // Cumulative harvest across all cycles
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User business settings table for invoice generation
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  // Business Information
  businessName: varchar("business_name").notNull(),
  businessRegistration: varchar("business_registration"), // SSM number for Malaysian businesses
  businessAddress: text("business_address").notNull(),
  businessPhone: varchar("business_phone").notNull(),
  businessEmail: varchar("business_email").notNull(),
  businessWebsite: varchar("business_website"),
  logoUrl: varchar("logo_url"), // For uploaded business logo
  // Invoice Settings
  invoicePrefix: varchar("invoice_prefix").default("INV"), // e.g., "INV", "PROG"
  nextInvoiceNumber: integer("next_invoice_number").default(1),
  currency: varchar("currency").default("MYR"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0.00"), // GST/SST rate
  paymentTerms: text("payment_terms").default("Payment due within 30 days"),
  bankDetails: text("bank_details"), // Banking information for payments
  footerNotes: text("footer_notes"), // Additional notes for invoice footer
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  saleId: varchar("sale_id").references(() => sales.id), // Link to the originating sale
  invoiceDate: timestamp("invoice_date").notNull().defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status").notNull().default("draft"), // draft, sent, paid, overdue, cancelled
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("MYR"),
  notes: text("notes"),
  paymentTerms: text("payment_terms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Invoice items table (multiple products per invoice)
export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  productId: varchar("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0.00"),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  userId: z.string().optional(), // Allow userId to be set by server
  saleDate: z.union([
    z.string().transform((val) => new Date(val)),
    z.date()
  ]),
});

export const insertPlotSchema = createInsertSchema(plots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalCycles: true, // Auto-calculated based on currentCycle
}).extend({
  plantingDate: z.string().transform((val) => new Date(val)),
  expectedHarvestDate: z.string().nullable().transform((val) => val ? new Date(val) : null),
  actualHarvestDate: z.string().nullable().transform((val) => val ? new Date(val) : null).optional(),
  nettingOpenDate: z.string().nullable().transform((val) => val ? new Date(val) : null).optional(),
  nextPlantingDate: z.string().nullable().transform((val) => val ? new Date(val) : null).optional(),
  cycleHistory: z.string().optional(),
  harvestAmountKg: z.number().min(0, "Harvest amount must be positive").nullable().optional(),
  totalHarvestedKg: z.string().optional(), // Allow string for decimal initialization
});

// User settings insert schema
export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Invoice insert schemas
export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  invoiceDate: z.union([
    z.string().transform((val) => new Date(val)),
    z.date()
  ]),
  dueDate: z.union([
    z.string().transform((val) => new Date(val)),
    z.date()
  ]),
  subtotal: z.union([
    z.string().transform((val) => parseFloat(val)),
    z.number()
  ]).refine((val) => val >= 0, "Subtotal must be positive"),
  taxAmount: z.union([
    z.string().transform((val) => parseFloat(val)),
    z.number()
  ]).refine((val) => val >= 0, "Tax amount cannot be negative").optional(),
  totalAmount: z.union([
    z.string().transform((val) => parseFloat(val)),
    z.number()
  ]).refine((val) => val >= 0, "Total amount must be positive"),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
  createdAt: true,
}).extend({
  unitPrice: z.union([
    z.string().transform((val) => parseFloat(val)),
    z.number()
  ]).refine((val) => val >= 0, "Unit price must be positive"),
  discount: z.union([
    z.string().transform((val) => parseFloat(val)),
    z.number()
  ]).refine((val) => val >= 0, "Discount cannot be negative").optional(),
  lineTotal: z.union([
    z.string().transform((val) => parseFloat(val)),
    z.number()
  ]).refine((val) => val >= 0, "Line total must be positive"),
});

// Types
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;

export type Plot = typeof plots.$inferSelect;
export type InsertPlot = z.infer<typeof insertPlotSchema>;

// Derived types for API responses
export type SaleWithDetails = Sale & {
  customer: Customer;
  product: Product;
};

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User settings types
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

// Invoice types
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

// Invoice with details for API responses
export type InvoiceWithDetails = Invoice & {
  customer: Customer;
  items: (InvoiceItem & { product: Product })[];
};

// Status enum for sales/orders
export const statusEnum = z.enum(["unpaid", "paid", "pending_shipment", "shipped", "completed"]);

// Invoice status enum
export const invoiceStatusEnum = z.enum(["draft", "sent", "paid", "overdue", "cancelled"]);

export type DashboardMetrics = {
  totalRevenue: number;
  totalProfit: number;
  activeOrders: number;
  totalCustomers: number;
  completedCycles: number; // Total number of completed harvest cycles across all plots
  totalHarvestKg: number; // Total harvest amount across all plots in kg
  orderStatusCounts: {
    unpaid: number;
    paid: number;
    pending_shipment: number;
    shipped: number;
    completed: number;
  };
};
