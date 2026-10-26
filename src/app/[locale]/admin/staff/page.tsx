import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function AdminStaffPage() {
  return (
    <PlaceholderPage
      titleAr="إدارة حسابات العاملين والصلاحيات"
      titleEn="Staff Accounts & Role Permissions"
      moduleCode="3.1 (Staff & Access Control)"
      allowedRolesAr={["مالك العيادة"]}
      allowedRolesEn={["Owner"]}
    />
  );
}
