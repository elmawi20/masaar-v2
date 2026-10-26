/**
 * Masaar Clinic System — Egyptian Mobile Phone Normalization & Validation
 * Spec Reference: docs/FEATURES-v2.2.md §4.1 (R-4.1-2, R-4.1-6), §4.2 (R-4.2-1)
 * Calculations Reference: docs/design/calculations.md §2.2
 */

const INDIC_TO_ASCII: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

export const EGYPTIAN_MOBILE_REGEX = /^01[0125][0-9]{8}$/;

export interface PhoneNormalizationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
}

export function normalizeEgyptianPhone(rawPhone: string): PhoneNormalizationResult {
  if (!rawPhone || typeof rawPhone !== "string") {
    return {
      isValid: false,
      normalized: "",
      error: "رقم الهاتف مطلوب",
    };
  }

  // 1. Convert Indic numerals to ASCII
  let cleaned = rawPhone.replace(/[٠-٩]/g, (ch) => INDIC_TO_ASCII[ch] || ch);

  // 2. Remove all non-digit characters except leading plus
  cleaned = cleaned.trim().replace(/[\s\-\(\)\.\/\\]/g, "");

  // 3. Prefix replacement
  if (cleaned.startsWith("+20")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("0020")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("201") && cleaned.length === 12) {
    cleaned = "0" + cleaned.slice(2);
  }

  // 4. Validate standard 11-digit mobile
  const isValid = EGYPTIAN_MOBILE_REGEX.test(cleaned);

  if (!isValid) {
    return {
      isValid: false,
      normalized: cleaned,
      error: "رقم المحمول المصري غير صحيح. يجب أن يتكون من 11 رقماً ويبدأ بـ 010 أو 011 أو 012 أو 015.",
    };
  }

  return {
    isValid: true,
    normalized: cleaned,
  };
}
