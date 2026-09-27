import { z } from "zod";

export const handoffBody = z.object({
  orderId: z.string().min(1),
  buyerId: z.string().min(1),
  widget_record_id: z.string().min(1),
  captchaToken: z.string().min(1),
  update: z.string().min(1).max(500),
});

export type HandoffInput = z.infer<typeof handoffBody>;

export type MarketplaceOrder = {
  id: string;
  sellerId: string;
  buyerId: string;
  asset: { title: string; downloadUrl: string };
  buyerUpdates: string[];
  state: "awaiting_buyer" | "handed_off";
};

export type CaptchaVerifier = (input: {
  widget_record_id: string;
  token: string;
  action: string;
  score_threshold: number;
}) => Promise<{ verified: boolean }>;

export class HandoffRejected extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function handOffOrder(
  order: MarketplaceOrder,
  input: HandoffInput,
  verify: CaptchaVerifier,
): Promise<MarketplaceOrder> {
  if (order.id !== input.orderId || order.buyerId !== input.buyerId) {
    throw new HandoffRejected(403, "This buyer cannot receive the order");
  }
  if (order.state !== "awaiting_buyer") {
    throw new HandoffRejected(409, "Order has already been handed off");
  }

  const captcha = await verify({
    widget_record_id: input.widget_record_id,
    token: input.captchaToken,
    action: "marketplace_order_handoff",
    score_threshold: 0.7,
  });
  if (!captcha.verified) {
    throw new HandoffRejected(422, "Buyer confirmation was rejected");
  }

  return {
    ...order,
    buyerUpdates: [...order.buyerUpdates, input.update],
    state: "handed_off",
  };
}
