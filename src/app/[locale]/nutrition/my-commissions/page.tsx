import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function NutritionCommissionsPage() {
  return (
    <PlaceholderPage
      titleAr="حساب عمولات أخصائي التغذية"
      titleEn="Nutritionist Commission Breakdown"
      moduleCode="3.8 (Commission Breakdown)"
      allowedRolesAr={["مالك العيادة", "أخصائي تغذية علاجية"]}
      allowedRolesEn={["Owner", "Nutritionist"]}
    />
  );
}
