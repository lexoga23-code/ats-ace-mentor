import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import CVAnalyzer from "@/components/CVAnalyzer";
import ATSEducation from "@/components/ATSEducation";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

import { RegionProvider } from "@/contexts/RegionContext";

const Index = () => (
  <RegionProvider>
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <CVAnalyzer />
      <ATSEducation />
      <Pricing />
      <FAQ />
      <Footer />
    </div>
  </RegionProvider>
);

export default Index;
