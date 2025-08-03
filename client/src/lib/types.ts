export type OrderStatus = 'unpaid' | 'paid' | 'pending_shipment' | 'shipped' | 'completed';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  pending_shipment: 'Pending Shipment',
  shipped: 'Shipped',
  completed: 'Completed',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  unpaid: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  pending_shipment: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  shipped: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
};

export type NavigationItem = {
  name: string;
  href: string;
  icon: string;
  current?: boolean;
};
