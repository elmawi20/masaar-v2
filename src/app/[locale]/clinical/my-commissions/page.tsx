import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function MyCommissionsPage() {
  return (
    <PlaceholderPage
      titleAr="حساب العمولات الشخصي للمعالج"
      titleEn="Clinician Commission Breakdown"
      moduleCode="3.8 (Commission Breakdown)"
      allowedRolesAr={["مالك العيادة", "أخصائي علاج طبيعي"]}
      allowedRolesEn={["Owner", "Physiotherapist"]}
    />
  );
}
