"use client";

import { 
  Header, 
  Hero,
  WhoIsThisFor,
  CandidatePractice,
  AiScreening,
  HowItWorks,
  WhyOurAi,
  Testimonials,
  FinalCta,
  Faq,
  Footer
} from "@/app/components/common/LandingPage";
import SilkBackground from "@/app/components/common/SilkBackground";

export default function LandingPage() {
  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col relative overflow-x-clip font-sans">
      {/* Background Ambient Glow (Mesh Gradient Effect) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
        {/* Soft Gold/Lime glow in top-left */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/10 dark:bg-[var(--chart-1)]/15 blur-[130px]" />

        {/* Soft Violet/Purple glow in the center-top */}
        <div className="absolute -top-60 left-[20%] w-[900px] h-[900px] rounded-full bg-violet-400/10 dark:bg-[oklch(0.48_0.18_290)]/20 blur-[160px]" />

        {/* Soft Pink/Magenta ambient glow on the right-middle side */}
        <div className="absolute top-[20%] -right-40 w-[550px] h-[550px] rounded-full bg-pink-400/10 dark:bg-[oklch(0.55_0.2_315)]/15 blur-[120px]" />

        {/* Soft Green base ambient glow towards bottom-left */}
        <div className="absolute -bottom-60 left-[10%] w-[800px] h-[800px] rounded-full bg-emerald-400/10 dark:bg-[var(--chart-3)]/10 blur-[150px]" />
      </div>

      {/* Main Content Wrapper */}
      <div className="relative flex flex-col flex-1 z-10">
        <div className="absolute inset-x-0 top-0 h-[118svh] z-0">
          <SilkBackground fadeBottom bottomColor="var(--background)" />
        </div>

        {/* Navigation Header */}
        <Header />

        {/* Hero Section */}
        <Hero />

        {/* Section 2: Who Is This For */}
        <WhoIsThisFor />

        {/* Section 3: Candidate Practice */}
        <CandidatePractice />

        {/* Section 4: AI Screening */}
        <AiScreening />

        {/* Section 5: How It Works */}
        <HowItWorks />

        {/* Section 6: Why Our AI */}
        <WhyOurAi />

        {/* Section 7: Testimonials */}
        <Testimonials />

        {/* Section 8: Final CTA */}
        <FinalCta />

        {/* Section 9: FAQ */}
        <Faq />

        {/* Section 10: Footer */}
        <Footer />
      </div>
    </div>
  );
}
