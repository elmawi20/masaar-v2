import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function CommissionsManagementPage() {
  return (
    <PlaceholderPage
      titleAr="مراجعة واعتماد صرف العمولات"
      titleEn="Commissions Audit & Payout Run"
      moduleCode="3.8 (Commissions Run)"
      allowedRolesAr={["مالك العيادة", "مدير العيادة"]}
      allowedRolesEn={["Owner", "Manager"]}
    />
  );
}
