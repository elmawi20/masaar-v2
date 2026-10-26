import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function PatientsPage() {
  return (
    <PlaceholderPage
      titleAr="سجل وملفات المرضى"
      titleEn="Patients Directory & Files"
      moduleCode="3.4 (Patients & Demographics)"
      allowedRolesAr={["مالك العيادة", "مدير العيادة", "موظف استقبال"]}
      allowedRolesEn={["Owner", "Manager", "Receptionist"]}
    />
  );
}
