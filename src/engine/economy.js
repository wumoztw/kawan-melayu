export const COMPLAINT_THRESHOLD = 0.3;
export function setPrice(state, productId, price, referencePrice) {
  if (!Number.isFinite(price) || price < 0) throw new Error('Price must be non-negative');
  const complained = Number.isFinite(referencePrice) && price > referencePrice * (1 + COMPLAINT_THRESHOLD);
  return { state: { ...state, prices: { ...state.prices, [productId]: price } }, complained };
}
export function restock(state, productId, quantity, unitCost) {
  if (!Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(unitCost) || unitCost < 0) throw new Error('Invalid restock');
  const cost = quantity * unitCost;
  const next = { ...state, cash: state.cash - cost, inventory: { ...state.inventory, [productId]: (state.inventory[productId] || 0) + quantity } };
  return ensureRelief(next, { type: 'restock', cost, productId, quantity });
}
export function sell(state, productId, quantity = 1, unitPrice = state.prices[productId]) {
  if (!Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Invalid sale');
  const sold = Math.min(quantity, state.inventory[productId] || 0);
  const revenue = sold * unitPrice;
  const next = { ...state, cash: state.cash + revenue, inventory: { ...state.inventory, [productId]: (state.inventory[productId] || 0) - sold } };
  return { ...ensureRelief(next, { type: 'sale', productId, quantity: sold, revenue }), revenue, sold };
}
export function calculateRevenue(sales = []) { return sales.reduce((sum, sale) => sum + (sale.quantity || 0) * (sale.unitPrice || 0), 0); }
export function ensureRelief(state, event = {}) {
  if (state.cash >= 0) return { ...state, events: [...(state.events || []), event] };
  const loan = Math.ceil(-state.cash) + 20;
  return { ...state, cash: state.cash + loan, events: [...(state.events || []), event, { type: 'relief-loan', lender: 'Pak Cik Hamid', amount: loan }] };
}
export function closeDay(state, sales = []) {
  const revenue = calculateRevenue(sales);
  const expenses = sales.reduce((sum, sale) => sum + (sale.quantity || 0) * (sale.unitCost || 0), 0);
  const result = ensureRelief({ ...state, cash: state.cash + revenue - expenses }, { type: 'close', revenue, expenses });
  return { ...result, revenue, expenses, profit: revenue - expenses };
}
