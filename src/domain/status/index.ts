/**
 * Masaar Clinic System — Domain Status Machines Barrel Export
 * 
 * Design Task 1.06: Central aggregation of all 7 domain state machines:
 * 1. Appointment (§5.5)
 * 2. Package (§7)
 * 3. Patient (§4.1, §4.2)
 * 4. ClinicalNote (§9.1, §9.2)
 * 5. Receipt (§8.2, §8.3)
 * 6. Staff (§3, §15.1)
 * 7. OtpEnrollment (§15.2)
 */

export * from './types';
export * from './appointment';
export * from './package';
export * from './patient';
export * from './clinical-note';
export * from './receipt';
export * from './staff';
export * from './otp-enrollment';
