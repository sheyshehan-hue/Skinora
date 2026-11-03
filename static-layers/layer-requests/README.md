# Request a product (pre-order on request)

Customers can ask for items Skinora doesn't stock. Request first, pay later: we check the price and a
genuine supplier, send a quote with a payment link on WhatsApp within 48 hours, and the customer pays only
if they say yes. A 30% deposit is suggested when a quote is LKR 50,000 or more.

## What it adds
- `request.html`: the request form (brand, product, size, how many, link, name, WhatsApp number, email,
  note), a live summary with the timing and "nothing to pay now", a check that tells the customer when we
  already stock what they typed, a thank-you screen with a "send it on WhatsApp too" button, and
  "Your requests" with each request's status.
- Shop search: when nothing matches, a "Can't find it? Request it" box that opens the form with the
  search filled in. Under normal results, a small "Request a product" link. Searches with no results are
  counted for the admin.
- Footer: "Request a product" under Shop.
- Admin: a Requests item in the menu with the number of new requests, and `admin__requests.html` with
  counts by status (late ones past 48 hours in red), a filterable list, a quote panel (price, arrival
  time, payment link, deposit, a ready WhatsApp message), status changes, "Most requested" with a
  "Worth stocking" tag at 3+ requests and a button to copy everyone's contacts, and "Searches with no
  results".

## Data
Like the rest of the static preview, everything lives in the browser's localStorage (`skd-requests`,
`skd-req-admin`, `skd-req-missed`). The admin also shows sample requests so the lists are not empty.
For the live store, requests need a table in the Next.js app (Prisma) and an API route, so customers'
requests reach the admin from any device.

## Build
`python3 build.py <site dir>`, after all other layers. Idempotent.
