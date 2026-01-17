import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, User, Mail, Lock, Briefcase, MapPin, GraduationCap, Phone } from "lucide-react";
import { Link } from "wouter";
import logoUrl from "@assets/swapnik_1768561630231.jpeg";

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  rollNumber: string;
  department: string;
  currentLocation: string;
  profession: string;
  company: string;
  phone: string;
  bio: string;
}

export default function RegisterPage({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<RegisterFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    rollNumber: "",
    department: "",
    currentLocation: "",
    profession: "",
    company: "",
    phone: "",
    bio: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: Omit<RegisterFormData, "confirmPassword">) => {
      return apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Registration submitted!",
        description: "Your profile has been submitted for admin approval. You'll be notified once approved.",
      });
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = "/";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password.trim() || !formData.name.trim()) {
      toast({
        title: "Required fields",
        description: "Please fill in email, password, and full name",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return;
    }

    const { confirmPassword, ...dataToSubmit } = formData;
    mutation.mutate(dataToSubmit);
  };

  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoUrl} alt="Swapnik99" className="h-16 w-16 rounded-full object-cover" />
          </div>
          <CardTitle className="text-2xl">Join Swapnik99</CardTitle>
          <CardDescription>
            Register to join the BUET '99 alumni network. Your profile will be reviewed by an admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                data-testid="input-register-email"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Password *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  data-testid="input-register-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Retype password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  data-testid="input-register-confirm-password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Full Name *
              </Label>
              <Input
                id="name"
                placeholder="Your full name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                data-testid="input-register-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rollNumber" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" /> Roll Number
                </Label>
                <Input
                  id="rollNumber"
                  placeholder="e.g., 9905001"
                  value={formData.rollNumber}
                  onChange={(e) => handleChange("rollNumber", e.target.value)}
                  data-testid="input-register-roll"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g., CSE, EEE, ME"
                  value={formData.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                  data-testid="input-register-department"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentLocation" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Current Location
              </Label>
              <Input
                id="currentLocation"
                placeholder="City, Country"
                value={formData.currentLocation}
                onChange={(e) => handleChange("currentLocation", e.target.value)}
                data-testid="input-register-location"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profession" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> Profession
                </Label>
                <Input
                  id="profession"
                  placeholder="Your role"
                  value={formData.profession}
                  onChange={(e) => handleChange("profession", e.target.value)}
                  data-testid="input-register-profession"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Company name"
                  value={formData.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  data-testid="input-register-company"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> Phone Number
              </Label>
              <Input
                id="phone"
                placeholder="+880 1XXX-XXXXXX"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                data-testid="input-register-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Short Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us a bit about yourself..."
                value={formData.bio}
                onChange={(e) => handleChange("bio", e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-register-bio"
              />
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-register">
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit for Approval"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium" data-testid="link-login">
                Sign In
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
