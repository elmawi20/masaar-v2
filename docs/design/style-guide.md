# Masaar Clinic System — Visual Design System & Style Guide (Task 1.17b)

This document establishes the official visual identity, color tokens, typography, layout density rules, component styles, and dark-mode specifications for the Masaar Clinic System.

- **Design Philosophy:** Calm, trustworthy, and rigorously clinical. **NOT "AI-looking"** — strictly zero decorative gradients, zero glassmorphism / backdrop-blur gimmicks, zero neon purple accents, and **zero emojis anywhere in the UI**. All interactive actions, theme switches, navigation links, and badges must use plain text, clear badges, or clean line-stroke SVG icons.
- **Spec Reference:** [docs/FEATURES-v2.2.md §0.7](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)
- **Primary Locale:** Arabic RTL first (`dir="rtl"`, Egyptian medical clinic conventions) with English LTR mirrored.

---

## 1. Core Interface Rules (Mandatory)

### 1.1 Strict Single-Language Rule (No Language Mixing)
- **Real screens show only ONE language at a time.**
- Mixing languages (e.g. `العربية (English)`, `اليوم (Today)`, `مجدول (Scheduled)`, or parenthetical foreign text) is **strictly forbidden on real screens**.
- When the application is in Arabic mode (the primary default): every single label, button, navigation link, status badge, table header, modal title, and error message MUST be 100% Arabic.
- When the application is switched to English mode: all text is 100% English.

### 1.2 Zero Emojis in the User Interface
- No emojis are permitted anywhere in the UI (e.g., no calendar icons as emoji, no sun/moon emoji in theme toggles, no plus emoji on buttons, no warning emoji in alerts).
- All visual cues must be rendered using:
  1. Semantic status colors paired with explicit Arabic text labels.
  2. Clean, minimal, monochromatic line-stroke SVG icons where necessary (14px - 16px).
  3. Clean text buttons and badges.

### 1.3 100% Self-Hosted Fonts (Zero External Links)
- All font files (`IBM Plex Sans Arabic` and `Cairo`) are self-hosted directly within the project under `docs/design/style/fonts/`.
- Local `@font-face` rules are declared in `fonts.css` and imported locally.
- Zero external font links, external CDNs, or Google Fonts URLs are permitted in stylesheets or HTML documents.

---

## 2. Color Palette & Token System

### 2.1 Primary Brand Color (Deep Teal)
The primary brand identity uses a single, authoritative **Deep Teal**, reflecting clinical calm, precision, and healthcare stability.

| Token | Light Mode Hex | Dark Mode Hex | Usage |
|---|---|---|---|
| `--color-primary-50` | `#E8F6F3` | `#0A2B24` | Light badge background, subtle hover highlights |
| `--color-primary-100` | `#D1F2EB` | `#114238` | Selected table row background, active tab pill |
| `--color-primary-500` | `#117A65` | `#16A085` | Interactive button hover, secondary accent |
| `--color-primary-600` | `#0E6251` | `#1ABC9C` | **Primary Brand Color**: Primary buttons, active nav link |
| `--color-primary-700` | `#0B5345` | `#2ECC71` | Primary button active/pressed state |
| `--color-primary-900` | `#063228` | `#A3E4D7` | Deep header text in high contrast |

### 2.2 Neutral Greys (Surfaces, Borders, & Typography)
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

## 3. Status Colors (Always Paired with Explicit Text Labels)

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

## 4. Typography & Formatting Rules

### 4.1 Typeface & Fonts
- **Primary Typeface:** `'IBM Plex Sans Arabic'`, with fallback to `'Cairo'`, `-apple-system`, `sans-serif`.
- **Hosting:** 100% self-hosted locally in the repository under `docs/design/style/fonts/` with zero external requests.
- **Characteristics:** Highly legible geometric sans designed specifically for Arabic digital interfaces with crisp baseline clarity and distinct letterforms.

### 4.2 Type Scale
| Level | Font Size | Line Height | Weight | Usage |
|---|---|---|---|---|
| `H1` Page Title | 20px (1.25rem) | 28px | Bold (700) | Screen titles (`لوحة الاستقبال — اليوم`) |
| `H2` Section Title | 16px - 18px | 24px | SemiBold (600) | Card headers, modal headings |
| `H3` Group Label | 15px | 22px | SemiBold (600) | Form section divisions, subheadings |
| `Front Desk Tables` | **15px** (0.9375rem) | 22px | Regular / Bold | Data table cells in reception & calendar views for rapid legibility |
| `Body (Base)` | **14px** (0.875rem) | 22px | Regular (400) | **Minimum base body font size across all screens** |
| `Body Medium` | 14px (0.875rem) | 22px | Medium (500) | Navigation items, buttons, patient names |
| `Small / Caption` | 11px - 12px | 18px | Regular (400) | Helper text, secondary badges, timestamps |
| `Mono Numbers` | 14px - 20px | — | Bold (700) | Currency amounts, receipt numbers, KPI figures |

### 4.3 Strict Formatting Standards
1. **Egyptian Currency:** Formatted with Arabic abbreviation and two decimal places:
   - Correct: `450.00 ج.م` · `1,200.00 ج.م` · `3,600.00 ج.م`
   - Incorrect: `450 L.E.` or `EGP 450` or `450 جنيه`
2. **Time of Day (No Leading Zero):** Egyptian 12-hour local time in Cairo timezone, formatted **without a leading zero**:
   - Correct: `9:30 ص` · `5:30 م` · `10:15 ص` · `11:00 ص` · `1:00 م` · `2:45 م` · `8:00 م`
   - Incorrect: `09:30 ص` or `05:30 م` or `17:30` or `5:30 PM`
3. **Dates:** Full Arabic Gregorian calendar date:
   - Correct: `25 أكتوبر 2026` · `الأحد 25 أكتوبر`
4. **Phone Numbers:** Stored normalized `01XXXXXXXXX`, displayed with readability spacing:
   - Format: `010 1234 5678`
5. **Single-Language Principle:** Real clinic screens display strictly one language at a time. No parenthetical English translations on Arabic screens (e.g. `الوضع الداكن` instead of `الوضع الداكن (Dark Mode)`).

---

## 5. Layout Architecture & Densities

### 5.1 Centered Max-Width Grid Container
- All application main content screens are bounded by a centered max-width container:
  - **Max Content Width:** `~1400px` (`max-width: 1400px; margin: 0 auto; width: 100%;`)
  - **Centering:** Prevents high-resolution desktop ultrawide stretching, ensuring clinicians and receptionists can comfortably scan across data tables and forms without excessive neck movement.

### 5.2 Compact Layout (Front Desk, Calendar, & Operations)
- **Target:** Receptionists and Practice Managers managing high patient volume.
- **Rules:**
  - Table row height: `40px - 44px`
  - Table font size: **15px** for fast readability across patient streams
  - Input field padding: `8px 10px`
  - Gap between elements: `8px - 12px`
  - Information-dense data grids to minimize vertical scrolling during rush hours.

### 5.3 Spacious Layout (Clinical SOAP Notes & InBody Consultations)
- **Target:** Treating Physiotherapists and Nutritionists documenting patient care.
- **Rules:**
  - Form section padding: `16px 20px`
  - Form input height / textarea min-height: `90px - 120px` for SOAP narratives
  - Gap between clinical sections: `16px - 24px`
  - Generous touch targets for dual pain scale buttons (`44px` height).

---

## 6. Access Control & Privacy UI Rules

### 6.1 Patient Profile Tab Visibility by Role
In accordance with patient medical privacy (`R-1.1-2`, `R-4.1-21`) and document categories (`R-9.5-1`), each role sees strictly scoped tabs on the Patient Profile (`patient-profile.html`):

| Role | Visible Profile Tabs | Masked / Hidden Tabs | Privacy Rationale |
|---|---|---|---|
| **Receptionist** (`RECEPTIONIST`) | • المواعيد والزيارات<br>• الباقات العلاجية (الرصيد المتاح)<br>• الفواتير والمقبوضات<br>• المستندات الإدارية وإثبات الدفع | 🚫 السجلات الطبية والتقارير السريرية<br>🚫 التشخيص الطبي<br>🚫 استشارات التغذية وفحص InBody<br>🚫 المستندات الطبية (أشعة، رنين، تحاليل) | الاستقبال يدير الحجوزات والماليات فقط؛ حجب التشخيص والملف الطبي إلزامي قانونياً وسريرياً (`R-1.1-2`) |
| **Manager** (`MANAGER`) | • المواعيد والزيارات<br>• الباقات العلاجية وسجل التعديلات<br>• الفواتير وسجل الاسترداد والإلغاء<br>• المستندات الإدارية وإثبات الدفع | 🚫 السجلات الطبية والتقارير السريرية<br>🚫 التشخيص الطبي<br>🚫 قياسات InBody السريرية<br>🚫 المستندات الطبية والفحوصات | المدير يدير العمليات والماليات والتدقيق، دون أي اطلاع على التاريخ المرضي للمرضى (`R-1-2`) |
| **Physiotherapist** (`PHYSIOTHERAPIST`) | • المواعيد والزيارات<br>• رصيد جلسات الباقة (عرض فقط)<br>• السجلات الإكلينيكية وتقارير SOAP<br>• التشخيص الطبي للمريض<br>• الفحوصات والمستندات الطبية (أشعة/تحاليل) | 🚫 فواتير العيادة وسندات الدفع<br>🚫 نقدية الدرج وإغلاق الوردية<br>🚫 مصروفات العيادة أو عمولات الزملاء | المعالج يركز على الخطة التأهيلية ولا يطلع على تفاصيل المحاسبة النقدية للعيادة (`R-1-4`) |
| **Nutritionist** (`NUTRITIONIST`) | • المواعيد والزيارات<br>• رصيد باقات التغذية (عرض فقط)<br>• كشوفات التغذية وفحوصات InBody ورسم التطور<br>• التشخيص وبروتوكول النظام الغذائي<br>• التحاليل الطبية ذات الصلة | 🚫 فواتير العيادة وسندات الدفع<br>🚫 نقدية الدرج وإغلاق الوردية<br>🚫 مصروفات العيادة أو عمولات الزملاء | أخصائي التغذية معني بالقياسات البدنية والحمية العلاجية دون المعاملات النقدية العامة (`R-1-5`) |
| **Owner** (`OWNER`) | • **كافة التبويبات بدون أي حجب** (الإدارية، المالية، السريرية، والتاريخ الكامل) | لا يوجد حجب | المالك يتمتع بصلاحية شاملة على كافة قطاعات النظام الطبية والتشغيلية (`R-1-1`) |

### 6.2 Role-Restricted Side Navigation Menus
- **Small Role Label at Top:** Every sidebar must prominently feature a top badge declaring the current logged-in role and user name (e.g. `الاستقبال — مريم` or `د. كريم حسني — علاج طبيعي`).
- **Zero Extraneous Links:** A receptionist's menu **never** contains clinical completion or medical charting links. A clinician's menu **never** contains cash drawer closing or clinic billing links (`permissions.md`).

### 6.3 Front Desk Shift Cash vs Clinic Revenue
- **Receptionist Dashboard:** The front desk today screen displays **"نقدية ورديتي الحالية"** (`cash in my shift`), representing solely the cash collected by that logged-in receptionist in their active unclosed drawer (`R-8.4-1`).
- **Owner & Manager Dashboards:** Total clinic daily revenue and multi-method breakdown (Cash, Visa, InstaPay, Vodafone Cash) appear **exclusively** on Owner/Manager dashboards.

### 6.4 Clinical Session Completion Pain Scales
- Per `R-9.1-1`, the physiotherapy session completion form (`session-complete.html`) requires **two distinct visual pain scales (0–10)**:
  1. **مستوى الألم قبل الجلسة (Pain Before):** من 0 إلى 10 (إلزامي `required`).
  2. **مستوى الألم بعد الجلسة (Pain After):** من 0 إلى 10 (إلزامي `required`).
- Both scales must be documented before session completion to track immediate therapeutic efficacy and longitudinal recovery.

---

## 7. Component Style Specifications

### 7.1 Buttons
- **Primary Button:** Solid Deep Teal background (`#0E6251`), white text, crisp 4px border radius. Hover: `#117A65`. Active: `#0B5345`.
- **Secondary / Outline Button:** Background transparent/white, 1px solid border (`#CBD5E1`), text main (`#0F172A`). Hover: `#F1F5F9`.
- **Danger Button:** Muted crimson border and text (`#B91C1C`), white background. Hover: light pink `#FEE2E2`.

### 7.2 Form Inputs & Controls
- Clean border (`1px solid #CBD5E1`), solid white surface in light mode (`#1E293B` in dark mode).
- Focus state: Deep teal outline (`2px solid #0E6251`) with zero offset.
- Labels: Placed above inputs, 13px SemiBold with asterisk for required fields.

### 7.3 Dark Mode Adaptation
- Handled cleanly via CSS Custom Properties on `[data-theme="dark"]`.
- Background transitions smoothly without high-contrast neon glare.
- Pure black (`#000000`) is avoided in favor of clinical deep navy (`#0B1120`) to prevent eye fatigue.
- Theme toggle uses simple inline line-stroke SVG icons for Sun and Moon (zero emojis).

---

## 8. Implementation Deliverables

The visual style is implemented across:
1. `docs/design/style/fonts/`: Directory containing all 25 self-hosted local `.woff2` font files.
2. `docs/design/style/fonts.css`: Local `@font-face` definitions.
3. `docs/design/style/style.css`: Unified stylesheet with full token definitions, base 14px font size, 15px table cells, centered 1400px layout, and light/dark theme support.
4. `docs/design/style/index.html`: Visual style guide showcase & live tokens inspector.
5. `docs/design/style/today.html`: Front Desk Today colored mockup (receptionist role, cash in my shift, 15px table, centered ~1400px).
6. `docs/design/style/patient-profile.html`: Patient Profile colored mockup (receptionist role, admin tabs only, no diagnosis).
7. `docs/design/style/session-complete.html`: Session Completion colored mockup (clinician role, two required pain scales: before & after).

