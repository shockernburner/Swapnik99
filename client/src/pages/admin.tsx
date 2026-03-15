import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, UserCheck, UserX, Upload, FileText, 
  Shield, Loader2, Check, X, Calendar
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PendingMember {
  id: string;
  name: string;
  email: string;
  department?: string;
  profession?: string;
  createdAt: string;
}

interface MemberForAdmin {
  id: string;
  name: string;
  email: string;
  rollNumber?: string;
  department?: string;
  role: "user" | "admin";
  approvalStatus: "pending" | "approved" | "rejected";
  createdAt: string;
}

function extractErrorMessage(raw: string): string {
  if (!raw) return "Request failed";

  const text = raw.trim();
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.message === "string") return parsed.message;
    if (typeof parsed?.error === "string") return parsed.error;
  } catch {
    const jsonStart = text.indexOf("{");
    if (jsonStart >= 0) {
      try {
        const parsed = JSON.parse(text.slice(jsonStart));
        if (typeof parsed?.message === "string") return parsed.message;
        if (typeof parsed?.error === "string") return parsed.error;
      } catch {
        // Ignore parse fallback errors.
      }
    }
  }

  return text;
}

export default function AdminPage() {
  const { toast } = useToast();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("");
  const [docYear, setDocYear] = useState(new Date().getFullYear().toString());
  const [docFile, setDocFile] = useState<File | null>(null);

  const { data: pendingMembers, isLoading: pendingLoading } = useQuery<PendingMember[]>({
    queryKey: ["/api/admin/pending-members"],
  });

  const { data: allMembers, isLoading: membersLoading } = useQuery<MemberForAdmin[]>({
    queryKey: ["/api/admin/members"],
  });

  const approveMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return apiRequest("POST", `/api/admin/members/${memberId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return apiRequest("POST", `/api/admin/members/${memberId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-members"] });
    },
  });

  const makeAdminMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return apiRequest("POST", `/api/admin/members/${memberId}/make-admin`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return apiRequest("POST", `/api/admin/members/${memberId}/remove-admin`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/admin/accounting", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) {
        const message = extractErrorMessage(await response.text());
        throw new Error(message || "Upload failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting"] });
      setUploadOpen(false);
      setDocTitle("");
      setDocCategory("");
      setDocYear(new Date().getFullYear().toString());
      setDocFile(null);
      toast({
        title: "Document uploaded",
        description: "The accounting document is now available to members.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: extractErrorMessage(error.message),
        variant: "destructive",
      });
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile || !docTitle || !docCategory) return;

    const formData = new FormData();
    formData.append("file", docFile);
    formData.append("title", docTitle);
    formData.append("category", docCategory);
    formData.append("year", docYear);

    uploadMutation.mutate(formData);
  };

  const approvedMembers = allMembers?.filter((m) => m.approvalStatus === "approved") || [];
  const pendingCount = pendingMembers?.length || 0;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Manage members and upload documents</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedMembers.length}</p>
                <p className="text-sm text-muted-foreground">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button className="w-full h-full flex flex-col items-center justify-center gap-2 min-h-[80px]" variant="outline" data-testid="button-upload-document">
                  <Upload className="h-6 w-6" />
                  <span>Upload Document</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Financial Document</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="docTitle">Title</Label>
                    <Input
                      id="docTitle"
                      placeholder="Document title"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      data-testid="input-doc-title"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="docCategory">Category</Label>
                      <Select value={docCategory} onValueChange={setDocCategory}>
                        <SelectTrigger data-testid="select-doc-category">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Budget">Budget</SelectItem>
                          <SelectItem value="Ledger">Ledger</SelectItem>
                          <SelectItem value="Journal">Journal</SelectItem>
                          <SelectItem value="Report">Report</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="docYear">Year</Label>
                      <Input
                        id="docYear"
                        type="number"
                        value={docYear}
                        onChange={(e) => setDocYear(e.target.value)}
                        data-testid="input-doc-year"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="docFile">File</Label>
                    <Input
                      id="docFile"
                      type="file"
                      accept=".pdf,.xls,.xlsx,.doc,.docx"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      data-testid="input-doc-file"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={uploadMutation.isPending} data-testid="button-submit-upload">
                      {uploadMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Upload
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending Approvals
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="members" data-testid="tab-members">All Members</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-muted" />
                    <div className="flex-1">
                      <div className="h-5 bg-muted rounded w-32 mb-2" />
                      <div className="h-4 bg-muted rounded w-48" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingMembers && pendingMembers.length > 0 ? (
            <div className="space-y-3">
              {pendingMembers.map((member) => (
                <Card key={member.id} data-testid={`pending-member-${member.id}`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        {member.name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{member.name}</h3>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {member.department && (
                          <Badge variant="secondary">{member.department}</Badge>
                        )}
                        {member.profession && (
                          <span className="text-xs text-muted-foreground">{member.profession}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Applied {formatDistanceToNow(new Date(member.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(member.id)}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-${member.id}`}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectMutation.mutate(member.id)}
                        disabled={rejectMutation.isPending}
                        data-testid={`button-reject-${member.id}`}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No pending approvals</h3>
                <p className="text-muted-foreground">All membership requests have been processed</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          {membersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="flex-1">
                      <div className="h-5 bg-muted rounded w-32 mb-2" />
                      <div className="h-4 bg-muted rounded w-48" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : approvedMembers.length > 0 ? (
            <div className="space-y-3">
              {approvedMembers.map((member) => (
                <Card key={member.id} data-testid={`member-admin-${member.id}`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {member.name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{member.name}</h3>
                        {member.role === "admin" && (
                          <Badge variant="default" className="gap-1">
                            <Shield className="h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                        {member.rollNumber && (
                          <Badge variant="outline">{member.rollNumber}</Badge>
                        )}
                        {member.department && (
                          <Badge variant="secondary">{member.department}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Joined {formatDistanceToNow(new Date(member.createdAt), { addSuffix: true })}
                      </div>
                      {member.role === "admin" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeAdminMutation.mutate(member.id)}
                          disabled={removeAdminMutation.isPending}
                          data-testid={`button-remove-admin-${member.id}`}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Remove Admin
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => makeAdminMutation.mutate(member.id)}
                          disabled={makeAdminMutation.isPending}
                          data-testid={`button-make-admin-${member.id}`}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Make Admin
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No members yet</h3>
                <p className="text-muted-foreground">Approved members will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
