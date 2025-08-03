export type OrderStatus = 'paid' | 'pending_shipment' | 'completed';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  paid: 'Paid',
  pending_shipment: 'Pending Shipment',
  completed: 'Completed',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  pending_shipment: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
};

export type NavigationItem = {
  name: string;
  href: string;
  icon: string;
  current?: boolean;
};
