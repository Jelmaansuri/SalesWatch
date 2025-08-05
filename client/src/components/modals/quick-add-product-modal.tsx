import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const formSchema = insertProductSchema.pick({
  name: true,
  description: true,
  sku: true,
  costPrice: true,
  sellingPrice: true,
  stock: true,
});

type FormData = z.infer<typeof formSchema>;

interface QuickAddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded: (productId: string, productData: any) => void;
}

export default function QuickAddProductModal({ open, onOpenChange, onProductAdded }: QuickAddProductModalProps) {
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      sku: "",
      costPrice: "",
      sellingPrice: "",
      stock: 0,
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("/api/products", "POST", data);
      return response;
    },
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product has been added successfully.",
      });
      onProductAdded(newProduct.id, newProduct);
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createProductMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Product name"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU *</Label>
            <Input
              id="sku"
              {...form.register("sku")}
              placeholder="Product SKU"
            />
            {form.formState.errors.sku && (
              <p className="text-sm text-red-600">{form.formState.errors.sku.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Product description (optional)"
              rows={3}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost Price (RM) *</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                min="0"
                {...form.register("costPrice")}
                placeholder="0.00"
              />
              {form.formState.errors.costPrice && (
                <p className="text-sm text-red-600">{form.formState.errors.costPrice.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price (RM) *</Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                min="0"
                {...form.register("sellingPrice")}
                placeholder="0.00"
              />
              {form.formState.errors.sellingPrice && (
                <p className="text-sm text-red-600">{form.formState.errors.sellingPrice.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock">Initial Stock *</Label>
            <Input
              id="stock"
              type="number"
              min="0"
              {...form.register("stock", { valueAsNumber: true })}
              placeholder="0"
            />
            {form.formState.errors.stock && (
              <p className="text-sm text-red-600">{form.formState.errors.stock.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={createProductMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createProductMutation.isPending}
            >
              {createProductMutation.isPending ? "Adding..." : "Add Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}