import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import StoreRegistration from "./pages/StoreRegistration";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Settings from "./pages/Settings";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ForgotPassword from "./pages/ForgotPassword";

import StoreOrder from "./pages/StoreOrder";
import NotFound from "./pages/NotFound";
import Unsubscribe from "./pages/Unsubscribe";
import InstallApp from "./pages/InstallApp";
import HelpCenter from "./pages/HelpCenter";
import { SupportChatbot } from "./components/SupportChatbot";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SupportChatbot />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<StoreRegistration />} />
            <Route path="/employee" element={<EmployeeDashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            <Route path="/backend/login" element={<AdminLogin />} />
            <Route path="/backend" element={<AdminDashboard />} />
            <Route path="/order/:slug" element={<StoreOrder />} />
            <Route path="/install" element={<InstallApp />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
