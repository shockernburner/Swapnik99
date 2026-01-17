import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import logoUrl from "@assets/swapnik_1768561630231.jpeg";

interface ForgotPasswordResponse {
  message: string;
}

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await apiRequest("POST", "/api/auth/forgot-password", data);
      return response.json() as Promise<ForgotPasswordResponse>;
    },
    onSuccess: (data) => {
      setSubmitted(true);
      toast({
        title: "Check your email",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate({ email });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              If an account exists with that email address, you will receive a password reset link shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              The link will expire in 1 hour for security reasons. If you don't see the email, please check your spam folder.
            </p>
            <div className="text-center">
              <Link href="/login" className="text-primary hover:underline inline-flex items-center gap-2" data-testid="link-back-to-login">
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoUrl} alt="Swapnik99" className="h-16 w-16 rounded-full object-cover" />
          </div>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-forgot-email"
              />
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-send-reset">
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-primary hover:underline inline-flex items-center gap-2" data-testid="link-back-login">
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
