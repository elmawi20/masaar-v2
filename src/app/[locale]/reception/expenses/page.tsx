import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function ExpensesPage() {
  return (
    <PlaceholderPage
      titleAr="المصروفات النثرية والتشغيلية"
      titleEn="Daily Operational Expenses"
      moduleCode="3.5 (Cash Desk & Expenses)"
      allowedRolesAr={["مالك العيادة", "مدير العيادة", "موظف استقبال"]}
      allowedRolesEn={["Owner", "Manager", "Receptionist"]}
    />
  );
}
