import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function ResourcesPage() {
  return (
    <PlaceholderPage
      titleAr="إدارة الغرف وأسرّة العلاج"
      titleEn="Clinic Rooms & Beds Resources"
      moduleCode="3.1 (Facility Resources)"
      allowedRolesAr={["مالك العيادة", "مدير العيادة"]}
      allowedRolesEn={["Owner", "Manager"]}
    />
  );
}
