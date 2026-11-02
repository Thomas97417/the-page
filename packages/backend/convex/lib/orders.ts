import type { Order } from "@polar-sh/sdk/models/components/order.js";

export function normalizePaidOrder(order: Order) {
  if (
    !order.paid ||
    !order.checkoutId ||
    typeof order.metadata.purchaseId !== "string"
  )
    return null;
  return {
    id: order.id,
    checkoutId: order.checkoutId,
    purchaseId: order.metadata.purchaseId,
    userId: order.customer.externalId ?? "",
    productId: order.productId ?? "",
    amount: order.totalAmount,
    currency: order.currency,
    refundedAmount: order.refundedAmount + order.refundedTaxAmount,
  };
}
