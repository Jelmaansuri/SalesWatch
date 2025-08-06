import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Mail, Phone, Globe, CreditCard, FileText, Upload, Image } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MainLayout from "@/components/layout/main-layout";
import { ObjectUploader } from "@/components/ObjectUploader";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertUserSettingsSchema, type UserSettings, type InsertUserSettings } from "@shared/schema";
import type { UploadResult } from "@uppy/core";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Settings() {
  return (
    <MainLayout title="Business Settings">
      <SettingsContent />
    </MainLayout>
  );
}

function SettingsContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Fetch user settings
  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ["/api/user-settings"],
    retry: false,
  });

  // Form setup
  const form = useForm<InsertUserSettings>({
    resolver: zodResolver(insertUserSettingsSchema),
    defaultValues: {
      businessName: "",
      businessRegistration: "",
      businessAddress: "",
      businessPhone: "",
      businessEmail: "",
      businessWebsite: "",
      logoUrl: "",
      invoicePrefix: "INV",
      nextInvoiceNumber: 1,
      currency: "MYR",
      taxRate: "0.00",
      paymentTerms: "Payment due within 30 days",
      bankDetails: "",
      footerNotes: "",
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      const formData = {
        businessName: settings.businessName || "",
        businessRegistration: settings.businessRegistration || "",
        businessAddress: settings.businessAddress || "",
        businessPhone: settings.businessPhone || "",
        businessEmail: settings.businessEmail || "",
        businessWebsite: settings.businessWebsite || "",
        logoUrl: settings.logoUrl || "",
        invoicePrefix: settings.invoicePrefix || "INV",
        nextInvoiceNumber: settings.nextInvoiceNumber || 1,
        currency: settings.currency || "MYR",
        taxRate: settings.taxRate || "0.00",
        paymentTerms: settings.paymentTerms || "Payment due within 30 days",
        bankDetails: settings.bankDetails || "",
        footerNotes: settings.footerNotes || "",
      };
      
      console.log("Resetting form with:", formData);
      form.reset(formData);
      
      if (settings.logoUrl) {
        setLogoPreview(settings.logoUrl);
      }
    }
  }, [settings, form]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: InsertUserSettings) => {
      try {
        console.log("Attempting to save settings:", data);
        if (settings) {
          return await apiRequest("/api/user-settings", "PUT", data);
        } else {
          return await apiRequest("/api/user-settings", "POST", data);
        }
      } catch (error: any) {
        console.error("Error in mutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Settings saved successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/user-settings"] });
      toast({
        title: "Success",
        description: "Business settings saved successfully",
      });
    },
    onError: (error: any) => {
      console.error("Mutation error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  // Logo upload handlers
  const handleLogoGetUploadParameters = async () => {
    console.log("Getting upload parameters for logo...");
    setIsUploadingLogo(true);
    try {
      const data = await apiRequest("/api/objects/upload", "POST", {});
      console.log("Got upload URL for logo:", data.uploadURL);
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      console.error("Failed to get upload parameters for logo:", error);
      setIsUploadingLogo(false);
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Upload Error",
        description: "Failed to get upload URL. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleLogoUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      if (result.successful && result.successful.length > 0) {
        const uploadURL = result.successful[0].uploadURL;
        console.log("Logo upload successful, URL:", uploadURL);
        
        // Normalize the upload URL to the object path format
        try {
          const data = await apiRequest("/api/objects/normalize", "POST", { 
            uploadURL: uploadURL 
          });
          console.log("Logo normalized path:", data.objectPath);
          const objectPath = data.objectPath;
          
          // Update both preview and form
          setLogoPreview(objectPath.startsWith('/objects/') ? objectPath : `/objects/${objectPath}`);
          form.setValue("logoUrl", objectPath);
          
          toast({
            title: "Success",
            description: "Logo uploaded successfully!",
          });
        } catch (error) {
          console.error("Logo normalization failed:", error);
          // Fallback to the upload URL if normalization fails
          setLogoPreview(uploadURL || "");
          form.setValue("logoUrl", uploadURL || "");
          
          toast({
            title: "Success",
            description: "Logo uploaded successfully!",
          });
        }
      } else {
        toast({
          title: "Upload Failed",
          description: "No files were uploaded successfully.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Logo upload completion error:", error);
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized", 
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Upload Error",
        description: "Failed to process uploaded logo.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const onSubmit = async (data: InsertUserSettings) => {
    try {
      console.log("Form submitted with data:", data);
      console.log("Form errors:", form.formState.errors);
      console.log("Form is valid:", form.formState.isValid);
      
      // Check if form is valid before submitting
      if (!form.formState.isValid) {
        console.log("Form validation failed, not submitting");
        return;
      }
      
      // Validate required fields manually to prevent API errors
      if (!data.businessName || !data.businessAddress || !data.businessPhone || !data.businessEmail) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
      
      console.log("Calling mutation with valid data");
      saveSettingsMutation.mutate(data);
    } catch (error) {
      console.error("Submit error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Business Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your business information and invoice preferences
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <CardTitle>Business Information</CardTitle>
              </div>
              <CardDescription>
                Your company details that will appear on invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Your Business Name"
                          data-testid="input-business-name"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessRegistration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Registration Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="SSM Registration Number"
                          data-testid="input-business-registration"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Your SSM registration number (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="businessAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Address *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Street Address&#10;City, State, Postal Code&#10;Country"
                        className="min-h-[80px] resize-y"
                        data-testid="textarea-business-address"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="businessPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+60 12-345 6789"
                          data-testid="input-business-phone"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="info@yourbusiness.com"
                          data-testid="input-business-email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="businessWebsite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://www.yourbusiness.com"
                        data-testid="input-business-website"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Logo Upload Section */}
              <div className="space-y-2">
                <FormLabel>Business Logo</FormLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage 
                      src={logoPreview.startsWith('/objects/') ? logoPreview : `/objects/${logoPreview}`} 
                      alt="Business logo"
                      onError={(e) => {
                        console.error("Logo failed to load:", logoPreview);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <AvatarFallback>
                      <Image className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <ObjectUploader
                      key="logo-uploader"
                      maxNumberOfFiles={1}
                      maxFileSize={2097152} // 2MB
                      onGetUploadParameters={handleLogoGetUploadParameters}
                      onComplete={handleLogoUploadComplete}
                      buttonClassName="bg-my-blue hover:bg-my-blue/90 text-white"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {logoPreview ? "Change Logo" : "Upload Logo"}
                    </ObjectUploader>
                    <p className="text-sm text-muted-foreground">
                      Recommended: 200x200px, PNG or JPG, max 2MB
                    </p>
                    {logoPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLogoPreview("");
                          form.setValue("logoUrl", "");
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove Logo
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>Invoice Settings</CardTitle>
              </div>
              <CardDescription>
                Configure how your invoices are generated and formatted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="invoicePrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Prefix</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="INV"
                          data-testid="input-invoice-prefix"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Appears before invoice numbers
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nextInvoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Invoice Number</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="1"
                          data-testid="input-next-invoice-number"
                          {...field}
                          value={field.value || 1}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        Starting number for new invoices
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="MYR"
                          data-testid="input-currency"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Default currency code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="taxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Rate (%)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="6.00"
                        data-testid="input-tax-rate"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      GST/SST rate as decimal (e.g., 6.00 for 6%)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Payment Terms</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Payment due within 30 days"
                        data-testid="textarea-payment-terms"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Banking & Additional Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <CardTitle>Banking & Additional Information</CardTitle>
              </div>
              <CardDescription>
                Payment and additional details for invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="bankDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Bank Name: Your Bank&#10;Account Number: 123456789&#10;Account Name: Your Business Name"
                        className="min-h-[80px] resize-y"
                        data-testid="textarea-bank-details"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Banking information for customer payments
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="footerNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Footer Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Thank you for your business! For inquiries, please contact us."
                        data-testid="textarea-footer-notes"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Additional notes that appear at the bottom of invoices
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button 
              type="button"
              disabled={saveSettingsMutation.isPending}
              onClick={async (e) => {
                e.preventDefault();
                console.log("Save button clicked");
                
                try {
                  // Get clean form data
                  const formData = form.getValues();
                  console.log("Form data:", formData);
                  
                  // Clean the data to ensure no null values
                  const cleanData = {
                    businessName: formData.businessName || "",
                    businessRegistration: formData.businessRegistration || "",
                    businessAddress: formData.businessAddress || "",
                    businessPhone: formData.businessPhone || "",
                    businessEmail: formData.businessEmail || "",
                    businessWebsite: formData.businessWebsite || "",
                    logoUrl: formData.logoUrl || "",
                    invoicePrefix: formData.invoicePrefix || "INV",
                    nextInvoiceNumber: formData.nextInvoiceNumber || 1,
                    currency: formData.currency || "MYR",
                    taxRate: formData.taxRate || "0.00",
                    paymentTerms: formData.paymentTerms || "Payment due within 30 days",
                    bankDetails: formData.bankDetails || "",
                    footerNotes: formData.footerNotes || "",
                  };
                  
                  console.log("Clean data to submit:", cleanData);
                  saveSettingsMutation.mutate(cleanData);
                } catch (error) {
                  console.error("Button click error:", error);
                }
              }}
              data-testid="button-save-settings"
            >
              {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}