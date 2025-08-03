import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertProductSchema, insertSaleSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Customers routes
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customer" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      
      // Check if email already exists
      const existingCustomer = await storage.getCustomerByEmail(validatedData.email);
      if (existingCustomer) {
        return res.status(400).json({ message: "Customer with this email already exists" });
      }

      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    try {
      const updateData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, updateData);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCustomer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Products routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      
      // Check if SKU already exists
      const existingProduct = await storage.getProductBySku(validatedData.sku);
      if (existingProduct) {
        return res.status(400).json({ message: "Product with this SKU already exists" });
      }

      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const updateData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, updateData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Sales routes
  app.get("/api/sales", async (req, res) => {
    try {
      const salesWithDetails = await storage.getSalesWithDetails();
      res.json(salesWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.get("/api/sales/:id", async (req, res) => {
    try {
      const sale = await storage.getSaleWithDetails(req.params.id);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }
      res.json(sale);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sale" });
    }
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const saleData = insertSaleSchema.parse(req.body);
      
      // Verify customer and product exist
      const customer = await storage.getCustomer(saleData.customerId);
      const product = await storage.getProduct(saleData.productId);
      
      if (!customer) {
        return res.status(400).json({ message: "Customer not found" });
      }
      if (!product) {
        return res.status(400).json({ message: "Product not found" });
      }

      // Calculate totals and profit
      const unitPrice = parseFloat(saleData.unitPrice);
      const quantity = saleData.quantity;
      const totalAmount = unitPrice * quantity;
      const costPrice = parseFloat(product.costPrice);
      const profit = (unitPrice - costPrice) * quantity;

      const finalSaleData = {
        ...saleData,
        totalAmount: totalAmount.toString(),
        profit: profit.toString(),
      };

      const sale = await storage.createSale(finalSaleData);
      const saleWithDetails = await storage.getSaleWithDetails(sale.id);
      res.status(201).json(saleWithDetails);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create sale" });
    }
  });

  app.put("/api/sales/:id", async (req, res) => {
    try {
      const updateData = insertSaleSchema.partial().parse(req.body);
      const sale = await storage.updateSale(req.params.id, updateData);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }
      const saleWithDetails = await storage.getSaleWithDetails(sale.id);
      res.json(saleWithDetails);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update sale" });
    }
  });

  app.delete("/api/sales/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSale(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Sale not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sale" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get("/api/analytics/revenue-by-month", async (req, res) => {
    try {
      const data = await storage.getRevenueByMonth();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenue data" });
    }
  });

  app.get("/api/analytics/top-products", async (req, res) => {
    try {
      const data = await storage.getTopProducts();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top products" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
