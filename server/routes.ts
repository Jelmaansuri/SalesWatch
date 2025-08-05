import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertProductSchema, insertSaleSchema, insertPlotSchema, insertUserSettingsSchema, insertInvoiceSchema, insertInvoiceItemSchema } from "@shared/schema";
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
      console.error("Error fetching sales:", error);
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

  // Update multi-product sale (handles grouped sales)
  app.put("/api/sales/:id/multi-product", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { customerId, status, platformSource, notes, saleDate, products } = req.body;

      console.log("PUT /api/sales/:id/multi-product called with:", { 
        saleId: id, 
        customerId, 
        status, 
        products: products?.length 
      });

      // Get existing sale to verify ownership
      const existingSale = await storage.getSale(id);
      if (!existingSale) {
        return res.status(404).json({ message: "Sale not found" });
      }

      if (existingSale.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Find all sales in the same group (if grouped)
      const groupMatch = existingSale.notes?.match(/\[GROUP:([^\]]+)\]/);
      const groupId = groupMatch ? groupMatch[1] : null;
      
      let salesInGroup = [existingSale];
      if (groupId) {
        const allSales = await storage.getSales();
        salesInGroup = allSales.filter((sale: any) => 
          sale.userId === userId && 
          sale.notes?.includes(`[GROUP:${groupId}]`) && 
          sale.customerId === existingSale.customerId
        );
      }

      // Auto-delete all invoices linked to the sales group before updating
      let deletedInvoicesCount = 0;
      let deletedInvoiceNumbers = [];
      for (const sale of salesInGroup) {
        try {
          const relatedInvoices = await storage.getInvoicesBySaleId(sale.id);
          for (const invoice of relatedInvoices) {
            deletedInvoiceNumbers.push(invoice.invoiceNumber);
            // Add the invoice number to reusable pool before deleting
            await storage.addReusableInvoiceNumber(userId, invoice.invoiceNumber);
            await storage.deleteInvoiceItems(invoice.id);
            await storage.deleteInvoice(invoice.id);
            deletedInvoicesCount++;
          }
        } catch (error) {
          console.warn(`Failed to delete invoices for sale ${sale.id}:`, error);
        }
      }

      // Delete existing sales in the group (except the main one, we'll update it)
      for (const sale of salesInGroup) {
        if (sale.id !== id) {
          try {
            await storage.deleteSale(sale.id);
          } catch (error) {
            console.warn(`Failed to delete sale ${sale.id}:`, error);
          }
        }
      }

      // Generate new group ID if multiple products
      const newGroupId = products.length > 1 ? `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : null;
      const groupNotes = newGroupId ? `${notes || ''} [GROUP:${newGroupId}]`.trim() : notes || '';

      // Update the main sale with the first product
      const firstProduct = products[0];
      const product = await storage.getProduct(firstProduct.productId);
      if (!product) {
        return res.status(404).json({ message: "First product not found" });
      }

      const costPrice = parseFloat(product.costPrice);
      const unitPrice = parseFloat(firstProduct.unitPrice);
      const discountAmount = parseFloat(firstProduct.discountAmount || "0");
      const quantity = firstProduct.quantity;
      
      const totalAmount = ((unitPrice - discountAmount) * quantity).toFixed(2);
      const profit = ((unitPrice - discountAmount - costPrice) * quantity).toFixed(2);

      const updatedMainSale = await storage.updateSale(id, {
        customerId,
        productId: firstProduct.productId,
        quantity,
        unitPrice: firstProduct.unitPrice,
        discountAmount: firstProduct.discountAmount,
        totalAmount,
        profit,
        status,
        platformSource,
        notes: groupNotes,
        saleDate: saleDate ? new Date(saleDate) : existingSale.saleDate,
        updatedAt: new Date(),
      });

      // Create additional sales for remaining products
      const createdSales = [updatedMainSale];
      
      for (let i = 1; i < products.length; i++) {
        const productItem = products[i];
        const product = await storage.getProduct(productItem.productId);
        if (!product) {
          console.warn(`Product ${productItem.productId} not found, skipping`);
          continue;
        }

        const costPrice = parseFloat(product.costPrice);
        const unitPrice = parseFloat(productItem.unitPrice);
        const discountAmount = parseFloat(productItem.discountAmount || "0");
        const quantity = productItem.quantity;
        
        const totalAmount = ((unitPrice - discountAmount) * quantity).toFixed(2);
        const profit = ((unitPrice - discountAmount - costPrice) * quantity).toFixed(2);

        const newSale = await storage.createSale({
          userId,
          customerId,
          productId: productItem.productId,
          quantity,
          unitPrice: productItem.unitPrice,
          discountAmount: productItem.discountAmount,
          totalAmount,
          profit,
          status,
          platformSource,
          notes: groupNotes,
          saleDate: saleDate ? new Date(saleDate) : existingSale.saleDate,
        });

        createdSales.push(newSale);
      }

      // Update related invoices for all sales in the group
      try {
        for (const sale of createdSales) {
          if (!sale) continue;
          const relatedInvoices = await storage.getInvoicesBySaleId(sale.id);
          if (relatedInvoices.length > 0) {
            for (const invoice of relatedInvoices) {
              // Update invoice based on all sales in the group
              const newSubtotal = createdSales.reduce((sum, s) => s ? sum + parseFloat(s.totalAmount) : sum, 0);
              const invoiceUpdates: any = {
                subtotal: newSubtotal.toString(),
                totalAmount: newSubtotal.toString(),
              };
              
              if (saleDate) {
                invoiceUpdates.invoiceDate = new Date(saleDate);
                const newDueDate = new Date(saleDate);
                newDueDate.setDate(newDueDate.getDate() + 30);
                invoiceUpdates.dueDate = newDueDate;
              }
              
              await storage.updateInvoice(invoice.id, invoiceUpdates);
              
              // Update invoice items
              await storage.deleteInvoiceItems(invoice.id);
              for (const groupSale of createdSales) {
                if (!groupSale) continue;
                const lineTotal = parseFloat(groupSale.totalAmount);
                await storage.createInvoiceItem({
                  invoiceId: invoice.id,
                  productId: groupSale.productId,
                  quantity: groupSale.quantity,
                  unitPrice: parseFloat(groupSale.unitPrice) - parseFloat(groupSale.discountAmount || "0"),
                  discount: parseFloat(groupSale.discountAmount || "0"),
                  lineTotal: lineTotal,
                });
              }
            }
          }
        }
      } catch (invoiceError) {
        console.warn("Failed to update related invoices:", invoiceError);
      }

      res.json({ 
        message: "Multi-product sale updated successfully",
        sales: createdSales,
        groupId: newGroupId,
        deletedInvoicesCount,
        deletedInvoiceNumbers
      });
    } catch (error) {
      console.error("Error updating multi-product sale:", error);
      res.status(500).json({ message: "Failed to update multi-product sale" });
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
      
      // Check if there are invoices linked to this sale and update them accordingly
      const relatedInvoices = await storage.getInvoicesBySaleId(req.params.id);
      if (relatedInvoices.length > 0) {
        console.log(`Found ${relatedInvoices.length} related invoices to update`);
        
        for (const invoice of relatedInvoices) {
          // Get all sales in the same group (if applicable) to recalculate invoice totals
          const groupMatch = sale.notes?.match(/\[GROUP:([^\]]+)\]/);
          const groupId = groupMatch ? groupMatch[1] : null;
          
          let groupedSales = [sale];
          if (groupId) {
            const allSales = await storage.getSalesWithDetails();
            groupedSales = allSales.filter((s: any) => 
              s.notes?.includes(`[GROUP:${groupId}]`) && s.customerId === sale.customerId
            );
          }
          
          // Recalculate invoice totals based on updated sales data
          const newSubtotal = groupedSales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
          const newTotalAmount = newSubtotal; // No tax for now
          
          // Update invoice date if sale date changed
          const invoiceUpdates: any = {
            subtotal: newSubtotal.toString(),
            totalAmount: newTotalAmount.toString(),
          };
          
          // If sale date changed, update invoice date and due date to match
          if (updateData.saleDate) {
            invoiceUpdates.invoiceDate = updateData.saleDate;
            // Calculate new due date (30 days from sale date)
            const newDueDate = new Date(updateData.saleDate);
            newDueDate.setDate(newDueDate.getDate() + 30);
            invoiceUpdates.dueDate = newDueDate;
          }
          
          await storage.updateInvoice(invoice.id, invoiceUpdates);
          
          // Update invoice items based on updated sales
          await storage.deleteInvoiceItems(invoice.id);
          
          // Recreate invoice items from grouped sales
          for (const groupSale of groupedSales) {
            const lineTotal = parseFloat(groupSale.totalAmount);
            await storage.createInvoiceItem({
              invoiceId: invoice.id,
              productId: groupSale.productId,
              quantity: groupSale.quantity,
              unitPrice: parseFloat(groupSale.unitPrice) - parseFloat(groupSale.discountAmount || "0"),
              discount: parseFloat(groupSale.discountAmount || "0"),
              lineTotal: lineTotal,
            });
          }
        }
        
        console.log(`Updated ${relatedInvoices.length} related invoices`);
      }
      
      const saleWithDetails = await storage.getSaleWithDetails(sale.id);
      
      // Return response with potential deleted invoice information (same format as multi-product route)
      res.json({
        ...saleWithDetails,
        deletedInvoicesCount: 0, // Regular updates don't delete invoices, they update them
        deletedInvoiceNumbers: []
      });
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
      console.log("Attempting to delete sale:", req.params.id);
      
      // Check if sale has any related invoices
      const relatedInvoices = await storage.getInvoicesBySaleId(req.params.id);
      if (relatedInvoices.length > 0) {
        return res.status(400).json({ 
          message: `Cannot delete sale. Sale has ${relatedInvoices.length} related invoice(s). Please delete the invoices first.`,
          invoiceCount: relatedInvoices.length
        });
      }
      
      const deleted = await storage.deleteSale(req.params.id);
      console.log("Delete result:", deleted);
      if (!deleted) {
        return res.status(404).json({ message: "Sale not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting sale:", error);
      if (error instanceof Error && error.message.includes("foreign key constraint")) {
        return res.status(400).json({ 
          message: "Cannot delete sale because it has related records. Please delete associated invoices first." 
        });
      }
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

  // User Settings routes (protected)
  app.get("/api/user-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ message: "Failed to fetch user settings" });
    }
  });

  app.post("/api/user-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertUserSettingsSchema.parse({
        ...req.body,
        userId
      });
      
      // Check if settings already exist
      const existingSettings = await storage.getUserSettings(userId);
      if (existingSettings) {
        const updatedSettings = await storage.updateUserSettings(userId, req.body);
        return res.json(updatedSettings);
      }
      
      const settings = await storage.createUserSettings(validatedData);
      res.json(settings);
    } catch (error) {
      console.error("Error creating/updating user settings:", error);
      res.status(500).json({ message: "Failed to save user settings" });
    }
  });

  app.put("/api/user-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("PUT /api/user-settings - userId:", userId);
      console.log("PUT /api/user-settings - request body:", req.body);
      
      const updatedSettings = await storage.updateUserSettings(userId, req.body);
      if (!updatedSettings) {
        return res.status(404).json({ message: "User settings not found" });
      }
      console.log("PUT /api/user-settings - updated successfully:", updatedSettings);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ message: "Failed to update user settings" });
    }
  });

  // Invoice routes (protected)
  app.get("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoices = await storage.getInvoicesWithDetails(userId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getInvoiceWithDetails(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Generate invoice number
      const invoiceNumber = await storage.generateInvoiceNumber(userId);
      
      const validatedData = insertInvoiceSchema.parse({
        ...req.body,
        userId,
        invoiceNumber
      });
      
      // Create invoice
      const invoice = await storage.createInvoice(validatedData);
      
      // Create invoice items if provided
      if (req.body.items && Array.isArray(req.body.items)) {
        const invoiceItems = [];
        for (const item of req.body.items) {
          const validatedItem = insertInvoiceItemSchema.parse({
            ...item,
            invoiceId: invoice.id
          });
          const createdItem = await storage.createInvoiceItem(validatedItem);
          invoiceItems.push(createdItem);
        }
      }
      
      // Return complete invoice with details
      const invoiceWithDetails = await storage.getInvoiceWithDetails(invoice.id);
      res.json(invoiceWithDetails);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Get intended invoice number for generation preview
  app.post("/api/invoices/preview-number", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Get user settings for invoice generation or create default
      let userSettings = await storage.getUserSettings(userId);
      if (!userSettings) {
        // Create default user settings
        const defaultSettings = {
          userId,
          businessName: "Your Business",
          businessAddress: "Your Business Address",
          businessPhone: "Your Phone",
          businessEmail: "your@email.com",
          invoicePrefix: "INV",
          nextInvoiceNumber: 1,
          currency: "MYR",
          paymentTerms: "Payment due within 30 days",
        };
        userSettings = await storage.createUserSettings(defaultSettings);
      }

      // Check for reusable invoice numbers first
      const reusableNumbers = await storage.getReusableInvoiceNumbers(userId);
      let invoiceNumber;
      
      if (reusableNumbers.length > 0) {
        // Use the oldest reusable number
        invoiceNumber = reusableNumbers[0].invoiceNumber;
      } else {
        // Generate new invoice number
        invoiceNumber = `${userSettings.invoicePrefix}-${String(userSettings.nextInvoiceNumber).padStart(4, '0')}`;
      }

      res.json({ invoiceNumber });
    } catch (error) {
      console.error("Error previewing invoice number:", error);
      res.status(500).json({ message: "Failed to preview invoice number" });
    }
  });

  // Generate invoice from sale
  app.post("/api/invoices/generate-from-sale", isAuthenticated, async (req: any, res) => {
    try {
      const { saleId } = req.body;
      const userId = req.user.claims.sub;

      if (!saleId) {
        return res.status(400).json({ message: "Sale ID is required" });
      }

      // Get the sale details
      const sale = await storage.getSale(saleId);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }

      // Extract group identifier from the sale notes
      const groupMatch = sale.notes?.match(/\[GROUP:([^\]]+)\]/);
      const groupId = groupMatch ? groupMatch[1] : null;

      // If this sale is part of a group, get all sales in the group
      let groupedSales = [sale];
      if (groupId) {
        // Get all sales with the same group ID
        const allSales = await storage.getSalesWithDetails();
        groupedSales = allSales.filter((s: any) => 
          s.notes?.includes(`[GROUP:${groupId}]`) && s.customerId === sale.customerId && s.userId === userId
        );
      }

      // Check if any sale in the group already has an invoice
      for (const groupSale of groupedSales) {
        const existingInvoices = await storage.getInvoicesBySaleId(groupSale.id);
        if (existingInvoices.length > 0) {
          return res.status(400).json({ 
            message: `Invoice already exists for this ${groupId ? 'transaction group' : 'sale'}. Invoice number: ${existingInvoices[0].invoiceNumber}` 
          });
        }
      }

      // Get user settings for invoice generation or create default
      let userSettings = await storage.getUserSettings(userId);
      if (!userSettings) {
        // Create default user settings
        const defaultSettings = {
          userId,
          businessName: "Your Business",
          businessAddress: "Your Business Address",
          businessPhone: "Your Phone",
          businessEmail: "your@email.com",
          invoicePrefix: "INV",
          nextInvoiceNumber: 1,
          currency: "MYR",
          paymentTerms: "Payment due within 30 days",
        };
        userSettings = await storage.createUserSettings(defaultSettings);
      }

      // Try to get a reusable invoice number first, otherwise generate new one
      let invoiceNumber = await storage.getNextReusableInvoiceNumber(userId);
      let shouldIncrementCounter = false;
      
      if (!invoiceNumber) {
        // No reusable number available, generate new one
        invoiceNumber = `${userSettings.invoicePrefix}-${String(userSettings.nextInvoiceNumber).padStart(4, '0')}`;
        shouldIncrementCounter = true;
      }

      // Calculate total amounts for all grouped sales
      const subtotal = groupedSales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
      const totalProfit = groupedSales.reduce((sum, s) => sum + parseFloat(s.profit), 0);

      // Use the actual sale date from the main sale, not current date
      const saleDate = new Date(sale.saleDate);
      const dueDate = new Date(saleDate);
      dueDate.setDate(dueDate.getDate() + 30); // 30 days from sale date
      
      // Create invoice data from sale group
      const invoiceData = {
        userId,
        customerId: sale.customerId,
        saleId: sale.id, // Link to the primary sale (first sale in group)
        invoiceNumber,
        invoiceDate: saleDate, // Use actual sale date, not current date
        dueDate: dueDate, // 30 days from sale date
        status: "draft",
        subtotal: subtotal,
        taxAmount: 0,
        totalAmount: subtotal,
        currency: userSettings.currency,
        paymentTerms: userSettings.paymentTerms,
        notes: "This is computer generated document. No signature required.",
      };

      // Create the invoice
      const invoice = await storage.createInvoice(invoiceData);

      // Create invoice items from all grouped sales
      for (const groupSale of groupedSales) {
        const invoiceItemData = {
          invoiceId: invoice.id,
          productId: groupSale.productId,
          quantity: groupSale.quantity,
          unitPrice: parseFloat(groupSale.unitPrice),
          discount: parseFloat(groupSale.discountAmount || "0"),
          lineTotal: parseFloat(groupSale.totalAmount),
        };
        await storage.createInvoiceItem(invoiceItemData);
      }

      // Update the next invoice number only if we used a new number
      if (shouldIncrementCounter) {
        await storage.updateUserSettings(userId, {
          nextInvoiceNumber: (userSettings.nextInvoiceNumber || 1) + 1,
        });
      }

      // Return the complete invoice with details
      const invoiceWithDetails = await storage.getInvoiceWithDetails(invoice.id);
      const response = invoiceWithDetails || invoice;
      console.log("Sending invoice response:", { invoiceNumber: response.invoiceNumber, id: response.id });
      res.json(response);
    } catch (error) {
      console.error("Error generating invoice from sale:", error);
      res.status(500).json({ message: "Failed to generate invoice" });
    }
  });

  app.put("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      // Handle partial updates (like status changes) vs full updates
      const isPartialUpdate = Object.keys(req.body).length === 1;
      
      // Update invoice - for partial updates, don't validate full schema
      let updateData = req.body;
      if (!isPartialUpdate) {
        // Only validate dates if they're provided
        if (req.body.invoiceDate) {
          updateData.invoiceDate = new Date(req.body.invoiceDate);
        }
        if (req.body.dueDate) {
          updateData.dueDate = new Date(req.body.dueDate);
        }
      }
      
      const updatedInvoice = await storage.updateInvoice(req.params.id, updateData);
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Update invoice items if provided (only for full updates)
      if (!isPartialUpdate && req.body.items && Array.isArray(req.body.items)) {
        // Delete existing items
        await storage.deleteInvoiceItems(req.params.id);
        
        // Create new items
        for (const item of req.body.items) {
          const validatedItem = insertInvoiceItemSchema.parse({
            ...item,
            invoiceId: req.params.id
          });
          await storage.createInvoiceItem(validatedItem);
        }
      }
      
      // Return complete invoice with details
      const invoiceWithDetails = await storage.getInvoiceWithDetails(req.params.id);
      res.json(invoiceWithDetails);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const deleted = await storage.deleteInvoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Check if all invoices are deleted and reset invoice numbering
      const userId = req.user.claims.sub;
      const remainingInvoices = await storage.getInvoices();
      
      if (remainingInvoices.length === 0) {
        // Reset invoice numbering to 1 when all invoices are deleted
        await storage.updateUserSettings(userId, {
          nextInvoiceNumber: 1,
        });
      }
      
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  app.post("/api/invoices/:id/generate-pdf", isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getInvoiceWithDetails(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Get user settings for business information
      const userId = (req.user as any)?.claims?.sub;
      const settings = await storage.getUserSettings(userId);
      
      // Return invoice data for PDF generation on frontend
      res.json({
        invoice,
        businessSettings: settings
      });
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      res.status(500).json({ message: "Failed to generate invoice PDF" });
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
      
      // Filter out null values for dates that might cause issues
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([key, value]) => 
          value !== null && value !== undefined
        )
      );
      
      const plot = await storage.updatePlot(req.params.id, filteredUpdateData);
      if (!plot) {
        return res.status(404).json({ message: "Plot not found" });
      }
      res.json(plot);
    } catch (error) {
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
