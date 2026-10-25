# Masaar Clinic System — Calculations & Formulas Specification

> **Task Reference:** Stage 1 Design Task 1.07  
> **Specification Reference:** [docs/FEATURES-v2.2.md](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md)  
> **Rules Index:** [docs/design/rules-index.md](file:///F:/Claude%20CRM/docs/design/rules-index.md)  
> **Decisions Log:** [docs/design/decisions.md](file:///F:/Claude%20CRM/docs/design/decisions.md)  
> **Status:** Approved Design Baseline

---

## 1. Architectural & Calculation Standards

### 1.1 Currency & Money Representation
1. **Rule R-0-4:** All financial amounts (prices, payments, receipts, balances, refunds, expenses, and commissions) are strictly represented and stored as **integer piasters** (where $1\text{ EGP} = 100\text{ piasters}$).
2. Floating-point types (`float`, `double`, `real`) are strictly prohibited for financial data in both database columns and domain business logic.
3. User interfaces format integer piasters to EGP for display (e.g. `45000 piasters` $\rightarrow$ `450.00 EGP`).

### 1.2 Timezone & Date Boundaries
1. **Rule R-0-5:** All timestamps are persisted in the database as UTC `DateTime` values (`YYYY-MM-DDTHH:mm:ss.sssZ`).
2. All date calculations, daily opening hours, shift closings, late arrival evaluations, and calendar day views are evaluated relative to clinic local time: **`Africa/Cairo`** (UTC+2 or UTC+3 depending on daylight saving time laws).
3. End-of-day package expiration and receipt sequence counters roll over at **`23:59:59.999`** and **`00:00:00.000`** local Cairo time, respectively.

### 1.3 Rounding Conventions
| Domain | Standard Rounding Rule | Reason |
|---|---|---|
| **Per-Session Value** | Round **DOWN** (Floor) to integer piaster | Protects clinic against cumulative liability during refunds and commission payouts. |
| **Commission Amount** | Round to **NEAREST** integer piaster (`round`) | Fair and standard financial rounding for staff compensation. |
| **Charge Balance** | Exact integer piasters ($\max(0, \dots)$) | Balances can never be negative; zero balance means fully settled. |
| **Patient Age** | Integer floor of completed calendar years | Standard legal and medical definition of age. |
| **BMI** | Round to **1 decimal place** | Standard WHO epidemiological classification. |
| **BMR** | Round to **nearest integer kcal/day** | Standard dietary clinical prescription standard. |
| **Utilization & No-Show Rates** | Round to **1 decimal place** (%) | Reporting standard for managerial KPIs. |

### 1.4 Non-Stored Derived Values
**Rule R-0-6 & DEC-005:** Derived quantities are dynamically computed at query time and **never stored in database columns**:
- Patient age
- Charge balance & payment status pill
- Package available sessions & package status
- Days left on package & forfeited sessions
- Cash shift expected drawer amount
- Late arrival minutes

---

## 2. Identity & Patient Calculations

### 2.1 Patient Age
- **Rule Reference:** `R-4.1-8`, `R-0-6`
- **Purpose:** Determine patient age in full years for medical evaluation, consent validation, and pediatric classification without storing an age column that becomes stale.
- **Inputs:**
  - `dateOfBirth`: Calendar date (`YYYY-MM-DD`)
  - `referenceDate`: Current clinic date in `Africa/Cairo` (`YYYY-MM-DD`)
- **Formula:**
  $$\text{ageYears} = \text{referenceDate.year} - \text{dob.year} - \left( 1 \text{ if } (\text{referenceDate.month}, \text{referenceDate.day}) < (\text{dob.month}, \text{dob.day}) \text{ else } 0 \right)$$
- **Rounding:** Integer floor (completed years).
- **Timezone:** Evaluated on the local clinic calendar date in `Africa/Cairo`.

#### Worked Examples
1. **Normal Case:**
   - Patient DOB: `1985-04-12`. Reference date: `2026-10-25`.
   - Year diff: $2026 - 1985 = 41$.
   - Month/day comparison: $(10, 25) \ge (4, 12)$ $\rightarrow$ Birthday has passed this year.
   - **Result:** **`41 years old`**.
2. **Edge Case (Birthday Eve):**
   - Patient DOB: `1990-10-26`. Reference date: `2026-10-25`.
   - Year diff: $2026 - 1990 = 36$.
   - Month/day comparison: $(10, 25) < (10, 26)$ $\rightarrow$ Birthday has not occurred yet.
   - **Result:** $36 - 1 =$ **`35 years old`** (turns 36 tomorrow).
3. **Invalid / Error Case (Future DOB):**
   - Patient DOB: `2026-10-26`. Reference date: `2026-10-25`.
   - **Result:** Validation Error: `"Date of birth cannot be in the future."`

---

### 2.2 Egyptian Mobile Phone Normalization & Validation
- **Rule Reference:** `R-4.1-2`, `R-4.1-6`, `R-4.2-1`, `DEC-014`
- **Purpose:** Convert all patient and guardian phone entries into a single canonical 11-digit format starting with Egyptian mobile network codes (`010`, `011`, `012`, `015`), enabling duplicate detection and family lookups.
- **Inputs:** `rawPhone` (string)
- **Algorithm:**
  1. Remove all whitespace, dashes, slashes, periods, and parentheses.
  2. Map Eastern Arabic-Indic numerals (`٠١٢٣٤٥٦٧٨٩`) to standard ASCII digits (`0123456789`).
  3. Prefix replacement:
     - If string starts with `+20`: replace `+20` with `0`.
     - Else if string starts with `0020`: replace `0020` with `0`.
     - Else if string starts with `201` and length is 12: replace `20` with `0`.
  4. Validation: Verify string matches regular expression `^01[0125][0-9]{8}$` (length exactly 11 digits).
- **Output:** Canonical string `01XXXXXXXXX`.

#### Worked Examples
1. **Normal Case (International format with spaces):**
   - Input: `"+20 100 123 4567"`
   - Strip spaces & replace `+20` $\rightarrow$ `"01001234567"`.
   - Regex check: Matches `^01[0125][0-9]{8}$`.
   - **Result:** **`"01001234567"` (Valid)**.
2. **Edge Case (Arabic-Indic Numerals & International 0020 Prefix):**
   - Input A: `"00201001234567"` $\rightarrow$ Strip `0020` and add `0` $\rightarrow$ **`"01001234567"` (Valid)**.
   - Input B: `"٠١٠٠١٢٣٤٥٦٧"` $\rightarrow$ Convert Indic digits $\rightarrow$ **`"01001234567"` (Valid)**.
3. **Invalid / Error Case (Short or Malformed Number):**
   - Input: `"123"`
   - Regex check: Fails length (3 digits) and prefix.
   - **Result:** Validation Error: `"Invalid Egyptian mobile number. Must be 11 digits starting with 010, 011, 012, or 015."`

---

### 2.3 Arabic Name Similarity Normalization
- **Rule Reference:** `R-4.2-5`
- **Purpose:** Standardize Arabic name strings to detect duplicate or existing patient files despite common orthographic variations in Egyptian naming.
- **Inputs:** `rawName` (string)
- **Algorithm:**
  1. Strip Arabic diacritics / Tashkeel (`[\u064B-\u065F]`: fathah, dammah, kasrah, sukoon, shaddah, tanween).
  2. Strip Tatweel / Kashida (`\u0640`).
  3. Normalize Alif forms: replace `أ`, `إ`, `آ`, `ٱ` with plain `ا`.
  4. Normalize Taa Marbuta: replace `ة` with `ه`.
  5. Normalize Alif Maqsura: replace `ى` with `ي`.
  6. Normalize compound "Abd" prefixes: collapse spaces between `"عبد"` and the following word / `"ال"` (e.g. `"عبد الرحمن"` $\rightarrow$ `"عبدالرحمن"`, `"عبد الله"` $\rightarrow$ `"عبدالله"`).
  7. Collapse consecutive whitespace characters into a single space and trim.
- **Output:** Normalized comparison string.

#### Worked Examples
1. **Normal Case (Compound Name with Space):**
   - Name A: `"أحمد عبد الرحمن"`
   - Name B: `"احمد عبدالرحمن"`
   - Normalization of A:
     - `"أحمد"` $\rightarrow$ `"احمد"`
     - `"عبد الرحمن"` $\rightarrow$ `"عبدالرحمن"`
     - Combined: `"احمد عبدالرحمن"`
   - Normalization of B: `"احمد عبدالرحمن"`
   - **Result:** **Exact Match** $\rightarrow$ Triggers warning: `"Similar patient already exists: احمد عبدالرحمن"`.
2. **Edge Case (Alif variants, Taa Marbuta, Alif Maqsura):**
   - Name A: `"منى إبراهيم حمزة"`
   - Name B: `"مني ابراهيم حمزه"`
   - Normalization of A: `منى` $\rightarrow$ `مني`, `إبراهيم` $\rightarrow$ `ابراهيم`, `حمزة` $\rightarrow$ `حمزه` $\rightarrow$ `"مني ابراهيم حمزه"`.
   - Normalization of B: `"مني ابراهيم حمزه"`.
   - **Result:** **Exact Match** $\rightarrow$ Triggers similarity alert.
3. **Non-Matching / Distinct Names:**
   - Name A: `"محمود علي حسن"` $\rightarrow$ Normalized: `"محمود علي حسن"`.
   - Name B: `"محمد علي حسن"` $\rightarrow$ Normalized: `"محمد علي حسن"`.
   - **Result:** **No Match** (different root names).

---

## 3. Scheduling & Calendar Calculations

### 3.1 Appointment Overlap Detection
- **Rule Reference:** `R-5.2-3`, `R-5.2-4`, `R-5.2-5`, `R-5.2-9`, `R-5.2-10`, `DEC-008`, `DEC-021`
- **Purpose:** Prevent double bookings for clinicians, beds, and patients using real durations, while respecting calendar release rules for inactive/waitlisted appointments.
- **Formula:**
  An overlap exists if and only if:
  $$\text{newStart} < \text{existingEnd} \quad\text{AND}\quad \text{newEnd} > \text{existingStart}$$
- **Active Appointments Scope:**
  Only appointments with `status IN ('scheduled', 'arrived', 'completed')` occupy physical calendar slots.
  Appointments with `status IN ('cancelled', 'waitlisted')` have `occupiesCalendarSlot = false`.
- **Bed Reservation Persistence (`R-5.2-10`, `DEC-021`):**
  If a session completes earlier than planned (e.g. finishes in 35 minutes of a 60-minute booking), `existingEnd` remains the **original scheduled end time** to maintain calendar stability.

#### Worked Examples
1. **Normal Case (Overlap on Real Duration):**
   - Existing active appointment: `10:00` to `11:00` (duration 60 min).
   - Proposed booking: `10:45` to `11:15` (duration 30 min).
   - Overlap test:
     $$\text{newStart (10:45)} < \text{existingEnd (11:00)} \quad [\text{TRUE}]$$
     $$\text{newEnd (11:15)} > \text{existingStart (10:00)} \quad [\text{TRUE}]$$
   - **Result:** Overlap condition met $\rightarrow$ **BLOCKED with collision error**.
2. **Edge Case (Back-to-Back Adjacent Booking — No Overlap):**
   - Existing active appointment: `10:00` to `11:00`.
   - Proposed booking: `11:00` to `11:45`.
   - Overlap test:
     $$\text{newStart (11:00)} < \text{existingEnd (11:00)} \quad [\mathbf{FALSE}]$$
   - **Result:** No collision $\rightarrow$ **ALLOWED**.
3. **Edge Case (Cancelled & Waitlisted Slots Released):**
   - Appointment A: `10:00` to `11:00`, status `cancelled`.
   - Appointment B: `11:00` to `12:00`, status `waitlisted`.
   - Proposed booking C: `10:15` to `11:30`.
   - Check: Both existing records are non-active calendar statuses.
   - **Result:** Overlap check ignores cancelled/waitlisted slots $\rightarrow$ **ALLOWED**.
4. **Invalid Case (Zero or Negative Duration):**
   - Proposed: Start `10:00`, End `10:00` (duration 0) or Start `10:30`, End `10:15`.
   - **Result:** Validation Error: `"Appointment duration must be between 15 and 180 minutes in increments of 15 minutes."`

---

### 3.2 Late Minutes & Arrival Alert
- **Rule Reference:** `R-5.5-1`, `R-14-2`, `DEC-018`
- **Purpose:** Compute punctuality metrics when a patient checks in, and display real-time dashboard warnings when an unarrived patient is running late.
- **Inputs:**
  - `scheduledStartTime`: UTC timestamp of appointment start
  - `arrivedAt`: UTC timestamp of reception check-in
  - `currentTime`: Current UTC timestamp
- **Formulas:**
  $$\text{lateMinutes} = \max\left(0, \left\lfloor \frac{\text{arrivedAt} - \text{scheduledStartTime}}{60\text{ seconds}} \right\rfloor\right)$$
  $$\text{lateDashboardAlert} = \left( \text{status} == \text{'scheduled'} \right) \;\text{AND}\; \left( \text{currentTime} > \text{scheduledStartTime} + 10\text{ minutes} \right)$$
- **Notification Trigger:** Upon check-in (`scheduled` $\rightarrow$ `arrived`), if $\text{lateMinutes} > 10$, an immediate notification is dispatched to the assigned clinician.

#### Worked Examples
1. **Normal Case (On-Time / Early Arrival):**
   - Scheduled start: `10:00:00`. Patient arrives at `09:52:00` (8 minutes early).
   - Difference: $-8$ minutes.
   - $\text{lateMinutes} = \max(0, -8) =$ **`0 minutes`**.
   - Dashboard alert: False. Clinician alert: None.
2. **Edge Case (Exactly at 10-Minute Boundary):**
   - Scheduled start: `10:00:00`.
   - Current time: `10:10:00`. Status: `scheduled`.
   - Alert condition: `10:10:00 > 10:10:00` is **FALSE** (alert triggers strictly when $> 10$ minutes).
   - At `10:10:01`: Alert activates on reception dashboard.
   - Patient checks in at `10:10:00`: $\text{lateMinutes} = 10$. Clinician notification not triggered ($\le 10$).
3. **Late Arrival Case (> 10 Minutes Late):**
   - Scheduled start: `10:00:00`.
   - Patient arrives and checks in at `10:18:30`.
   - Difference: $+18.5$ minutes $\rightarrow$ floor to integer minutes.
   - **Result:** $\text{lateMinutes} =$ **`18 minutes`** recorded. System dispatches alert to clinician: `"Patient checked in 18 minutes late."`

---

### 3.3 Clinician Daily Utilization Rate
- **Rule Reference:** `R-12-5`
- **Purpose:** Measure clinician productivity and schedule efficiency for management reports.
- **Inputs:**
  - `totalBookedMinutes`: Sum of scheduled durations for active appointments (`scheduled`, `arrived`, `completed`) within the clinician's scheduled working shift.
  - `scheduledShiftMinutes`: Total duration of the clinician's working shifts for that day.
- **Formula:**
  $$\text{utilizationPercentage} = \begin{cases} 0.0 & \text{if } \text{scheduledShiftMinutes} = 0 \\ \text{round}\left( \frac{\text{totalBookedMinutes}}{\text{scheduledShiftMinutes}} \times 100, 1 \right) & \text{if } \text{scheduledShiftMinutes} > 0 \end{cases}$$
- **Rounding:** 1 decimal place.

#### Worked Examples
1. **Normal Case:**
   - Clinician shift: `10:00` to `18:00` (8 hours $= 480\text{ minutes}$).
   - Completed/booked sessions: 6 sessions of 45 minutes $= 270\text{ minutes}$.
   - Calculation: $\frac{270}{480} \times 100 = 56.25\%$.
   - **Result:** **`56.3%`**.
2. **Edge Case (100% Full Capacity):**
   - Clinician shift: `14:00` to `18:00` ($240\text{ minutes}$).
   - Booked sessions: 4 sessions of 60 minutes $= 240\text{ minutes}$.
   - Calculation: $\frac{240}{240} \times 100 = 100.0\%$.
   - **Result:** **`100.0%`**.
3. **Invalid / Zero Shift Divisor:**
   - Clinician not scheduled to work on that day ($\text{scheduledShiftMinutes} = 0$).
   - **Result:** **`0.0%`** (division by zero safely prevented).

---

### 3.4 Attendance KPI Rates (No-Show Rate & Cancellation Rate)
- **Rule Reference:** `R-12-5`, `R-12-6`
- **Purpose:** Track clinic no-show and cancellation metrics across reporting intervals.
- **Formulas:**
  $$\text{totalScheduled} = \text{completed} + \text{no\_show} + \text{cancelled} + \text{arrived} + \text{scheduled}$$
  $$\text{noShowRate} = \begin{cases} 0.0 & \text{if } \text{totalScheduled} = 0 \\ \text{round}\left( \frac{\text{no\_show}}{\text{totalScheduled}} \times 100, 1 \right) & \text{otherwise} \end{cases}$$
  $$\text{cancellationRate} = \begin{cases} 0.0 & \text{if } \text{totalScheduled} = 0 \\ \text{round}\left( \frac{\text{cancelled}}{\text{totalScheduled}} \times 100, 1 \right) & \text{otherwise} \end{cases}$$

#### Worked Examples
1. **Normal Case:**
   - Month of October: Completed $= 160$, Cancelled $= 24$, No-Show $= 10$, Arrived/Scheduled $= 6$.
   - $\text{totalScheduled} = 160 + 24 + 10 + 6 = 200$.
   - $\text{noShowRate} = \frac{10}{200} \times 100 =$ **`5.0%`**.
   - $\text{cancellationRate} = \frac{24}{200} \times 100 =$ **`12.0%`**.
2. **Edge Case (Zero No-Shows):**
   - Total scheduled $= 85$, No-Shows $= 0$.
   - **Result:** **`0.0%`**.
3. **Zero Period Appointments:**
   - Newly opened room with zero bookings ($\text{totalScheduled} = 0$).
   - **Result:** **`0.0%`**.

---

## 4. Package Calculations

### 4.1 Package Expiry Date & Expiration Window
- **Rule Reference:** `R-2-6`, `R-7-1`, `R-7-4`
- **Purpose:** Compute the exact validity window for multi-session packages.
- **Inputs:**
  - `purchaseDate`: Local calendar date in `Africa/Cairo` (`YYYY-MM-DD`).
  - `validityDays`: Default 60 days (or configured clinic default).
- **Formula:**
  $$D_{\text{expiry}} = D_{\text{purchase}} + \text{validityDays} \text{ calendar days}$$
  $$\text{expiryTimestamp} = D_{\text{expiry}} \text{ at } 23:59:59.999 \text{ Africa/Cairo}$$
- **Extension Rule (`R-7-6`):**
  $$D_{\text{expiry\_new}} = D_{\text{expiry}} + N \text{ days} \quad (1 \le N \le 365)$$

#### Worked Examples
1. **Normal Case (Standard 60-Day Expiry):**
   - Purchase Date: `2026-10-25`.
   - Days remaining in October (31 days): $31 - 25 = 6\text{ days}$ (Oct 26, 27, 28, 29, 30, 31).
   - Days in November: $30\text{ days}$. Cumulative: $6 + 30 = 36\text{ days}$.
   - Remaining days needed in December: $60 - 36 = 24\text{ days}$.
   - **Result:** Expiry Date is **`2026-12-24`**.
   - Usable throughout `2026-12-24` until `23:59:59.999`.
   - On `2026-12-25 00:00:00`: Package is **`expired`**.
2. **Edge Case (Leap Year February Window):**
   - Purchase Date: `2028-01-15` (2028 is a leap year; February has 29 days).
   - Remaining Jan: $31 - 15 = 16\text{ days}$.
   - Feb 2028: $29\text{ days}$. Cumulative: $45\text{ days}$.
   - Needed in March: $60 - 45 = 15\text{ days}$.
   - **Result:** Expiry Date is **`2028-03-15`**.
3. **Invalid Extension Request:**
   - Attempting to extend by $0$ days or $400$ days.
   - **Result:** Validation Error: `"Extension days must be between 1 and 365 days."`

---

### 4.2 Days Left & Forfeited Sessions
- **Rule Reference:** `R-6-1`, `R-7-4`, `R-12-4`
- **Purpose:** Track urgency alerts on front-desk dashboards and compute lost patient sessions upon expiration.
- **Formulas:**
  $$\text{daysLeft} = \max\left(0, D_{\text{expiry}} - D_{\text{today}}\right)$$
  $$\text{forfeitedSessions} = \begin{cases} \text{totalSessions} - \text{completedSessions} & \text{if status} == \text{'expired'} \\ 0 & \text{otherwise} \end{cases}$$
- **Low Sessions Alert:** Triggered if $\text{availableSessions} \le 1$.
- **Expiring Soon Alert:** Triggered if $\text{daysLeft} \le 7$ and status is `active`.

#### Worked Examples
1. **Normal Case (Days Left Countdown):**
   - Package Expiry: `2026-12-24`. Today's Date: `2026-12-20`.
   - Days Left: $2026-12-24 - 2026-12-20 =$ **`4 days left`** (triggers "Expiring in $\le 7$ days" alert).
2. **Edge Case (Last Day of Validity):**
   - Package Expiry: `2026-12-24`. Today's Date: `2026-12-24`.
   - Days Left: $2026-12-24 - 2026-12-24 =$ **`0 days left`**.
   - **Result:** Still usable today until end of day (`23:59:59.999`).
3. **Expired Package with Forfeited Sessions:**
   - Package: 10 total sessions. Completed to date: 3 sessions.
   - Today's Date: `2026-12-25` (one day past expiry).
   - Package status resolves to `expired`.
   - **Result:** $\text{forfeitedSessions} = 10 - 3 =$ **`7 forfeited sessions`**.

---

### 4.3 Package Status Dynamic Resolution
- **Rule Reference:** `R-7-4`
- **Purpose:** Resolve the current operational state of a package dynamically without storing an outdated status column.
- **Inputs:**
  - `isCancelled`: Boolean
  - `totalSessions`: Integer
  - `completedSessions`: Integer
  - `expiryDate`: Calendar date
  - `today`: Current calendar date in `Africa/Cairo`
- **Resolution Tree:**
  $$\text{status} = \begin{cases} 
  \text{'cancelled'} & \text{if } \text{isCancelled} = \text{true} \\
  \text{'completed'} & \text{else if } \text{completedSessions} \ge \text{totalSessions} \\
  \text{'expired'} & \text{else if } \text{today} > \text{expiryDate} \\
  \text{'active'} & \text{otherwise}
  \end{cases}$$

#### Worked Examples
1. **Completed Package:**
   - 6 sessions total, 6 sessions completed, expiry date `2026-12-24`, today `2026-11-15`.
   - **Result:** **`'completed'`**.
2. **Expired with Unused Sessions:**
   - 12 sessions total, 8 completed, expiry date `2026-12-24`, today `2026-12-25`.
   - **Result:** **`'expired'`** (4 sessions forfeited).
3. **Explicitly Cancelled Package:**
   - 10 sessions total, 2 completed, cancelled by Clinic Manager on `2026-11-01`.
   - **Result:** **`'cancelled'`**.

---

### 4.4 Available Sessions & Rescheduling Self-Exclusion
- **Rule Reference:** `R-5.2-7`, `R-5.5-8`, `DEC-008`
- **Purpose:** Accurately compute uncommitted package sessions and permit rescheduling of existing bookings without self-collision errors.
- **Formula:**
  $$\text{availableSessions} = \text{totalSessions} - \text{completedSessions} - \text{futureBookedSessions}$$
  where:
  $$\text{futureBookedSessions} = \text{count}\Big( \text{appointments where packageId} = P \;\text{AND}\; \text{status} \in \{\text{'scheduled'}, \text{'arrived'}, \text{'waitlisted'}\} \;\text{AND}\; \text{id} \neq \text{reschedulingAppointmentId} \Big)$$
- **Booking Check Rule:** Booking is accepted only if $\text{availableSessions} > 0$ and $\text{appointmentDate} \le \text{packageExpiryDate}$.

#### Worked Examples
1. **Normal Case (Quota Calculation):**
   - Package: 10 total sessions.
   - Completed sessions: 3.
   - Future booked appointments: 2 (1 `scheduled`, 1 `waitlisted`).
   - Calculation: $10 - 3 - 2 =$ **`5 available sessions`**. Booking a new appointment is permitted.
2. **Edge Case (Rescheduling Appointment When Available Sessions = 0):**
   - Package: 6 total sessions.
   - Completed sessions: 5.
   - Scheduled appointments: 1 (Appointment #501).
   - New booking check without exclusion: $6 - 5 - 1 = 0$ available.
   - Patient calls to reschedule Appointment #501 to a different day.
   - Rescheduling check: Excludes #501 from `futureBookedSessions` $\rightarrow$ $6 - 5 - 0 = 1$ available.
   - **Result:** Rescheduling is **ALLOWED** (appointment does not count against itself).
3. **Invalid Case (Overbooking Exhausted Package):**
   - Package: 8 total sessions. Completed: 6. Future booked: 2.
   - Available sessions: $8 - 6 - 2 = 0$.
   - Front desk attempts to book another session.
   - **Result:** Validation Error: `"Package has zero available sessions remaining."`

---

### 4.5 Per-Session Value
- **Rule Reference:** `R-7-3`, `R-8.3-2`, `R-11-1`
- **Purpose:** Determine the exact monetary worth of an individual session from a multi-session package for refunds, commission calculations, and cancelled package balances.
- **Inputs:**
  - `totalPricePiasters`: Integer piasters
  - `totalSessions`: Integer ($\ge 1$)
- **Formula:**
  $$\text{perSessionValuePiasters} = \left\lfloor \frac{\text{totalPricePiasters}}{\text{totalSessions}} \right\rfloor$$
- **Rounding:** Strictly round **DOWN (Floor)** to the integer piaster.

#### Worked Examples
1. **Normal Case (Strict Floor Rounding Down):**
   - Package Price: `1,000.00 EGP` ($= 100,000\text{ piasters}$).
   - Total Sessions: `3 sessions`.
   - Division: $100,000 / 3 = 33,333.333\dots\text{ piasters}$.
   - Floor: $\lfloor 33,333.333\dots \rfloor = 33,333\text{ piasters}$.
   - **Result:** **`33,333 piasters` (`333.33 EGP`) per session**.
   - *(Note: $3 \times 333.33 = 999.99\text{ EGP}$; the remaining 1 piaster remains with the clinic and avoids overpaying during refunds or commission payouts).*
2. **Edge Case (Exact Clean Division):**
   - Package Price: `4,000.00 EGP` ($= 400,000\text{ piasters}$).
   - Total Sessions: `10 sessions`.
   - Division: $400,000 / 10 = 40,000\text{ piasters}$.
   - **Result:** **`40,000 piasters` (`400.00 EGP`) per session**.
3. **Invalid Case (Zero Sessions):**
   - Input: Sessions $= 0$.
   - **Result:** Validation Error: `"Total package sessions must be at least 1."`

---

## 5. Billing, Balances & Cash Calculations

### 5.1 Charge Balance Calculation
- **Rule Reference:** `R-8.1-1`, `R-8.1-3`, `DEC-023`
- **Purpose:** Determine the outstanding amount owed on any charge dynamically without storing a balance field.
- **Formula:**
  $$\text{balancePiasters} = \max\left(0, \text{owedPiasters} - (\text{nonVoidedPaymentsPiasters} - \text{refundsPiasters}) - \text{writeOffsPiasters}\right)$$
  Where:
  - For a **Standalone Appointment**: $\text{owedPiasters} = \text{appointment.pricePiasters}$
  - For an **Active / Completed Package**: $\text{owedPiasters} = \text{package.totalPricePiasters}$
  - For a **Cancelled Package**: $\text{owedPiasters} = \text{completedSessions} \times \text{perSessionValuePiasters}$
  - $\text{nonVoidedPaymentsPiasters} = \sum \text{payments where status} \neq \text{'voided'}$

#### Worked Examples
1. **Normal Case (Single-Appointment Partial Payment):**
   - Standalone Physiotherapy visit price: `450.00 EGP` ($45,000\text{ piasters}$).
   - Payment collected: `200.00 EGP` ($20,000\text{ piasters}$).
   - No refunds, no write-offs.
   - Calculation: $45,000 - 20,000 = 25,000\text{ piasters}$.
   - **Result:** **`25,000 piasters` (`250.00 EGP`) remaining balance due**.
2. **Edge Case (Voided Payment Ignored):**
   - Standalone Assessment visit price: `450.00 EGP` ($45,000\text{ piasters}$).
   - Payment 1: `200.00 EGP` (marked **`voided`** due to clerical error).
   - Payment 2: `100.00 EGP` (active).
   - Non-voided payments: $100.00\text{ EGP}$ ($10,000\text{ piasters}$).
   - Calculation: $45,000 - 10,000 = 35,000\text{ piasters}$.
   - **Result:** **`35,000 piasters` (`350.00 EGP`) balance due** (voided payment completely excluded).
3. **Cancelled Package with Refund (Patient Never Made to Owe Money):**
   - Package Price: `1,000.00 EGP` ($100,000\text{ piasters}$), 3 sessions.
   - Per-session value: $33,333\text{ piasters}$ (`333.33 EGP`).
   - Patient paid in full: $100,000\text{ piasters}$ (`1,000.00 EGP`).
   - Patient completed 1 session (used value $= 33,333\text{ piasters}$).
   - Package is cancelled by Manager; refund of $66,667\text{ piasters}$ (`666.67 EGP`) is issued.
   - Balance formula evaluation:
     - $\text{owed} = 1 \times 33,333 = 33,333\text{ piasters}$.
     - $\text{nonVoidedPayments} - \text{refunds} = 100,000 - 66,667 = 33,333\text{ piasters}$.
     - $\text{balance} = \max(0, 33,333 - 33,333) = 0\text{ piasters}$.
   - **Result:** **`0.00 EGP` balance due**. The refund never creates a phantom debt.

---

### 5.2 Payment Validation & Overpayment Prevention
- **Rule Reference:** `R-8.2-1`
- **Purpose:** Ensure all payments strictly settle valid debts and prevent overcollection.
- **Validation Rules:**
  1. $\text{paymentAmountPiasters} > 0$
  2. $\text{paymentAmountPiasters} \le \text{charge.balancePiasters}$

#### Worked Examples
1. **Normal Case (Full Settlement):**
   - Outstanding charge balance: `250.00 EGP` ($25,000\text{ piasters}$).
   - Payment entered: `250.00 EGP` ($25,000\text{ piasters}$).
   - **Result:** **Accepted**. New balance becomes `0.00 EGP`.
2. **Edge Case (Overpayment by 0.01 EGP / 1 Piaster):**
   - Outstanding charge balance: `150.00 EGP` ($15,000\text{ piasters}$).
   - Receptionist enters payment of: `150.01 EGP` ($15,001\text{ piasters}`).
   - Check: $15,001 > 15,000$.
   - **Result:** **BLOCKED with error:** `"Payment amount (150.01 EGP) exceeds remaining balance of 150.00 EGP by 0.01 EGP."`
3. **Invalid Case (Payment When Nothing is Due):**
   - Outstanding charge balance: `0.00 EGP` ($0\text{ piasters}$).
   - Receptionist attempts to record payment of `100.00 EGP`.
   - **Result:** **BLOCKED with error:** `"Cannot record payment: Charge has zero balance due."`

---

### 5.3 Maximum Refund Calculation
- **Rule Reference:** `R-8.3-2`
- **Purpose:** Enforce legal and operational refund ceilings.
- **Inputs:**
  - `netPaidPiasters`: $\sum \text{nonVoidedPayments} - \sum \text{refunds}$
  - `usedSessionsValuePiasters`: $\text{completedSessions} \times \text{perSessionValuePiasters}$
- **Formula:**
  $$\text{maxRefundPiasters} = \max\left(0, \text{netPaidPiasters} - \text{usedSessionsValuePiasters}\right)$$
- **Policy Rule:** Expired packages default to max refund $= 0$ unless Owner explicitly overrides.

#### Worked Examples
1. **Normal Case (Package Refund):**
   - Package Price: `2,000.00 EGP` ($200,000\text{ piasters}$), 10 sessions.
   - Per-session value: $20,000\text{ piasters}$ (`200.00 EGP`).
   - Paid to date: `1,500.00 EGP` ($150,000\text{ piasters}`).
   - Completed sessions: 4 sessions ($= 4 \times 20,000 = 80,000\text{ piasters} = 800.00\text{ EGP}`).
   - Max Refund: $150,000 - 80,000 = 70,000\text{ piasters}$.
   - **Result:** **`700.00 EGP` maximum allowable refund**.
2. **Edge Case (Used Sessions Exceed Paid Amount):**
   - Package Price: `2,000.00 EGP`, 10 sessions ($200.00\text{ EGP}$ per session).
   - Paid to date: `500.00 EGP` ($50,000\text{ piasters}`).
   - Completed sessions: 3 sessions ($= 3 \times 20,000 = 60,000\text{ piasters} = 600.00\text{ EGP}`).
   - Max Refund: $\max(0, 50,000 - 60,000) = 0\text{ piasters}$.
   - **Result:** **`0.00 EGP`** (no refund permitted).
3. **Invalid Case (Exceeding Refund Ceiling):**
   - Using Normal Case figures (max refund $= 700.00\text{ EGP}$). Manager attempts to process refund of `700.01 EGP`.
   - **Result:** **BLOCKED with error:** `"Refund amount cannot exceed maximum allowable limit of 700.00 EGP."`

---

### 5.4 Cash Shift Closing (End of Shift)
- **Rule Reference:** `R-8.4-1`, `R-8.3-3`, `DEC-011`, `DEC-015`
- **Purpose:** Reconcile cash drawer transactions recorded by a specific receptionist during their active shift.
- **Inputs:**
  - $\sum \text{cashPaymentsPiasters}$: Cash collected by this user since last closing.
  - $\sum \text{cashRefundsPiasters}$: Cash refunds handed out by this user since last closing.
  - $\sum \text{cashExpensesPiasters}$: Cash expenses recorded by this user since last closing.
  - $\text{countedCashPiasters}$: Physical cash counted in drawer entered by receptionist.
- **Formulas:**
  $$\text{expectedCashPiasters} = \sum \text{cashPaymentsPiasters} - \sum \text{cashRefundsPiasters} - \sum \text{cashExpensesPiasters}$$
  $$\text{differencePiasters} = \text{countedCashPiasters} - \text{expectedCashPiasters}$$
- **Discrepancy Status:**
  - $\text{difference} = 0$: Balanced.
  - $\text{difference} < 0$: Shortage (cash deficit).
  - $\text{difference} > 0$: Overage (cash surplus).

#### Worked Examples
1. **Normal Case with Cash Discrepancy (Exact Spec Case):**
   - Cash Payments: $450.00\text{ EGP} + 600.00\text{ EGP} = 1,050.00\text{ EGP}$ ($105,000\text{ piasters}$).
   - Cash Refund handed out: $50.00\text{ EGP}$ ($5,000\text{ piasters}$).
   - Cash Expense recorded: $20.00\text{ EGP}$ ($2,000\text{ piasters}$).
   - Counted Cash entered: $970.00\text{ EGP}$ ($97,000\text{ piasters}$).
   - Calculations:
     $$\text{expectedCash} = 105,000 - 5,000 - 2,000 = 98,000\text{ piasters } (\mathbf{980.00\text{ EGP}})$$
     $$\text{difference} = 97,000 - 98,000 = -1,000\text{ piasters } (\mathbf{-10.00\text{ EGP}})$$
   - **Result:** **Expected `980.00 EGP`, Difference `-10.00 EGP` (Shortage)**.
2. **Edge Case (Perfect Exact Closing):**
   - Cash Payments: $800.00\text{ EGP}$ ($80,000\text{ piasters}$). Cash Refunds: $0$. Cash Expenses: $100.00\text{ EGP}$ ($10,000\text{ piasters}$).
   - Counted Cash entered: $700.00\text{ EGP}$ ($70,000\text{ piasters}$).
   - $\text{expectedCash} = 80,000 - 10,000 = 70,000\text{ piasters}$.
   - **Result:** **Expected `700.00 EGP`, Difference `0.00 EGP` (Balanced)**.
3. **Invalid Case (Negative Counted Cash):**
   - Receptionist enters Counted Cash: `-50.00 EGP`.
   - **Result:** Validation Error: `"Counted cash cannot be a negative amount."`

---

### 5.5 Clinician Commission Calculation
- **Rule Reference:** `R-3-1`, `R-11-1`, `DEC-010`
- **Purpose:** Compute therapist and nutritionist compensation per completed treatment session.
- **Session Basis Value:**
  - For a **Standalone Appointment**: $\text{sessionValuePiasters} = \text{appointment.pricePiasters}$
  - For a **Package Session**: $\text{sessionValuePiasters} = \text{package.perSessionValuePiasters}$
- **Commission Formulas:**
  - **Percentage (`percent`):**
    $$\text{commissionPiasters} = \text{round}\left( \frac{\text{sessionValuePiasters} \times \text{commissionRate}}{100} \right)$$
    *(Rounds to the nearest integer piaster)*
  - **Fixed per session (`fixed_per_session`):**
    $$\text{commissionPiasters} = \text{fixedAmountPiasters}$$
  - **None (`none`):**
    $$\text{commissionPiasters} = 0$$
    *(Default for Owner account)*

#### Worked Examples
1. **Normal Case (Package Session Percentage Commission):**
   - Package: `4,000.00 EGP` ($400,000\text{ piasters}$), 10 sessions.
   - Per-session value: $400,000 / 10 = 40,000\text{ piasters}$ (`400.00 EGP`).
   - Clinician commission setting: `percent = 25%`.
   - Calculation:
     $$\text{commission} = \text{round}\left( \frac{40,000 \times 25}{100} \right) = 10,000\text{ piasters } (\mathbf{100.00\text{ EGP}})$$
   - **Result:** **`10,000 piasters` (`100.00 EGP`)**.
2. **Edge Case (Commission Rounding to Nearest Piaster on Fraction):**
   - Package: `1,000.00 EGP` / 3 sessions $\rightarrow$ Per-session value $= 33,333\text{ piasters}$ (`333.33 EGP`).
   - Clinician commission setting: `percent = 25%`.
   - Raw calculation: $33,333 \times 0.25 = 8,333.25\text{ piasters}$.
   - Rounding to nearest piaster: $\text{round}(8,333.25) = 8,333\text{ piasters}$.
   - **Result:** **`8,333 piasters` (`83.33 EGP`)**.
   - *(Note: If rate was 35%: $33,333 \times 0.35 = 11,666.55\text{ piasters} \rightarrow \mathbf{11,667\text{ piasters}}$ / `116.67 EGP`).*
3. **Fixed Amount per Session:**
   - Clinician commission setting: `fixed_per_session = 7,500 piasters` (`75.00 EGP`).
   - Session completed (regardless of session price).
   - **Result:** **`7,500 piasters` (`75.00 EGP`)**.
4. **Owner Account (Default None):**
   - Owner completes a 600.00 EGP assessment session. Commission setting is `none`.
   - **Result:** **`0 piasters` (`0.00 EGP`)**.

---

### 5.6 Annual Receipt Counter Rollover
- **Rule Reference:** `R-8.2-2`, `R-8.2-3`, `DEC-017`
- **Purpose:** Guarantee contiguous, sequential receipt numbers per calendar year without collision risks or gaps.
- **Format:**
  $$\text{receiptNumber} = \text{"INV-" } + \text{YYYY} + \text{"-" } + \text{padLeft}(\text{counter}, 5, \text{'0'})$$
- **Rollover Rule:** At `00:00:00.000` on January 1st local clinic time (`Africa/Cairo`), the counter resets to 1.

#### Worked Examples
1. **Normal Case:**
   - Date: `2026-10-25 14:30:00` Cairo time.
   - Current 2026 counter value: 142.
   - Next receipt generated: **`"INV-2026-00143"`**.
2. **Edge Case (New Year Midnight Rollover):**
   - Last receipt of 2026 issued at `2026-12-31 23:59:58` Cairo time: `"INV-2026-08954"`.
   - First receipt of 2027 issued at `2027-01-01 00:00:02` Cairo time:
   - Counter resets for year `2027` to 1.
   - Next receipt generated: **`"INV-2027-00001"`**.
3. **Concurrency Protection:**
   - Concurrent payments generated at the same millisecond execute within a serial transaction with sequence locks, preventing duplicate receipt numbers.

---

## 6. Clinical & Nutrition Calculations

### 6.1 Body Mass Index (BMI)
- **Rule Reference:** `R-9.4-1`
- **Purpose:** Automatically calculate BMI in InBody and nutrition consultation records.
- **Inputs:**
  - `weightKg`: Decimal (kg)
  - `heightCm`: Decimal (cm)
- **Formula:**
  $$\text{heightM} = \frac{\text{heightCm}}{100}$$
  $$\text{BMI} = \text{round}\left( \frac{\text{weightKg}}{\text{heightM}^2}, 1 \right)$$
- **WHO Classification Standards:**
  - Underweight: $< 18.5$
  - Normal Weight: $18.5 \le \text{BMI} < 25.0$
  - Overweight: $25.0 \le \text{BMI} < 30.0$
  - Obese Class I: $30.0 \le \text{BMI} < 35.0$
  - Obese Class II: $35.0 \le \text{BMI} < 40.0$
  - Obese Class III: $\ge 40.0$

#### Worked Examples
1. **Normal Case:**
   - Weight: `70.0 kg`, Height: `170.0 cm` ($1.70\text{ m}$).
   - Height squared: $1.70 \times 1.70 = 2.89\text{ m}^2$.
   - Calculation: $70.0 / 2.89 = 24.22145\dots$
   - **Result:** **`24.2` (Normal Weight)**.
2. **Edge Case (Overweight Classification Boundary):**
   - Weight: `81.0 kg`, Height: `180.0 cm` ($1.80\text{ m}$).
   - Calculation: $81.0 / (1.80 \times 1.80) = 81.0 / 3.24 = 25.0$.
   - **Result:** **`25.0` (Overweight)**.
3. **Invalid / Error Case (Out of Range Values):**
   - Input: Height $= 0\text{ cm}$ or Weight $= -5\text{ kg}$.
   - **Result:** Validation Error: `"Height must be between 50 and 250 cm; weight must be between 20 and 300 kg."`

---

### 6.2 Basal Metabolic Rate (BMR — Mifflin-St Jeor)
- **Rule Reference:** `R-9.4-1`
- **Purpose:** Provide baseline metabolic calorie expenditure for nutrition consultation planning.
- **Inputs:**
  - `weightKg`: Weight in kilograms
  - `heightCm`: Height in centimeters
  - `ageYears`: Patient age in years
  - `gender`: `'male'` or `'female'`
- **Formula (Mifflin-St Jeor Equation):**
  $$\text{BMR} = \text{round}\Big( 10 \times \text{weightKg} + 6.25 \times \text{heightCm} - 5 \times \text{ageYears} + s \Big)$$
  where:
  $$s = \begin{cases} +5 & \text{for males} \\ -161 & \text{for females} \end{cases}$$
- **Rounding:** Nearest integer kcal/day.

#### Worked Examples
1. **Normal Male Example:**
   - Male, Weight: `80.0 kg`, Height: `175.0 cm`, Age: `35 years`.
   - Calculation:
     $$\text{BMR} = (10 \times 80) + (6.25 \times 175) - (5 \times 35) + 5$$
     $$\text{BMR} = 800 + 1093.75 - 175 + 5 = 1723.75$$
   - Round to nearest integer:
   - **Result:** **`1,724 kcal/day`**.
2. **Normal Female Example:**
   - Female, Weight: `65.0 kg`, Height: `160.0 cm`, Age: `30 years`.
   - Calculation:
     $$\text{BMR} = (10 \times 65) + (6.25 \times 160) - (5 \times 30) - 161$$
     $$\text{BMR} = 650 + 1000 - 150 - 161 = 1339.0$$
   - **Result:** **`1,339 kcal/day`**.
3. **Invalid / Out of Range Case:**
   - Patient record with Age $= 0$ or missing gender.
   - **Result:** Validation Error: `"Age must be at least 1 year, and gender must be specified as male or female."`

---

### 6.3 Clinical Note Edit Countdown
- **Rule Reference:** `R-9.2-1`, `R-9.2-2`, `DEC-016`
- **Purpose:** Calculate remaining editable window for clinical session notes before permanent lockdown.
- **Inputs:**
  - `completedAt`: UTC timestamp of session completion save
  - `currentTime`: Current UTC timestamp
- **Formula:**
  $$\text{remainingMinutes} = \max\left(0, \left\lfloor \frac{(\text{completedAt} + 24\text{ hours}) - \text{currentTime}}{60\text{ seconds}} \right\rfloor\right)$$
- **Enforcement Rule:**
  - If $\text{remainingMinutes} > 0$: Full note editing permitted (generates a version record).
  - If $\text{remainingMinutes} == 0$: Note locked; author may only append an **addendum**.

#### Worked Examples
1. **Normal Case (Within Edit Window):**
   - Note completed at: `2026-10-25 10:00:00 UTC`.
   - Current time: `2026-10-25 14:30:00 UTC` ($4.5\text{ hours}$ elapsed).
   - Remaining time: $24 - 4.5 = 19.5\text{ hours}$ ($1,170\text{ minutes}$).
   - **Result:** **`1,170 minutes remaining`** $\rightarrow$ **Full Note Edit Allowed**.
2. **Edge Case (Exact 24-Hour Expiration Boundary):**
   - Note completed at: `2026-10-25 10:00:00 UTC`.
   - Current time: `2026-10-26 10:00:00 UTC` (exactly 24 hours).
   - Remaining time: $0\text{ minutes}$.
   - **Result:** **Note Locked**.
3. **Invalid Case (Attempted Edit on Locked Note):**
   - Current time: `2026-10-26 10:05:00 UTC` ($24\text{ hours } 5\text{ min}$ elapsed).
   - Clinician attempts to edit SOAP text directly.
   - **Result:** **BLOCKED with error:** `"The 24-hour edit window has expired. You may only add an addendum to this clinical record."`

---

## 7. Formula & Rule Traceability Matrix

| Section | Calculation / Formula | Rule IDs | Target Rounding | 3 Worked Examples |
|---|---|---|---|:---:|
| **§2.1** | Patient Age | `R-4.1-8`, `R-0-6` | Integer floor (completed years) | ✅ Included |
| **§2.2** | Egyptian Phone Normalization | `R-4.1-2`, `R-4.2-1`, `DEC-014` | Canonical `01XXXXXXXXX` | ✅ Included |
| **§2.3** | Arabic Name Similarity | `R-4.2-5` | String normalization | ✅ Included |
| **§3.1** | Appointment Overlap Detection | `R-5.2-3`, `R-5.2-4`, `R-5.2-5`, `R-5.2-9`, `R-5.2-10`, `DEC-008`, `DEC-021` | Boolean interval check | ✅ Included |
| **§3.2** | Late Minutes & Arrival Alert | `R-5.5-1`, `R-14-2`, `DEC-018` | Integer minutes ($\ge 0$) | ✅ Included |
| **§3.3** | Clinician Daily Utilization | `R-12-5` | 1 decimal place (%) | ✅ Included |
| **§3.4** | No-Show & Cancellation Rates | `R-12-5`, `R-12-6` | 1 decimal place (%) | ✅ Included |
| **§4.1** | Package Expiry Date & Window | `R-2-6`, `R-7-1`, `R-7-4` | Calendar date / 23:59:59.999 | ✅ Included |
| **§4.2** | Days Left & Forfeited Sessions | `R-6-1`, `R-7-4`, `R-12-4` | Integer days / integer sessions | ✅ Included |
| **§4.3** | Package Status Resolution | `R-7-4` | Dynamic enum status | ✅ Included |
| **§4.4** | Available Sessions & Reschedule | `R-5.2-7`, `R-5.5-8`, `DEC-008` | Integer sessions ($\ge 0$) | ✅ Included |
| **§4.5** | Per-Session Value | `R-7-3`, `R-8.3-2`, `R-11-1` | Floor to integer piaster | ✅ Included |
| **§5.1** | Charge Balance (Single & Package) | `R-8.1-1`, `R-8.1-3`, `DEC-023` | Integer piasters ($\max(0, \dots)$) | ✅ Included |
| **§5.2** | Payment Validation & Overpayment | `R-8.2-1` | Integer piasters | ✅ Included |
| **§5.3** | Maximum Refund Limit | `R-8.3-2` | Integer piasters | ✅ Included |
| **§5.4** | Cash Shift Closing | `R-8.4-1`, `R-8.3-3`, `DEC-011`, `DEC-015` | Integer piasters | ✅ Included |
| **§5.5** | Clinician Commission | `R-3-1`, `R-11-1`, `DEC-010` | Nearest integer piaster | ✅ Included |
| **§5.6** | Receipt Counter Rollover | `R-8.2-2`, `R-8.2-3`, `DEC-017` | `INV-YYYY-XXXXX` | ✅ Included |
| **§6.1** | Body Mass Index (BMI) | `R-9.4-1` | 1 decimal place | ✅ Included |
| **§6.2** | Basal Metabolic Rate (BMR) | `R-9.4-1` | Nearest integer kcal/day | ✅ Included |
| **§6.3** | Note Edit Window Countdown | `R-9.2-1`, `R-9.2-2`, `DEC-016` | Integer minutes ($\ge 0$) | ✅ Included |
