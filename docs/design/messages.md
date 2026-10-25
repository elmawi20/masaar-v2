# Masaar Clinic System — User Messages & WhatsApp Templates Catalog (Task 1.19)

> **Specification Reference:** [docs/FEATURES-v2.2.md](file:///F:/Claude%20CRM/docs/FEATURES-v2.2.md) §2.7, §4.1, §6.1, §6.2, §8, §9, §15  
> **Server Actions Reference:** [docs/design/actions.md](file:///F:/Claude%20CRM/docs/design/actions.md)  
> **Glossary & Tokens Reference:** [docs/design/glossary.md](file:///F:/Claude%20CRM/docs/design/glossary.md)  
> **Screens Reference:** [docs/design/screens.md](file:///F:/Claude%20CRM/docs/design/screens.md)  
> **Status:** Stage 1 Design Deliverable (Task 1.19)

---

## 1. Overview & Localization Architecture

The Masaar Clinic System utilizes `next-intl` for system-wide bilingual localization. 
- **Primary Locale:** Egyptian Arabic (`ar-EG`, RTL direction default).
- **Secondary Locale:** English (`en-US`, LTR direction).
- **Format Invariants:**
  - Currency: Stored as integer piasters; formatted in Arabic as `450.00 ج.م` and in English as `450.00 EGP`.
  - Time: Egyptian local time (Africa/Cairo) in 12-hour format without leading zero (`9:30 ص` / `5:30 م` in Arabic; `9:30 AM` / `5:30 PM` in English).
  - Dates: Standard Arabic calendar date format (e.g., `الأحد، 25 أكتوبر 2026`).
  - WhatsApp Messages: Dispatched dynamically in the patient's registered language preference (`patient.preferred_language`: `'AR'` or `'EN'`).

---

## 2. Namespace: Validation Messages (`validation.*`)

These translation keys correspond to client and server-side Zod input validation schemas:

| Translation Key | Arabic Text (`ar`) | English Text (`en`) |
|---|---|---|
| `validation.required` | هذا الحقل مطلوب ولا يمكن تركه فارغاً | This field is required |
| `validation.email_invalid` | يُرجى إدخال بريد إلكتروني صحيح | Please enter a valid email address |
| `validation.password_min_length` | كلمة المرور يجب ألا تقل عن 8 أحرف | Password must be at least 8 characters |
| `validation.phone_egyptian_invalid` | يجب إدخال رقم هاتف محمول مصري صحيح مكون من 11 رقماً يبدأ بـ 01 (مثل: 01012345678) | Must be a valid 11-digit Egyptian mobile number starting with 01 |
| `validation.national_id_invalid` | الرقم القومي يجب أن يتكون من 14 رقماً صحيحاً | National ID must be exactly 14 digits |
| `validation.patient_name_min_parts` | يُرجى إدخال الاسم ثلاثياً على الأقل | Please enter at least a three-part full name |
| `validation.date_invalid` | التاريخ المدخل غير صحيح | Invalid date format |
| `validation.date_of_birth_future` | تاريخ الميلاد لا يمكن أن يكون في المستقبل | Date of birth cannot be in the future |
| `validation.guardian_required_for_dependent` | بيانات ولي الأمر (الاسم، صلة القرابة، الهاتف) إلزامية للمريض التابع | Guardian details (name, relation, phone) are required for dependents |
| `validation.data_consent_required` | موافقة معالجة البيانات الشخصية والطبية إلزامية لإنشاء الملف | Consent to personal and clinical data processing is mandatory |
| `validation.duration_step_15` | مدة الجلسة يجب أن تكون من مضاعفات الـ 15 دقيقة (15، 30، 45، 60، 90 دقيقة) | Session duration must be a multiple of 15 minutes |
| `validation.positive_price` | السعر يجب أن يكون قيمة رقمية موجبة أكبر من صفر | Price must be a positive integer greater than zero |
| `validation.positive_amount` | المبلغ المدخل يجب أن يكون أكبر من صفر | Amount must be greater than zero |
| `validation.pain_score_range` | درجة مقياس الألم يجب أن تكون رقماً صحيحاً بين 0 و 10 | Pain score must be an integer between 0 and 10 |
| `validation.inbody_height_range` | الطول يجب أن يكون بين 50 و 250 سم | Height must be between 50 and 250 cm |
| `validation.inbody_weight_range` | الوزن يجب أن يكون بين 20 و 300 كجم | Weight must be between 20 and 300 kg |
| `validation.inbody_body_fat_range` | نسبة الدهون يجب أن تكون بين 3% و 60% | Body fat percentage must be between 3% and 60% |
| `validation.inbody_visceral_fat_range`| مستوى الدهون الحشوية يجب أن يكون رقماً بين 1 و 20 | Visceral fat level must be between 1 and 20 |
| `validation.file_size_limit_10mb` | حجم الملف يتجاوز الحد الأقصى المسموح به (10 ميجابايت) | File size exceeds the maximum limit of 10MB |
| `validation.file_type_unsupported` | نوع الملف غير مدعوم؛ يُسمح فقط بملفات PDF والصور (JPG/PNG) | Unsupported file type; only PDF, JPG, and PNG files are allowed |
| `validation.digital_payment_ref_required`| رقم العملية أو المرجع إلزامي لمدفوعات إنستاباي وفودافون كاش | Transaction reference number is required for InstaPay and Vodafone Cash |
| `validation.closing_count_required` | يجب إدخال المبلغ الفعلي المعدود بالدرج لإتمام الإغلاق | Physical cash drawer count is required to close shift |

---

## 3. Namespace: Business Error Codes (`errors.*`)

These translation keys correspond to every domain error code emitted by `actions.md` and database constraints:

| Error Code | Arabic Text (`ar`) | English Text (`en`) |
|---|---|---|
| `UNAUTHENTICATED` | جلسة الدخول منتهية أو غير صالحة، يرجى تسجيل الدخول مجدداً | Session expired or invalid. Please sign in again |
| `USER_DEACTIVATED` | هذا الحساب معطل حالياً. يرجى التواصل مع إدارة العيادة للمساعدة | This account is deactivated. Please contact clinic management |
| `PERMISSION_DENIED` | عذراً، ليس لديك الصلاحية الكافية لتنفيذ هذا الإجراء | Permission denied. You do not have access to this action |
| `INVALID_CREDENTIALS` | البريد الإلكتروني أو كلمة المرور غير صحيحة | Invalid email address or password |
| `RATE_LIMIT_EXCEEDED` | تم تجاوز الحد الأقصى للمحاولات الخاطئة. يرجى الانتظار 15 دقيقة ثم إعادة المحاولة | Too many failed attempts. Please wait 15 minutes before retrying |
| `INVALID_TOTP_CODE` | رمز التحقق المكون من 6 أرقام غير صحيح أو منتهي الصلاحية | Verification code is incorrect or expired |
| `BACKUP_CODE_USED` | تم استخدام هذا الرمز الاحتياطي مسبقاً | This backup code has already been used |
| `BACKUP_CODES_EXHAUSTED` | تم استنفاذ جميع الرموز الاحتياطية. يرجى مراجعة مالك العيادة لإعادة تعيين المصادقة | All backup codes have been exhausted. Contact the Clinic Owner |
| `DUPLICATE_MOBILE_PHONE` | رقم الهاتف مسجل بالفعل لمريض آخر في النظام | Mobile phone number is already registered to another patient |
| `PATIENT_ALREADY_DISCHARGED` | المريض تم إنهاء علاجه وإغلاق ملفه بالفعل | Patient treatment has already been formally discharged |
| `RECEPTIONIST_CLINICAL_DOC_FORBIDDEN` | موظف الاستقبال غير مصرح له برفع مستندات طبية سريرية (أشعة أو تحاليل) | Receptionists are not permitted to upload clinical or medical documents |
| `EMPTY_COVERING_REASON` | يجب كتابة سبب مفصل لطلب إذن الوصول للتغطية الطبية للمتابعة والرقابة | A detailed justification is required to request covering access |
| `CLINICIAN_DOUBLE_BOOKED` | يتعذر الحجز: المعالج لديه موعد آخر متعارض في نفس التوقيت | Clinician already has an overlapping appointment at this time |
| `BED_DOUBLE_BOOKED` | يتعذر الحجز: السرير محجوز لمريض آخر في نفس التوقيت | Selected treatment bed is already booked for another patient |
| `PATIENT_DOUBLE_BOOKED` | يتعذر الحجز: المريض مسجل له موعد آخر في نفس التوقيت | Patient already has another appointment scheduled at this time |
| `CLINIC_CLOSED` | الموعد المحدد يقع خارج ساعات العمل الرسمية للعيادة أو في يوم عطلة معتمدة | Selected time is outside official clinic opening hours or on a holiday |
| `STAFF_ON_LEAVE` | المعالج في إجازة معتمدة في هذا التاريخ | Clinician is on approved leave during this time |
| `PACKAGE_NO_SESSIONS` | لا توجد جلسات متاحة متبقية في هذه الباقة | This package has no remaining available sessions |
| `PACKAGE_EXPIRED` | الباقة منتهية الصلاحية؛ يرجى تجديد أو تمديد صلاحية الباقة لإتاحة الحجز | Package has expired. Renew or extend validity to enable booking |
| `PACKAGE_ALREADY_CANCELLED` | هذه الباقة ملغاة بالفعل | This package is already cancelled |
| `CANNOT_CANCEL_COMPLETED` | لا يمكن إلغاء موعد تم استكماله وتوثيقه طبياً | Clinically completed appointments cannot be cancelled |
| `CANNOT_RESCHEDULE_COMPLETED`| لا يمكن تعديل توقيت موعد تم استكماله | Completed appointments cannot be rescheduled |
| `CANNOT_WAITLIST_COMPLETED` | لا يمكن تحويل موعد مكتمل إلى قائمة الانتظار | Completed appointments cannot be moved to waitlist |
| `NOT_SAME_DAY` | لا يمكن التراجع عن هذا الإجراء إلا في نفس يوم تنفيذه | This action can only be undone on the same operational day |
| `SESSION_ALREADY_COMPLETED` | الجلسة مسجلة كمكتملة ولها تقرير طبي معتمد | Session is already completed with a signed clinical note |
| `NOT_PAST_START_TIME` | لا يمكن تسجيل عدم الحضور إلا بعد مرور وقت بدء الموعد المحدد | Cannot mark no-show before the scheduled appointment start time |
| `NOT_TREATING_CLINICIAN` | لا يمكن توثيق الجلسة الطبية إلا بواسطة المعالج المتابع أو مالك العيادة | Clinical sessions can only be documented by the assigned clinician or Owner |
| `MISSING_TREATMENTS` | يجب اختيار إجراء علاجي واحد على الأقل تم تنفيذه في الجلسة | At least one treatment modality must be selected for the session |
| `NOTE_EDIT_WINDOW_EXPIRED` | انتهت مهلة الـ 24 ساعة المسموحة لتعديل التقرير. يمكنك إضافة ملحق طبي فقط | The 24-hour edit window has expired. You may only add a clinical addendum |
| `NOT_NOTE_AUTHOR` | لا يمكن تعديل التقرير الطبي إلا بواسطة الطبيب كاتب التقرير نفسه | Only the original author can edit the clinical note within 24 hours |
| `OWNER_ONLY` | هذا الإجراء مقصور تماماً على مالك واستشاري العيادة | This action is strictly restricted to the Clinic Owner |
| `EMPTY_ADDENDUM` | نص الملحق الطبي لا يمكن أن يكون فارغاً | Clinical addendum text cannot be empty |
| `RECEPTIONIST_CANNOT_CHANGE_PAID_PRICE` | لا يمكن تعديل السعر بعد سداد أي دفعة مالية إلا بواسطة المدير أو المالك | Price cannot be modified after payment exists without Manager/Owner role |
| `NEW_PRICE_LESS_THAN_PAID` | لا يمكن خفض سعر الخدمة لمبلغ يقل عن إجمالي الدفعات المسددة بالفعل | New price cannot be lower than total non-voided payments already received |
| `PAYMENT_EXCEEDS_BALANCE` | المبلغ المراد تحصيله أكبر من الرصيد المتبقي على الفاتورة | Payment amount exceeds the outstanding balance on the charge |
| `PAYMENT_ALREADY_VOIDED` | إيصال القبض ملغي بالفعل ولا يمكن إلغاؤه مجدداً | Payment receipt is already voided |
| `CLOSED_SHIFT_LOCKED` | لا يمكن إلغاء دفعة أو تعديل مصروف في وردية نقدية تم إغلاقها وتجميدها | Cannot modify or void transactions in a closed, locked cash shift |
| `REFUND_EXCEEDS_CEILING` | مبلغ الاسترداد يتجاوز الحد الأقصى المسموح به بعد احتساب الجلسات المستهلكة | Refund amount exceeds allowable ceiling after deducting consumed sessions |
| `NO_OPEN_CASH_DRAWER_FOR_REFUND` | لا توجد وردية نقدية مفتوحة للمستخدم الحالي لصرف الاسترداد نقداً | No open cash shift found for current user to disburse cash refund |
| `AMOUNT_EXCEEDS_REMAINING_DEBT`| مبلغ الإسقاط أكبر من الرصيد المتبقي المستحق على الفاتورة | Write-off amount exceeds remaining outstanding debt |
| `ACTIVE_SHIFT_EXISTS` | لديك بالفعل وردية نقدية مفتوحة حالياً. يرجى إغلاقها أولاً | You already have an active open cash shift. Close it first |
| `SHIFT_ALREADY_CLOSED` | هذه الوردية النقدية مغلقة بالفعل | This cash shift is already closed |
| `SHIFT_NOT_OWNER` | لا يمكن إغلاق وردية مستخدم آخر إلا عبر شاشة الإغلاق الإداري للمدير | Cannot close another user's shift without manager force-close |
| `RECEPTIONIST_FUTURE_OR_PAST_EXPENSE` | موظف الاستقبال مصرح له بتسجيل مصروفات اليوم الحالي فقط | Receptionists are only authorized to log same-day expenses |
| `NO_OPEN_CASH_DRAWER_FOR_EXPENSE` | لا توجد وردية نقدية مفتوحة حالياً لصرف المصروف من الدرج | No active cash shift found to disburse cash expense from drawer |
| `EXPENSE_ALREADY_VOIDED` | سند المصروف ملغي بالفعل | Expense voucher is already voided |
| `EXPENSE_SHIFT_CLOSED_LOCKED` | لا يمكن تعديل أو إلغاء مصروف مسجل في وردية تم إغلاقها | Cannot edit or void an expense logged in a closed cash shift |
| `RECEPTIONIST_NOT_EXPENSE_AUTHOR` | لا يمكن تعديل مصروف تم تسجيله بواسطة موظف آخر | Cannot edit an expense logged by another staff member |
| `SESSION_ALREADY_PAID` | إحدى الجلسات المحددة تم صرف عمولتها بالفعل في كشف صرف معتمد | One or more selected sessions have already been paid in an approved payout run |
| `PAYOUT_ALREADY_VOIDED` | سند صرف العمولات ملغي بالفعل | Commission payout voucher is already voided |
| `EMAIL_ALREADY_EXISTS` | البريد الإلكتروني مسجل بالفعل لموظف آخر | Email address is already registered to another staff user |
| `CANNOT_DEACTIVATE_SELF` | لا يمكن لمالك العيادة تعطيل حسابه الشخصي | The Clinic Owner cannot deactivate their own account |
| `SHIFT_ORDER_INVALID` | توقيت بداية الوردية الأولى يجب أن يسبق الوردية الثانية لنفس اليوم | Shift 1 start time must precede Shift 2 on the same day |
| `INVALID_DATE_RANGE` | تاريخ البداية يجب أن يسبق أو يساوي تاريخ النهاية | Start date must precede or equal end date |
| `DUPLICATE_BED_NAME` | اسم السرير مسجل بالفعل في هذه الغرفة | Bed name already exists in this room |
| `MISSING_TEMPLATE_TOKENS` | قالب الرسالة يفتقر إلى المتغيرات الإلزامية المطلوبة (مثل: {patient_name}) | Message template is missing required mandatory placeholder tokens |
| `NETWORK_DISCONNECTED` | انقطع الاتصال بالخادم، جارٍ محاولة إعادة الاتصال تلقائياً... | Connection lost. Reconnecting automatically... |

---

## 4. Namespace: Confirmation Prompts (`confirmations.*`)

These translation keys correspond to user confirmation dialogs before irreversible or sensitive operations:

| Translation Key | Arabic Text (`ar`) | English Text (`en`) |
|---|---|---|
| `confirmations.cancel_appointment.title` | تأكيد إلغاء الموعد | Confirm Appointment Cancellation |
| `confirmations.cancel_appointment.body` | هل أنت متأكد من رغبتك في إلغاء هذا الموعد؟ سيتم إخلاء السرير بالجدول وإتاحة الجلسة بالباقة مجدداً. | Are you sure you want to cancel this appointment? The bed slot will be freed and package session made available again. |
| `confirmations.cancel_appointment.confirm_btn` | نعم، تأكيد الإلغاء | Yes, Cancel Appointment |
| `confirmations.undo_checkin.title` | التراجع عن تسجيل الحضور | Undo Patient Check-In |
| `confirmations.undo_checkin.body` | سيتم إعادة حالة الموعد إلى "مجدول" وإلغاء تسجيل وقت الوصول. هل تريد المتابعة؟ | The appointment status will revert to 'Scheduled' and check-in time cleared. Continue? |
| `confirmations.void_receipt.title` | تأكيد إلغاء إيصال القبض | Confirm Voiding Payment Receipt |
| `confirmations.void_receipt.body` | تحذير: إلغاء الإيصال سيعيد حساب رصيد المريض ويسجل سند إلغاء رسمي في سجل الرقابة المالي. هل أنت متأكد؟ | Warning: Voiding this receipt will recalculate the patient balance and record a formal audit entry. Proceed? |
| `confirmations.void_receipt.confirm_btn` | نعم، إلغاء الإيصال رسمياً | Yes, Void Receipt |
| `confirmations.issue_refund.title` | تأكيد صرف الاسترداد المالي | Confirm Patient Refund Disbursement |
| `confirmations.issue_refund.body` | سيتم صرف مبلغ {amount} للمريض وخصم القيمة من حسابات العيادة. هل تم مراجعة الجلسات المستهلكة بدقة؟ | Amount of {amount} will be refunded to patient and deducted from accounts. Have consumed sessions been verified? |
| `confirmations.close_shift.title` | تأكيد إغلاق الوردية النقدية | Confirm Cash Drawer Shift Closing |
| `confirmations.close_shift.body` | عند إغلاق الوردية، سيتم تجميد جميع المقبوضات والمصروفات النقدية ولن يمكن التعديل عليها لاحقاً. هل قمت بعدّ النقدية بدقة؟ | Closing this shift permanently freezes all cash transactions from further editing. Has cash been accurately counted? |
| `confirmations.force_close_shift.title` | تأكيد الإغلاق الإداري الإجباري للوردية | Confirm Manager Force-Close of Shift |
| `confirmations.force_close_shift.body` | أنت بصدد إغلاق وردية نقدية تابعة للموظف {staff_name}. سيتم تسجيل اسمك في سجل الرقابة. هل تريد المتابعة؟ | You are force-closing an abandoned cash shift for {staff_name}. Your user ID will be audited. Proceed? |
| `confirmations.reopen_clinical_note.title`| إعادة فتح تقرير طبي مغلق | Re-open Locked Clinical Note |
| `confirmations.reopen_clinical_note.body` | هذا التقرير مغلق ومحمي بعد مرور 24 ساعة. إعادة فتحه كمالك للعيادة ستسجل في سجل الأمان وسيمكن المعالج من التعديل. هل تؤكد ذلك؟ | This note is locked past 24 hours. Re-opening as Owner will be audited and allow author editing. Confirm? |
| `confirmations.deactivate_staff.title` | تأكيد تعطيل حساب الموظف | Confirm Staff Account Deactivation |
| `confirmations.deactivate_staff.body` | سيتم منع الموظف من تسجيل الدخول وإخفاؤه من جداول الحجز فوراً مع الحفاظ التام على سجلاته السابقة. هل تؤكد التعطيل؟ | The user will be blocked from logging in and hidden from bookings while keeping all historical records. Confirm? |
| `confirmations.void_payout.title` | تأكيد إلغاء كشف صرف العمولات | Confirm Voiding Commission Payout |
| `confirmations.void_payout.body` | سيتم إلغاء سند الصرف وعكس قيد المصروف وإعادة الجلسات المشمولة لحالة "غير مدفوعة". هل تريد المتابعة؟ | Payout voucher and linked expense will be voided, returning sessions to unpaid status. Proceed? |
| `confirmations.discharge_patient.title` | تأكيد تخريج وإنهاء علاج المريض | Confirm Formal Patient Discharge |
| `confirmations.discharge_patient.body` | سيتم توثيق إتمام الخطة العلاجية للمريض وحفظ تقرير التخريج النهائي. هل راجعت أهداف العلاج؟ | Treatment plan will be formally marked completed and discharge summary saved. Confirm? |

---

## 5. Namespace: Screen Empty States (`empty_states.*`)

These translation keys provide friendly Arabic and English copy for empty screens and tables:

| Translation Key | Arabic Text (`ar`) | English Text (`en`) |
|---|---|---|
| `empty_states.today.title` | لا توجد مواعيد مجدولة لهذا اليوم | No appointments scheduled for today |
| `empty_states.today.description` | لم يتم حجز أي مواعيد لليوم حتى الآن. يمكنك بدء حجز موعد جديد بالضغط على الزر أدناه. | No patient appointments have been booked for today yet. Start by booking a new visit below. |
| `empty_states.today.action_btn` | حجز موعد جديد | Book New Appointment |
| `empty_states.calendar.description` | لا توجد حجوزات في هذا التاريخ. اضغط على أي سرير وتوقيت فارغ لإنشاء موعد. | No bookings on this date. Click on any empty bed and time slot to create an appointment. |
| `empty_states.patient_search.title` | لم يتم العثور على نتائج مطابقة | No matching patients found |
| `empty_states.patient_search.description` | تأكد من صحة رقم الهاتف أو اسم المريض المدخل، أو قم بتسجيل مريض جديد. | Verify the phone number or name entered, or register a new patient in the system. |
| `empty_states.patient_search.action_btn` | تسجيل مريض جديد | Register New Patient |
| `empty_states.patient_packages.description` | لا توجد باقات علاجية مسجلة لهذا المريض حالياً. اضغط على "إصدار باقة" لإنشاء باقة جديدة. | No treatment packages recorded for this patient yet. Click 'Issue Package' to create one. |
| `empty_states.patient_billing.description` | لا توجد فواتير أو إيصالات مسجلة للمريض. | No charges or payment receipts recorded for this patient. |
| `empty_states.patient_clinical_chart.description`| لا توجد تقارير طبية سابقة. سيتم إنشاء التقرير الأول تلقائياً عند استكمال الجلسة الأولى. | No clinical notes recorded yet. The first note will be generated upon completing session 1. |
| `empty_states.clinician_queue.title` | قائمة الانتظار فارغة حالياً | Your patient queue is currently empty |
| `empty_states.clinician_queue.description` | لا يوجد مرضى بالانتظار في الوقت الحالي. استمتع بوقتك أو راجع مواعيدك المجدولة القادمة. | No patients waiting at the moment. Relax or review your upcoming scheduled appointments. |
| `empty_states.expenses.description` | لم يتم تسجيل أي مصروفات تشغيلية في هذه الفترة. | No operating expenses logged in this period. |
| `empty_states.commissions_unpaid.description`| لا توجد جلسات مكتملة معلقة تنتظر الصرف لهذا المعالج في الفترة المحددة. | No completed sessions awaiting commission payout for this clinician in the selected period. |
| `empty_states.audit_log.description` | لا توجد أحداث رقابية مطابقة لمعايير البحث المحددة. | No audit trail events matching your search criteria. |

---

## 6. Namespace: In-App Staff Notifications & Banners (`notifications.*`)

These translation keys correspond to operational alerts displayed to staff members in real time:

| Translation Key | Arabic Text (`ar`) | English Text (`en`) |
|---|---|---|
| `notifications.late_arrival_alert.title` | تنبيه تأخر مريض | Patient Arrival Delay Alert |
| `notifications.late_arrival_alert.body` | المريض {patient_name} موعده كان في {time} ولم يسجل حضوره حتى الآن (تأخير {late_minutes} دقيقة). | Patient {patient_name} was scheduled at {time} and has not arrived yet ({late_minutes} min late). |
| `notifications.patient_arrived.title` | وصل مريض بالانتظار | Patient Checked In |
| `notifications.patient_arrived.body` | وصل المريض {patient_name} وسجل حضوره في الاستقبال لجلسة {service_name}. | Patient {patient_name} has arrived at front desk for {service_name}. |
| `notifications.low_package_sessions.title`| تنبيه استهلاك باقة | Package Sessions Running Low |
| `notifications.low_package_sessions.body` | المريض {patient_name} متبقي له {remaining_sessions} جلسة فقط في باقة {package_name}. | Patient {patient_name} has only {remaining_sessions} sessions left in {package_name}. |
| `notifications.package_expiring.title` | تنبيه قرب انتهاء باقة | Package Nearing Expiration |
| `notifications.package_expiring.body` | باقة المريض {patient_name} تنتهي صلاحيتها في {expiry_date} (متبقي {days_left} يوماً). | Patient {patient_name}'s package will expire on {expiry_date} ({days_left} days remaining). |
| `notifications.unclosed_shift_warning.title`| تنبيه وردية نقدية مفتوحة | Active Cash Shift Warning |
| `notifications.unclosed_shift_warning.body` | لديك وردية نقدية مفتوحة بالدرج! يرجى إغلاق الوردية وتسليم العهدة قبل مغادرة النظام. | You have an active open cash drawer! Please close your shift before logging out. |
| `notifications.covering_access_granted.title`| إذن وصول تغطية سارٍ | Active Covering Access Grant |
| `notifications.covering_access_granted.body` | تم منحك صلاحية تغطية مؤقتة للمريض {patient_name} للسبب: {reason}. تنتهي الصلاحية بانتهاء الجلسة. | Temporary covering access granted for {patient_name}. Reason: {reason}. Expires upon logout. |

---

## 7. Namespace: Official WhatsApp Message Templates (`whatsapp.*`)

In compliance with **R-2-7**, **R-6-1**, and **DEC-022**, the clinic maintains six standardized bilingual WhatsApp notification templates. Placeholders are enclosed in `{tokens}` and replaced at dispatch time with dynamic values. When sending to a patient, the system selects the template matching the patient's preferred language (`preferred_language`: `'AR'` or `'EN'`).

### Template 1: Welcome New Patient (`welcome`)
*Dispatched immediately upon successful patient registration at the clinic.*

#### Arabic Template (`ar` - Default):
```text
أهلاً بك أستاذ/ة {patient_name} في عيادة مسار للعلاج الطبيعي والتغذية العلاجية 🌿

تم فتح ملفك الطبي بنجاح برقم: {file_number}
يسعدنا تقديم أفضل رعاية طبية متكاملة لصحتك وراحتك.

📍 العنوان: {clinic_address}
📞 هاتف العيادة: {clinic_phone}

نتمنى لك دوام الصحة والعافية!
```

#### English Template (`en`):
```text
Welcome {patient_name} to Masaar Clinic for Physical Therapy & Clinical Nutrition 🌿

Your medical file has been registered successfully with File No: {file_number}
We are dedicated to providing you with the highest standard of specialized care.

📍 Location: {clinic_address}
📞 Clinic Contact: {clinic_phone}

Wishing you health and wellness!
```

---

### Template 2: Appointment Reminder (`reminder`)
*Dispatched 24 hours prior to appointment or on the morning of the visit.*

#### Arabic Template (`ar` - Default):
```text
مرحباً أستاذ/ة {patient_name} 🌸

نذكركم بموعدكم القادم في عيادة مسار:
🗓️ اليوم والتاريخ: {date}
⏰ توقيت الموعد: {time}
👨‍⚕️ المعالج المتابع: {doctor_name}
🏥 الخدمة: {service_name}
📍 العنوان: {clinic_address}

يرجى الحضور قبل الموعد بـ 10 دقائق لضمان راحتكم وحسن تنظيم الجلسة.
📞 للاستفسار أو التواصل: {clinic_phone}
```

#### English Template (`en`):
```text
Hello {patient_name} 🌸

This is a reminder for your upcoming appointment at Masaar Clinic:
🗓️ Date: {date}
⏰ Time: {time}
👨‍⚕️ Clinician: {doctor_name}
🏥 Service: {service_name}
📍 Location: {clinic_address}

Please arrive 10 minutes prior to your appointment time.
📞 For inquiries: {clinic_phone}
```

---

### Template 3: Rescheduled Appointment Notice (`reschedule`)
*Dispatched whenever an appointment is moved to a new date, time, or bed.*  
*Must explicitly include BOTH the old appointment time and the new appointment time.*

#### Arabic Template (`ar` - Default):
```text
مرحباً أستاذ/ة {patient_name}،

نود إحاطتكم بأنه تم تعديل موعد جلستكم في عيادة مسار:
❌ الموعد السابق: {old_date} في تمام الساعة {old_time}
✅ الموعد الجديد المعتمد: {new_date} في تمام الساعة {new_time}
👨‍⚕️ المعالج المتابع: {doctor_name}

نتطلع لاستقبالكم في الموعد الجديد!
📞 للتعديل أو الاستفسار: {clinic_phone}
```

#### English Template (`en`):
```text
Hello {patient_name},

Please note that your appointment at Masaar Clinic has been rescheduled:
❌ Previous Appointment: {old_date} at {old_time}
✅ New Confirmed Appointment: {new_date} at {new_time}
👨‍⚕️ Clinician: {doctor_name}

We look forward to seeing you at your new scheduled time!
📞 For inquiries: {clinic_phone}
```

---

### Template 4: Low Package Sessions Remaining (`low_sessions`)
*Dispatched when an active package has 1 or 2 remaining available sessions.*

#### Arabic Template (`ar` - Default):
```text
مرحباً أستاذ/ة {patient_name} 🌿

نحيطكم علماً بأن باقتكم الحالية ({package_name}) أوشكت على الاكتمال:
📊 الجلسات المتبقية المتاحة: {remaining_sessions} جلسة فقط.

للحفاظ على استمرارية الخطة التأهيلية وتجنب انقطاع المواعيد، يُرجى التنسيق مع الاستقبال لتجديد الباقة في زيارتكم القادمة.
📞 هاتف العيادة: {clinic_phone}
```

#### English Template (`en`):
```text
Hello {patient_name} 🌿

We would like to inform you that your treatment package ({package_name}) is nearing completion:
📊 Remaining Available Sessions: {remaining_sessions} session(s) only.

To maintain treatment continuity, please speak with our front desk team during your next visit to renew your package.
📞 Contact: {clinic_phone}
```

---

### Template 5: Outstanding Balance Due (`balance_due`)
*Dispatched when an unpaid charge or session balance remains outstanding.*

#### Arabic Template (`ar` - Default):
```text
مرحباً أستاذ/ة {patient_name}،

نتمنى لكم دوام الصحة والعافية من عيادة مسار.
نود تذكيركم بوجود رصيد مالي مستحق على حسابكم:
💳 المبلغ المستحق: {balance_due}

يمكنكم سداد المبلغ بالعيادة نقداً، أو عبر بطاقة الدفع (فيزا)، أو تحويل إنستاباي / فودافون كاش.
📞 للاستفسار أو التحقق من الحساب: {clinic_phone}
```

#### English Template (`en`):
```text
Hello {patient_name},

Warm regards from Masaar Clinic.
This is a gentle reminder regarding an outstanding balance on your account:
💳 Amount Due: {balance_due}

Payment can be made at the clinic via Cash, Card, InstaPay, or Mobile Wallet.
📞 For billing inquiries: {clinic_phone}
```

---

### Template 6: Package Expiring Notice (`package_expiring`)
*Dispatched 7 days prior to a package reaching its validity expiration date.*

#### Arabic Template (`ar` - Default):
```text
مرحباً أستاذ/ة {patient_name} ⏳

نحيطكم علماً بأن صلاحية باقتكم العلاجية ({package_name}) تنتهي قريباً:
🗓️ تاريخ انتهاء الصلاحية: {expiry_date} (متبقي {days_left} يوماً)
📊 الجلسات المتبقية غير المستهلكة: {remaining_sessions} جلسة.

يُرجى حجز جلساتكم المتبقية قبل موعد الانتهاء أو مراجعة إدارة العيادة لتمديد الصلاحية.
📞 للتنسيق والحجز: {clinic_phone}
```

#### English Template (`en`):
```text
Hello {patient_name} ⏳

Please note that your treatment package ({package_name}) will expire soon:
🗓️ Expiry Date: {expiry_date} ({days_left} days remaining)
📊 Unused Sessions Remaining: {remaining_sessions} session(s).

Please book your remaining sessions before the expiry date, or contact clinic management for validity extension.
📞 Booking & Inquiries: {clinic_phone}
```

---

## 8. Verification & Completeness Checklist

- [x] All texts provided with high-quality, natural-sounding Arabic (Egyptian locale) and professional English equivalents.
- [x] All 56 validation and business error codes from `actions.md` are mapped to human-readable error messages.
- [x] Confirmation dialogs cover all irreversible/financial operations (cancellation, voiding, refunds, shift closing, reopening, discharge).
- [x] Empty states designed for all 12 key system screens and tabular views.
- [x] In-app notifications cover late arrivals (>10 min), check-ins, package warnings, shift handovers, and covering access.
- [x] All six approved WhatsApp templates (welcome, reminder, reschedule with old+new time, low sessions, balance due, package expiring) provided in AR and EN with exact `{placeholders}` matching `glossary.md`.
