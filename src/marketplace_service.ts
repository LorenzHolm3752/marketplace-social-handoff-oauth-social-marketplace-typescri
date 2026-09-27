import express from "express";
import { z } from "zod";
import {
  createSocialAuthorizeUrl,
  InfraiError,
  verifyCaptcha,
} from "./infrai_auth.js";
import {
  handoffBody,
  handOffOrder,
  HandoffRejected,
  type MarketplaceOrder,
} from "./order_handoff.js";

const app = express();
app.use(express.json());

const loginParams = z.object({ provider: z.enum(["google", "github"]) });
const loginQuery = z.object({ role: z.enum(["seller", "buyer"]) });
const orders = new Map<string, MarketplaceOrder>([
  [
    "order_demo_42",
    {
      id: "order_demo_42",
      sellerId: "seller_7",
      buyerId: "buyer_9",
      asset: {
        title: "Launch icon bundle",
        downloadUrl: "https://downloads.example.test/orders/order_demo_42",
      },
      buyerUpdates: [],
      state: "awaiting_buyer",
    },
  ],
]);

app.get("/login/:provider", async (request, response, next) => {
  try {
    const { provider } = loginParams.parse(request.params);
    const { role } = loginQuery.parse(request.query);
    const origin = `${request.protocol}://${request.get("host")}`;
    const result = await createSocialAuthorizeUrl(
      provider,
      `${origin}/dashboard/${role}`,
      `${origin}/oauth/callback`,
    );
    response.json({ provider, role, authorizationUrl: result.authorization_url });
  } catch (error) {
    next(error);
  }
});

app.post("/orders/:orderId/handoff", async (request, response, next) => {
  try {
    const input = handoffBody.parse({ ...request.body, orderId: request.params.orderId });
    const order = orders.get(input.orderId);
    if (!order) throw new HandoffRejected(404, "Order was not found");
    const handedOff = await handOffOrder(order, input, verifyCaptcha);
    orders.set(handedOff.id, handedOff);
    response.json(handedOff);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    response.status(400).json({ error: "Invalid request", issues: error.issues });
    return;
  }
  if (error instanceof HandoffRejected) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof InfraiError) {
    const status = error.status >= 400 && error.status < 500 ? error.status : 502;
    response.status(status).json({ error: error.code, message: error.message });
    return;
  }
  response.status(500).json({ error: "Unexpected service error" });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Marketplace service listening on http://localhost:${port}`));
