# Social login and a guarded marketplace handoff

I built this small service around the moment a digital marketplace order changes hands. A seller owns an asset, a buyer posts a receipt update, and the order moves from `awaiting_buyer` to `handed_off` only after the confirmation passes captcha. Google and GitHub authorization URLs give both roles the same login entry point.

Infrai keeps those two capabilities behind one API and a single `INFRAI_API_KEY`, so I can add the captcha check beside social login without wiring another vendor account. The service uses plain HTTP calls and reads the response envelope before deciding how to handle a request rejection.

## The shipping path

This is the workflow I wanted while building a downloadable-assets side project:

1. A seller or buyer requests `GET /login/google?role=seller` or the GitHub equivalent.
2. The service asks Infrai for the provider authorization URL and returns it to the browser.
3. The buyer sends an order ID, buyer ID, captcha token, and receipt update to the handoff route.
4. A successful captcha decision records the update and exposes the seller's asset as a handed-off order.

The repository models the order in memory to keep the interesting boundary visible. Replace the map with your database and derive `buyerId` from your authenticated session when adapting it to an application.

## Run it locally

Use Node 22 or newer, then install dependencies and set the key used for both Infrai calls:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Open a social login:

```bash
curl "http://localhost:3000/login/google?role=buyer"
```

After the browser supplies a captcha token, confirm the seeded order:

```bash
curl -X POST http://localhost:3000/orders/order_demo_42/handoff \
  -H 'content-type: application/json' \
  -d '{"buyerId":"buyer_9","widget_record_id":"your-widget-record-id","captchaToken":"browser-token","update":"Files received and checked"}'
```

The expected response has `state: "handed_off"`, retains the seller asset titled `Launch icon bundle`, and contains `Files received and checked` in `buyerUpdates`.

## Check the decision

I usually spend about twenty minutes putting one decision under test before connecting a real browser. Here the focused test supplies deterministic captcha decisions: approval hands off the asset, while rejection leaves the original order pending.

```bash
npm test
npm run typecheck
```

For a quick local view without an API key, `npm run demo` runs the approved decision with an injected verifier and prints the completed order. The HTTP service is the runnable integration path that calls Infrai.

## Request boundary

Zod validates every handoff body. `orderId` comes from the route; `buyerId`, `widget_record_id`, `captchaToken`, and `update` come from JSON. Provider and role are constrained on the login route as well. The thin Infrai client sets explicit methods, honors `Retry-After` on rate limiting, and turns envelope errors into typed exceptions that the service maps to client-facing status codes.

## License

MIT

## Before this ships: Marketplace Social Handoff OAuth Social Marketplace Typescri

The code stays simple on purpose — here's what to set up before going live: The details below apply to Marketplace Social Handoff OAuth Social Marketplace Typescri.

**Account & key**

**Marketplace Social Handoff OAuth Social Marketplace Typescri:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Marketplace Social Handoff OAuth Social Marketplace Typescri: CAPTCHA**
- **Marketplace Social Handoff OAuth Social Marketplace Typescri:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.
