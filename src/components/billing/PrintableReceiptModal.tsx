"use client";

import React from "react";
import { useLocale } from "next-intl";

export interface ReceiptData {
  receiptNumber: string;
  receiptYear: number;
  receiptSequence: number;
  amountPiasters: number;
  paymentMethod: string;
  collectedAt: string | Date;
  patientName: string;
  patientPhone?: string | null;
  description: string;
  collectedByName?: string | null;
  referenceNumber?: string | null;
}

interface PrintableReceiptModalProps {
  receipt: ReceiptData;
  onClose: () => void;
}

export default function PrintableReceiptModal({
  receipt,
  onClose,
}: PrintableReceiptModalProps) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(receipt.collectedAt).toLocaleDateString(
    isAr ? "ar-EG" : "en-US",
    {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  const paymentMethodLabels: Record<string, { ar: string; en: string }> = {
    CASH: { ar: "نقداً", en: "Cash" },
    INSTAPAY: { ar: "إنستاباي (InstaPay)", en: "InstaPay" },
    VODAFONE_CASH: { ar: "محفظة إلكترونية (فودافون كاش)", en: "Vodafone Cash" },
    CARD: { ar: "بطاقة ائتمانية / فيزا", en: "Credit/Debit Card" },
    FAWRY: { ar: "فوري (Fawry)", en: "Fawry" },
    BANK_TRANSFER: { ar: "تحويل بنكي", en: "Bank Transfer" },
  };

  const methodLabel =
    paymentMethodLabels[receipt.paymentMethod]?.[isAr ? "ar" : "en"] ||
    receipt.paymentMethod;

  const egpAmount = (receipt.amountPiasters / 100).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Modal Container */}
      <div className="bg-white text-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 print:border-none print:shadow-none print:max-w-none print:w-full print:p-8">
        {/* Printable Area */}
        <div id="printable-receipt-area" className="space-y-4 font-sans text-start">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="text-xl font-black text-[#0E6251]">MASAAR CLINIC</div>
              <div className="text-xs font-bold text-slate-700">
                {isAr
                  ? "مركز مسار للعلاج الطبيعي والتأهيل والتغذية العلاجية"
                  : "Masaar Clinic for Physical Therapy & Clinical Nutrition"}
              </div>
              <div className="text-[10px] text-slate-500">
                {isAr
                  ? "القاهرة، جمهورية مصر العربية | هاتف العيادة: 01000000000"
                  : "Cairo, Egypt | Tel: 01000000000"}
              </div>
            </div>
            <div className="text-end">
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-md bg-teal-50 text-[#0E6251] border border-teal-200">
                {receipt.receiptNumber}
              </span>
              <div className="text-[10px] text-slate-400 mt-1 font-mono">
                {formattedDate}
              </div>
            </div>
          </div>

          {/* Receipt Title */}
          <div className="text-center py-1 bg-slate-50 rounded-lg">
            <span className="text-xs font-bold text-slate-800 tracking-wider">
              {isAr ? "إيصال استلام نقدية وسداد رسمي" : "OFFICIAL PAYMENT RECEIPT"}
            </span>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
            <div>
              <span className="text-[11px] text-slate-500 block">
                {isAr ? "اسم المريض:" : "Patient Name:"}
              </span>
              <span className="font-bold text-slate-900">{receipt.patientName}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">
                {isAr ? "رقم الهاتف:" : "Mobile Phone:"}
              </span>
              <span className="font-mono text-slate-800">
                {receipt.patientPhone || "—"}
              </span>
            </div>
          </div>

          {/* Service & Amount Table */}
          <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold">
              <tr>
                <th className="py-2 px-3 text-start">
                  {isAr ? "البيان / الخدمة" : "Description / Service"}
                </th>
                <th className="py-2 px-3 text-end font-mono">
                  {isAr ? "المبلغ المسدد" : "Amount Paid"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="py-3 px-3 font-medium text-slate-800">
                  {receipt.description}
                  {receipt.referenceNumber && (
                    <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                      {isAr ? "رقم مرجعي:" : "Ref:"} {receipt.referenceNumber}
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-end font-mono font-bold text-base text-[#0E6251]">
                  {egpAmount} EGP
                </td>
              </tr>
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
              <tr>
                <td className="py-2 px-3 text-start text-slate-600">
                  {isAr ? "طريقة الدفع:" : "Payment Method:"}{" "}
                  <span className="text-slate-900 font-medium">{methodLabel}</span>
                </td>
                <td className="py-2 px-3 text-end font-mono text-sm text-[#0E6251]">
                  {isAr ? "الإجمالي:" : "Total:"} {egpAmount} ج.م
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Footer & Signature */}
          <div className="flex justify-between items-end pt-4 text-xs text-slate-500 border-t border-slate-200">
            <div>
              <span className="block text-[10px]">
                {isAr ? "المستلم / الكاشير:" : "Received By:"}
              </span>
              <span className="font-semibold text-slate-800">
                {receipt.collectedByName || (isAr ? "قسم الاستقبال" : "Reception Desk")}
              </span>
            </div>
            <div className="text-end">
              <span className="text-[10px] text-slate-400 block font-mono">
                {isAr
                  ? "إيصال إلكتروني صادر عن نظام مسار لإدارة العيادات"
                  : "Generated by Masaar Clinic System"}
              </span>
            </div>
          </div>
        </div>

        {/* Buttons (Hidden when printing) */}
        <div className="mt-6 flex justify-end gap-2 print:hidden border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700"
          >
            {isAr ? "إغلاق" : "Close"}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-[#0E6251] text-white hover:bg-[#117A65] flex items-center gap-1.5 shadow-md"
          >
            <span>🖨️</span>
            <span>{isAr ? "طباعة الإيصال (A5)" : "Print Receipt (A5)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
