import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function CalendarPage() {
  return (
    <PlaceholderPage
      titleAr="جدول المواعيد والتقويم الشامل"
      titleEn="Appointment Calendar & Grid"
      moduleCode="3.3 (Scheduling & Multi-Bed Calendar)"
      allowedRolesAr={["مالك العيادة", "مدير العيادة", "موظف استقبال", "أخصائي علاج طبيعي", "أخصائي تغذية علاجية"]}
      allowedRolesEn={["Owner", "Manager", "Receptionist", "Physiotherapist", "Nutritionist"]}
    />
  );
}
