import { PlaceholderPage } from "@/components/common/PlaceholderPage";

export default function NutritionQueuePage() {
  return (
    <PlaceholderPage
      titleAr="عيادة التغذية والقياسات والـ InBody"
      titleEn="Nutrition Consultations & InBody Queue"
      moduleCode="3.7 (Clinical Nutrition & InBody)"
      allowedRolesAr={["مالك العيادة", "أخصائي تغذية علاجية"]}
      allowedRolesEn={["Owner", "Nutritionist"]}
    />
  );
}
