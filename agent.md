# GoToMart - What We're Actually Building

## The one-line version

GoToMart is a WhatsApp contact you chat with to buy everyday stuff from local
vendors - no app, no browsing, no account. You just tell it what you want,
it finds you the best options nearby, and you pay right there in the chat.

It's not a marketplace app with a homepage and search bar. It's an **agent**
sitting on one WhatsApp number, and it treats you differently depending on
whether you're trying to *buy* something or *sell* something.

---

## Scenario 1: Someone buying rice

Amaka is in Ikorodu and needs rice for the weekend. She opens WhatsApp and
messages GoToMart like she'd message a friend:

> **Amaka:** I need a 50kg bag of rice in Ikorodu

GoToMart doesn't show her a catalog. It reads that sentence, figures out
she wants *rice*, *50kg*, in *Ikorodu*, checks which registered vendors
actually sell that in that area, and replies with a WhatsApp list - the
same tappable list UI WhatsApp already supports, showing the top 3 options
sorted by price and trust (verified vendors first):

> **GoToMart:** Here's what I found for 50kg bag rice in Ikorodu:
> - Iya Basira Foods - ₦45,000 • ★4.8 • Verified
> - Ikorodu Grains Hub - ₦46,500 • ★4.5 • Verified
> - Quick Rice Depot - ₦44,000 • ★4.0

Amaka taps **Iya Basira Foods**. GoToMart immediately sends her a secure
payment link. She pays.

> **GoToMart:** Payment confirmed! Your PIN is 4821. Show this to the vendor
> to confirm handover.

At the same time, GoToMart messages the vendor:

> **GoToMart → Iya Basira Foods:** You've received ₦45,000 for 1 bag of
> rice. Contact the buyer at 080XXXXXXXX to arrange delivery - they'll
> confirm with PIN 4821.

That PIN is the handshake: it's how the vendor proves to Amaka (and Amaka
proves to the vendor) that this is the real, paid-for handover - not
someone else showing up and claiming the order.

Total effort from Amaka's side: one message, one tap, one payment. She
never left the chat.

---

## Scenario 2: A shop owner joining as a vendor

### The Catalog Forwarding Strategy

Since Meta's API does not allow programmatic scraping of another user's WhatsApp Business Catalog, GoToMart uses a native workaround: **instructing vendors to forward products directly from their catalog.**

This action forces WhatsApp to deliver perfectly structured JSON containing the product details directly to the webhook, completely bypassing the need for AI plain-text parsing.

### Vendor Onboarding Flow

Mr. Bello runs a small provisions store. He hears about GoToMart and messages
the same WhatsApp number:

> **Mr. Bello:** I want to sell on GoToMart

GoToMart recognizes this is a *seller*, not a buyer - different keywords,
different flow - and switches into onboarding mode:

> **GoToMart:** Want to list your business on GoToMart? Reply YES to get
> started.
>
> **Mr. Bello:** Yes
>
> **GoToMart:** Great! Where would you like to receive your money? Send
> your bank name, account number, and account name.
>
> **Mr. Bello:** GTBank, 0123456789, Bello Provisions
>
> **GoToMart:** Got it! Now here's the easy part - open your WhatsApp Business Catalog, tap on any product you want to sell, and use the **Forward** button to send it directly to this chat. We'll automatically add it to your store.

Mr. Bello forwards the rice product from his catalog. GoToMart receives the structured JSON with all the product details and saves it.

> **GoToMart:** You're live on GoToMart! Your product is now searchable by buyers nearby.

That's it - Mr. Bello never downloaded anything, never filled out a form,
never spoke to a human. He's now a searchable vendor, and the next time
someone like Amaka asks for rice in his area, he's in the running.

---

## Why this is the hard/interesting part

The actual engineering challenge isn't "build a database of vendors" - it's
the **translation layer** in the middle:

- Turning a messy sentence ("I need rice for the weekend, cheap, somewhere
  in Ikorodu") into something a database can actually query.
- Telling a buyer's message apart from a vendor's message on the *same*
  WhatsApp number, with no explicit mode switch.
- Remembering where someone is mid-conversation (e.g. Mr. Bello is halfway
  through onboarding) even though the backend technically forgets
  everything between messages.
- Closing the loop with real money and a real handover - not just "show
  price," but generate a live payment link, confirm the payment actually
  cleared, and only then release the PIN and notify the vendor.

Everything else - nice UI, vendor ratings, escrow, geo-search - is stuff
we can layer on later. The demo that proves this works is: **type a
request, get a real shortlist, tap, pay, get a PIN - and watch the vendor
get notified in real time.**

---

## What's intentionally *not* in the MVP

- **No group chat support.** WhatsApp's group API needs a Meta-verified
  Official Business Account, which we don't have time to get - GoToMart
  only works in 1-on-1 chats for now.
- **No automatic bank payouts.** Vendors give us their bank details, but
  for now GoToMart just *tells* them a payment came in - it doesn't
  actually move money to their account yet.
- **No live GPS/proximity matching** - vendors are matched by the location
  name they typed, not real coordinates.

None of that blocks the demo. All of it is a good "what's next" slide.

---

## System Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   WhatsApp      │────▶│   GoToMart       │────▶│   Airtable      │
│   User          │◀────│   Backend        │◀────│   (Database)    │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   Paystack       │
                         │   (Payments)     │
                         └──────────────────┘
```

**Components:**
- **WhatsApp User**: Buyer or Vendor chatting via WhatsApp
- **GoToMart Backend**: Express.js server handling webhooks & business logic
- **Airtable**: Stores Vendors, Sessions (conversation state), Orders
- **Paystack**: Payment processing for checkout & webhook notifications

---

## Data Flow - Buyer Purchase

```
┌────────────┐     ┌──────────────┐     ┌────────────────┐     ┌───────────┐
│ Buyer      │────▶│ Meta         │────▶│ GoToMart       │────▶│ Airtable  │
│ texts      │     │ Webhook      │     │ parses intent  │     │ finds     │
│ "rice"     │     │              │     │ via Groq       │     │ vendors   │
└────────────┘     └──────────────┘     └────────┬───────┘     └───────────┘
                                                  │
                                                  ▼
                                         ┌────────────────┐     ┌───────────┐
                                         │ Send vendor    │────▶│ Buyer     │
                                         │ list (tap to   │     │ taps one  │
                                         │ select)        │     │           │
                                         └────────────────┘     └─────┬─────┘
                                                                       │
                                                                       ▼
                                                          ┌────────────────────┐
                                                          │ Paystack           │
                                                          │ checkout link      │
                                                          └─────────┬──────────┘
                                                                    │
                                                                    ▼
                                                       ┌──────────────────────┐
                                                       │ Payment success      │
                                                       │ webhook → generate   │
                                                       │ PIN → notify both    │
                                                       └──────────────────────┘
```

---

## State Machine - Vendor Onboarding

```
                    ┌─────────────┐
                    │   IDLE      │
                    └──────┬──────┘
                           │ "I want to sell"
                           ▼
                 ┌─────────────────────┐
                 │ AWAITING_CONFIRM    │
                 │ "Reply YES to start" │
                 └──────────┬──────────┘
                            │ "YES"
                            ▼
                 ┌─────────────────────┐
                 │   AWAITING_BANK     │
                 │ "Send bank details"  │
                 └──────────┬──────────┘
                            │ (bank info)
                            ▼
                 ┌─────────────────────┐
                 │  AWAITING_CATALOG   │
                 │ "Shop name, item,    │
                 │   price, location"  │
                 └──────────┬──────────┘
                            │ (catalog)
                            ▼
                 ┌─────────────────────┐
                 │   IDLE (live!)      │
                 │ Vendor now in       │
                 │ Airtable            │
                 └─────────────────────┘
```

---

## Webhook Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/webhook` | GET | Meta verification (hub.verify_token) |
| `/webhook` | POST | Receive WhatsApp messages |
| `/paystack/webhook` | POST | Receive payment notifications |

---

## Database Schema (Airtable)

### Vendors Table
| Field | Type | Description |
|-------|------|-------------|
| Name | Single line text | Shop name |
| Item | Single line text | What they sell |
| Location | Single line text | Area/location |
| Price | Number | Price |
| Rating | Number | 0-5 stars |
| Verified | Checkbox | Trust indicator |
| Phone | Single line text | WhatsApp number |
| UID | Single line text | Unique vendor ID |
| BankDetails | Long text | Bank, account, name |

### Sessions Table
| Field | Type | Description |
|-------|------|-------------|
| Phone | Single line text | WhatsApp sender |
| State | Single line text | idle / awaiting_confirm / awaiting_bank / awaiting_catalog |
| Data | Long text (JSON) | Stored conversation data |
| UpdatedAt | Date | Last update time |

### Orders Table
| Field | Type | Description |
|-------|------|-------------|
| Reference | Single line text | UUID, also Paystack reference |
| BuyerPhone | Single line text | Buyer WhatsApp |
| VendorId | Single line text | Vendor UID |
| VendorPhone | Single line text | Vendor WhatsApp |
| Item | Single line text | Item purchased |
| Quantity | Single line text | Amount |
| Price | Number | Price paid |
| Pin | Single line text | 4-digit handover PIN |
| Status | Single line text | pending / paid |

---

## Key Services

| Service | File | Responsibility |
|---------|------|----------------|
| groqService | `services/groqService.js` | Parse buyer text & vendor catalog via Groq AI |
| airtableService | `services/airtableService.js` | Query Vendors table |
| whatsappService | `services/whatsappService.js` | Send messages via Meta API |
| paystackService | `services/paystackService.js` | Create checkout links, verify webhooks |
| sessionService | `services/sessionService.js` | Get/Set session state in Airtable |
| vendorService | `services/vendorService.js` | Create new vendor records |
| orderService | `services/orderService.js` | Create/Update orders |
| classify | `utils/classify.js` | Detect vendor vs buyer intent |
| pin | `utils/pin.js` | Generate 4-digit handover PIN |
