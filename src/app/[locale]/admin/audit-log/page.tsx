import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function AdminAuditLogPage() {
  return (
    <PlaceholderPage
      titleAr="سجل الرقابة والتدقيق الأمني الشامل"
      titleEn="System Security & Operations Audit Trail"
      moduleCode="3.1 & 3.9 (Audit Logging)"
      allowedRolesAr={["مالك العيادة", "مدير العيادة"]}
      allowedRolesEn={["Owner", "Manager"]}
    />
  );
}
