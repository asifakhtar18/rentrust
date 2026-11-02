# RenTrust — Business & Working Model

> **Know the place before you rent it.**

This document explains *what RenTrust is*, *who it serves*, *how it works end
to end*, and *how it could make money*. It describes the system as actually
built in this repository — not a generic pitch.

---

## 1. The problem

Rental listings tell you the rent, the photos, and the amenities. They do **not**
tell you what it's actually like to live there:

- Does management actually fix things, or disappear after you move in?
- Will you get your security deposit back, or fight for it?
- Is the water supply reliable? Is the area safe? Are the rules reasonable?

In the Indian rental market these questions are answered only *after* you've
signed and moved in — when it's expensive to be wrong. The information that
matters most is invisible at decision time, scattered across WhatsApp groups,
word of mouth, and one-off horror stories.

**RenTrust makes that invisible information visible before you commit.**

---

## 2. What RenTrust is (and isn't)

RenTrust is a **rental-property intelligence and resident-review platform**.
The core user journey is:

```
SEARCH  →  RESEARCH  →  TRUST  →  DECIDE
```

A renter can look up a property, building, landlord, PG, co-living space, or
locality and see structured resident experiences and a transparent trust score
*before* deciding to rent.

**It is explicitly NOT a rental marketplace.** There is no:

- rent collection or payments
- bookings or reservations
- broker/agent marketplace
- lease agreements or e-signing

This matters for the business model: RenTrust is an **information and trust
layer**, not a transaction platform. It sits *upstream* of the rental
transaction, where the decision is made.

---

## 3. Who it serves (the participants)

| Role | Who they are | What they do |
| --- | --- | --- |
| **Resident / Renter** | Anyone researching or living in a rental | Searches, reads trust scores & reviews, saves & compares properties, writes verified reviews |
| **Owner / Manager** | Verified landlord or property manager | Claims their property, posts clearly-labelled public responses to reviews |
| **Moderator** | Trust & safety staff | Reviews the moderation queue, approves/hides/rejects reviews, handles reports & appeals, approves verifications |
| **Admin** | Platform operator | Everything a moderator can do, plus manages the property catalogue (create/edit/CSV import), users, claims, and scoring config |

A key design rule shapes everything: **reviewer identity is never exposed.**
Reviews render publicly as "Verified Resident" with only a tenure band and
month. Owners can respond but can never edit, delete, suppress, or de-anonymise
a review.

---

## 4. The working model — how the product actually flows

### 4.1 Search → Research
- Unified search across properties, landlords, and localities (PostgreSQL
  full-text + fuzzy matching + geospatial proximity).
- Each **property profile** shows a **Resident Trust Score**: a 0–100 number
  with a per-category breakdown (management, maintenance, deposit handling,
  communication, safety, condition, rules), the **sample size**, and a
  **confidence** signal. A property with three reviews is never presented like
  one with three hundred.
- Positive and negative **themes** are surfaced from aggregated reviews.
- **Locality intelligence** rolls the same data up to the neighbourhood level:
  average trust, category averages, common praise, and common complaints.

### 4.2 Trust → Decide
- Residents **save** properties and **compare** 2–4 side by side on trust +
  category scores.
- When there isn't enough verified data, the product says so honestly rather
  than fabricating a number. **No fake content** is a hard rule.

### 4.3 Contributing a review (the data flywheel)
1. A signed-in resident opens a property and starts a **structured review**
   (a guided questionnaire — ratings and defined choices, not just free text).
2. On submit, the review enters **`PENDING_MODERATION`** — it is **not public
   immediately**.
3. A moderator approves it (or hides/rejects with a reason). Negative reviews
   are **never auto-removed**.
4. Once published, it feeds the trust-score engine, which recomputes the
   property's score in the background.

### 4.4 Verification (what makes reviews trustworthy)
- A resident can prove residency by uploading private documents (e.g. a rental
  agreement or utility bill).
- Documents live only in private object storage; signed URLs are issued **only
  to staff**, never public.
- On approval, the linked review is flagged **Verified** — the public badge
  appears without ever exposing the evidence or the person.

### 4.5 Claims & owner responses (the supply side)
- An owner/manager uploads evidence to **claim** a property that already exists
  in the catalogue.
- An admin approves the claim, which grants the matching role and links them to
  the property.
- A verified owner can then add a **public, labelled response** to a review —
  a strictly bounded power (add only; never edit/delete/suppress/de-anonymise).

### 4.6 Catalogue management (admin only)
- Residents **cannot** create property records. This keeps the catalogue
  canonical and free of spam/duplicates.
- Admins establish each city and its localities in the location setup screen
  before importing that area's properties. Production migrations provide the
  India country/state reference rows without adding fictional seed properties.
- Admins add properties individually or via **bulk CSV import** (with a dry-run
  validation pass), scoped to a locality.

---

## 5. The core asset: a trust flywheel

RenTrust's defensibility is a **data network effect**:

```
         more residents search
                  │
                  ▼
   more residents contribute reviews
                  │
                  ▼
   richer, more confident trust scores
                  │
                  ▼
   the platform becomes more useful
                  │
                  ▼
         more residents search   ⟳
```

Verification and moderation are what keep the flywheel *clean*: the data stays
trustworthy as it scales, which is precisely the thing competitors (listing
sites, informal WhatsApp groups) can't guarantee. The moat is **accumulated,
verified, moderated resident experience** — hard to copy because it compounds
over time and can't be bought.

---

## 6. How it could make money

RenTrust is pre-revenue in this MVP (no payment code exists). Because it sits
at the *decision point* of a high-value transaction, several monetisation paths
are natural. These are **candidate models**, deliberately kept separate from the
free, unbiased trust data so credibility is never compromised.

### 6.1 B2C — residents
- **Freemium research.** Core search, scores, and reviews stay free (the
  flywheel depends on this). Charge for power features: deep comparison,
  historical score trends, alerts when a saved property's score changes,
  neighbourhood deep-dives.
- **Verified-mover reports.** A paid, consolidated due-diligence report on a
  specific property before signing a lease.

### 6.2 B2B — owners, managers, PGs & co-living operators
- **Verified business profile (SaaS subscription).** Claimed owners/operators
  pay for a managed presence: response tools, analytics on their trust score and
  themes, and benchmarking against the locality.
- **Reputation analytics.** Dashboards showing what residents praise/complain
  about across a portfolio — valuable to professional PG/co-living chains and
  large landlords.

### 6.3 Platform & data (used carefully, never compromising neutrality)
- **Locality intelligence API / reports** for proptech, relocation services,
  and corporate housing teams — aggregated, anonymised insight (never
  individual reviewer data).
- **Qualified lead referrals** to *verified, well-rated* properties — aligned
  with user interest because only genuinely good properties benefit.

**Guardrail:** owners can pay for presence and analytics, but **never** to
alter, hide, or buy a trust score or remove honest reviews. The product's entire
value is that the trust data is unbought. Monetisation that breaks this breaks
the business.

---

## 7. Why the architecture supports the model

The system is built so the trust layer can scale without losing integrity:

- **Structured reviews** (defined questionnaire, not free text) → consistent,
  comparable, machine-aggregatable data that powers scores and themes.
- **Transparent scoring** (score + sample size + confidence) → users trust the
  number because its basis is visible.
- **Anonymous-by-design reviews** → residents can be honest without fear, which
  keeps the supply of truthful data flowing.
- **Verification + moderation + audit log** → the data stays clean and
  defensible as volume grows; abuse and manipulation are contained.
- **Multi-tenant geography** (country → state → city → locality) → nothing is
  hard-coded to one city; expansion is a data operation, not a rewrite.
- **No-fake-data rule** → honest "not enough data yet" states protect long-term
  credibility over short-term vanity metrics.

---

## 8. Go-to-market shape (MVP)

- **Start dense, not wide.** Launch locality-by-locality (initial focus:
  Bengaluru — HSR Layout, Koramangala, Bellandur, Whitefield, Marathahalli).
  Depth of reviews in a few areas beats thin coverage everywhere, because trust
  scores are only useful once sample sizes are meaningful.
- **Seed the supply side** with verified reviews in target localities to cross
  the "enough data to be useful" threshold, then let the flywheel take over.
- **Expand** to new cities once the model proves out in the first — the platform
  is already multi-city ready.

---

## 9. One-paragraph summary

RenTrust is a trust-and-intelligence layer for the Indian rental market that
helps renters know what living somewhere is actually like *before* they sign.
Residents contribute structured, verified, anonymous reviews; the platform turns
them into transparent property trust scores and locality intelligence;
moderation and verification keep that data honest. It makes money not by taxing
transactions but by selling deeper insight to residents and reputation tools to
property owners — while keeping the underlying trust data free, unbiased, and
impossible to buy, which is exactly what makes it defensible.
