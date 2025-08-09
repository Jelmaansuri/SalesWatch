import { type Customer, type InsertCustomer, type Product, type InsertProduct, type Sale, type InsertSale, type SaleWithDetails, type DashboardMetrics, type User, type UpsertUser, type Plot, type InsertPlot, type UserSettings, type InsertUserSettings, type Invoice, type InsertInvoice, type InvoiceItem, type InsertInvoiceItem, type InvoiceWithDetails, type HarvestLog, type InsertHarvestLog } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { customers, products, sales, users, plots, userSettings, invoices, invoiceItems, reusableInvoiceNumbers, harvestLogs } from "@shared/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { hasBusinessAccess, getAuthorizedUserIds } from "./userWhitelist";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  // Customers
  getCustomers(userId?: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;

  // Products
  getProducts(userId?: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Sales
  getSales(userId?: string): Promise<Sale[]>;
  getSalesWithDetails(userId?: string): Promise<SaleWithDetails[]>;
  getSale(id: string): Promise<Sale | undefined>;
  getSaleWithDetails(id: string): Promise<SaleWithDetails | undefined>;
  getSalesByCustomerId(customerId: string): Promise<Sale[]>;
  getSalesByProductId(productId: string): Promise<Sale[]>;
  createSale(sale: InsertSale): Promise<Sale>;
  updateSale(id: string, updates: Partial<Sale>): Promise<Sale | undefined>;
  deleteSale(id: string): Promise<boolean>;

  // Stock Management
  updateProductStock(productId: string, quantityChange: number): Promise<Product | undefined>;
  checkStockAvailability(productId: string, requiredQuantity: number): Promise<boolean>;

  // Analytics
  getDashboardMetrics(): Promise<DashboardMetrics>;
  getRevenueByMonth(): Promise<{ month: string; revenue: number }[]>;
  getTopProducts(): Promise<Array<{ product: Product; totalRevenue: number; totalProfit: number; unitsSold: number }>>;

  // Plots
  getPlots(userId: string): Promise<Plot[]>;
  getPlot(id: string): Promise<Plot | undefined>;
  createPlot(plot: InsertPlot): Promise<Plot>;
  updatePlot(id: string, updates: Partial<Plot>): Promise<Plot | undefined>;
  deletePlot(id: string): Promise<boolean>;

  // Harvest Logs
  getHarvestLogs(plotId: string, cycleNumber?: number): Promise<HarvestLog[]>;
  getHarvestLogsByPlotAndCycle(plotId: string, cycleNumber: number): Promise<HarvestLog[]>;
  createHarvestLog(harvestLog: InsertHarvestLog): Promise<HarvestLog>;
  updateHarvestLog(id: string, updates: Partial<HarvestLog>): Promise<HarvestLog | undefined>;
  deleteHarvestLog(id: string): Promise<boolean>;
  getHarvestLogsByUserId(userId: string): Promise<HarvestLog[]>;

  // User Settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings | undefined>;

  // Invoices
  getInvoices(userId: string): Promise<Invoice[]>;
  getInvoicesWithDetails(userId: string): Promise<InvoiceWithDetails[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoiceWithDetails(id: string): Promise<InvoiceWithDetails | undefined>;
  getInvoicesBySaleId(saleId: string): Promise<Invoice[]>;
  getInvoicesBySaleIdAndUser(saleId: string, userId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  generateInvoiceNumber(userId: string): Promise<string>;

  // Invoice Items
  getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: string, updates: Partial<InvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: string): Promise<boolean>;
  deleteInvoiceItems(invoiceId: string): Promise<boolean>;
  
  // Reusable invoice numbers
  addReusableInvoiceNumber(userId: string, invoiceNumber: string): Promise<void>;
  getNextReusableInvoiceNumber(userId: string): Promise<string | null>;
  getReusableInvoiceNumbers(userId: string): Promise<{ invoiceNumber: string }[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Customer operations with Shared Business Access
  async getCustomers(userId?: string): Promise<Customer[]> {
    if (userId && hasBusinessAccess(userId)) {
      // User has whitelist access - show all customers from authorized users
      const authorizedUsers = getAuthorizedUserIds();
      return await db.select().from(customers).where(inArray(customers.userId, authorizedUsers)).orderBy(desc(customers.createdAt));
    } else if (userId) {
      // Regular user - only their own customers
      return await db.select().from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.createdAt));
    } else {
      // No user filter - return all customers (for backward compatibility)
      return await db.select().from(customers).orderBy(desc(customers.createdAt));
    }
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values({
      id: randomUUID(),
      ...customer,
    }).returning();
    return newCustomer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const [updatedCustomer] = await db
      .update(customers)
      .set(updates)
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer || undefined;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id));
    return result.rowCount! > 0;
  }

  // Product operations with Shared Business Access
  async getProducts(userId?: string): Promise<Product[]> {
    if (userId && hasBusinessAccess(userId)) {
      // User has whitelist access - show all products from authorized users
      const authorizedUsers = getAuthorizedUserIds();
      return await db.select().from(products).where(inArray(products.userId, authorizedUsers)).orderBy(desc(products.createdAt));
    } else if (userId) {
      // Regular user - only their own products
      return await db.select().from(products).where(eq(products.userId, userId)).orderBy(desc(products.createdAt));
    } else {
      // No user filter - return all products (for backward compatibility)
      return await db.select().from(products).orderBy(desc(products.createdAt));
    }
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values({
      id: randomUUID(),
      ...product,
    }).returning();
    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id));
    return result.rowCount! > 0;
  }

  // Sales operations
  async getSales(userId?: string): Promise<Sale[]> {
    if (userId && hasBusinessAccess(userId)) {
      // User has whitelist access - show all sales from authorized users
      const authorizedUsers = getAuthorizedUserIds();
      return await db.select().from(sales).where(inArray(sales.userId, authorizedUsers)).orderBy(desc(sales.createdAt));
    } else if (userId) {
      // User doesn't have whitelist access - show only their own sales
      return await db.select().from(sales).where(eq(sales.userId, userId)).orderBy(desc(sales.createdAt));
    } else {
      // No user filter - return all sales (for backward compatibility)
      return await db.select().from(sales).orderBy(desc(sales.createdAt));
    }
  }

  async getSalesWithDetails(userId?: string): Promise<SaleWithDetails[]> {
    // Build the base query
    let query = db
      .select({
        id: sales.id,
        userId: sales.userId,
        customerId: sales.customerId,
        productId: sales.productId,
        quantity: sales.quantity,
        unitPrice: sales.unitPrice,
        discountAmount: sales.discountAmount,
        totalAmount: sales.totalAmount,
        profit: sales.profit,
        status: sales.status,
        saleDate: sales.saleDate,
        platformSource: sales.platformSource,
        notes: sales.notes,
        createdAt: sales.createdAt,
        updatedAt: sales.updatedAt,
        customer: {
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          company: customers.company,
          address: customers.address,
          createdAt: customers.createdAt,
        },
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
          description: products.description,
          costPrice: products.costPrice,
          sellingPrice: products.sellingPrice,
          stock: products.stock,
          status: products.status,
          imageUrl: products.imageUrl,
          createdAt: products.createdAt,
        },
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(products, eq(sales.productId, products.id));

    // Apply user filtering based on whitelist access
    if (userId) {
      if (hasBusinessAccess(userId)) {
        // User has whitelist access - show all sales from authorized users
        const authorizedUsers = getAuthorizedUserIds();
        query = query.where(inArray(sales.userId, authorizedUsers));
      } else {
        // User doesn't have whitelist access - show only their own sales
        query = query.where(eq(sales.userId, userId));
      }
    }

    const result = await query.orderBy(desc(sales.createdAt));
    
    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      customerId: row.customerId,
      productId: row.productId,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      discountAmount: row.discountAmount,
      totalAmount: row.totalAmount,
      profit: row.profit,
      status: row.status,
      saleDate: row.saleDate,
      platformSource: row.platformSource,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: row.customer!,
      product: row.product!,
    }));
  }

  async getSale(id: string): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale || undefined;
  }

  async getSaleWithDetails(id: string): Promise<SaleWithDetails | undefined> {
    const result = await db
      .select({
        id: sales.id,
        userId: sales.userId,
        customerId: sales.customerId,
        productId: sales.productId,
        quantity: sales.quantity,
        unitPrice: sales.unitPrice,
        discountAmount: sales.discountAmount,
        totalAmount: sales.totalAmount,
        profit: sales.profit,
        status: sales.status,
        saleDate: sales.saleDate,
        platformSource: sales.platformSource,
        notes: sales.notes,
        createdAt: sales.createdAt,
        updatedAt: sales.updatedAt,
        customer: {
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          company: customers.company,
          address: customers.address,
          createdAt: customers.createdAt,
        },
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
          description: products.description,
          costPrice: products.costPrice,
          sellingPrice: products.sellingPrice,
          stock: products.stock,
          status: products.status,
          imageUrl: products.imageUrl,
          createdAt: products.createdAt,
        },
      })
      .from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .leftJoin(products, eq(sales.productId, products.id))
      .where(eq(sales.id, id));

    if (result.length === 0) return undefined;

    const row = result[0];
    return {
      id: row.id,
      userId: row.userId,
      customerId: row.customerId,
      productId: row.productId,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      discountAmount: row.discountAmount,
      totalAmount: row.totalAmount,
      profit: row.profit,
      status: row.status,
      saleDate: row.saleDate,
      platformSource: row.platformSource,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: row.customer!,
      product: row.product!,
    };
  }

  async createSale(sale: InsertSale): Promise<Sale> {
    const unitPriceNum = typeof sale.unitPrice === 'string' ? parseFloat(sale.unitPrice) : sale.unitPrice;
    const discountAmountNum = sale.discountAmount ? (typeof sale.discountAmount === 'string' ? parseFloat(sale.discountAmount) : sale.discountAmount) : 0;
    
    // CORRECT CALCULATION: Total = (Unit Price - Discount per unit) × Quantity
    const discountedUnitPrice = unitPriceNum - discountAmountNum;
    const totalAmount = discountedUnitPrice * sale.quantity;
    
    // Get product cost to calculate profit
    const product = await this.getProduct(sale.productId);
    if (!product) {
      throw new Error("Product not found");
    }
    
    const costPriceNum = typeof product.costPrice === 'string' ? parseFloat(product.costPrice) : product.costPrice;
    const profit = (discountedUnitPrice - costPriceNum) * sale.quantity;

    const saleRecord = {
      id: randomUUID(),
      userId: sale.userId,
      customerId: sale.customerId,
      productId: sale.productId,
      quantity: sale.quantity,
      unitPrice: unitPriceNum.toString(),
      discountAmount: discountAmountNum.toString(),
      totalAmount: totalAmount.toString(),
      profit: profit.toString(),
      status: sale.status,
      saleDate: sale.saleDate || new Date(),
      platformSource: sale.platformSource,
      notes: sale.notes || null,
    };

    const [newSale] = await db.insert(sales).values([{
      ...saleRecord,
      userId: saleRecord.userId || "",
    }]).returning();
    return newSale;
  }

  async updateSale(id: string, updates: Partial<Sale>): Promise<Sale | undefined> {
    // If quantity, unitPrice, or discountAmount is being updated, recalculate totals
    if (updates.quantity !== undefined || updates.unitPrice !== undefined || updates.discountAmount !== undefined) {
      const existingSale = await this.getSale(id);
      if (!existingSale) return undefined;

      const product = await this.getProduct(existingSale.productId);
      if (!product) return undefined;

      const quantity = updates.quantity !== undefined ? updates.quantity : existingSale.quantity;
      const unitPriceNum = updates.unitPrice !== undefined 
        ? (typeof updates.unitPrice === 'string' ? parseFloat(updates.unitPrice) : updates.unitPrice)
        : (typeof existingSale.unitPrice === 'string' ? parseFloat(existingSale.unitPrice) : existingSale.unitPrice);
      const discountAmountNum = updates.discountAmount !== undefined
        ? (updates.discountAmount ? (typeof updates.discountAmount === 'string' ? parseFloat(updates.discountAmount) : updates.discountAmount) : 0)
        : (existingSale.discountAmount ? (typeof existingSale.discountAmount === 'string' ? parseFloat(existingSale.discountAmount) : existingSale.discountAmount) : 0);
      
      // CORRECT CALCULATION: Total = (Unit Price - Discount per unit) × Quantity
      const discountedUnitPrice = unitPriceNum - discountAmountNum;
      const totalAmount = discountedUnitPrice * quantity;
      const costPriceNum = typeof product.costPrice === 'string' ? parseFloat(product.costPrice) : product.costPrice;
      const profit = (discountedUnitPrice - costPriceNum) * quantity;

      updates = {
        ...updates,
        totalAmount: totalAmount.toString(),
        profit: profit.toString(),
        updatedAt: new Date(),
      };
    } else {
      updates = {
        ...updates,
        updatedAt: new Date(),
      };
    }

    const [updatedSale] = await db
      .update(sales)
      .set(updates)
      .where(eq(sales.id, id))
      .returning();
    return updatedSale || undefined;
  }

  async deleteSale(id: string): Promise<boolean> {
    const result = await db.delete(sales).where(eq(sales.id, id));
    return result.rowCount! > 0;
  }

  async getSalesByCustomerId(customerId: string): Promise<Sale[]> {
    return await db.select().from(sales).where(eq(sales.customerId, customerId));
  }

  async getSalesByProductId(productId: string): Promise<Sale[]> {
    return await db.select().from(sales).where(eq(sales.productId, productId));
  }

  // Stock Management
  async updateProductStock(productId: string, quantityChange: number): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set({
        stock: sql`${products.stock} + ${quantityChange}`,
      })
      .where(eq(products.id, productId))
      .returning();
    return updatedProduct || undefined;
  }

  async checkStockAvailability(productId: string, requiredQuantity: number): Promise<boolean> {
    const product = await this.getProduct(productId);
    return product ? product.stock >= requiredQuantity : false;
  }

  // Analytics
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const allSales = await this.getSales();
    
    const totalRevenue = allSales.reduce((sum, sale) => {
      const amount = typeof sale.totalAmount === 'string' ? parseFloat(sale.totalAmount) : sale.totalAmount;
      return sum + amount;
    }, 0);
    
    const totalProfit = allSales.reduce((sum, sale) => {
      const profit = typeof sale.profit === 'string' ? parseFloat(sale.profit) : sale.profit;
      return sum + profit;
    }, 0);
    
    const activeOrders = allSales.filter(sale => 
      ['paid', 'pending_shipment', 'shipped'].includes(sale.status)
    ).length;
    
    const allCustomers = await this.getCustomers();
    const totalCustomers = allCustomers.length;
    
    // Calculate completed cycles based on actual harvest data, not plot status
    const allPlots = await db.select().from(plots);
    console.log('Dashboard calculation - all plots:', allPlots.map(p => ({ 
      name: p.name, 
      status: p.status, 
      currentCycle: p.currentCycle,
      totalHarvestedKg: p.totalHarvestedKg 
    })));
    
    let completedCycles = 0;
    
    // Count completed cycles based on plot status and harvest data
    // For each plot, count actual completed cycles
    for (const plot of allPlots) {
      const plotHarvestLogs = await db.select().from(harvestLogs).where(eq(harvestLogs.plotId, plot.id));
      
      let plotCompletedCycles = 0;
      
      if (plotHarvestLogs.length > 0) {
        // If plot has harvest events, count unique cycles with harvest data
        const cyclesWithHarvest = new Set(plotHarvestLogs.map(log => log.cycleNumber));
        plotCompletedCycles = cyclesWithHarvest.size;
      } else {
        // If no harvest events, count completed cycles based on current cycle
        plotCompletedCycles = Math.max(0, plot.currentCycle - 1);
      }
      
      console.log(`Plot ${plot.name}: currentCycle=${plot.currentCycle}, harvest events=${plotHarvestLogs.length}, completed cycles=${plotCompletedCycles}`);
      completedCycles += plotCompletedCycles;
    }
    
    console.log('Total completed cycles calculated:', completedCycles);
    
    // Calculate total harvest amount from actual harvest log data
    const allHarvestLogs = await db.select().from(harvestLogs);
    const totalHarvestKg = allHarvestLogs.reduce((sum, log) => {
      const gradeAKg = parseFloat(log.gradeAKg || "0");
      const gradeBKg = parseFloat(log.gradeBKg || "0");
      return sum + gradeAKg + gradeBKg;
    }, 0);
    
    console.log('Total harvest calculated from harvest logs:', totalHarvestKg);

    const orderStatusCounts = {
      unpaid: allSales.filter(s => s.status === 'unpaid').length,
      paid: allSales.filter(s => s.status === 'paid').length,
      pending_shipment: allSales.filter(s => s.status === 'pending_shipment').length,
      shipped: allSales.filter(s => s.status === 'shipped').length,
      completed: allSales.filter(s => s.status === 'completed').length,
    };

    console.log('API returning dashboard metrics:', { 
      totalRevenue, 
      totalProfit, 
      activeOrders, 
      totalCustomers, 
      completedCycles, 
      totalHarvestKg 
    });

    return {
      totalRevenue,
      totalProfit,
      activeOrders,
      totalCustomers,
      completedCycles,
      totalHarvestKg,
      orderStatusCounts,
    };
  }

  async getRevenueByMonth(): Promise<{ month: string; revenue: number }[]> {
    const result = await db
      .select({
        month: sql<string>`TO_CHAR(${sales.saleDate}, 'YYYY-MM')`,
        revenue: sql<number>`SUM(CAST(${sales.totalAmount} AS DECIMAL))`,
      })
      .from(sales)
      .groupBy(sql`TO_CHAR(${sales.saleDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${sales.saleDate}, 'YYYY-MM')`);

    return result.map(row => ({
      month: row.month,
      revenue: Number(row.revenue),
    }));
  }

  async getTopProducts(): Promise<Array<{ product: Product; totalRevenue: number; totalProfit: number; unitsSold: number }>> {
    const result = await db
      .select({
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
          description: products.description,
          costPrice: products.costPrice,
          sellingPrice: products.sellingPrice,
          stock: products.stock,
          status: products.status,
          imageUrl: products.imageUrl,
          createdAt: products.createdAt,
        },
        totalRevenue: sql<number>`SUM(CAST(${sales.totalAmount} AS DECIMAL))`,
        totalProfit: sql<number>`SUM(CAST(${sales.profit} AS DECIMAL))`,
        unitsSold: sql<number>`SUM(${sales.quantity})`,
      })
      .from(sales)
      .leftJoin(products, eq(sales.productId, products.id))
      .groupBy(products.id, products.name, products.sku, products.description, products.costPrice, products.sellingPrice, products.stock, products.status, products.imageUrl, products.createdAt)
      .orderBy(sql`SUM(CAST(${sales.totalAmount} AS DECIMAL)) DESC`)
      .limit(10);

    return result.map(row => ({
      product: row.product!,
      totalRevenue: Number(row.totalRevenue),
      totalProfit: Number(row.totalProfit),
      unitsSold: Number(row.unitsSold),
    }));
  }

  // Plot Management with Shared Business Access
  async getPlots(userId: string): Promise<Plot[]> {
    if (hasBusinessAccess(userId)) {
      // User has whitelist access - show all plots from authorized users
      const authorizedUsers = getAuthorizedUserIds();
      return await db.select().from(plots).where(inArray(plots.userId, authorizedUsers)).orderBy(desc(plots.createdAt));
    } else {
      // Regular user - only their own plots
      return await db.select().from(plots).where(eq(plots.userId, userId)).orderBy(desc(plots.createdAt));
    }
  }

  async getPlot(id: string): Promise<Plot | undefined> {
    const [plot] = await db.select().from(plots).where(eq(plots.id, id));
    return plot || undefined;
  }

  async createPlot(plot: InsertPlot): Promise<Plot> {
    // Calculate netting open date from planting date + days to open netting
    const plantingDate = new Date(plot.plantingDate);
    const nettingOpenDate = new Date(plantingDate);
    nettingOpenDate.setDate(plantingDate.getDate() + plot.daysToOpenNetting);
    
    // PROGENY AGROTECH: Ensure proper harvest accumulation initialization
    // New plots should start with totalHarvestedKg as "0.00" for proper accumulation
    const [newPlot] = await db.insert(plots).values([{
      ...plot,
      id: randomUUID(),
      nettingOpenDate: nettingOpenDate,
      actualHarvestDate: plot.actualHarvestDate ?? null,
      expectedHarvestDate: plot.expectedHarvestDate ?? new Date(),
      harvestAmountKg: plot.harvestAmountKg?.toString() || null,
      totalHarvestedKg: plot.totalHarvestedKg?.toString() || "0.00", // Initialize to 0 for proper accumulation
    }]).returning();
    console.log(`Plot created: ${newPlot.name} - initialized with totalHarvestedKg: ${newPlot.totalHarvestedKg}`);
    return newPlot;
  }

  async updatePlot(id: string, updates: Partial<Plot>): Promise<Plot | undefined> {
    const [updatedPlot] = await db
      .update(plots)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(plots.id, id))
      .returning();
    return updatedPlot || undefined;
  }

  async deletePlot(id: string): Promise<boolean> {
    const result = await db.delete(plots).where(eq(plots.id, id));
    return result.rowCount! > 0;
  }

  // User Settings Management with Shared Business Access
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    // Import whitelist functions
    const { hasBusinessAccess, getPrimaryUserId } = await import("./userWhitelist");
    
    if (hasBusinessAccess(userId)) {
      // For whitelisted users, get the primary user's settings as shared business settings
      const primaryUserId = getPrimaryUserId();
      const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, primaryUserId));
      return settings || undefined;
    } else {
      // Regular users get their own settings
      const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
      return settings || undefined;
    }
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    // Import whitelist functions
    const { hasBusinessAccess, getPrimaryUserId } = await import("./userWhitelist");
    
    if (hasBusinessAccess(settings.userId)) {
      // For whitelisted users, create/update settings under the primary user ID
      const primaryUserId = getPrimaryUserId();
      const [newSettings] = await db.insert(userSettings).values({
        ...settings,
        userId: primaryUserId, // Always use primary user ID for shared business settings
        id: randomUUID(),
      }).returning();
      return newSettings;
    } else {
      // Regular users create their own settings
      const [newSettings] = await db.insert(userSettings).values({
        ...settings,
        id: randomUUID(),
      }).returning();
      return newSettings;
    }
  }

  async updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings | undefined> {
    // Import whitelist functions
    const { hasBusinessAccess, getPrimaryUserId } = await import("./userWhitelist");
    
    if (hasBusinessAccess(userId)) {
      // For whitelisted users, update the primary user's settings (shared business settings)
      const primaryUserId = getPrimaryUserId();
      const [updatedSettings] = await db
        .update(userSettings)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(userSettings.userId, primaryUserId))
        .returning();
      return updatedSettings || undefined;
    } else {
      // Regular users update their own settings
      const [updatedSettings] = await db
        .update(userSettings)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(userSettings.userId, userId))
        .returning();
      return updatedSettings || undefined;
    }
  }

  // Invoice Management
  async getInvoices(userId: string): Promise<Invoice[]> {
    if (hasBusinessAccess(userId)) {
      // User has whitelist access - show all invoices from authorized users
      const authorizedUsers = getAuthorizedUserIds();
      return await db.select().from(invoices).where(inArray(invoices.userId, authorizedUsers)).orderBy(invoices.invoiceNumber);
    } else {
      // User doesn't have whitelist access - show only their own invoices
      return await db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(invoices.invoiceNumber);
    }
  }

  async getInvoicesWithDetails(userId: string): Promise<InvoiceWithDetails[]> {
    // Build the base query
    let query = db
      .select({
        invoice: invoices,
        customer: customers,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id));

    // Apply user filtering based on whitelist access
    if (hasBusinessAccess(userId)) {
      // User has whitelist access - show all invoices from authorized users
      const authorizedUsers = getAuthorizedUserIds();
      query = query.where(inArray(invoices.userId, authorizedUsers));
    } else {
      // User doesn't have whitelist access - show only their own invoices
      query = query.where(eq(invoices.userId, userId));
    }

    const invoicesWithCustomers = await query.orderBy(invoices.invoiceNumber);

    const invoicesWithItems = await Promise.all(
      invoicesWithCustomers.map(async ({ invoice, customer }) => {
        const items = await db
          .select({
            invoiceItem: invoiceItems,
            product: products,
          })
          .from(invoiceItems)
          .leftJoin(products, eq(invoiceItems.productId, products.id))
          .where(eq(invoiceItems.invoiceId, invoice.id));

        return {
          ...invoice,
          customer: customer!,
          items: items.map(item => ({
            ...item.invoiceItem,
            product: item.product!,
          })),
        };
      })
    );

    return invoicesWithItems;
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async getInvoiceWithDetails(id: string): Promise<InvoiceWithDetails | undefined> {
    const [invoiceWithCustomer] = await db
      .select({
        invoice: invoices,
        customer: customers,
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(eq(invoices.id, id));

    if (!invoiceWithCustomer) return undefined;

    const items = await db
      .select({
        invoiceItem: invoiceItems,
        product: products,
      })
      .from(invoiceItems)
      .leftJoin(products, eq(invoiceItems.productId, products.id))
      .where(eq(invoiceItems.invoiceId, id));

    return {
      ...invoiceWithCustomer.invoice,
      customer: invoiceWithCustomer.customer!,
      items: items.map(item => ({
        ...item.invoiceItem,
        product: item.product!,
      })),
    };
  }

  async getInvoicesBySaleId(saleId: string): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.saleId, saleId));
  }

  async getInvoicesBySaleIdAndUser(saleId: string, userId: string): Promise<Invoice[]> {
    // Import whitelist functions for shared data access
    const { hasBusinessAccess, getAuthorizedUserIds } = await import("./userWhitelist");
    
    if (hasBusinessAccess(userId)) {
      // User has whitelist access - check invoices from all authorized users for this sale
      const authorizedUsers = getAuthorizedUserIds();
      return await db.select().from(invoices).where(
        and(
          eq(invoices.saleId, saleId),
          inArray(invoices.userId, authorizedUsers)
        )
      );
    } else {
      // Regular user - only their own invoices
      return await db.select().from(invoices).where(
        and(
          eq(invoices.saleId, saleId),
          eq(invoices.userId, userId)
        )
      );
    }
  }

  async getInvoicesBySaleIdAndUser(saleId: string, userId: string): Promise<Invoice[]> {
    if (hasBusinessAccess(userId)) {
      // User has whitelist access - check invoices from all authorized users for this sale
      const authorizedUsers = getAuthorizedUserIds();
      return await db.select().from(invoices).where(
        and(eq(invoices.saleId, saleId), inArray(invoices.userId, authorizedUsers))
      );
    } else {
      // User doesn't have whitelist access - check only their own invoices
      return await db.select().from(invoices).where(
        and(eq(invoices.saleId, saleId), eq(invoices.userId, userId))
      );
    }
  }

  async createInvoice(invoiceData: any): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values({
      id: randomUUID(),
      userId: invoiceData.userId,
      customerId: invoiceData.customerId,
      saleId: invoiceData.saleId,
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: invoiceData.invoiceDate,
      dueDate: invoiceData.dueDate,
      status: invoiceData.status,
      subtotal: invoiceData.subtotal.toString(),
      taxAmount: (invoiceData.taxAmount || 0).toString(),
      totalAmount: invoiceData.totalAmount.toString(),
      currency: invoiceData.currency,
      notes: invoiceData.notes,
      paymentTerms: invoiceData.paymentTerms,
    }).returning();
    return newInvoice;
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice || undefined;
  }

  async updateInvoiceFromSale(saleId: string): Promise<void> {
    // Get all invoices linked to this sale
    const relatedInvoices = await this.getInvoicesBySaleId(saleId);
    
    for (const invoice of relatedInvoices) {
      // Get updated sale details
      const sale = await this.getSaleWithDetails(saleId);
      if (!sale) continue;
      
      // Get grouped sales if applicable
      const groupMatch = sale.notes?.match(/\[GROUP:([^\]]+)\]/);
      const groupId = groupMatch ? groupMatch[1] : null;
      
      let groupedSales = [sale];
      if (groupId) {
        const allSales = await this.getSalesWithDetails();
        groupedSales = allSales.filter((s: any) => 
          s.notes?.includes(`[GROUP:${groupId}]`) && s.customerId === sale.customerId
        );
      }
      
      // Recalculate totals
      const newSubtotal = groupedSales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
      
      // Calculate new due date (30 days from sale date)
      const newDueDate = new Date(sale.saleDate);
      newDueDate.setDate(newDueDate.getDate() + 30);
      
      // Update the invoice
      await this.updateInvoice(invoice.id, {
        subtotal: newSubtotal.toString(),
        totalAmount: newSubtotal.toString(),
        invoiceDate: sale.saleDate,
        dueDate: newDueDate,
      });
      
      // Update invoice items
      await this.deleteInvoiceItems(invoice.id);
      
      for (const groupSale of groupedSales) {
        await this.createInvoiceItem({
          invoiceId: invoice.id,
          productId: groupSale.productId,
          quantity: groupSale.quantity,
          unitPrice: parseFloat(groupSale.unitPrice) - parseFloat(groupSale.discountAmount || "0"),
          discount: parseFloat(groupSale.discountAmount || "0"),
          lineTotal: parseFloat(groupSale.totalAmount),
        });
      }
    }
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const result = await db.delete(invoices).where(eq(invoices.id, id));
    return result.rowCount! > 0;
  }

  async generateInvoiceNumber(userId: string): Promise<string> {
    // Import whitelist functions
    const { hasBusinessAccess, getPrimaryUserId } = await import("./userWhitelist");
    
    // Get settings from primary user for whitelisted users (shared business settings)
    const settingsUserId = hasBusinessAccess(userId) ? getPrimaryUserId() : userId;
    const settings = await this.getUserSettings(settingsUserId);
    const prefix = settings?.invoicePrefix || "INV";
    const nextNumber = settings?.nextInvoiceNumber || 1;
    
    // Generate the invoice number
    const invoiceNumber = `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
    
    // Update the next invoice number in shared settings (always update primary user's settings for whitelisted users)
    if (settings) {
      await this.updateUserSettings(settingsUserId, {
        nextInvoiceNumber: nextNumber + 1,
      });
    }
    
    return invoiceNumber;
  }

  // Invoice Items Management
  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(itemData: any): Promise<InvoiceItem> {
    const [newItem] = await db.insert(invoiceItems).values({
      id: randomUUID(),
      invoiceId: itemData.invoiceId,
      productId: itemData.productId,
      quantity: itemData.quantity,
      unitPrice: itemData.unitPrice.toString(),
      discount: (itemData.discount || 0).toString(),
      lineTotal: itemData.lineTotal.toString(),
    }).returning();
    return newItem;
  }

  async updateInvoiceItem(id: string, updates: Partial<InvoiceItem>): Promise<InvoiceItem | undefined> {
    const [updatedItem] = await db
      .update(invoiceItems)
      .set(updates)
      .where(eq(invoiceItems.id, id))
      .returning();
    return updatedItem || undefined;
  }

  async deleteInvoiceItem(id: string): Promise<boolean> {
    const result = await db.delete(invoiceItems).where(eq(invoiceItems.id, id));
    return result.rowCount! > 0;
  }

  async deleteInvoiceItems(invoiceId: string): Promise<boolean> {
    const result = await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    return result.rowCount! > 0;
  }

  // Reusable invoice numbers functionality
  async addReusableInvoiceNumber(userId: string, invoiceNumber: string): Promise<void> {
    // Import whitelist functions
    const { hasBusinessAccess, getPrimaryUserId } = await import("./userWhitelist");
    
    // Store reusable numbers under primary user for whitelisted users (shared business pool)
    const storageUserId = hasBusinessAccess(userId) ? getPrimaryUserId() : userId;
    await db.insert(reusableInvoiceNumbers).values({
      userId: storageUserId,
      invoiceNumber,
    });
  }

  async getNextReusableInvoiceNumber(userId: string): Promise<string | null> {
    // Import whitelist functions
    const { hasBusinessAccess, getPrimaryUserId } = await import("./userWhitelist");
    
    // Get reusable numbers from primary user for whitelisted users (shared business pool)
    const lookupUserId = hasBusinessAccess(userId) ? getPrimaryUserId() : userId;
    const [reusableNumber] = await db
      .select()
      .from(reusableInvoiceNumbers)
      .where(eq(reusableInvoiceNumbers.userId, lookupUserId))
      .orderBy(reusableInvoiceNumbers.createdAt)
      .limit(1);

    if (reusableNumber) {
      // Remove it from the reusable list since we're using it
      await db.delete(reusableInvoiceNumbers).where(eq(reusableInvoiceNumbers.id, reusableNumber.id));
      return reusableNumber.invoiceNumber;
    }

    return null;
  }

  async getReusableInvoiceNumbers(userId: string): Promise<{ invoiceNumber: string }[]> {
    // Import whitelist functions
    const { hasBusinessAccess, getPrimaryUserId } = await import("./userWhitelist");
    
    // Get reusable numbers from primary user for whitelisted users (shared business pool)
    const lookupUserId = hasBusinessAccess(userId) ? getPrimaryUserId() : userId;
    return await db
      .select({ invoiceNumber: reusableInvoiceNumbers.invoiceNumber })
      .from(reusableInvoiceNumbers)
      .where(eq(reusableInvoiceNumbers.userId, lookupUserId))
      .orderBy(reusableInvoiceNumbers.createdAt);
  }

  async clearReusableInvoiceNumbers(userId: string): Promise<void> {
    await db.delete(reusableInvoiceNumbers).where(eq(reusableInvoiceNumbers.userId, userId));
  }
  // Harvest Logs operations
  async getHarvestLogs(plotId: string, cycleNumber?: number): Promise<HarvestLog[]> {
    if (cycleNumber !== undefined) {
      return await db.select().from(harvestLogs)
        .where(and(eq(harvestLogs.plotId, plotId), eq(harvestLogs.cycleNumber, cycleNumber)))
        .orderBy(desc(harvestLogs.harvestDate));
    }
    return await db.select().from(harvestLogs)
      .where(eq(harvestLogs.plotId, plotId))
      .orderBy(desc(harvestLogs.harvestDate));
  }

  async getHarvestLogsByPlotAndCycle(plotId: string, cycleNumber: number): Promise<HarvestLog[]> {
    return await db.select().from(harvestLogs)
      .where(and(eq(harvestLogs.plotId, plotId), eq(harvestLogs.cycleNumber, cycleNumber)))
      .orderBy(desc(harvestLogs.harvestDate));
  }

  async createHarvestLog(harvestLogData: InsertHarvestLog): Promise<HarvestLog> {
    // Calculate total amounts based on detailed grade structure
    const gradeAKg = harvestLogData.gradeAKg || 0;
    const gradeBKg = harvestLogData.gradeBKg || 0;
    const pricePerKgGradeA = harvestLogData.pricePerKgGradeA || 7.00;
    const pricePerKgGradeB = harvestLogData.pricePerKgGradeB || 4.00;
    
    const totalAmountGradeA = gradeAKg * pricePerKgGradeA;
    const totalAmountGradeB = gradeBKg * pricePerKgGradeB;
    const grandTotal = totalAmountGradeA + totalAmountGradeB;

    const [newHarvestLog] = await db.insert(harvestLogs).values({
      userId: harvestLogData.userId || "",
      plotId: harvestLogData.plotId,
      cycleNumber: harvestLogData.cycleNumber,
      harvestDate: harvestLogData.harvestDate,
      gradeAKg: gradeAKg.toString(),
      gradeBKg: gradeBKg.toString(),
      pricePerKgGradeA: pricePerKgGradeA.toString(),
      pricePerKgGradeB: pricePerKgGradeB.toString(),
      totalAmountGradeA: totalAmountGradeA.toString(),
      totalAmountGradeB: totalAmountGradeB.toString(),
      grandTotal: grandTotal.toString(),
      comments: harvestLogData.comments || "",
    }).returning();
    
    return newHarvestLog;
  }

  async updateHarvestLog(id: string, updates: Partial<HarvestLog>): Promise<HarvestLog | undefined> {
    const [updatedHarvestLog] = await db
      .update(harvestLogs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(harvestLogs.id, id))
      .returning();
    return updatedHarvestLog || undefined;
  }

  async deleteHarvestLog(id: string): Promise<boolean> {
    const result = await db.delete(harvestLogs).where(eq(harvestLogs.id, id));
    return result.rowCount! > 0;
  }

  async getHarvestLogsByUserId(userId: string): Promise<HarvestLog[]> {
    if (hasBusinessAccess(userId)) {
      // User has whitelist access - show all harvest logs from authorized users
      const authorizedUserIds = getAuthorizedUserIds();
      return await db.select().from(harvestLogs)
        .where(inArray(harvestLogs.userId, authorizedUserIds))
        .orderBy(desc(harvestLogs.harvestDate));
    } else {
      // Regular user - show only their harvest logs
      return await db.select().from(harvestLogs)
        .where(eq(harvestLogs.userId, userId))
        .orderBy(desc(harvestLogs.harvestDate));
    }
  }
}

export const storage = new DatabaseStorage();
