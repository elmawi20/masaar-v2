# Masaar Clinic System — Visual Design System & Style Guide (Task 1.17b)

This document establishes the official visual identity, color tokens, typography, layout density rules, component styles, and dark-mode specifications for the Masaar Clinic System.

- **Design Philosophy:** Calm, trustworthy, and rigorously clinical. **NOT "AI-looking"** — strictly zero decorative gradients, zero glassmorphism / backdrop-blur gimmicks, zero neon purple accents, and zero emoji decorations in functional UI elements.
- **Spec Reference:** [docs/FEATURES-v2.2.md §0.7](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)
- **Primary Locale:** Arabic RTL first (`dir="rtl"`, Egyptian medical clinic conventions) with English LTR mirrored.

---

## 1. Color Palette & Token System

### 1.1 Primary Brand Color (Deep Teal)
The primary brand identity uses a single, authoritative **Deep Teal**, reflecting clinical calm, precision, and healthcare stability.

| Token | Light Mode Hex | Dark Mode Hex | Usage |
|---|---|---|---|
| `--color-primary-50` | `#E8F6F3` | `#0A2B24` | Light badge background, subtle hover highlights |
| `--color-primary-100` | `#D1F2EB` | `#114238` | Selected table row background, active tab pill |
| `--color-primary-500` | `#117A65` | `#16A085` | Interactive button hover, secondary accent |
| `--color-primary-600` | `#0E6251` | `#1ABC9C` | **Primary Brand Color**: Primary buttons, active nav link |
| `--color-primary-700` | `#0B5345` | `#2ECC71` | Primary button active/pressed state |
| `--color-primary-900` | `#063228` | `#A3E4D7` | Deep header text in high contrast |

### 1.2 Neutral Greys (Surfaces, Borders, & Typography)
Neutral slates ensure high legibility and zero visual fatigue over long 8-hour clinic shifts.

| Token | Light Mode Hex | Dark Mode Hex | Purpose |
|---|---|---|---|
| `--bg-app` | `#F8FAFC` (Slate 50) | `#0B1120` (Dark Navy 950) | Main viewport canvas background |
| `--bg-surface` | `#FFFFFF` | `#131C31` (Slate 900) | Content cards, data tables, modals |
| `--bg-surface-elevated`| `#FFFFFF` | `#1E293B` (Slate 800) | Dropdowns, popovers, sticky headers |
| `--border-subtle` | `#E2E8F0` (Slate 200) | `#1E293B` (Slate 800) | Table row dividers, inner section borders |
| `--border-strong` | `#CBD5E1` (Slate 300) | `#334155` (Slate 700) | Input field borders, container outlines |
| `--text-main` | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) | Primary headlines, patient names, amounts |
| `--text-secondary` | `#475569` (Slate 600) | `#94A3B8` (Slate 400) | Form labels, table headers, metadata |
| `--text-muted` | `#64748B` (Slate 500) | `#64748B` (Slate 500) | Timestamps, placeholder texts, hint copy |

---

## 2. Status Colors (Always Paired with Explicit Text Labels)

> **Accessibility Rule:** Color is never used as the sole indicator of status. Every badge, pill, and calendar block MUST display an explicit Arabic text label (`مجدول`, `حضر`, `مكتمل`, `ملغي`, `لم يحضر`, `قائمة انتظار`).

| Status Key | Arabic Label | Color Category | Light Mode (Text / Background / Border) | Dark Mode (Text / Background / Border) |
|---|---|---|---|---|
| `scheduled` | **مجدول** | Calm Blue | `#1D4ED8` / `#EFF6FF` / `#BFDBFE` | `#93C5FD` / `#1E3A8A` / `#2563EB` |
| `arrived` | **حضر** | Amber / Alert | `#B45309` / `#FEF3C7` / `#FDE68A` | `#FCD34D` / `#78350F` / `#D97706` |
| `completed` | **مكتمل** | Clinical Green | `#15803D` / `#DCFCE7` / `#BBF7D0` | `#86EFAC` / `#14532D` / `#16A34A` |
| `cancelled` | **ملغي** | Neutral Slate | `#475569` / `#F1F5F9` / `#CBD5E1` | `#94A3B8` / `#1E293B` / `#334155` |
| `no_show` | **لم يحضر** | Clinical Crimson | `#B91C1C` / `#FEE2E2` / `#FECACA` | `#FCA5A5` / `#7F1D1D` / `#DC2626` |
| `waitlisted` | **قائمة انتظار** | Slate Banner | `#334155` / `#E2E8F0` / `#94A3B8` | `#CBD5E1` / `#0F172A` / `#475569` |

---

## 3. Typography & Formatting Rules

### 3.1 Typeface & Fonts
- **Primary Typeface:** `'IBM Plex Sans Arabic'`, with fallback to `'Cairo'`, `-apple-system`, `sans-serif`.
- **Characteristics:** Highly legible geometric sans designed specifically for Arabic digital interfaces with crisp baseline clarity and distinct letterforms.

### 3.2 Type Scale
| Level | Font Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `H1` Page Title | 20px (1.25rem) | 28px | Bold (700) | Screen titles (`لوحة الاستقبال — اليوم`) |
| `H2` Section Title | 16px (1.00rem) | 24px | SemiBold (600) | Card headers, modal headings |
| `H3` Group Label | 14px (0.875rem) | 20px | SemiBold (600) | Form section divisions, subheadings |
| `Body` | 13px (0.8125rem) | 20px | Regular (400) | Data table cells, form inputs, notes |
| `Body Medium` | 13px (0.8125rem) | 20px | Medium (500) | Navigation items, buttons, patient names |
| `Small / Caption` | 11px (0.6875rem) | 16px | Regular (400) | Help text, badges, secondary timestamps |
| `Mono Numbers` | 13px - 18px | — | Bold (700) | Currency amounts, receipt numbers |

### 3.3 Strict Formatting Standards
1. **Egyptian Currency:** Formatted with Arabic abbreviation and two decimal places:
   - Correct: `450.00 ج.م` · `1,200.00 ج.م` · `3,600.00 ج.م`
   - Incorrect: `450 L.E.` or `EGP 450` or `450 جنيه`
2. **Time of Day:** Egyptian 12-hour local time in Cairo timezone:
   - Correct: `09:30 ص` · `05:30 م` · `10:15 م`
   - Incorrect: `17:30` or `5:30 PM`
3. **Dates:** Full Arabic Gregorian calendar date:
   - Correct: `25 أكتوبر 2026` · `الأحد 25 أكتوبر`
4. **Phone Numbers:** Stored normalized `01XXXXXXXXX`, displayed with readability spacing:
   - Format: `010 1234 5678`

---

## 4. Layout Densities: Compact vs Spacious

To match the actual cognitive rhythm of a clinical setting, two distinct density profiles are applied:

### 4.1 Compact Layout (Front Desk, Calendar, & Reports)
- **Target:** Receptionists and Practice Managers managing high patient volume.
- **Rules:**
  - Table row height: `36px - 40px`
  - Input field padding: `6px 10px`
  - Gap between elements: `8px - 12px`
  - Information-dense data grids to minimize vertical scrolling during rush hours.

### 4.2 Spacious Layout (Clinical SOAP Notes & InBody Consultations)
- **Target:** Treating Physiotherapists and Nutritionists documenting patient care.
- **Rules:**
  - Form section padding: `16px 20px`
  - Form input height / textarea min-height: `90px - 120px` for SOAP narratives
  - Gap between clinical sections: `16px - 24px`
  - Generous touch targets for pain scale buttons (`44px` height).

---

## 5. Component Style Specifications

### 5.1 Buttons
- **Primary Button:** Solid Deep Teal background (`#0E6251`), white text, crisp 4px border radius. Hover: `#117A65`. Active: `#0B5345`.
- **Secondary / Outline Button:** Background transparent/white, 1px solid border (`#CBD5E1`), text main (`#0F172A`). Hover: `#F1F5F9`.
- **Danger Button:** Muted crimson border and text (`#B91C1C`), white background. Hover: light pink `#FEE2E2`.

### 5.2 Form Inputs & Controls
- Clean border (`1px solid #CBD5E1`), solid white surface in light mode (`#1E293B` in dark mode).
- Focus state: Deep teal outline (`2px solid #0E6251`) with zero offset.
- Labels: Placed above inputs, 12px SemiBold with asterisk for required fields.

### 5.3 Dark Mode Adaptation
- Handled cleanly via CSS Custom Properties on `[data-theme="dark"]`.
- Background transitions smoothly without high-contrast neon glare.
- Pure black (`#000000`) is avoided in favor of clinical deep navy (`#0B1120`) to prevent eye fatigue.

---

## 6. Implementation Deliverables

The visual style is implemented across:
1. `docs/design/style/style.css`: Unified stylesheet with full token definitions and light/dark theme support.
2. `docs/design/style/index.html`: Visual style guide showcase & live tokens inspector.
3. `docs/design/style/today.html`: Front Desk Today colored mockup (compact density).
4. `docs/design/style/patient-profile.html`: Patient Profile colored mockup (admin & financial hub).
5. `docs/design/style/session-complete.html`: Session Completion & SOAP Note colored mockup (spacious clinical density).
