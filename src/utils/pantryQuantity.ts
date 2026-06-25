export function formatPantryQuantity(item: {
  quantity: number;
  unit?: string;
  name?: string;
}): string {
  const quantity = Number.isFinite(item.quantity) ? item.quantity : 1;
  const unit = item.unit?.trim();
  if (unit) {
    return quantity === 1 ? `1 ${unit}` : `${quantity} ${unit}`;
  }
  if (quantity === 1) return '1 unit';
  return `${quantity} units`;
}
