import HeroSection from "@/components/home/HeroSection";
import CVCarousel from "@/components/home/CVCarousel";
import HowItWorks from "@/components/home/HowItWorks";
// import FeaturesSection from '@/components/home/FeaturesSection';
import PricingSection from "@/components/home/PricingSection";
import HeroUploadSection from "@/components/home/HeroUploadSection";
import PaymentSync from "@/components/results/PaymentSync";
import AnimatedBackground from "@/components/layout/AnimatedBackground";

export default async function HomePage() {
  return (
    <div className="flex-1 flex flex-col overflow-x-hidden relative">
      <AnimatedBackground />
      <PaymentSync />
      <HeroSection />

      <section id="analyze" className="py-20 px-6 max-w-6xl mx-auto w-full">
        <HeroUploadSection />
      </section>

      <div className="hidden md:block">
        <HowItWorks />
      </div>

      <CVCarousel theme="light" />

      {/* <FeaturesSection /> */}

      <PricingSection />
    </div>
  );
}
