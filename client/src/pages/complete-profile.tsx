import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, User, Briefcase, MapPin, GraduationCap, Upload } from "lucide-react";

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

function extractErrorMessage(raw: string): string {
  if (!raw) return "Request failed";

  const text = raw.trim();
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.message === "string") {
      return parsed.message;
    }
    if (typeof parsed?.error === "string") {
      return parsed.error;
    }
  } catch {
    const jsonStart = text.indexOf("{");
    if (jsonStart >= 0) {
      const jsonText = text.slice(jsonStart);
      try {
        const parsed = JSON.parse(jsonText);
        if (typeof parsed?.message === "string") {
          return parsed.message;
        }
        if (typeof parsed?.error === "string") {
          return parsed.error;
        }
      } catch {
        // Ignore parse fallback errors.
      }
    }
  }

  return text;
}

export default function CompleteProfilePage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
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

  const { data: member, isLoading: memberLoading } = useQuery<any>({
    queryKey: ["/api/member/profile"],
  });

  useEffect(() => {
    if (!member) return;

    setFormData({
      name: member.name || "",
      rollNumber: member.rollNumber || "",
      department: member.department || "",
      currentLocation: member.location || "",
      profession: member.profession || "",
      company: member.company || "",
      bio: member.bio || "",
      phone: member.phone || "",
    });
  }, [member]);

  const mutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("PATCH", "/api/member/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile changes were saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/member/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: extractErrorMessage(error.message),
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

  const handlePhotoSelect = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setPhotoUploading(true);
      const response = await fetch("/api/member/photo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(extractErrorMessage(message || "Photo upload failed"));
      }

      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/member/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: extractErrorMessage(error.message),
        variant: "destructive",
      });
    } finally {
      setPhotoUploading(false);
      event.target.value = "";
    }
  };

  if (memberLoading) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <Card>
          <CardContent className="p-10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Edit Profile</CardTitle>
          <CardDescription>
            Keep your profile and photo up to date so members can recognize you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 mb-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={member?.photo || undefined} />
              <AvatarFallback className="text-xl">
                {formData.name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.webp,.gif"
              onChange={handlePhotoChange}
            />
            <Button type="button" variant="outline" onClick={handlePhotoSelect} disabled={photoUploading}>
              {photoUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {photoUploading ? "Uploading..." : "Upload Photo"}
            </Button>
          </div>

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
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
