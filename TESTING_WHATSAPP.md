# How to Test GoToMart on WhatsApp

This is the practical buyer path: link the bot, chat like a real user, confirm Airtable + payment.

## Before you start

1. Copy env and fill secrets:
   ```bash
   cp .env.example .env
   ```
   You need at least: `AIRTABLE_*`, `BACHS_API_KEY`, `BACHS_PRODUCT_ID`, `CEREBRAS_API_KEY`.

2. Confirm Airtable has sample vendors (e.g. rice in Ikorodu).

3. Prefer a **spare** WhatsApp number for the bot.

4. Install and start the server on a machine that can stay online:
   ```bash
   npm install
   npm start
   ```

---

## Annotated golden path checklist

Use this as the demo scorecard. Each step has **you send**, **expected shape**, **PASS**, **FAIL**, and **fix**.

### G0 - Server and link ready

| | |
|--|--|
| **You do** | `npm start`, scan QR if shown |
| **Expected logs** | Baileys connects; no endless QR loop. Health: `curl http://localhost:3000/` succeeds |
| **PASS** | Socket connected once; process stays up |
| **FAIL** | QR repeats every few seconds, or port crash (`EADDRINUSE`) |
| **Fix** | One bot instance only. Free port 3000 or set `PORT`. Relink only if session is dead |

### G1 - Greeting

| | |
|--|--|
| **You send** | `hi` or `hello` |
| **Expected reply shape** | Mentions **GoToMart**, shopping assistant tone, offers help. Example family: |
| | `Hello! I'm your GoToMart shopping assistant...` |
| | or `Welcome to GoToMart - your AI marketplace assistant!` |
| **PASS** | Reply arrives < ~10s, brand name present, not an error dump |
| **FAIL** | No reply, or generic crash text |
| **Fix** | Check `[BAILEYS] Received` in logs; confirm linked device; restart server |

### G2 - Help (optional)

| | |
|--|--|
| **You send** | `help` |
| **Expected reply shape** | Capability menu, roughly: |
| | Shopping example: `I need 50kg rice in Lagos` |
| | Sell example: `I want to sell beans` |
| | Select vendor: reply `1`, `2`, `3`... |
| | Pay: use the payment link the bot sends |
| **PASS** | Buy + sell + select guidance all present |
| **FAIL** | Empty or off-topic essay with no buy/sell cues |
| **Fix** | Router/persona path; check Cerebras key if LLM path is required for help |

### G3 - Vendor search (core)

| | |
|--|--|
| **You send** | `I need rice in Ikorodu` |
| **Expected reply shape** | Numbered shortlist from Airtable, each line roughly: |
| | `1. Iya Basira Foods` |
| | `   ₦45,000 • Ikorodu ✅` (checkmark if verified) |
| | `2. Ikorodu Grains Hub` |
| | `   ₦46,500 • Ikorodu ✅` |
| | `3. Quick Rice Depot` |
| | `   ₦44,000 • Ikorodu` |
| | Interactive list/buttons may appear instead of plain text; same data must show. |
| **PASS** | At least **1** vendor; each has **name + price + location**; numbers 1..n |
| **FAIL** | "No vendors", empty list, or prices missing |
| **Fix** | Seed Vendors table; item/location text must match (`rice`, `Ikorodu`). See recovery section |

### G3b - Clarifying question branch (not a failure)

If the bot asks for missing info instead of listing vendors:

```text
                  send buy intent
                        |
            +-----------+-----------+
            |                       |
     has item+location        missing piece
            |                       |
      vendor shortlist        bot asks e.g.
            |                 "where?" / "what item?"
            v                       |
         continue G4          you reply with the missing
                                    field, then expect G3
```

| Bot asks | You reply | Then expect |
|----------|-----------|-------------|
| Location only | `Ikorodu` | Vendor shortlist (G3) |
| Item only | `rice` or `rice 50kg bag` | Vendor shortlist (G3) |
| Both unclear | `I need rice in Ikorodu` | Vendor shortlist (G3) |

**PASS:** After one clarifying turn, shortlist appears.  
**FAIL:** Loop of questions with no search after clear item+location.

### G4 - Select vendor

| | |
|--|--|
| **You send** | `1` (or tap first list row / button) |
| **Expected reply shape** | Selection confirmation, roughly: |
| | `Selected: Iya Basira Foods` |
| | `rice 50kg bag` (or item text) |
| | `₦45,000` |
| | `Ikorodu` |
| | Then checkout/payment CTA (link, Pay button, or "confirm to pay") |
| **PASS** | Named vendor matches #1 from list; price shown; path toward pay continues |
| **FAIL** | Ignores number, re-lists forever, or selects wrong vendor with no way to pay |
| **Fix** | Ensure session still active; send `1` soon after the list; check `session.lastVendors` path in logs |

### G5 - Checkout / payment link

| | |
|--|--|
| **You do** | Follow bot CTA (open link or confirm pay) |
| **Expected reply shape** | Message includes a BACHs URL, e.g. |
| | `https://sandbox-checkout.bachs.io/c/...` |
| | Amount should match selected vendor price when shown |
| **PASS** | Link opens BACHs checkout page (sandbox or prod) |
| **FAIL** | No link; broken URL; product-not-found style error in logs |
| **Fix** | Set `BACHS_PRODUCT_ID`; valid `BACHS_API_KEY`; see `paymentService` logs for `checkout_url` |

### G6 - Order row in Airtable (before or right after checkout)

| | |
|--|--|
| **You do** | Open Airtable -> **Orders** -> newest row for your buyer phone |
| **Expected fields** | |
| | `Reference` present |
| | `BuyerPhone` = your WhatsApp number (normalized) |
| | `Item` matches search |
| | `Quantity` is **text** (e.g. `1 bag`, `50kg`) |
| | `Price` number matches vendor |
| | `Status` = `pending` |
| | `Pin` 4-digit style code |
| | `VendorId` / `VendorPhone` when available |
| **PASS** | Row exists within ~30s of selection/checkout with `pending` + PIN |
| **FAIL** | No row, or 422 quantity/field errors in server logs |
| **Fix** | Quantity must be string; field names per `orderService`; API key permissions |

### G7 - Paid confirmation (webhook live only)

| | |
|--|--|
| **You do** | Complete sandbox payment; BACHs hits `POST /webhook` |
| **Expected buyer reply shape** | e.g. |
| | `Payment confirmed! Your PIN is 1234. Show this to the vendor to confirm handover.` |
| **Expected vendor notify (if implemented/reachable)** | Paid amount + item + buyer contact + PIN |
| **Airtable** | Same order `Status` -> `paid` |
| **PASS** | Buyer gets PIN message and Orders status is `paid` |
| **FAIL** | Pay succeeds in BACHs UI but bot/Airtable stay `pending` |
| **Fix** | Public `BASE_URL`, webhook URL + `BACHS_WEBHOOK_SECRET`, inspect webhook logs |

---

## Master pass/fail scorecard

Print or copy this during a demo:

```text
[ ] G0 Server linked
[ ] G1 Greeting
[ ] G2 Help (optional)
[ ] G3 Vendor shortlist (name+price+location, numbered)
[ ] G3b Clarifiers resolve (if any)
[ ] G4 Selection confirmation
[ ] G5 Checkout URL opens
[ ] G6 Airtable order pending + PIN
[ ] G7 Paid + PIN message (if webhook public)
```

**Golden path demo = PASS** when G0, G3, G4, G5, G6 are checked.  
G7 is required only when showing full payment settlement.

---

## Server log snippets to watch

While testing, a healthy run often looks like:

```text
GoToMart backend running on port 3000
[BAILEYS] ... Connecting / connected ...
[BAILEYS] Received: I need rice in Ikorodu ... | from: ...
[COMMERCE] or [ROUTING] ... buy ...
# vendor search hits Airtable
# after select:
# order create success (Airtable record id)
# checkout session -> checkout_url
[BAILEYS] Message ... status: DELIVERY_ACK / READ
```

Webhook pay:

```text
[WEBHOOK] Event: ... reference ...
# mark order paid
```

Red flags:

```text
EADDRINUSE :::3000
PRODUCT_NOT_FOUND
Unknown field name
Field "Quantity" cannot accept the provided value
Signature verification failed
```

---

## Step 1: Link WhatsApp (Baileys)

1. Watch the terminal for a QR code (first run or expired session).
2. On your phone: WhatsApp -> Settings -> Linked Devices -> Link a Device.
3. Scan the QR.
4. Wait until logs show the socket is connected (no QR loop).
5. Session files land in `baileys_auth/` (local only; not for git).

Health check in another terminal:
```bash
curl http://localhost:3000/
```

## Step 2: Message the bot like a buyer

Open WhatsApp and message **the same number you linked** (or have a second phone message it).

Follow **Annotated golden path checklist** G1-G5 above.

### Other useful prompts

| You type | Intent |
|----------|--------|
| `I need garri in Lagos Island` | Different item/location search |
| `I want to buy beans` | Buy intent; bot may ask for location (G3b) |
| `show my orders` / `my orders` | Order history if supported by router |
| `help` | Help text (G2) |

### Seller path (optional)

| You type | Intent |
|----------|--------|
| `I want to sell` | Vendor onboarding |
| Follow prompts for shop name, item, price, location, bank | New vendor row / listing |

**Seller PASS:** Bot switches to onboarding questions (not buyer vendor list).  
**Seller FAIL:** Treated as buyer search with no onboarding prompts.

## Step 3: Confirm data in Airtable

See **G6** and **G7** in the golden path checklist.

**Vendors** table should still list the matched sellers used in the reply.

## Step 4: Confirm payment wiring

1. Checkout URL should look like:
   - sandbox: `https://sandbox-checkout.bachs.io/c/...`
2. In BACHs dashboard, webhook URL should be:
   - `https://YOUR_PUBLIC_HOST/webhook`
3. For local-only demos without a public URL, you can still:
   - verify order creation in Airtable
   - verify checkout URL generation with:
     ```bash
     node tests/test_purchase_flow.js
     ```
   - full paid status needs a reachable webhook (tunnel or deployed host)

### Local public tunnel (optional)

If the bot runs on your laptop and you need webhooks:

```bash
# example with ngrok
ngrok http 3000
# set BASE_URL to the https ngrok URL in .env and restart
# register that BASE_URL/webhook in BACHs
```


## Live automated G1 / G2 / G7

For CI-style live path checks without typing on a phone UI:

```bash
ENABLE_LIVE_TEST=1 npm start
# other terminal:
LIVE_TEST_TO=2348XXXXXXXXX npm run test:live-golden
# or: LIVE_TEST_TO=2348XXXXXXXXX node tests/test_live_g1_g2_g7.js
```

| Step | What it proves |
|------|----------------|
| G1 | JEV GREETING + `handleTextMessage('hi')` + Baileys outbound |
| G2 | JEV HELP + `handleTextMessage('help')` + Baileys outbound |
| G7 | Signed BACHs webhook -> Airtable `paid` + PIN notify path |

Turn off `ENABLE_LIVE_TEST` after verification on shared hosts.

## Step 5: Automated check (no phone UI)

Does not replace real chat, but validates Airtable + BACHs:

```bash
npm run test:purchase
# same as: node tests/test_purchase_flow.js
```

Expect: vendors found, order created, checkout URL returned, order readable from Airtable.

Broader diagnostics:

```bash
node tests/test_integration.js
```

---

## Broken demo recovery

| Breakage | Fast recovery |
|----------|----------------|
| QR loop / not linked | Stop extra Node processes. Relink once. Keep a single `baileys_auth` on one host |
| Port in use | `npx kill-port 3000` or change `PORT` |
| No reply | Confirm `[BAILEYS] Received` logs; relink; message the linked number from a second phone |
| Empty vendors | Airtable Vendors need `Item`/`Location` text that fuzzy-matches the query; seed rice + Ikorodu |
| Order 422 Quantity | Send quantity as text in code/Airtable (`1 bag`), not a bare number field type mismatch |
| PRODUCT_NOT_FOUND | Create BACHs product; set `BACHS_PRODUCT_ID` in `.env`; restart |
| Checkout URL missing in app | BACHs returns `checkout_url` (not `data.url`); use current `paymentService` |
| Stuck on clarifying questions | Resend full utterance: `I need rice in Ikorodu` |
| Paid in BACHs, still pending | Tunnel/public URL + webhook secret; check `POST /webhook` logs |
| Serverless-only host | Move bot to always-on Node (VPS, Railway, Render, Fly) |

---

## Suggested 5-minute demo script

1. `npm start` and confirm **G0**.
2. From a second phone: `hi` (**G1**).
3. `I need rice in Ikorodu` (**G3**). Show numbered list on screen.
4. Reply `1` (**G4**).
5. Open payment link (**G5**).
6. Airtable Orders: new `pending` row + PIN (**G6**).
7. (If webhook live) pay sandbox and show `paid` + PIN chat (**G7**).

Tick the **Master pass/fail scorecard** as you go.

---

## Related docs

- `BAILEYS_SETUP.md` - quick link guide
- `WHATSAPP_DEPLOYMENT.md` - production deploy
- `RELEASE_NOTES.md` - v0.1.1 changes
- `tests/test_purchase_flow.js` - automated purchase path
