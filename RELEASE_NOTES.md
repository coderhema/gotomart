# Release Notes

## v0.1.1 — Purchase path, Airtable/BACHs fixes, WhatsApp deploy docs

**Date:** 2026-09-29  
**Git:** `e6b8206` on `main`  
**Repo:** https://github.com/coderhema/gotomart

### Summary

Hardens the WhatsApp-native buy flow from vendor discovery through order creation and BACHs checkout, with Airtable as the system of record. Adds an automated purchase-path test and production-oriented WhatsApp deployment documentation.

### User-facing

- Buyers can still message the linked WhatsApp bot to find local vendors (e.g. rice in Ikorodu).
- Orders are stored in Airtable with PIN and `pending` status before payment.
- Checkout links open BACHs sandbox/production checkout (`checkout_url`).

### Technical changes

- **Orders (`orderService.js`)** — Writes schema-correct fields: `Reference`, `BuyerPhone`, `VendorId`, `VendorPhone`, `Item`, `Quantity` (text), `Price`, `Pin`, `Status`. Removed invalid field-name retry noise.
- **Payments (`paymentService.js`)** — Replaces Paystack-centric helper; uses `BACHS_PRODUCT_ID`, returns `checkout_url`, falls back to ad-hoc `pricing` when product cart fails.
- **Env** — `.env.example` documents `BACHS_PRODUCT_ID`, Tinyfish key, table names.
- **Security/hygiene** — `baileys_auth/` gitignored; do not commit WhatsApp session material.
- **Commerce stack** — Includes commerce engine, payment UX helpers, product intelligence modules shipped with this line of work.
- **Tests** — `tests/test_purchase_flow.js` covers session → vendor search → order create → checkout URL → Airtable verify.
- **Docs**
  - `WHATSAPP_DEPLOYMENT.md` — full deploy (always-on host, env, webhooks, pm2, checklist)
  - `BAILEYS_SETUP.md` — quick QR/local guide + pointer to full deploy doc

### Verification

```bash
npm install
npm start
node tests/test_purchase_flow.js
```

Expected E2E outcomes (sandbox):

- ≥1 vendor returned for sample query (`rice 50kg bag` / `Ikorodu`)
- Order row in Airtable `Orders` with `Status=pending`
- BACHs URL under `https://sandbox-checkout.bachs.io/...`

### Deploy notes

1. Run the bot on an **always-on Node host** (Baileys is not serverless-friendly).
2. Configure Airtable, BACHs, Cerebras (and optional Meta/Twilio) via `.env`.
3. Create a BACHs product once; set `BACHS_PRODUCT_ID`.
4. Point BACHs webhooks to `POST {BASE_URL}/webhook`.
5. Persist and back up `baileys_auth/` privately; never push it.

### Known limitations

- Changes landed directly on `main` (no separate PR for this cut).
- Automated test does not drive a live WhatsApp client UI; Baileys still requires a linked device for real chat.
- Full paid-webhook → vendor payout path is implemented but not fully covered by `test_purchase_flow.js`.
- BACHs catalog product uses a fixed list price unless pricing fallback is used—tune product strategy for multi-price catalogs.

### Upgrade / ops checklist

- [ ] Pull `main` @ `e6b8206` or later
- [ ] Add `BACHS_PRODUCT_ID` to deployment secrets
- [ ] Confirm Airtable `Quantity` is single-line text
- [ ] Rotate any keys that were exposed in local logs/shell history if applicable
- [ ] Re-scan Baileys QR only if session invalid after host migrate

### Related paths

| Path | Role |
|------|------|
| `src/services/orderService.js` | Order Airtable CRUD |
| `src/services/paymentService.js` | BACHs checkout / payouts |
| `src/services/twilioService.js` | Baileys WhatsApp transport |
| `tests/test_purchase_flow.js` | E2E purchase path |
| `WHATSAPP_DEPLOYMENT.md` | Deploy runbook |
| `BAILEYS_SETUP.md` | Local WhatsApp link guide |

---

*Archived release record for the 2026-09-29 purchase-path delivery.*
