/**
 * Masaar Clinic System — Arabic Name Similarity Normalization
 * Spec Reference: docs/FEATURES-v2.2.md §4.2 (R-4.2-5)
 * Calculations Reference: docs/design/calculations.md §2.3
 */

export function normalizeArabicName(rawName: string): string {
  if (!rawName || typeof rawName !== "string") {
    return "";
  }

  let s = rawName;

  // 1. Strip Tashkeel diacritics
  s = s.replace(/[\u064B-\u065F]/g, "");

  // 2. Strip Tatweel / Kashida
  s = s.replace(/\u0640/g, "");

  // 3. Normalize Alif forms (أ, إ, آ, ٱ -> ا)
  s = s.replace(/[أإآٱ]/g, "ا");

  // 4. Normalize Taa Marbuta (ة -> ه)
  s = s.replace(/ة/g, "ه");

  // 5. Normalize Alif Maqsura (ى -> ي)
  s = s.replace(/ى/g, "ي");

  // 6. Normalize compound "Abd" prefixes (e.g. "عبد الرحمن" -> "عبدالرحمن", "عبد الله" -> "عبدالله")
  s = s.replace(/عبد\s+/g, "عبد");

  // 7. Collapse whitespace and trim
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

export function areArabicNamesSimilar(nameA: string, nameB: string): boolean {
  const normA = normalizeArabicName(nameA);
  const normB = normalizeArabicName(nameB);

  if (!normA || !normB) return false;

  return normA === normB;
}
