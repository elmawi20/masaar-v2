import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function TodayPage() {
  return (
    <PlaceholderPage
      titleAr="لوحة الاستقبال — اليوم في العيادة"
      titleEn="Reception Hub — Today at Clinic"
      moduleCode="3.2 (Front Desk & Check-in)"
      allowedRolesAr={["مالك العيادة", "مدير العيادة", "موظف استقبال"]}
      allowedRolesEn={["Owner", "Manager", "Receptionist"]}
    />
  );
}
