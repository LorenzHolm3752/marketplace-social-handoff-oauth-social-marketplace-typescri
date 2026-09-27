import { handOffOrder, type MarketplaceOrder } from "./order_handoff.js";

const order: MarketplaceOrder = {
  id: "order_demo_42",
  sellerId: "seller_7",
  buyerId: "buyer_9",
  asset: {
    title: "Launch icon bundle",
    downloadUrl: "https://downloads.example.test/orders/order_demo_42",
  },
  buyerUpdates: [],
  state: "awaiting_buyer",
};

const result = await handOffOrder(
  order,
  {
    orderId: order.id,
    buyerId: order.buyerId,
    widget_record_id: "demo-widget-record",
    captchaToken: "demo-browser-token",
    update: "Files received and checked",
  },
  async () => ({ verified: true }),
);

console.log(JSON.stringify(result, null, 2));
