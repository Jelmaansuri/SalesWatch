import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { NavigationItem } from "@/lib/types";
import { 
  ChartPie, 
  TrendingUp, 
  Package, 
  Users, 
  ClipboardList, 
  FileText,
  Sprout
} from "lucide-react";

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: "ChartPie" },
  { name: "Sales Tracking", href: "/sales", icon: "TrendingUp" },
  { name: "Product Management", href: "/products", icon: "Package" },
  { name: "CRM & Customers", href: "/customers", icon: "Users" },
  { name: "Order Management", href: "/orders", icon: "ClipboardList" },
  { name: "Reports & Analytics", href: "/reports", icon: "FileText" },
];

const iconMap = {
  ChartPie,
  TrendingUp,
  Package,
  Users,
  ClipboardList,
  FileText,
};

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();

  return (
    <div className={cn("flex flex-col w-64 bg-white dark:bg-gray-900 shadow-lg", className)}>
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 bg-green-600">
        <Sprout className="h-6 w-6 text-white mr-2" />
        <h1 className="text-lg font-bold text-white">PROGENY AGROTECH</h1>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const isActive = location === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <a
                className={cn(
                  "flex items-center px-2 py-2 text-sm font-medium rounded-md group transition-colors",
                  isActive
                    ? "text-white bg-my-blue"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
              </a>
            </Link>
          );
        })}
      </nav>
      
      {/* User Profile - Removed hardcoded data for production */}
      <div className="flex items-center p-4 border-t dark:border-gray-700">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-my-blue text-white text-sm font-medium">
          U
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">User</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Business Manager</p>
        </div>
      </div>
    </div>
  );
}
