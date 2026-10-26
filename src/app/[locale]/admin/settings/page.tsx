import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function AdminSettingsPage() {
  return (
    <PlaceholderPage
      titleAr="إعدادات العيادة وساعات العمل والأسعار"
      titleEn="Clinic Settings, Hours & Pricing"
      moduleCode="3.1 (Clinic Configuration)"
      allowedRolesAr={["مالك العيادة"]}
      allowedRolesEn={["Owner"]}
    />
  );
}
