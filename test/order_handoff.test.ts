import assert from "node:assert/strict";
import test from "node:test";
import {
  handOffOrder,
  HandoffRejected,
  type MarketplaceOrder,
} from "../src/order_handoff.js";

function pendingOrder(): MarketplaceOrder {
  return {
    id: "order_12",
    sellerId: "seller_4",
    buyerId: "buyer_8",
    asset: { title: "Invoice templates", downloadUrl: "https://example.test/order_12" },
    buyerUpdates: [],
    state: "awaiting_buyer",
  };
}

test("hands seller assets to the matching buyer after captcha approval", async () => {
  const result = await handOffOrder(
    pendingOrder(),
    { orderId: "order_12", buyerId: "buyer_8", widget_record_id: "widget_1", captchaToken: "approved", update: "Downloaded" },
    async (captcha) => {
      assert.equal(captcha.widget_record_id, "widget_1");
      return { verified: true };
    },
  );

  assert.equal(result.state, "handed_off");
  assert.deepEqual(result.buyerUpdates, ["Downloaded"]);
  assert.equal(result.asset.title, "Invoice templates");
});

test("keeps the order pending when captcha rejects the confirmation", async () => {
  const order = pendingOrder();
  await assert.rejects(
    handOffOrder(
      order,
      { orderId: "order_12", buyerId: "buyer_8", widget_record_id: "widget_1", captchaToken: "rejected", update: "Downloaded" },
      async () => ({ verified: false }),
    ),
    (error: unknown) => error instanceof HandoffRejected && error.status === 422,
  );
  assert.equal(order.state, "awaiting_buyer");
  assert.deepEqual(order.buyerUpdates, []);
});
