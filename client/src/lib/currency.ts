export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount).replace('MYR', 'RM');
}

export function formatNumber(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-MY').format(numValue);
}

export function calculateProfit(sellingPrice: number, costPrice: number, quantity: number = 1): number {
  return (sellingPrice - costPrice) * quantity;
}

export function calculateProfitMargin(sellingPrice: number, costPrice: number): number {
  if (sellingPrice === 0) return 0;
  return ((sellingPrice - costPrice) / sellingPrice) * 100;
}
