import { describe, it, expect } from "vitest";
import { normalizeEgyptianPhone } from "@/domain/patients/phone";
import { normalizeArabicName, areArabicNamesSimilar } from "@/domain/patients/arabicName";
import { calculatePatientAge } from "@/domain/patients/age";

describe("Patient Domain Logic Unit Tests [R-4.1-2, R-4.1-8, R-4.2-1, R-4.2-5]", () => {
  describe("Egyptian Phone Normalization & Validation (R-4.1-2, R-4.2-1)", () => {
    it("normalizes international +20 format with spaces and dashes into 11-digit canonical Egyptian mobile", () => {
      const res1 = normalizeEgyptianPhone("+20 100 123 4567");
      expect(res1.isValid).toBe(true);
      expect(res1.normalized).toBe("01001234567");

      const res2 = normalizeEgyptianPhone("+20-111-234-5678");
      expect(res2.isValid).toBe(true);
      expect(res2.normalized).toBe("01112345678");
    });

    it("normalizes international 0020 prefix into canonical 01XXXXXXXXX", () => {
      const res = normalizeEgyptianPhone("00201223456789");
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe("01223456789");
    });

    it("converts Eastern Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) to standard ASCII digits", () => {
      const res = normalizeEgyptianPhone("٠١٥١٢٣٤٥٦٧٨");
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe("01512345678");
    });

    it("rejects non-Egyptian or invalid prefix phone numbers", () => {
      // Starts with 013 (landline) or 014 (non-existent)
      const res1 = normalizeEgyptianPhone("01312345678");
      expect(res1.isValid).toBe(false);

      // Too short
      const res2 = normalizeEgyptianPhone("010123456");
      expect(res2.isValid).toBe(false);

      // Too long
      const res3 = normalizeEgyptianPhone("0101234567899");
      expect(res3.isValid).toBe(false);
    });
  });

  describe("Arabic Name Similarity Normalization (R-4.2-5)", () => {
    it("strips tashkeel diacritics and tatweel", () => {
      const normalized = normalizeArabicName("مُحَمَّـدْ");
      expect(normalized).toBe("محمد");
    });

    it("normalizes Alif variants (أ, إ, آ, ٱ -> ا)", () => {
      const normalized1 = normalizeArabicName("إبراهيم أحمد");
      const normalized2 = normalizeArabicName("ابراهيم احمد");
      expect(normalized1).toBe("ابراهيم احمد");
      expect(normalized1).toBe(normalized2);
    });

    it("normalizes Taa Marbuta (ة -> ه) and Alif Maqsura (ى -> ي)", () => {
      const normalized1 = normalizeArabicName("منى حمزة");
      const normalized2 = normalizeArabicName("مني حمزه");
      expect(normalized1).toBe("مني حمزه");
      expect(normalized1).toBe(normalized2);
    });

    it("collapses compound 'Abd' spaces (عبد الرحمن -> عبدالرحمن)", () => {
      const sim = areArabicNamesSimilar("أحمد عبد الرحمن", "احمد عبدالرحمن");
      expect(sim).toBe(true);
    });

    it("detects similarity between name variations and distinguishes different names", () => {
      expect(areArabicNamesSimilar("منى إبراهيم حمزة", "مني ابراهيم حمزه")).toBe(true);
      expect(areArabicNamesSimilar("محمود علي حسن", "محمد علي حسن")).toBe(false);
    });
  });

  describe("Dynamic Patient Age Calculation (R-4.1-8, R-0-6)", () => {
    it("computes completed full years dynamically based on reference date", () => {
      // Born on April 12, 1985; reference Oct 25, 2026 -> 41 years
      const age1 = calculatePatientAge(new Date("1985-04-12"), new Date("2026-10-25"));
      expect(age1).toBe(41);

      // Birthday has not occurred yet this year
      // Born on Oct 26, 1990; reference Oct 25, 2026 -> 35 years
      const age2 = calculatePatientAge(new Date("1990-10-26"), new Date("2026-10-25"));
      expect(age2).toBe(35);

      // Birthday is today
      // Born on Oct 25, 2000; reference Oct 25, 2026 -> 26 years
      const age3 = calculatePatientAge(new Date("2000-10-25"), new Date("2026-10-25"));
      expect(age3).toBe(26);
    });

    it("throws error for future date of birth", () => {
      expect(() => {
        calculatePatientAge(new Date("2026-10-26"), new Date("2026-10-25"));
      }).toThrow(/future/i);
    });
  });
});
