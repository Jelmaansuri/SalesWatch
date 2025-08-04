import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, index, jsonb } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
}).extend({
  plantingDate: z.string().transform((val) => new Date(val)),
  expectedHarvestDate: z.string().nullable().transform((val) => val ? new Date(val) : null),
  actualHarvestDate: z.string().nullable().transform((val) => val ? new Date(val) : null).optional(),
  nettingOpenDate: z.string().nullable().transform((val) => val ? new Date(val) : null).optional(),
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

// Status enum for sales/orders
export const statusEnum = z.enum(["unpaid", "paid", "pending_shipment", "shipped", "completed"]);

export type DashboardMetrics = {
  totalRevenue: number;
  totalProfit: number;
  activeOrders: number;
  totalCustomers: number;
  orderStatusCounts: {
    unpaid: number;
    paid: number;
    pending_shipment: number;
    shipped: number;
    completed: number;
  };
};
