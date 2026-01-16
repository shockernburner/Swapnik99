import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
import logoUrl from "@assets/swapnik_1768561630231.jpeg";

export default function PendingApprovalPage() {
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <img src={logoUrl} alt="Swapnik99" className="h-16 w-16 rounded-full object-cover" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center">
              <Clock className="h-8 w-8 text-accent" />
            </div>
          </div>
          <CardTitle className="text-2xl">Pending Approval</CardTitle>
          <CardDescription className="text-base">
            Your membership request has been submitted and is awaiting admin approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            An admin will review your profile soon. You'll receive access to the full platform once approved. 
            Thank you for your patience!
          </p>
          <Button variant="outline" onClick={handleLogout} className="gap-2" data-testid="button-logout">
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
