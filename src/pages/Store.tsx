import { StoreLayout } from "@/components/store/StoreLayout";
import { HeroSection } from "@/components/store/HeroSection";
import { SmartSchedulingSection } from "@/components/store/SmartSchedulingSection";
import { FinancialManagementSection } from "@/components/store/FinancialManagementSection";
import { FeaturedFeatures } from "@/components/store/FeaturedFeatures";
import { FeaturesSection } from "@/components/store/FeaturesSection";
import { BenefitsSection } from "@/components/store/BenefitsSection";
import { TestimonialsSection } from "@/components/store/TestimonialsSection";
import { PricingSection } from "@/components/store/PricingSection";
import { CTASection } from "@/components/store/CTASection";
import { StoreFooter } from "@/components/store/StoreFooter";
const Store = () => {
  return <StoreLayout>
      <HeroSection className="py-[30px]" />
      <SmartSchedulingSection className="py-0" />
      <FinancialManagementSection className="py-0" />
      <FeaturedFeatures className="mx-0 my-0 py-[30px]" />
      <FeaturesSection className="py-[20px]" />
      <BenefitsSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <StoreFooter />
    </StoreLayout>;
};
export default Store;