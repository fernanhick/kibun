# RevenueCat Paywall — Design Spec

Use this spec to rebuild the RevenueCat-hosted paywall (the screen rendered by `RevenueCatUI.presentPaywallIfNeeded` from `app/paywall.tsx:84`) so it matches the in-app paywall and clears Apple **Guideline 3.1.2(c)**.

---

## 1. Compliance rules (read first)

Apple rejected v1.0 (build 11) because the free-trial banner was more conspicuous than the billed amount. Every change below is in service of these three rules:

1. **Price ≥ trial in visual prominence.** The recurring billed amount must be at least as large, bold, and high-contrast as any free-trial / "X days free" / introductory-pricing copy.
2. **CTA must say "Subscribe."** The primary button cannot say only "Start free trial." It must include the word *Subscribe* or *Start subscription*.
3. **Discount badges must not outweigh price disclosure.** "51% OFF" or similar can stay only if the post-trial price next to it is equally readable.

If you remember nothing else: **make the price the biggest text on the offer card.**

---

## 2. Brand tokens (paste into RevenueCat)

### Colors

| Token            | Hex        | Where it's used                     |
| ---------------- | ---------- | ----------------------------------- |
| Primary pink     | `#FF6B9D`  | Hero gradient start, accents        |
| Primary purple   | `#C77DFF`  | Hero gradient end                   |
| Selected outline | `#FF6B9D`  | Border on selected package row      |
| Surface          | `#FFFDFB`  | Card / package row background       |
| Surface alt      | `#FFFFFF`  | Elevated card background            |
| Text primary     | `#1A1A2E`  | All body text on light surfaces     |
| Text secondary   | `#6B6B8A`  | Disclosure, restore/legal links     |
| Text inverse     | `#FFFFFF`  | All text on the pink/purple gradient |
| Background       | `#E6F4FF`  | Outer page background               |

**Hero gradient** — linear, 0deg → 135deg, `#FF6B9D` → `#C77DFF`.

### Typography

RevenueCat lets you pick a font family per text component. Use **Fredoka** (Google Fonts) to match the app, with these roles:

| Role     | Font weight     | Style use                       |
| -------- | --------------- | ------------------------------- |
| Display  | Fredoka 700     | Title, price line               |
| UI       | Fredoka 600     | Button label, package title     |
| Body     | Fredoka 500     | Feature rows, disclosure        |

If Fredoka is not available in the RevenueCat editor, fall back to **system rounded** (SF Pro Rounded on iOS) at the same weights.

### Sizes

| Element               | Size (pt) | Weight    |
| --------------------- | --------- | --------- |
| Page title            | 26        | 700       |
| Subtitle              | 15        | 500       |
| Feature row           | 15        | 500       |
| Package title         | 16        | 600       |
| **Package price line**| **18**    | **700**   |
| Package sub-line      | 13        | 500       |
| CTA button            | 17        | 600       |
| Disclosure footer     | 11        | 500       |
| Restore / legal links | 13        | 500       |

The **package price line** must be ≥ any free-trial mention on the same row. Don't shrink it below 18pt.

### Spacing & radius

- Card radius: **22**
- Button radius: **16**
- Package row radius: **18**
- Inner padding (cards/rows): **16**
- Vertical gap between sections: **24**

---

## 3. Offering structure (RevenueCat dashboard → Products & Offerings)

Entitlement: `premium` (matches `REVENUECAT_ENTITLEMENT_ID` in `src/lib/revenuecat.ts:7`).

| Package    | Identifier       | Product                  | Intro offer            |
| ---------- | ---------------- | ------------------------ | ---------------------- |
| Annual     | `$rc_annual`     | `kibun.pro.annual`       | 1 week free trial      |
| Monthly    | `$rc_monthly`    | `kibun.pro.monthly`      | 1 week free trial      |

Mark **Annual** as the default-selected package and as "most popular" in the editor.

---

## 4. Layout — top to bottom

```
┌────────────────────────────────────────┐
│           [×] close (top-right)        │
│                                        │
│            ╭──────────────╮            │
│            │   Hero art    │            │   ← header image (mascot)
│            ╰──────────────╯            │
│                                        │
│  Unlock kibun Premium                  │   ← title (26/700)
│  Your feelings deserve the full        │   ← subtitle (15/500)
│  picture.                              │
│                                        │
│  ✓ One-tap daily mood check-ins        │   ← feature rows (15/500)
│  ✓ Private mood journal                │
│  ✓ Visual charts & trends              │
│  ✓ Personalized reminders              │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ ● Annual                           │ │   ← package (selected)
│ │   $34.99/year                      │ │   ← PRICE: 18/700, primary text
│ │   7-day free trial · Cancel anytime│ │   ← sub: 13/500, secondary text
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ ○ Monthly                          │ │
│ │   $5.99/month                      │ │
│ │   7-day free trial · Cancel anytime│ │
│ └────────────────────────────────────┘ │
│                                        │
│  [    Subscribe — 7 days free   ]      │   ← CTA, pink/purple gradient
│                                        │
│  Payment is charged at confirmation    │   ← disclosure (11/500)
│  of purchase. Subscription auto-       │
│  renews unless cancelled at least 24h  │
│  before period end. Manage in Settings.│
│                                        │
│  Restore · Terms · Privacy             │   ← legal links (13/500)
└────────────────────────────────────────┘
```

---

## 5. Component-by-component spec

### 5.1 Header image

- Source: kibun mascot (the smiling shiba). Use `assets/images/icon.png` or the existing hero asset.
- Treatment: full-bleed, top-aligned, max height **220pt**.
- Behind the image, a soft pink-to-purple gradient sits as the screen background tint.

### 5.2 Title block

- **Title**: `Unlock kibun Premium`
- **Subtitle**: `Your feelings deserve the full picture. Let's make sense of them together.`
- Center-aligned. Title and subtitle stack with 8pt gap.

### 5.3 Feature list

Use a check-mark bullet (color `#FF6B9D`) followed by body text:

- One-tap daily mood check-ins in seconds
- Private mood journal to capture quick notes
- Visual charts & trends to spot patterns
- Personalized reminders and habit nudges

Row gap: 12pt. Background: transparent.

### 5.4 Package rows (the part Apple cares about)

Each package row is a card with:

| Element            | Style                                                               |
| ------------------ | ------------------------------------------------------------------- |
| Container          | bg `#FFFDFB`, border 1.5px, radius 18, padding 16                   |
| Selected border    | `#FF6B9D`                                                           |
| Unselected border  | `rgba(255,107,157,0.25)`                                            |
| Radio dot          | filled `#FF6B9D` when selected, hollow border when not              |
| Package name       | 16/600, color `#1A1A2E` (e.g. "Annual", "Monthly")                  |
| **Price line**     | **18/700, color `#1A1A2E`** — `{{ product.price_per_period }}`      |
| Sub-line           | 13/500, color `#6B6B8A` — `7-day free trial · Cancel anytime`       |

**Critical:** the price line must be at least 18pt and bold. The "7-day free trial" sub-line must be ≤ 13pt and use secondary text color. This reverses the previous hierarchy that got rejected.

> **Do NOT** put `"Try free for 1 week"` on the same line as the price, or as the only highlighted text. Keep "free trial" as supporting copy under the price.

#### Discount badge (Annual only) — optional

If you want to keep "Save 51%" / "Best value":

- Place to the **right** of the package name, not over the price.
- Pill style: bg `#FF6B9D`, text `#FFFFFF`, 11/600, padding 4×8, radius 9999.
- The price line below must remain larger than the badge text.

If in doubt, **omit the badge** — it's a high-risk element with App Review.

### 5.5 CTA button

- Label: **`Subscribe — 7 days free`**
  (Alt acceptable: `Start subscription · 7 days free`)
- Style: full-width, height 56, radius 16, gradient bg `#FF6B9D` → `#C77DFF` (left → right), text `#FFFFFF` 17/600.
- Do **not** use only "Start free trial" or "Try for free."
- Disabled / loading state: 60% opacity, spinner replaces label.

### 5.6 Disclosure footer

Plain text, 11/500, color `#6B6B8A`, center-aligned, line-height 1.5:

> Payment is charged to your account at confirmation of purchase. Your subscription automatically renews unless cancelled at least 24 hours before the current period ends. Manage or cancel anytime in your account settings.

This block is **required** by Apple. Don't shorten it.

### 5.7 Legal / restore row

Three links separated by middle dots, 13/500, color `#6B6B8A`, underlined:

`Restore purchases  ·  Terms of Use  ·  Privacy Policy`

URLs: pull from your existing constants (`PRIVACY_POLICY_URL`, `TERMS_OF_USE_URL` in `src/constants/legal.ts`).

### 5.8 Close button

Top-right `×`, 32×32 hit target, white circle bg, dark icon. Must remain visible at all times — Apple specifically checks that users can dismiss the paywall.

---

## 6. RevenueCat editor variable bindings

Use these template variables on the price line so localized currencies work automatically:

| Display                               | Variable                             |
| ------------------------------------- | ------------------------------------ |
| `$34.99/year`                         | `{{ product.price_per_period }}`     |
| `$5.99/month`                         | `{{ product.price_per_period }}`     |
| `$2.92/month` (annual ÷ 12, optional) | `{{ product.price_per_period_abbreviated }}` |
| Trial duration                        | `{{ product.offer_period_abbreviated }}` |

Sub-line example using variables:
`{{ product.offer_period }} free trial · Cancel anytime`
→ renders as `7-day free trial · Cancel anytime`.

---

## 7. Pre-submission checklist

Before you save & republish the paywall in RevenueCat:

- [ ] Price text on each package is ≥ 18pt **and** bold **and** uses primary color
- [ ] Free-trial text on each package is ≤ 13pt and uses secondary color
- [ ] CTA contains the word **Subscribe**
- [ ] Discount badge (if present) is smaller than the price text next to it
- [ ] Full Apple disclosure paragraph is present and unshortened
- [ ] Restore Purchases, Terms of Use, Privacy Policy are all linked
- [ ] Close (×) button is visible without scrolling
- [ ] Tested in dark mode and on iPad — text remains legible, nothing clipped
- [ ] Tested with the longest localized currency string (e.g. `kr 349,99/år`) — no truncation of the price

When all boxes are checked, the paywall should clear 3.1.2(c).

---

## 8. Reference: matching in-app paywall

The in-app paywall at `app/paywall.tsx` was already updated to follow these rules:

- Price line `$5.99 / month or $34.99 / year` — 22pt display bold, full white opacity (`paywall.tsx:236`)
- Trial line `Includes 7-day free trial · Cancel anytime` — 15pt regular, 92% opacity (`paywall.tsx:237`)
- CTA `Subscribe — 7 days free 🌸` (`paywall.tsx:241`)

Keeping the RevenueCat-hosted paywall consistent with that hierarchy means a returning reviewer sees the same compliance pattern in both screens.
