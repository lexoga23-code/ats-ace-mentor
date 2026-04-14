import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProblemSection from "@/components/ProblemSection";
import SolutionSection from "@/components/SolutionSection";
import HowItWorks from "@/components/HowItWorks";
import CVAnalyzer from "@/components/CVAnalyzer";
import FreemiumSection from "@/components/FreemiumSection";
import BeforeAfter from "@/components/BeforeAfter";
import SocialProof from "@/components/SocialProof";
import Reassurance from "@/components/Reassurance";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

import { RegionProvider } from "@/contexts/RegionContext";

const Index = () => (
  <RegionProvider>
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <HowItWorks />
      <CVAnalyzer />
      <FreemiumSection />
      <BeforeAfter />
      <SocialProof />
      <Reassurance />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  </RegionProvider>
);

export default Index;
