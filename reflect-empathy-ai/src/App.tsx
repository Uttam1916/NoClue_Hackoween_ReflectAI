import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Index from "./pages/Index"; // MirrorInterface page
import NotFound from "./pages/NotFound";
import MirrorOnboarding from "@/components/MirrorOnboarding";

const queryClient = new QueryClient();

const App = () => {
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem("onboarding_completed");
    if (completed === "true") setOnboardingCompleted(true);
  }, []);

  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Onboarding */}
            {!onboardingCompleted && (
              <Route
                path="/"
                element={<MirrorOnboarding onComplete={handleOnboardingComplete} />}
              />
            )}

            {/* Main mirror */}
            {onboardingCompleted && <Route path="/" element={<Index />} />}

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
