import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SharedReportPage from "./pages/SharedReport.tsx";
import PaymentSuccess from "./pages/PaymentSuccess.tsx";
import Auth from "./pages/Auth.tsx";
import Account from "./pages/Account.tsx";

const queryClient = new QueryClient();

/** Save and restore scroll position per route */
const ScrollRestorer = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  // Save scroll position on scroll
  useEffect(() => {
    const key = `scrollPos_${location.pathname}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      setTimeout(() => window.scrollTo(0, parseInt(saved, 10)), 50);
    }

    const handleScroll = () => {
      sessionStorage.setItem(`scrollPos_${location.pathname}`, String(window.scrollY));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollRestorer>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/compte" element={<Account />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/rapport/:id" element={<SharedReportPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ScrollRestorer>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
