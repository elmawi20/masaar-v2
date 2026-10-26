/**
 * Masaar Clinic System — Dynamic Patient Age Calculation
 * Spec Reference: docs/FEATURES-v2.2.md §4.1 (R-4.1-8, R-0-6)
 * Calculations Reference: docs/design/calculations.md §2.1
 */

export function calculatePatientAge(
  dateOfBirth: Date | string,
  referenceDate: Date | string = new Date()
): number {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  const ref = typeof referenceDate === "string" ? new Date(referenceDate) : referenceDate;

  if (isNaN(dob.getTime())) {
    throw new Error("Invalid date of birth provided.");
  }
  if (isNaN(ref.getTime())) {
    throw new Error("Invalid reference date provided.");
  }

  if (dob.getTime() > ref.getTime()) {
    throw new Error("Date of birth cannot be in the future.");
  }

  const dobYear = dob.getUTCFullYear();
  const dobMonth = dob.getUTCMonth();
  const dobDay = dob.getUTCDate();

  const refYear = ref.getUTCFullYear();
  const refMonth = ref.getUTCMonth();
  const refDay = ref.getUTCDate();

  let age = refYear - dobYear;

  // Has birthday occurred yet this year?
  const birthdayPassed =
    refMonth > dobMonth || (refMonth === dobMonth && refDay >= dobDay);

  if (!birthdayPassed) {
    age -= 1;
  }

  return Math.max(0, age);
}
