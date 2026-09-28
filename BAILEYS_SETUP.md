# Baileys WhatsApp Setup - Quick Hackathon Guide

## What is Baileys?
WebSocket-based WhatsApp library - no Twilio/Meta API needed!
- Your personal WhatsApp number becomes the bot
- Scan QR code once, good for days
- No $0 fees, no platform restrictions

---

## Quick Start

1. **Install complete** ✓

2. **Run the server:**
```bash
npm start
```

3. **Scan QR code:**
- First run: A QR code appears in terminal
- Open WhatsApp on your phone
- Settings → Linked Devices → Link a Device
- Scan the QR code

4. **Test it:**
- Text yourself or a friend: "I need rice in Ikorodu"
- Bot replies with vendors!

---

## How It Works

```
Your WhatsApp Number (as bot)
      ↓
[BAILEYS] WebSocket connection
      ↓
Your GoToMart Bot logic
      ↓
Airtable (vendors, orders)
      ↓
Paystack (payments)
```

---

## Demo Commands

| Message | Response |
|---------|----------|
| "I need tomatoes" | Vendor list |
| "I want to sell" | Vendor signup |
| "Jumia Foods, rice 50kg, ₦30000, Lagos" | Registration |
| Reply "1" | Select vendor #1 |
| "yes" (after signup) | Continue registration |

---

## Storage

Auth saved to `baileys_auth/` folder - keeps you logged in.

---

## ⚠️ WARNINGS

- **One number per bot** - use a spare WhatsApp if you have one
- **Rate limits** - WhatsApp can ban for spam
- **Demo only** - Don't use your main business number
