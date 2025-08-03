import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3, Users, Package, TrendingUp } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            SalesTracker Pro
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Comprehensive sales and inventory management system built for Malaysian businesses. 
            Track sales, manage products and customers, analyze performance metrics, and generate business insights.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-4"
            onClick={() => window.location.href = '/api/login'}
          >
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="h-12 flex items-center justify-center">Sales Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track revenue, profit margins, and sales performance with detailed analytics and reporting.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="h-12 flex items-center justify-center">Product Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage product catalog with SKU tracking, pricing, inventory levels, and product images.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="h-12 flex items-center justify-center">Customer Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Maintain comprehensive customer database with contact information and purchase history.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="h-12 flex items-center justify-center">Order Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track orders through complete workflow: Paid → Pending Shipment → Shipped → Completed.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Malaysian Business Focus */}
        <div className="text-center mb-16">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Built for Malaysian Businesses</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-lg">
                Designed with Malaysian business practices in mind, featuring MYR currency formatting, 
                local tax considerations, and interfaces optimized for the Malaysian market.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to streamline your business?
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Join thousands of Malaysian businesses already using SalesTracker Pro.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-4"
            onClick={() => window.location.href = '/api/login'}
          >
            Start Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}