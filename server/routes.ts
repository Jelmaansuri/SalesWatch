import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertProductSchema, insertSaleSchema, insertPlotSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Customers routes (protected)
  app.get("/api/customers", isAuthenticated, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.get("/api/customers/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/customers", isAuthenticated, async (req, res) => {
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

  app.put("/api/customers/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/customers/:id", isAuthenticated, async (req, res) => {
    try {
      // Check if customer has any sales records
      const customerSales = await storage.getSalesByCustomerId(req.params.id);
      if (customerSales.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete customer. Customer has ${customerSales.length} sales record(s). Please delete or reassign the sales records first.`,
          salesCount: customerSales.length
        });
      }

      const deleted = await storage.deleteCustomer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting customer:", error);
      if (error instanceof Error && error.message.includes("foreign key constraint")) {
        return res.status(400).json({ 
          message: "Cannot delete customer because they have associated sales records. Please delete the sales records first." 
        });
      }
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Products routes (protected)
  app.get("/api/products", isAuthenticated, async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/products", isAuthenticated, async (req, res) => {
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

  app.put("/api/products/:id", isAuthenticated, async (req, res) => {
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

  app.delete("/api/products/:id", isAuthenticated, async (req, res) => {
    try {
      // Check if product has any sales records
      const productSales = await storage.getSalesByProductId(req.params.id);
      if (productSales.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete product. Product has ${productSales.length} sales record(s). Please delete or reassign the sales records first.`,
          salesCount: productSales.length
        });
      }

      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting product:", error);
      if (error instanceof Error && error.message.includes("foreign key constraint")) {
        return res.status(400).json({ 
          message: "Cannot delete product because it has associated sales records. Please delete the sales records first." 
        });
      }
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Sales routes (protected)
  app.get("/api/sales", isAuthenticated, async (req, res) => {
    try {
      const salesWithDetails = await storage.getSalesWithDetails();
      res.json(salesWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.get("/api/sales/:id", isAuthenticated, async (req, res) => {
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

  app.post("/api/sales", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requestData = { ...req.body, userId };
      
      // Ensure saleDate is handled properly
      if (requestData.saleDate) {
        if (typeof requestData.saleDate === 'string') {
          requestData.saleDate = new Date(requestData.saleDate);
        } else if (requestData.saleDate instanceof Date) {
          // Already a Date object, keep as is
        }
      }
      
      console.log("Processing sale creation with data:", requestData);
      const saleData = insertSaleSchema.parse(requestData);
      
      // Verify customer and product exist
      const customer = await storage.getCustomer(saleData.customerId);
      const product = await storage.getProduct(saleData.productId);
      
      if (!customer) {
        return res.status(400).json({ message: "Customer not found" });
      }
      if (!product) {
        return res.status(400).json({ message: "Product not found" });
      }

      // Calculate totals and profit with discount
      const unitPrice = parseFloat(saleData.unitPrice);
      const discountAmount = parseFloat(saleData.discountAmount || "0.00");
      const quantity = saleData.quantity;
      const discountedUnitPrice = unitPrice - discountAmount;
      const totalAmount = discountedUnitPrice * quantity;
      const costPrice = parseFloat(product.costPrice);
      const profit = (discountedUnitPrice - costPrice) * quantity;

      const finalSaleData = {
        ...saleData,
        discountAmount: discountAmount.toString(),
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
      if (error instanceof Error && error.message.includes("Insufficient stock")) {
        return res.status(400).json({ message: error.message });
      }
      console.error("Error creating sale:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack available');
      res.status(500).json({ message: "Failed to create sale", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.put("/api/sales/:id", isAuthenticated, async (req, res) => {
    try {
      console.log(`Updating sale ${req.params.id} with data:`, req.body);
      
      const updateData = insertSaleSchema.partial().parse(req.body);
      console.log(`Parsed update data:`, updateData);
      
      // If unitPrice, discount, quantity, or product is being updated, recalculate totals and profit
      if (updateData.unitPrice || updateData.discountAmount !== undefined || updateData.quantity || updateData.productId) {
        const existingSale = await storage.getSale(req.params.id);
        if (!existingSale) {
          return res.status(404).json({ message: "Sale not found" });
        }
        
        const productId = updateData.productId || existingSale.productId;
        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(400).json({ message: "Product not found" });
        }
        
        const unitPrice = updateData.unitPrice ? parseFloat(updateData.unitPrice) : parseFloat(existingSale.unitPrice);
        const discountAmount = updateData.discountAmount ? parseFloat(updateData.discountAmount) : parseFloat(existingSale.discountAmount || "0.00");
        const quantity = updateData.quantity !== undefined ? updateData.quantity : existingSale.quantity;
        const discountedUnitPrice = unitPrice - discountAmount;
        const totalAmount = discountedUnitPrice * quantity;
        const costPrice = parseFloat(product.costPrice);
        const profit = (discountedUnitPrice - costPrice) * quantity;
        
        updateData.totalAmount = totalAmount.toString();
        updateData.profit = profit.toString();
      }
      
      const sale = await storage.updateSale(req.params.id, updateData);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }
      
      console.log(`Updated sale:`, sale);
      
      const saleWithDetails = await storage.getSaleWithDetails(sale.id);
      res.json(saleWithDetails);
    } catch (error) {
      console.error("Error updating sale:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      if (error instanceof Error && error.message.includes("Insufficient stock")) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update sale" });
    }
  });

  app.delete("/api/sales/:id", isAuthenticated, async (req, res) => {
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

  // Excel Export Routes
  app.get("/api/reports/export/excel", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, reportType = 'comprehensive' } = req.query;
      
      // Get all sales with details
      const allSales = await storage.getSalesWithDetails();
      
      // Filter by date range if provided
      let filteredSales = allSales;
      if (startDate || endDate) {
        filteredSales = allSales.filter((sale: any) => {
          const saleDate = new Date(sale.createdAt);
          const start = startDate ? new Date(startDate as string) : new Date('1900-01-01');
          const end = endDate ? new Date(endDate as string) : new Date();
          return saleDate >= start && saleDate <= end;
        });
      }
      
      // Get customers and products for comprehensive report
      const customers = await storage.getCustomers();
      const products = await storage.getProducts();
      
      // Calculate comprehensive analytics
      const analytics = {
        totalRevenue: filteredSales.reduce((sum: number, sale: any) => sum + parseFloat(sale.totalAmount), 0),
        totalProfit: filteredSales.reduce((sum: number, sale: any) => sum + parseFloat(sale.profit), 0),
        totalOrders: filteredSales.length,
        averageOrderValue: filteredSales.length > 0 ? 
          filteredSales.reduce((sum: number, sale: any) => sum + parseFloat(sale.totalAmount), 0) / filteredSales.length : 0,
        profitMargin: 0,
        totalCustomers: customers.length,
        totalProducts: products.length,
        statusBreakdown: filteredSales.reduce((acc: any, sale: any) => {
          acc[sale.status] = (acc[sale.status] || 0) + 1;
          return acc;
        }, {})
      };
      analytics.profitMargin = analytics.totalRevenue > 0 ? (analytics.totalProfit / analytics.totalRevenue) * 100 : 0;
      
      // Customer performance analysis
      const customerAnalysis = customers.map((customer: any) => {
        const customerSales = filteredSales.filter((sale: any) => sale.customerId === customer.id);
        const revenue = customerSales.reduce((sum: number, sale: any) => sum + parseFloat(sale.totalAmount), 0);
        const profit = customerSales.reduce((sum: number, sale: any) => sum + parseFloat(sale.profit), 0);
        const orders = customerSales.length;
        const avgOrderValue = orders > 0 ? revenue / orders : 0;
        
        return {
          customerId: customer.id,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone || 'N/A',
          customerCompany: customer.company || 'N/A',
          totalRevenue: revenue,
          totalProfit: profit,
          totalOrders: orders,
          averageOrderValue: avgOrderValue,
          profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
          firstOrder: customerSales.length > 0 ? 
            new Date(Math.min(...customerSales.map((s: any) => new Date(s.createdAt).getTime()))).toISOString().split('T')[0] : 'N/A',
          lastOrder: customerSales.length > 0 ? 
            new Date(Math.max(...customerSales.map((s: any) => new Date(s.createdAt).getTime()))).toISOString().split('T')[0] : 'N/A'
        };
      }).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);
      
      // Product performance analysis
      const productAnalysis = products.map((product: any) => {
        const productSales = filteredSales.filter((sale: any) => sale.productId === product.id);
        const revenue = productSales.reduce((sum: number, sale: any) => sum + parseFloat(sale.totalAmount), 0);
        const profit = productSales.reduce((sum: number, sale: any) => sum + parseFloat(sale.profit), 0);
        const unitsSold = productSales.reduce((sum: number, sale: any) => sum + sale.quantity, 0);
        const orders = productSales.length;
        
        return {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          costPrice: parseFloat(product.costPrice),
          sellingPrice: parseFloat(product.sellingPrice),
          currentStock: product.stock,
          status: product.status,
          unitsSold: unitsSold,
          totalRevenue: revenue,
          totalProfit: profit,
          totalOrders: orders,
          profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
          avgSellingPrice: orders > 0 ? revenue / unitsSold : 0
        };
      }).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);
      
      // Monthly performance data
      const monthlyData = filteredSales.reduce((acc: any, sale: any) => {
        const month = new Date(sale.createdAt).toISOString().slice(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = {
            month: month,
            revenue: 0,
            profit: 0,
            orders: 0,
            customers: new Set()
          };
        }
        acc[month].revenue += parseFloat(sale.totalAmount);
        acc[month].profit += parseFloat(sale.profit);
        acc[month].orders += 1;
        acc[month].customers.add(sale.customerId);
        return acc;
      }, {});
      
      const monthlyAnalysis = Object.values(monthlyData).map((data: any) => ({
        month: data.month,
        revenue: data.revenue,
        profit: data.profit,
        orders: data.orders,
        uniqueCustomers: data.customers.size,
        profitMargin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
      })).sort((a: any, b: any) => a.month.localeCompare(b.month));
      
      // Comprehensive sales details
      const salesDetails = filteredSales.map((sale: any) => ({
        saleId: sale.id,
        orderDate: new Date(sale.createdAt).toISOString().split('T')[0],
        orderTime: new Date(sale.createdAt).toTimeString().split(' ')[0],
        customerName: sale.customer.name,
        customerEmail: sale.customer.email,
        customerCompany: sale.customer.company || 'N/A',
        productName: sale.product.name,
        productSku: sale.product.sku,
        quantity: sale.quantity,
        unitPrice: parseFloat(sale.unitPrice),
        totalAmount: parseFloat(sale.totalAmount),
        costPrice: parseFloat(sale.product.costPrice),
        profit: parseFloat(sale.profit),
        profitMargin: parseFloat(sale.totalAmount) > 0 ? (parseFloat(sale.profit) / parseFloat(sale.totalAmount)) * 100 : 0,
        status: sale.status,
        statusLabel: (() => {
          const statusMap = {
            'paid': 'Paid',
            'pending_shipment': 'Pending Shipment',
            'shipped': 'Shipped',
            'completed': 'Completed'
          };
          return statusMap[sale.status as keyof typeof statusMap] || sale.status;
        })(),
        notes: sale.notes || 'N/A'
      })).sort((a: any, b: any) => new Date(b.orderDate + 'T' + b.orderTime).getTime() - new Date(a.orderDate + 'T' + a.orderTime).getTime());

      const reportData = {
        summary: analytics,
        salesDetails,
        customerAnalysis,
        productAnalysis,
        monthlyAnalysis,
        metadata: {
          generatedAt: new Date().toISOString(),
          dateRange: {
            start: startDate || 'All time',
            end: endDate || 'Present'
          },
          reportType,
          totalRecords: filteredSales.length,
          companyName: 'PROGENY AGROTECH',
          companyDescription: 'Malaysian Fresh Young Ginger Farming & Distribution'
        }
      };

      res.json(reportData);
    } catch (error) {
      console.error("Error generating Excel report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Object storage routes
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.post("/api/objects/normalize", isAuthenticated, async (req, res) => {
    if (!req.body.uploadURL) {
      return res.status(400).json({ error: "uploadURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.uploadURL,
      );
      res.json({ objectPath });
    } catch (error) {
      console.error("Error normalizing object path:", error);
      res.status(500).json({ error: "Failed to normalize object path" });
    }
  });

  app.put("/api/products/:id/image", isAuthenticated, async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.imageURL,
      );

      // Update product with image URL
      const product = await storage.updateProduct(req.params.id, {
        imageUrl: objectPath,
      });

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.status(200).json({
        objectPath: objectPath,
        product: product,
      });
    } catch (error) {
      console.error("Error setting product image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Analytics routes (protected)
  app.get("/api/analytics/dashboard", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  app.get("/api/analytics/revenue-by-month", isAuthenticated, async (req, res) => {
    try {
      const data = await storage.getRevenueByMonth();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenue data" });
    }
  });

  app.get("/api/analytics/top-products", isAuthenticated, async (req, res) => {
    try {
      const data = await storage.getTopProducts();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top products" });
    }
  });

  // Plot Management Routes (protected)
  app.get("/api/plots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const plots = await storage.getPlots(userId);
      res.json(plots);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plots" });
    }
  });

  app.get("/api/plots/:id", isAuthenticated, async (req, res) => {
    try {
      const plot = await storage.getPlot(req.params.id);
      if (!plot) {
        return res.status(404).json({ message: "Plot not found" });
      }
      res.json(plot);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plot" });
    }
  });

  app.post("/api/plots", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const plotData = { ...req.body, userId };
      
      console.log("Received plot data:", plotData);
      console.log("Using schema:", insertPlotSchema);
      
      const validatedData = insertPlotSchema.parse(plotData);
      console.log("Validated data:", validatedData);
      
      const plot = await storage.createPlot(validatedData);
      res.status(201).json(plot);
    } catch (error) {
      console.error("Plot creation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create plot" });
    }
  });

  app.put("/api/plots/:id", isAuthenticated, async (req, res) => {
    try {
      const updateData = insertPlotSchema.partial().parse(req.body);
      
      // Automated harvest tracking: when status changes to "harvested" and harvest amount is provided
      if (updateData.status === "harvested" && updateData.harvestAmountKg) {
        console.log("🌾 HARVEST TRACKING: Plot being marked as harvested with", updateData.harvestAmountKg, "kg");
        
        const existingPlot = await storage.getPlot(req.params.id);
        if (existingPlot) {
          // Update total harvested amount across all cycles
          const currentTotal = parseFloat(existingPlot.totalHarvestedKg || "0");
          const newHarvest = parseFloat(updateData.harvestAmountKg || "0");
          updateData.totalHarvestedKg = (currentTotal + newHarvest).toString();
          
          console.log("📊 HARVEST SUMMARY: Previous total:", currentTotal, "kg | New harvest:", newHarvest, "kg | Updated total:", updateData.totalHarvestedKg, "kg");
          
          // Auto-set actual harvest date if not provided
          if (!updateData.actualHarvestDate) {
            updateData.actualHarvestDate = new Date().toISOString();
            console.log("📅 AUTO-SET: Actual harvest date to today");
          }
        }
      }
      
      // Filter out null values for dates that might cause issues
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([key, value]) => 
          value !== null && value !== undefined
        )
      );
      
      console.log("Updating plot with enhanced data:", filteredUpdateData);
      
      const plot = await storage.updatePlot(req.params.id, filteredUpdateData);
      if (!plot) {
        return res.status(404).json({ message: "Plot not found" });
      }
      
      console.log("✅ PLOT UPDATED: Harvest tracking complete");
      res.json(plot);
    } catch (error) {
      console.error("❌ PLOT UPDATE ERROR:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update plot" });
    }
  });

  app.delete("/api/plots/:id", isAuthenticated, async (req, res) => {
    try {
      const deleted = await storage.deletePlot(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Plot not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete plot" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
