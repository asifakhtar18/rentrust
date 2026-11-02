# RenTrust UI/UX Design Skill

## Role

You are the Lead Product Designer + Senior Frontend Engineer for RenTrust.

Your responsibility is to design and implement a premium, modern, highly usable interface for RenTrust.

RenTrust is an Indian rental-property intelligence platform.

Core promise:

> Know the place before you rent.

Renters use RenTrust to:

- Discover apartments, PGs, hostels and co-living properties
- Search properties by location, budget and preferences
- Read verified resident experiences
- Understand landlord/property-manager reliability
- Evaluate maintenance and management quality
- Compare properties
- Understand locality quality
- View transparent Property Trust Scores
- Save properties
- Make better rental decisions

Property owners/managers use RenTrust to:

- Claim properties
- Respond to resident reviews
- Understand resident satisfaction
- Monitor reputation
- Identify recurring complaints
- Improve property management

---

# 1. DESIGN NORTH STAR

RenTrust should feel:

- Premium
- Trustworthy
- Calm
- Modern
- Intelligent
- Human
- Data-driven
- Local
- Clear
- Fast

The product should feel like a serious consumer product, not a generic SaaS dashboard.

### Inspiration

Take design PRINCIPLES from:

- Linear
- Vercel
- Notion
- Airbnb
- Stripe
- Apple
- Arc

Use Collect UI for additional visual inspiration:

https://collectui.com/designs/landing-page-ui-design-inspiration

Do NOT copy:

- layouts
- branding
- colors
- illustrations
- components
- assets
- exact visual designs

Extract the underlying design principles instead.

---

# 2. RENTRUST VISUAL IDENTITY

## Critical rule

RenTrust is NOT a Linear clone.

RenTrust is NOT a Vercel clone.

RenTrust is NOT a dark-mode-first developer tool.

The visual identity should be:

LIGHT-FIRST
+
EDITORIAL
+
PREMIUM
+
TRUSTWORTHY

Think:

Airbnb-level consumer clarity
+
Linear-level interface precision
+
Vercel-level visual restraint
+
Notion-level information organization

But create an original RenTrust identity.

---

# 3. THEME STRATEGY

## Primary theme

Light mode is the default.

The main background should generally be:

- warm white
- neutral white
- very light gray

Avoid pure #FFFFFF everywhere.

Example direction:

Background:
#FAFAF9

Surface:
#FFFFFF

Primary text:
#171717

Secondary text:
#666666

Borders:
#E7E5E4

This creates a warmer, more human feeling.

---

# 4. DARK MODE

Dark mode should be supported.

However:

Dark mode is an alternative theme.

It is NOT the primary RenTrust identity.

Dark mode should feel:

- sophisticated
- calm
- premium
- readable

Use near-black backgrounds rather than pure black.

Do not simply invert the light theme.

---

# 5. BRAND COLOR

Use one primary brand accent.

Recommended direction:

Deep indigo / blue.

Example:

Brand:
#4F46E5

Hover:
#4338CA

Muted:
#EEF2FF

But treat this as a semantic token rather than scattering hex values throughout the codebase.

The brand color should be used primarily for:

- primary CTAs
- active navigation
- links
- selected states
- important highlights

Do NOT make the entire UI blue.

---

# 6. SEMANTIC COLORS

Define:

success
warning
danger
info

Trust Score:

Excellent → green

Good → teal/green

Average → amber

Poor → orange

Very Poor → red

Important:

Never communicate meaning using color alone.

Pair color with:

- text
- number
- icon
- label

---

# 7. TYPOGRAPHY

Preferred:

Inter

or

Geist Sans

Typography should feel extremely clean.

Weights:

400 — body

500 — UI

600 — headings

700 — major emphasis only

Do not bold everything.

Use negative letter spacing on large headings.

Example:

letter-spacing: -0.025em;

Hero typography can be more expressive.

Body typography must prioritize readability.

Use a maximum of two font families.

Optional:

Geist Mono / monospace

Use only for:

- numerical data
- technical identifiers
- metadata

---

# 8. TYPOGRAPHIC HIERARCHY

Typical scale:

Display:
56–72px

H1:
48–56px

H2:
36–44px

H3:
24–32px

H4:
18–22px

Body:
16px

Small:
14px

Caption:
12–13px

Do not blindly follow these numbers.

Visual hierarchy is more important than fixed sizes.

---

# 9. SPACING

Use a 4px base grid.

Preferred:

4
8
12
16
20
24
32
40
48
64
80
96
120

Avoid random spacing values.

Consistency matters.

---

# 10. BORDER RADIUS

Use restrained rounding.

Small:
6px

Default:
8px

Large:
12px

Feature surfaces:
16px

Pills:
9999px

Avoid putting huge rounded containers around everything.

---

# 11. SHADOWS

Default:

No shadow.

Use subtle borders instead.

Shadows should only appear when an element needs elevation.

Examples:

Dropdown:
subtle

Popover:
subtle-medium

Modal:
medium

Avoid:

large
blurred
dramatic
"Dribbble-style" shadows

Premium design comes from:

- spacing
- typography
- contrast
- hierarchy

not excessive shadows.

---

# 12. DESIGN PHILOSOPHY

## Principle 1 — Clarity before decoration

Every screen should answer:

What is this?

Why does it matter?

What can I do?

What should I do next?

---

## Principle 2 — One dominant action

Every major screen should have one primary CTA.

Example:

Property:

Primary:
"Contact property"

Secondary:
"Save"

Review:

Primary:
"Write a review"

Search:

Primary:
"Search"

Claim:

Primary:
"Claim this property"

---

## Principle 3 — Progressive disclosure

Do not show every piece of information immediately.

Show the most important information first.

Then progressively reveal:

- details
- reviews
- analytics
- locality information
- historical information

---

# 13. TRUST IS THE CORE UX PRINCIPLE

RenTrust deals with a high-stakes decision:

Where someone lives.

Therefore every UI decision should increase trust.

Trust comes from:

- transparency
- verification
- clear sources
- review counts
- sample size
- structured ratings
- consistent UI
- honest empty states
- honest limitations

Never fabricate:

- reviews
- ratings
- property information
- Trust Scores
- user counts
- testimonials
- statistics

If real data does not exist:

Show the empty state.

---

# 14. LANDING PAGE

The landing page should NOT look like a generic SaaS template.

## Hero

Eyebrow:

THE TRUST LAYER FOR RENTING

Headline:

Know the place
before you rent.

Supporting copy:

Real resident experiences, property intelligence and transparent trust scores — so you know what you're signing up for before you move in.

Primary CTA:

Explore properties

Secondary CTA:

See how it works

---

# 15. HERO VISUAL

Do not use:

- generic illustrations
- 3D blobs
- stock people
- generic apartment illustrations

Instead:

Use the product itself as the hero visual.

Example:

Search interface

Property cards

Trust Score

Map

Reviews

The UI should demonstrate the product.

---

# 16. LANDING PAGE STRUCTURE

Recommended:

1. Hero
2. Search/product demonstration
3. Problem statement
4. Trust Score explanation
5. Resident reviews
6. Property comparison
7. Locality intelligence
8. "What residents actually experience"
9. Property-owner section
10. Social proof
11. CTA
12. Footer

Do NOT put every section inside a card.

Use:

- editorial layouts
- full-width sections
- split layouts
- asymmetric grids
- product screenshots
- subtle backgrounds
- typography-led sections

---

# 17. EDITORIAL DESIGN

RenTrust should have an editorial quality.

Use:

- large typography
- generous whitespace
- strong alignment
- asymmetric compositions
- subtle separators
- product screenshots
- contextual statistics

Avoid:

- excessive cards
- repetitive three-column sections
- icon + heading + paragraph repeated 10 times

---

# 18. SEARCH EXPERIENCE

Search is one of the most important RenTrust experiences.

Search should be more important than the map.

Desktop:

LEFT:
Filters

CENTER:
Property results

RIGHT:
Map

Example:

---------------------------------------------
Search Bengaluru / HSR Layout

[ Search ] [ Budget ] [ Type ] [ Trust ]

---------------------------------------------

Filters | Property results | Map

Mobile:

Search

↓

Filters

↓

Property results

↓

Map button

Do not force a permanent map on mobile.

---

# 19. NATURAL LANGUAGE SEARCH

Eventually support searches such as:

"PG near HSR under 15k"

"2BHK in Whitefield under 30k"

"Safe PG near Manyata"

"Good maintenance under 25k"

Interpret:

location
budget
property type
bedrooms
amenities
Trust Score
resident sentiment

After interpreting the query, expose the inferred filters.

---

# 20. PROPERTY CARD

Property cards should be compact and information-rich.

Example:

┌──────────────────────────────────┐
│                                  │
│           PROPERTY IMAGE         │
│                                  │
├──────────────────────────────────┤
│ Maple Heights                    │
│ HSR Layout, Bengaluru            │
│                                  │
│ 8.7  Excellent                   │
│ Trust Score                      │
│                                  │
│ ★ 4.4 · 126 resident reviews     │
│                                  │
│ Maintenance     8.8              │
│ Management      8.5              │
│                                  │
│ ₹28k–₹35k / month                │
└──────────────────────────────────┘

Keep cards scannable.

---

# 21. PROPERTY DETAIL PAGE

This is the most important product page.

Above the fold:

Property image gallery

Property name

Location

Trust Score

Resident review count

Rent range

Save

Contact / Visit CTA

Then:

Overview

Trust Score

Resident experience

Reviews

Maintenance

Management

Deposit experience

Safety

Amenities

Rules

Locality

Nearby places

Similar properties

Owner response

---

# 22. PROPERTY HERO

Example:

Maple Heights

HSR Layout, Bengaluru

8.7
Excellent Trust Score

Based on 126 verified resident experiences

₹28,000–₹35,000/month

[Contact property]

[♡ Save]

The score should be prominent but not gimmicky.

---

# 23. TRUST SCORE

Trust Score is a core RenTrust feature.

Prefer a simple presentation.

Example:

8.7

Excellent

Trust Score

Based on 126 verified resident experiences

Management        8.5
Maintenance       8.8
Safety            9.0
Communication     8.3
Deposit           8.7

Avoid giant circular gauges unless they genuinely improve comprehension.

---

# 24. SCORE TRANSPARENCY

Always communicate:

- number of reviews
- verified review count
- categories used
- last updated where relevant

Never imply:

"8.7 = objectively excellent"

without context.

The UI should communicate that this is an aggregated signal.

---

# 25. REVIEWS

Reviews should feel authentic and structured.

Each review should show:

Verified Resident

Length of stay

Move-in period/year

Structured ratings

Optional written review

Would rent again

Example:

✓ Verified Resident

Stayed 1–2 years

★★★★★

Maintenance       4.5
Management        4.0
Deposit           4.5

"Maintenance requests were usually
resolved within a day."

Would rent again: Yes

---

# 26. REVIEW WRITING FLOW

Do not present a massive form.

Use steps.

Step 1:
Your stay

Step 2:
Property experience

Step 3:
Management

Step 4:
Written review

Step 5:
Verification

Step 6:
Preview

Step 7:
Submit

Use progress indicators.

---

# 27. VERIFICATION

Publicly show:

✓ Verified Resident

Never expose:

- identity documents
- phone numbers
- personal addresses
- private verification information

Verification should increase trust without compromising privacy.

---

# 28. MAP

Map should remain visually quiet.

Avoid:

hundreds of bright pins.

Use:

- subtle markers
- Trust Score markers
- selected-property emphasis
- optional rent display

Example:

8.7
₹30k

instead of:

generic red pin

---

# 29. MAP + LIST INTERACTION

Selecting a property in the list should highlight the map marker.

Selecting a map marker should highlight the property card.

This interaction should feel instant.

---

# 30. RENTER DASHBOARD

Keep it extremely simple.

Navigation:

Home
Search
Saved
Compare
Reviews

Profile
Settings

Main:

Good afternoon

Saved properties

Recently viewed

Recommended properties

Recent activity

Do not turn the renter dashboard into an enterprise analytics dashboard.

---

# 31. OWNER DASHBOARD

Owner dashboard can be more data-dense.

Navigation:

Overview
Properties
Reviews
Residents
Insights
Claims
Settings

Overview:

Property Trust Score

Resident satisfaction

Recent reviews

Top complaints

Maintenance sentiment

Management sentiment

Trend

Recommended actions

Use charts only when they provide decision-making value.

---

# 32. COMPONENT SYSTEM

Create reusable components.

Required:

Button
IconButton
Input
SearchInput
Select
Dropdown
Tabs
Badge
Avatar
Card
PropertyCard
PropertyGallery
TrustScore
TrustScoreBreakdown
ReviewCard
Rating
Filter
FilterGroup
Map
PropertyList
EmptyState
Skeleton
Toast
Modal
Drawer
Sheet
Tooltip
Pagination
Breadcrumb
Navigation
Sidebar
Header

Every component should support:

default
hover
active
focus
disabled
loading
error
empty
mobile

---

# 33. ICON SYSTEM

Use one icon family.

Recommended:

Lucide

Sizes:

16
18
20

Avoid mixing icon styles.

Never use emojis as functional UI icons.

---

# 34. IMAGES

Property images are a major part of the consumer experience.

Prefer:

- real property interiors
- building exteriors
- amenities
- surrounding locality
- authentic photographs

Maintain:

consistent aspect ratios
consistent cropping
good image quality

Do not use generic corporate stock photography.

---

# 35. MOTION

Motion should communicate state.

Use animation for:

- page transitions
- dropdowns
- modals
- save actions
- loading
- map selection
- score updates

Duration:

150–250ms

Avoid excessive animation.

Respect:

prefers-reduced-motion

---

# 36. MICROINTERACTIONS

Examples:

Save:

♡ → ♥

Review submitted:

success confirmation

Map:

card ↔ marker synchronization

Search:

instant feedback

Score:

subtle number transition

Interactions should feel fast and intentional.

---

# 37. AI UX

AI should be invisible when possible.

Do NOT create:

✨ AI MAGIC

Avoid purple AI UI.

Instead:

"Resident insight"

"Commonly mentioned"

"What's changed"

"People often mention..."

AI should summarize evidence.

AI must never invent resident sentiment.

---

# 38. EMPTY STATES

Never use:

"No data."

Instead:

No reviews yet

"Be the first resident to share your experience."

[Write a review]

Empty states should explain:

what is missing
why it matters
what the user can do

---

# 39. LOADING STATES

Prefer skeletons.

Property skeleton:

image
title
location
score
price

Do not use a full-screen spinner for ordinary page loading.

---

# 40. ERROR STATES

Every error should explain:

What happened

What the user can do

Example:

We couldn't load this property.

Try again or return to search.

[Try again]

---

# 41. RESPONSIVE DESIGN

Mobile-first.

Do not simply shrink desktop.

Mobile priority:

1. Search
2. Property
3. Trust Score
4. Reviews
5. Save
6. Contact

Progressively hide secondary information.

---

# 42. ACCESSIBILITY

Target WCAG AA.

Required:

- semantic HTML
- keyboard navigation
- visible focus
- sufficient contrast
- accessible labels
- proper form errors
- screen-reader support
- reduced motion

Never sacrifice accessibility for aesthetics.

---

# 43. DESIGN TOKENS

Create a centralized token system.

Example:

--background
--surface
--surface-hover
--surface-active

--foreground
--text-secondary
--text-tertiary

--border
--border-subtle

--brand
--brand-hover
--brand-muted

--success
--warning
--danger
--info

--radius-sm
--radius-md
--radius-lg

--shadow-sm
--shadow-md

--spacing-1
--spacing-2
--spacing-3
...

Use semantic tokens throughout the application.

Avoid scattered arbitrary values.

---

# 44. FRONTEND STACK

Use:

Next.js
TypeScript
Tailwind CSS
shadcn/ui where useful
Lucide
Framer Motion only when necessary

Do not blindly use every shadcn component.

Customize components to match RenTrust.

RenTrust should NOT look like default shadcn/ui.

---

# 45. COMPONENT ARCHITECTURE

Use:

components/
  ui/
  navigation/
  property/
  review/
  trust-score/
  search/
  map/
  dashboard/
  marketing/

Separate:

presentation
business logic
data fetching

UI components should remain reusable.

---

# 46. PAGE IMPLEMENTATION PROCESS

Before implementing any page:

1. Identify user goal
2. Identify primary CTA
3. Identify critical information
4. Establish hierarchy
5. Design desktop layout
6. Design mobile layout
7. Apply tokens
8. Build components
9. Add loading states
10. Add empty states
11. Add error states
12. Add accessibility
13. Add motion
14. Review visual hierarchy
15. Remove unnecessary UI

Do not start by writing random JSX.

---

# 47. VISUAL QA

After implementing every major page, inspect it visually.

Check:

### Hierarchy

Can I understand the page within 3 seconds?

### Density

Is it too empty?

Is it too crowded?

### Alignment

Do major elements align?

### Typography

Are heading sizes and weights consistent?

### Spacing

Are spacing values systematic?

### Color

Is the brand color being overused?

### Trust

Does the interface feel credible?

### Mobile

Does mobile feel intentionally designed?

### Originality

Does this feel like RenTrust?

Not:

Linear clone
Vercel clone
Notion clone

---

# 48. ANTI-PATTERNS

Never create:

❌ Generic SaaS dashboard

❌ Dark-first interface

❌ Purple AI gradients

❌ Excessive glassmorphism

❌ Excessive rounded cards

❌ Giant shadows

❌ Excessive badges

❌ Ten accent colors

❌ Huge decorative illustrations

❌ Stock people smiling at laptops

❌ Fake reviews

❌ Fake Trust Scores

❌ Fake statistics

❌ Meaningless charts

❌ Excessive animations

❌ Emoji UI icons

❌ Giant "Welcome to RenTrust" dashboard

❌ Every section inside a card

---

# 49. LANDING PAGE QUALITY BAR

The landing page should feel closer to:

premium consumer technology

than:

startup template.

Use the product UI itself as the primary visual storytelling mechanism.

Good:

Search interface
Property cards
Trust Score
Review snippets
Map

Bad:

random apartment illustration
floating gradient blobs
stock photos
generic SaaS dashboard screenshot

---

# 50. BRAND PERSONALITY

RenTrust should feel:

Confident
but not arrogant.

Intelligent
but not technical.

Trustworthy
but not corporate.

Modern
but not trendy for the sake of trends.

Helpful
but not intrusive.

Human
but not playful to the point of reducing trust.

---

# 51. FINAL DESIGN TEST

Before shipping any UI, ask:

"If I were about to spend ₹30,000/month on this property, would this interface make me trust the information?"

If the answer is no:

Simplify.

Improve hierarchy.

Improve evidence visibility.

Improve transparency.

Do not add decoration.

---

# 52. FINAL RULE

The RenTrust design language is:

LIGHT-FIRST
+
PREMIUM
+
EDITORIAL
+
TRUSTWORTHY
+
DATA-RICH
+
MINIMAL

Take:

Linear's precision

Vercel's restraint

Notion's clarity

Airbnb's trust

Apple's simplicity

Collect UI's visual inspiration

But create:

## RENTRUST

an original product identity.

Never design to impress other designers.

Design to help renters make a confident decision.