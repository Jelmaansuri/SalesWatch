import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3, Users, Package, TrendingUp, Sprout, Truck, MapPin } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Sprout className="h-12 w-12 text-green-600 dark:text-green-400 mr-4" />
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white">
              PROGENY AGROTECH
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-4 max-w-3xl mx-auto">
            Premium Fresh Young Ginger Farming & Distribution
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Cultivating the finest quality young ginger with sustainable farming practices. 
            From farm to table, delivering fresh, organic ginger products across Malaysia.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-4 bg-green-600 hover:bg-green-700"
            onClick={() => window.location.href = '/api/login'}
          >
            Access Farm Management System <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Company Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4">
                <Sprout className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="h-12 flex items-center justify-center">Premium Ginger</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Cultivating fresh young ginger with sustainable farming methods and organic practices.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="h-12 flex items-center justify-center">Quality Assurance</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Rigorous quality control from harvest to packaging, ensuring the freshest ginger products.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center mb-4">
                <Truck className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="h-12 flex items-center justify-center">Fresh Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Efficient distribution network ensuring fresh ginger reaches customers within 24-48 hours.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="h-12 flex items-center justify-center">Local Sourcing</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Supporting local Malaysian agriculture with farm-to-market traceability and transparency.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Company Mission */}
        <div className="text-center mb-16">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-lg">
                Dedicated to producing the highest quality fresh young ginger through sustainable farming practices. 
                We provide premium agricultural products that support healthy living and local communities across Malaysia.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Contact Information */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Contact PROGENY AGROTECH
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            For wholesale inquiries, partnership opportunities, or farm visits, please get in touch.
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="font-semibold mb-2">Business Hours</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Monday - Friday: 8:00 AM - 6:00 PM<br />
                    Saturday: 8:00 AM - 2:00 PM<br />
                    Sunday: Closed
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="font-semibold mb-2">Farm Location</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Fresh Ginger Cultivation<br />
                    Sustainable Agriculture Zone<br />
                    Malaysia
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="font-semibold mb-2">Products</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Fresh Young Ginger<br />
                    Organic Ginger Products<br />
                    Wholesale & Retail
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          <Button 
            size="lg" 
            className="text-lg px-8 py-4 bg-green-600 hover:bg-green-700"
            onClick={() => window.location.href = '/api/login'}
          >
            Access Internal Management System <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}