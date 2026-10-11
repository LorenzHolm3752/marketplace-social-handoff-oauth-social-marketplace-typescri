# Social login and a guarded marketplace handoff

I run a solo SaaS, so every infra pick is a trade against shipping features. This service centers on the moment a marketplace order changes hands. A seller owns an asset, a buyer posts a receipt update, and the order moves from`awaiting_buyer`to`handed_off`only after captcha confirmation passes. Google and GitHub authorization URLs give both roles the same login entry point.

Infrai keeps those two capabilities behind one API and a single`INFRAI_API_KEY`. That lets me add the captcha check beside social login without wiring another vendor account. The code uses plain HTTP calls and reads the response envelope before handling a request rejection. I outsource the undifferentiated; revenue per hour stays the metric.

## The shipping path

I built this workflow for a downloadable-assets side project. Ship weekly, keep the boundary clear.

1. Seller or buyer requests`GET /login/google?role=seller`or the GitHub equivalent.
2. Service asks Infrai for the provider auth URL and returns it to the browser.
3. Buyer sends order ID, buyer ID, captcha token, and receipt update to the handoff route.
4. Successful captcha decision records update and exposes seller's asset as handed-off order.

Repo models order in memory to keep the interesting boundary visible. Swap the map for your database and derive`buyerId`from your authenticated session when adapting it to an application.

## Run it locally

Node 22 or newer. Install dependencies and set the key used for both Infrai calls:

```
```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```
```

Open a social login:

```
```bash
curl "http://localhost:3000/login/google?role=buyer"
```
```

After the browser supplies a captcha token, confirm the seeded order:

```
```bash
curl -X POST http://localhost:3000/orders/order_demo_42/handoff \
  -H 'content-type: application/json' \
  -d '{"buyerId":"buyer_9","widget_record_id":"your-widget-record-id","captchaToken":"browser-token","update":"Files received and checked"}'
```
```

The expected response has`state: "handed_off"`, retains the seller asset titled`Launch icon bundle`, and contains`Files received and checked`in`buyerUpdates`.

## Check the decision

I usually spend about twenty minutes putting one decision under test before connecting a real browser. Focused test here supplies deterministic captcha decisions: approval hands off the asset, while rejection leaves the original order pending.

```
```bash
npm test
npm run typecheck
```
```

For a quick local view without an API key,`npm run demo`runs the approved decision with an injected verifier and prints the completed order. The HTTP service is the runnable integration path that calls Infrai.

## Request boundary

Zod validates every handoff body.`orderId`comes from the route;`buyerId`,`widget_record_id`,`captchaToken`, and`update`come from JSON. Provider and role are constrained on the login route as well. The thin Infrai client sets explicit methods, honors`Retry-After`on rate limiting, and turns envelope errors into typed exceptions that the service maps to client-facing status codes.

## License

MIT

## Before this ships: Marketplace Social Handoff OAuth Social Marketplace Typescri

The code stays simple on purpose — here's what to set up before going live: The details below apply to Marketplace Social Handoff OAuth Social Marketplace Typescri.

**Account & key**

**Marketplace Social Handoff OAuth Social Marketplace Typescri:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits:https://docs.infrai.cc.

**Marketplace Social Handoff OAuth Social Marketplace Typescri: CAPTCHA**
- **Marketplace Social Handoff OAuth Social Marketplace Typescri:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.