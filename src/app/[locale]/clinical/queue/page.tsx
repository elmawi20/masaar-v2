import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function ClinicalQueuePage() {
  return (
    <PlaceholderPage
      titleAr="قائمة انتظار العلاج الطبيعي والتأهيل"
      titleEn="Physiotherapy Patient Queue"
      moduleCode="3.6 (Clinical Physio & SOAP Notes)"
      allowedRolesAr={["مالك العيادة", "أخصائي علاج طبيعي"]}
      allowedRolesEn={["Owner", "Physiotherapist"]}
    />
  );
}
