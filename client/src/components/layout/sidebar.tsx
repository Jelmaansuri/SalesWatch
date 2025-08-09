import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { NavigationItem } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/hooks/use-sidebar";
import { 
  ChartPie, 
  TrendingUp, 
  Package, 
  Users, 
  ClipboardList, 
  FileText,
  Sprout,
  MapPin,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: "ChartPie" },
  { name: "Sales Tracking", href: "/sales", icon: "TrendingUp" },
  { name: "Product Management", href: "/products", icon: "Package" },
  { name: "CRM & Customers", href: "/customers", icon: "Users" },
  { name: "Order Management", href: "/orders", icon: "ClipboardList" },
  { name: "Invoice Management", href: "/invoices", icon: "Receipt" },
  { name: "Reports & Analytics", href: "/reports", icon: "FileText" },
  { name: "Plot Management", href: "/plots", icon: "MapPin" },
  { name: "Business Settings", href: "/settings", icon: "Settings" },
];

const iconMap = {
  ChartPie,
  TrendingUp,
  Package,
  Users,
  ClipboardList,
  FileText,
  MapPin,
  Receipt,
  Settings,
};

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <div className={cn(
      "flex flex-col bg-white dark:bg-gray-900 shadow-lg transition-all duration-300 ease-in-out relative",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 bg-green-600 relative">
        <Sprout className="h-6 w-6 text-white flex-shrink-0" />
        {!isCollapsed && (
          <h1 className="text-lg font-bold text-white ml-2 truncate">PROGENY AGROTECH</h1>
        )}
        
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 h-6 w-6 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-md z-10"
          data-testid="button-toggle-sidebar"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-gray-600 dark:text-gray-300" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-gray-600 dark:text-gray-300" />
          )}
        </Button>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];
          const isActive = location === item.href;
          
          const navItem = (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center px-2 py-2 text-sm font-medium rounded-md group transition-colors cursor-pointer",
                  isActive
                    ? "text-white bg-my-blue"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="ml-3 truncate">{item.name}</span>
                )}
              </div>
            </Link>
          );

          // If collapsed, wrap in tooltip
          if (isCollapsed) {
            return (
              <Tooltip key={item.name} delayDuration={100}>
                <TooltipTrigger asChild>
                  {navItem}
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  {item.name}
                </TooltipContent>
              </Tooltip>
            );
          }

          return navItem;
        })}
      </nav>
      
      {/* User Profile */}
      <div className="flex items-center p-4 border-t dark:border-gray-700">
        {user?.profileImageUrl ? (
          <img 
            src={user.profileImageUrl} 
            alt="Profile" 
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-my-blue text-white text-sm font-medium">
            {user?.firstName ? user.firstName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
        <div className="ml-3">
          <p className="text-sm font-medium">
            {user?.firstName && user?.lastName 
              ? `${user.firstName} ${user.lastName}`
              : user?.firstName 
              ? user.firstName
              : user?.email?.split('@')[0] || 'User'
            }
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Business Manager</p>
        </div>
      </div>
    </div>
  );
}
