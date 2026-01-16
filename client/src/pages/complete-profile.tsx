import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, User, Briefcase, MapPin, GraduationCap } from "lucide-react";
import logoUrl from "@assets/swapnik_1768561630231.jpeg";

interface ProfileFormData {
  name: string;
  rollNumber: string;
  department: string;
  currentLocation: string;
  profession: string;
  company: string;
  bio: string;
  phone: string;
}

export default function CompleteProfilePage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ProfileFormData>({
    name: "",
    rollNumber: "",
    department: "",
    currentLocation: "",
    profession: "",
    company: "",
    bio: "",
    phone: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("POST", "/api/members", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile submitted",
        description: "Your profile has been submitted for admin approval. You'll be notified once approved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/member/me"] });
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
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate(formData);
  };

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoUrl} alt="Swapnik99" className="h-16 w-16 rounded-full object-cover" />
          </div>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Fill in your details to join the BUET '99 alumni network. Your profile will be reviewed by an admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Full Name *
              </Label>
              <Input
                id="name"
                placeholder="Your full name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                data-testid="input-profile-name"
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
                  data-testid="input-profile-roll"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g., CSE, EEE, ME"
                  value={formData.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                  data-testid="input-profile-department"
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
                data-testid="input-profile-location"
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
                  data-testid="input-profile-profession"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  placeholder="Company name"
                  value={formData.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  data-testid="input-profile-company"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+880 1XXX-XXXXXX"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                data-testid="input-profile-phone"
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
                data-testid="input-profile-bio"
              />
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-profile">
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
        </CardContent>
      </Card>
    </div>
  );
}
