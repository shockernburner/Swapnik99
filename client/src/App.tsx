import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import FeedPage from "@/pages/feed";
import ChatPage from "@/pages/chat";
import DiscussionsPage from "@/pages/discussions";
import EventsPage from "@/pages/events";
import BusinessPage from "@/pages/business";
import MembersPage from "@/pages/members";
import AccountingPage from "@/pages/accounting";
import AdminPage from "@/pages/admin";
import PendingApprovalPage from "@/pages/pending-approval";

interface Member {
  id: string;
  email: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  role: "member" | "admin";
}

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={FeedPage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/discussions" component={DiscussionsPage} />
      <Route path="/events" component={EventsPage} />
      <Route path="/business" component={BusinessPage} />
      <Route path="/members" component={MembersPage} />
      <Route path="/accounting" component={AccountingPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between h-14 px-4 border-b bg-background/80 backdrop-blur-sm">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <AuthenticatedRouter />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function UnauthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login">{() => <LoginPage />}</Route>
      <Route path="/register">{() => <RegisterPage />}</Route>
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route component={LandingPage} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();

  const { data: member, isLoading, error } = useQuery<Member>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show public pages
  if (error || !member) {
    return <UnauthenticatedRouter />;
  }

  // Authenticated but pending approval
  if (member.status === "pending") {
    return <PendingApprovalPage />;
  }

  // Authenticated but rejected
  if (member.status === "rejected") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Membership Rejected</h1>
          <p className="text-muted-foreground">
            Unfortunately, your membership request was not approved. 
            Please contact an admin if you believe this was an error.
          </p>
        </div>
      </div>
    );
  }

  // Fully authenticated and approved
  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
