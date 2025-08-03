import { Search, Bell, Moon, Sun, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/use-theme";

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-700">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="ml-4 text-lg font-semibold">{title}</h2>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Input
            type="text"
            placeholder="Search..."
            className="w-64 pl-10"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        </div>
        
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        
        {/* Notifications */}
        <Button
          variant="ghost"
          size="sm"
          className="relative text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-my-red rounded-full"></span>
        </Button>
      </div>
    </header>
  );
}
