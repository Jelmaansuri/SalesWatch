import { type Customer, type InsertCustomer, type Product, type InsertProduct, type Sale, type InsertSale, type SaleWithDetails, type DashboardMetrics, type User, type UpsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private customers: Map<string, Customer>;
  private products: Map<string, Product>;
  private sales: Map<string, Sale>;

  constructor() {
    this.users = new Map();
    this.customers = new Map();
    this.products = new Map();
    this.sales = new Map();
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
}

export const storage = new MemStorage();
