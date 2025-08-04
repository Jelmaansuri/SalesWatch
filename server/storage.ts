import { type Customer, type InsertCustomer, type Product, type InsertProduct, type Sale, type InsertSale, type SaleWithDetails, type DashboardMetrics, type User, type UpsertUser, type Plot, type InsertPlot } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { customers, products, sales, users, plots } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Sales
  getSales(): Promise<Sale[]>;
  getSalesWithDetails(): Promise<SaleWithDetails[]>;
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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private customers: Map<string, Customer>;
  private products: Map<string, Product>;
  private sales: Map<string, Sale>;
  private plots: Map<string, Plot>;

  constructor() {
    this.users = new Map();
    this.customers = new Map();
    this.products = new Map();
    this.sales = new Map();
    this.plots = new Map();
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Add sample customers
    const sampleCustomer1: Customer = {
      id: "customer-1",
      name: "Ahmad Restaurant Sdn Bhd",
      email: "ahmad@restaurant.com.my",
      phone: "+60123456789",
      company: "Ahmad Restaurant",
      address: "Kuala Lumpur, Malaysia",
      createdAt: new Date(),
    };

    const sampleCustomer2: Customer = {
      id: "customer-2", 
      name: "Siti Trading",
      email: "siti@trading.com.my",
      phone: "+60198765432",
      company: "Siti Trading Sdn Bhd",
      address: "Penang, Malaysia",
      createdAt: new Date(),
    };

    this.customers.set(sampleCustomer1.id, sampleCustomer1);
    this.customers.set(sampleCustomer2.id, sampleCustomer2);

    // Add sample products
    const sampleProduct1: Product = {
      id: "product-1",
      name: "Premium Fresh Young Ginger",
      sku: "GINGER-001",
      description: "Premium quality fresh young ginger, organically grown",
      costPrice: "8.50",
      sellingPrice: "15.00",
      stock: 100,
      status: "active",
      imageUrl: null,
      createdAt: new Date(),
    };

    const sampleProduct2: Product = {
      id: "product-2",
      name: "Organic Young Ginger - Bulk",
      sku: "GINGER-002", 
      description: "Bulk organic young ginger for commercial use",
      costPrice: "12.00",
      sellingPrice: "22.00",
      stock: 50,
      status: "active",
      imageUrl: null,
      createdAt: new Date(),
    };

    this.products.set(sampleProduct1.id, sampleProduct1);
    this.products.set(sampleProduct2.id, sampleProduct2);
  }

  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = userData.id ? this.users.get(userData.id) : undefined;
    
    if (existingUser) {
      const updatedUser: User = {
        ...existingUser,
        ...userData,
        updatedAt: new Date(),
      };
      this.users.set(existingUser.id, updatedUser);
      return updatedUser;
    } else {
      const id = userData.id || randomUUID();
      const user: User = {
        id,
        email: userData.email ?? null,
        firstName: userData.firstName ?? null,
        lastName: userData.lastName ?? null,
        profileImageUrl: userData.profileImageUrl ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(id, user);
      return user;
    }
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.email === email);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = {
      id,
      name: insertCustomer.name,
      email: insertCustomer.email,
      phone: insertCustomer.phone ?? null,
      company: insertCustomer.company ?? null,
      address: insertCustomer.address ?? null,
      createdAt: new Date(),
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;
    
    const updatedCustomer = { ...customer, ...updates };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return this.customers.delete(id);
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(product => product.sku === sku);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = {
      id,
      name: insertProduct.name,
      sku: insertProduct.sku,
      description: insertProduct.description ?? null,
      costPrice: insertProduct.costPrice,
      sellingPrice: insertProduct.sellingPrice,
      stock: insertProduct.stock ?? 0,
      status: insertProduct.status ?? "active",
      imageUrl: insertProduct.imageUrl ?? null,
      createdAt: new Date(),
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    
    const updatedProduct = { ...product, ...updates };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.products.delete(id);
  }

  // Sales
  async getSales(): Promise<Sale[]> {
    return Array.from(this.sales.values());
  }

  async getSale(id: string): Promise<Sale | undefined> {
    return this.sales.get(id);
  }

  async getSalesWithDetails(): Promise<SaleWithDetails[]> {
    const sales = Array.from(this.sales.values());
    const salesWithDetails: SaleWithDetails[] = [];

    for (const sale of sales) {
      const customer = this.customers.get(sale.customerId);
      const product = this.products.get(sale.productId);
      
      if (customer && product) {
        salesWithDetails.push({
          ...sale,
          customer,
          product,
        });
      }
    }

    return salesWithDetails.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getSaleWithDetails(id: string): Promise<SaleWithDetails | undefined> {
    const sale = this.sales.get(id);
    if (!sale) return undefined;

    const customer = this.customers.get(sale.customerId);
    const product = this.products.get(sale.productId);
    
    if (!customer || !product) return undefined;

    return {
      ...sale,
      customer,
      product,
    };
  }

  async createSale(insertSale: InsertSale): Promise<Sale> {
    // Check stock availability
    const stockAvailable = await this.checkStockAvailability(insertSale.productId, insertSale.quantity);
    if (!stockAvailable) {
      throw new Error("Insufficient stock for this product");
    }

    const id = randomUUID();
    const now = new Date();
    const sale: Sale = {
      id,
      userId: insertSale.userId,
      status: insertSale.status,
      customerId: insertSale.customerId,
      productId: insertSale.productId,
      quantity: insertSale.quantity,
      unitPrice: insertSale.unitPrice,
      discountAmount: insertSale.discountAmount || "0.00",
      totalAmount: insertSale.totalAmount,
      profit: insertSale.profit,
      saleDate: insertSale.saleDate || now,
      platformSource: insertSale.platformSource || "others",
      notes: insertSale.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };
    
    // Update stock when sale is created (reduce stock)
    await this.updateProductStock(insertSale.productId, -insertSale.quantity);
    
    this.sales.set(id, sale);
    return sale;
  }

  async updateSale(id: string, updates: Partial<Sale>): Promise<Sale | undefined> {
    const sale = this.sales.get(id);
    if (!sale) return undefined;
    
    // Handle quantity changes to update stock
    if (updates.quantity !== undefined && updates.quantity !== sale.quantity) {
      const quantityDiff = updates.quantity - sale.quantity;
      
      // Check stock availability if increasing quantity
      if (quantityDiff > 0) {
        const stockAvailable = await this.checkStockAvailability(sale.productId, quantityDiff);
        if (!stockAvailable) {
          throw new Error("Insufficient stock for this quantity increase");
        }
      }
      
      // Update stock (negative diff means returning stock, positive means using more stock)
      await this.updateProductStock(sale.productId, -quantityDiff);
    }
    
    const updatedSale = { 
      ...sale, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.sales.set(id, updatedSale);
    return updatedSale;
  }

  async deleteSale(id: string): Promise<boolean> {
    const sale = this.sales.get(id);
    if (!sale) return false;
    
    // Return stock when sale is deleted
    await this.updateProductStock(sale.productId, sale.quantity);
    
    return this.sales.delete(id);
  }

  async getSalesByCustomerId(customerId: string): Promise<Sale[]> {
    const sales = Array.from(this.sales.values());
    return sales.filter(sale => sale.customerId === customerId);
  }

  async getSalesByProductId(productId: string): Promise<Sale[]> {
    const sales = Array.from(this.sales.values());
    return sales.filter(sale => sale.productId === productId);
  }

  // Analytics
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const sales = Array.from(this.sales.values());
    const customers = Array.from(this.customers.values());

    const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
    const totalProfit = sales.reduce((sum, sale) => sum + parseFloat(sale.profit), 0);
    const activeOrders = sales.filter(sale => sale.status !== 'completed').length;
    const totalCustomers = customers.length;

    const orderStatusCounts = {
      unpaid: sales.filter(sale => sale.status === 'unpaid').length,
      paid: sales.filter(sale => sale.status === 'paid').length,
      pending_shipment: sales.filter(sale => sale.status === 'pending_shipment').length,
      shipped: sales.filter(sale => sale.status === 'shipped').length,
      completed: sales.filter(sale => sale.status === 'completed').length,
    };

    return {
      totalRevenue,
      totalProfit,
      activeOrders,
      totalCustomers,
      orderStatusCounts,
    };
  }

  async getRevenueByMonth(): Promise<{ month: string; revenue: number }[]> {
    const sales = Array.from(this.sales.values());
    const monthlyRevenue = new Map<string, number>();

    sales.forEach(sale => {
      const month = sale.createdAt.toLocaleDateString('en-MY', { 
        month: 'short',
        year: 'numeric'
      });
      const current = monthlyRevenue.get(month) || 0;
      monthlyRevenue.set(month, current + parseFloat(sale.totalAmount));
    });

    return Array.from(monthlyRevenue.entries()).map(([month, revenue]) => ({
      month,
      revenue,
    }));
  }

  async getTopProducts(): Promise<Array<{ product: Product; totalRevenue: number; totalProfit: number; unitsSold: number }>> {
    const sales = Array.from(this.sales.values());
    const productStats = new Map<string, { totalRevenue: number; totalProfit: number; unitsSold: number }>();

    sales.forEach(sale => {
      const current = productStats.get(sale.productId) || { totalRevenue: 0, totalProfit: 0, unitsSold: 0 };
      productStats.set(sale.productId, {
        totalRevenue: current.totalRevenue + parseFloat(sale.totalAmount),
        totalProfit: current.totalProfit + parseFloat(sale.profit),
        unitsSold: current.unitsSold + sale.quantity,
      });
    });

    const results: Array<{ product: Product; totalRevenue: number; totalProfit: number; unitsSold: number }> = [];
    Array.from(productStats.entries()).forEach(([productId, stats]) => {
      const product = this.products.get(productId);
      if (product) {
        results.push({
          product,
          ...stats,
        });
      }
    });

    return results.sort((a, b) => b.totalProfit - a.totalProfit);
  }

  // Stock Management Methods
  async updateProductStock(productId: string, quantityChange: number): Promise<Product | undefined> {
    const product = this.products.get(productId);
    if (!product) return undefined;
    
    const newStock = product.stock + quantityChange;
    if (newStock < 0) {
      throw new Error("Stock cannot be negative");
    }
    
    const updatedProduct = { ...product, stock: newStock };
    this.products.set(productId, updatedProduct);
    return updatedProduct;
  }

  async checkStockAvailability(productId: string, requiredQuantity: number): Promise<boolean> {
    const product = this.products.get(productId);
    if (!product) return false;
    
    return product.stock >= requiredQuantity;
  }

  // Plot Management Methods
  async getPlots(userId: string): Promise<Plot[]> {
    return Array.from(this.plots.values())
      .filter(plot => plot.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPlot(id: string): Promise<Plot | undefined> {
    return this.plots.get(id);
  }

  async createPlot(insertPlot: InsertPlot): Promise<Plot> {
    const id = randomUUID();
    const now = new Date();
    
    // Calculate netting open date from planting date + days to open netting
    const plantingDate = new Date(insertPlot.plantingDate);
    const nettingOpenDate = new Date(plantingDate);
    nettingOpenDate.setDate(plantingDate.getDate() + insertPlot.daysToOpenNetting);
    
    const plot: Plot = {
      id,
      userId: insertPlot.userId,
      name: insertPlot.name,
      polybagCount: insertPlot.polybagCount,
      location: insertPlot.location,
      cropType: insertPlot.cropType,
      plantingDate: insertPlot.plantingDate,
      expectedHarvestDate: insertPlot.expectedHarvestDate,
      actualHarvestDate: insertPlot.actualHarvestDate || null,
      daysToMaturity: insertPlot.daysToMaturity,
      daysToOpenNetting: insertPlot.daysToOpenNetting,
      nettingOpenDate: nettingOpenDate,
      status: insertPlot.status || "planted",
      notes: insertPlot.notes || null,
      createdAt: now,
      updatedAt: now,
    };
    
    this.plots.set(id, plot);
    return plot;
  }

  async updatePlot(id: string, updates: Partial<Plot>): Promise<Plot | undefined> {
    const plot = this.plots.get(id);
    if (!plot) return undefined;
    
    const updatedPlot = { 
      ...plot, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.plots.set(id, updatedPlot);
    return updatedPlot;
  }

  async deletePlot(id: string): Promise<boolean> {
    return this.plots.delete(id);
  }
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

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
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

  // Product operations
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.createdAt));
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
  async getSales(): Promise<Sale[]> {
    return await db.select().from(sales).orderBy(desc(sales.createdAt));
  }

  async getSalesWithDetails(): Promise<SaleWithDetails[]> {
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
      .orderBy(desc(sales.createdAt));
    
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

    const [newSale] = await db.insert(sales).values(saleRecord).returning();
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
    
    // Calculate completed cycles from all plots
    const allPlots = await db.select().from(plots);
    const completedCycles = allPlots.reduce((sum, plot) => {
      // Count harvested cycles: if status is harvested, count the current cycle
      // For multi-cycle plots, count all completed cycles (currentCycle represents total completed)
      if (plot.status === 'harvested') {
        return sum + plot.currentCycle;
      }
      return sum;
    }, 0);
    
    const orderStatusCounts = {
      unpaid: allSales.filter(s => s.status === 'unpaid').length,
      paid: allSales.filter(s => s.status === 'paid').length,
      pending_shipment: allSales.filter(s => s.status === 'pending_shipment').length,
      shipped: allSales.filter(s => s.status === 'shipped').length,
      completed: allSales.filter(s => s.status === 'completed').length,
    };

    return {
      totalRevenue,
      totalProfit,
      activeOrders,
      totalCustomers,
      completedCycles,
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

  // Plot Management
  async getPlots(userId: string): Promise<Plot[]> {
    return await db.select().from(plots).where(eq(plots.userId, userId)).orderBy(desc(plots.createdAt));
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
    
    const [newPlot] = await db.insert(plots).values({
      ...plot,
      id: randomUUID(),
      nettingOpenDate: nettingOpenDate,
    }).returning();
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
}

export const storage = new DatabaseStorage();
