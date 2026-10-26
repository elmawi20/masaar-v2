import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function StaffSchedulesPage() {
  return (
    <PlaceholderPage
      titleAr="جداول نوبات العمل والإجازات"
      titleEn="Staff Schedules & Leaves"
      moduleCode="3.1 (Staff Scheduling & Leaves)"
      allowedRolesAr={["مالك العيادة", "مدير العيادة"]}
      allowedRolesEn={["Owner", "Manager"]}
    />
  );
}
