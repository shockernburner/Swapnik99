import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface PendingUser {
  id: string;
  name: string;
  email: string;
  rollNumber?: string | null;
  department?: string | null;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const { data: pendingUsers, isLoading } = useQuery<PendingUser[]>({
    queryKey: ["/api/admin/pending-users"],
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/admin/approve/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/admin/reject/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
    },
  });

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">Review and approve pending signups.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pending Users</CardTitle>
          <Badge>{pendingUsers?.length || 0} pending</Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading pending users...
            </div>
          ) : !pendingUsers || pendingUsers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No pending users right now.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Name</th>
                    <th className="py-3 pr-4 font-medium">Email</th>
                    <th className="py-3 pr-4 font-medium">Roll Number</th>
                    <th className="py-3 pr-4 font-medium">Department</th>
                    <th className="py-3 pr-4 font-medium">Signup Date</th>
                    <th className="py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{user.name}</td>
                      <td className="py-3 pr-4">{user.email}</td>
                      <td className="py-3 pr-4">{user.rollNumber || "-"}</td>
                      <td className="py-3 pr-4">{user.department || "-"}</td>
                      <td className="py-3 pr-4">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(user.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            data-testid={`button-approve-${user.id}`}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectMutation.mutate(user.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            data-testid={`button-reject-${user.id}`}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
