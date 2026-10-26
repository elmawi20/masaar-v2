import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function ReportsPage() {
  return (
    <PlaceholderPage
      titleAr="التقارير المالية والتشغيلية والإحصائيات"
      titleEn="Operational & Financial Reports"
      moduleCode="3.9 (Reports & Analytics)"
      allowedRolesAr={["مالك العيادة", "مدير العيادة"]}
      allowedRolesEn={["Owner", "Manager"]}
    />
  );
}
