import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  X,
  RefreshCw
} from "lucide-react";

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  sortFn?: (a: T, b: T) => number;
  filterOptions?: Array<{ value: string; label: string }>;
  accessor?: (item: T) => any;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

interface EnhancedDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  defaultSortKey?: string;
  defaultSortOrder?: "asc" | "desc";
  title?: string;
  description?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  actions?: React.ReactNode;
  filters?: FilterConfig[];
  globalSearch?: boolean;
  emptyMessage?: string;
  className?: string;
  testIdPrefix?: string;
}

type SortOrder = "asc" | "desc" | null;

export function EnhancedDataTable<T extends Record<string, any>>({
  data,
  columns,
  searchPlaceholder = "Search...",
  defaultSortKey,
  defaultSortOrder = "desc", // Latest on top by default
  title,
  description,
  isLoading = false,
  onRefresh,
  actions,
  filters = [],
  globalSearch = true,
  emptyMessage = "No data available",
  className = "",
  testIdPrefix = "table"
}: EnhancedDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Handle sorting
  const handleSort = (columnKey: string) => {
    if (sortKey === columnKey) {
      setSortOrder(sortOrder === "asc" ? "desc" : sortOrder === "desc" ? null : "asc");
      if (sortOrder === "desc") {
        setSortKey(null);
      }
    } else {
      setSortKey(columnKey);
      setSortOrder("asc");
    }
  };

  // Get sort icon
  const getSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="h-4 w-4" />;
    if (sortOrder === "asc") return <ArrowUp className="h-4 w-4" />;
    if (sortOrder === "desc") return <ArrowDown className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm && globalSearch) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((item) => {
        return columns.some((column) => {
          if (!column.searchable) return false;
          const value = column.accessor ? column.accessor(item) : item[column.key];
          return String(value || "").toLowerCase().includes(searchLower);
        });
      });
    }

    // Apply column filters
    Object.entries(activeFilters).forEach(([filterKey, filterValue]) => {
      if (filterValue && filterValue !== "all") {
        filtered = filtered.filter((item) => {
          const column = columns.find(col => col.key === filterKey);
          const value = column?.accessor ? column.accessor(item) : item[filterKey];
          return String(value) === filterValue;
        });
      }
    });

    // Apply sorting
    if (sortKey && sortOrder) {
      const column = columns.find(col => col.key === sortKey);
      if (column?.sortFn) {
        filtered.sort(column.sortFn);
        if (sortOrder === "desc") filtered.reverse();
      } else {
        filtered.sort((a, b) => {
          const aValue = column?.accessor ? column.accessor(a) : a[sortKey];
          const bValue = column?.accessor ? column.accessor(b) : b[sortKey];
          
          // Handle dates
          if (aValue instanceof Date && bValue instanceof Date) {
            return sortOrder === "asc" 
              ? aValue.getTime() - bValue.getTime()
              : bValue.getTime() - aValue.getTime();
          }
          
          // Handle date strings
          if (typeof aValue === "string" && typeof bValue === "string") {
            const aDate = new Date(aValue);
            const bDate = new Date(bValue);
            if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
              return sortOrder === "asc" 
                ? aDate.getTime() - bDate.getTime()
                : bDate.getTime() - aDate.getTime();
            }
          }
          
          // Handle numbers
          if (typeof aValue === "number" && typeof bValue === "number") {
            return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
          }
          
          // Handle strings
          const aStr = String(aValue || "").toLowerCase();
          const bStr = String(bValue || "").toLowerCase();
          if (sortOrder === "asc") {
            return aStr.localeCompare(bStr);
          } else {
            return bStr.localeCompare(aStr);
          }
        });
      }
    }

    return filtered;
  }, [data, searchTerm, sortKey, sortOrder, activeFilters, columns, globalSearch]);

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setActiveFilters({});
    setSortKey(defaultSortKey || null);
    setSortOrder(defaultSortOrder);
  };

  const hasActiveFilters = searchTerm || Object.values(activeFilters).some(v => v && v !== "all") || sortKey;

  const TableContent = (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className="font-medium">
              {column.sortable ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 data-[state=open]:bg-accent font-medium"
                  onClick={() => handleSort(column.key)}
                  data-testid={`${testIdPrefix}-sort-${column.key}`}
                >
                  {column.label}
                  {getSortIcon(column.key)}
                </Button>
              ) : (
                column.label
              )}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              <div className="flex items-center justify-center">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </div>
            </TableCell>
          </TableRow>
        ) : processedData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              {hasActiveFilters ? "No results found with current filters" : emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          processedData.map((item, index) => (
            <TableRow key={item.id || index} data-testid={`${testIdPrefix}-row-${index}`}>
              {columns.map((column) => {
                const value = column.accessor ? column.accessor(item) : item[column.key];
                return (
                  <TableCell key={column.key} data-testid={`${testIdPrefix}-cell-${column.key}-${index}`}>
                    {column.render ? column.render(value, item) : String(value || "")}
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (title || description || actions || globalSearch || filters.length > 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              {title && <CardTitle data-testid={`${testIdPrefix}-title`}>{title}</CardTitle>}
              {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            </div>
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  data-testid={`${testIdPrefix}-refresh`}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              {actions}
            </div>
          </div>
          
          {/* Search and Filters */}
          {(globalSearch || filters.length > 0) && (
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              {globalSearch && (
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={searchPlaceholder}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                      data-testid={`${testIdPrefix}-search`}
                    />
                  </div>
                </div>
              )}
              
              {filters.map((filter) => (
                <Select
                  key={filter.key}
                  value={activeFilters[filter.key] || "all"}
                  onValueChange={(value) => {
                    setActiveFilters(prev => ({
                      ...prev,
                      [filter.key]: value
                    }));
                  }}
                >
                  <SelectTrigger className="w-[180px]" data-testid={`${testIdPrefix}-filter-${filter.key}`}>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {filter.label}</SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
              
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  data-testid={`${testIdPrefix}-clear-filters`}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          )}
          
          {/* Filter summary */}
          {processedData.length !== data.length && data.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {processedData.length} of {data.length} {title ? title.toLowerCase() : "items"}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {TableContent}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {TableContent}
    </div>
  );
}