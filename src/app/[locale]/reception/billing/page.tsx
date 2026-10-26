import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function BillingPage() {
  return (
    <PlaceholderPage
      titleAr="الفواتير والمتحصلات المالية"
      titleEn="Billing, Invoices & Receipts"
      moduleCode="3.5 (Billing & Cash Desk)"
      allowedRolesAr={["مالك العيادة", "مدير العيادة", "موظف استقبال"]}
      allowedRolesEn={["Owner", "Manager", "Receptionist"]}
    />
  );
}
