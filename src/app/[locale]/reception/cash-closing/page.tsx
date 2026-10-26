import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function CashClosingPage() {
  return (
    <PlaceholderPage
      titleAr="إغلاق الوردية ومطابقة النقدية"
      titleEn="Cash Shift Closing & Audit"
      moduleCode="3.5 (Cash Drawer Closing)"
      allowedRolesAr={["مالك العيادة", "مدير العيادة", "موظف استقبال"]}
      allowedRolesEn={["Owner", "Manager", "Receptionist"]}
    />
  );
}
