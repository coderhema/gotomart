# Baileys WhatsApp Setup — Quick Guide

For full production steps (hosting, webhooks, Airtable, BACHs), see **[WHATSAPP_DEPLOYMENT.md](./WHATSAPP_DEPLOYMENT.md)**.

## What is Baileys?

WebSocket-based WhatsApp client — no Meta Cloud / Twilio required for the primary path.

- Your linked WhatsApp number becomes the bot
- Scan QR once; session stored in `baileys_auth/` (gitignored)
- Good for demos and always-on Node hosts

## Quick start

```bash
cp .env.example .env   # fill Airtable, BACHs, Cerebras, etc.
npm install
npm start
```

1. Scan the terminal QR: WhatsApp → **Linked Devices → Link a Device**
2. Message the bot: `I need rice in Ikorodu`
3. Select a vendor (`1`), complete checkout when offered
4. Confirm order appears in Airtable `Orders`

## Purchase path test

```bash
node tests/test_purchase_flow.js
```

## Flow

```
WhatsApp (Baileys)
  → GoToMart router / commerce engine
  → Airtable (Vendors, Sessions, Orders)
  → BACHs checkout_url
  → POST /webhook (paid)
```

## Demo messages

| Message | Response |
|---------|----------|
| `I need tomatoes` / `rice in Ikorodu` | Vendor list |
| `I want to sell` | Vendor onboarding |
| Reply `1` | Select vendor #1 |
| Payment link | BACHs checkout |

## Warnings

- Prefer a **spare** WhatsApp number
- WhatsApp may restrict spammy accounts
- Do not commit `.env` or `baileys_auth/`
- Serverless-only hosts cannot keep the Baileys socket reliably online
