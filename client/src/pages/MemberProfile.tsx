import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, Building2, GraduationCap, MapPin, Users } from "lucide-react";

interface MemberSummary {
  id: string;
  name: string;
  email: string;
  photo?: string | null;
  department?: string | null;
  profession?: string | null;
  company?: string | null;
  location?: string | null;
  bio?: string | null;
}

interface MemberProfileResponse {
  member: MemberSummary;
  friends: MemberSummary[];
  friend_count: number;
  mutual_friend_count: number;
}

export default function MemberProfilePage() {
  const [match, params] = useRoute("/members/:id");
  const memberId = match ? params.id : "";

  const { data, isLoading, error } = useQuery<MemberProfileResponse>({
    queryKey: [`/api/members/${memberId}`],
    enabled: !!memberId,
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-6 px-4">
        <Card className="animate-pulse">
          <CardContent className="p-6 h-64" />
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-4">
        <Link href="/members">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Members
          </Button>
        </Link>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Member profile not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const { member, friends, friend_count, mutual_friend_count } = data;

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      <Link href="/members">
        <Button variant="outline" size="sm" data-testid="button-back-members">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Members
        </Button>
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={member.photo || undefined} />
              <AvatarFallback className="text-2xl">{member.name?.[0]}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <div>
                <h1 className="text-2xl font-bold">{member.name}</h1>
                <p className="text-muted-foreground">{member.email}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{friend_count} Friends</Badge>
                <Badge variant="outline">{mutual_friend_count} Mutual Friends</Badge>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {member.department && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    <span>{member.department}</span>
                  </div>
                )}
                {member.profession && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{member.profession}</span>
                  </div>
                )}
                {member.company && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{member.company}</span>
                  </div>
                )}
                {member.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{member.location}</span>
                  </div>
                )}
              </div>

              {member.bio && <p className="text-muted-foreground">{member.bio}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friends
          </CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground">No friends to display yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {friends.map((friend) => (
                <Link key={friend.id} href={`/members/${friend.id}`}>
                  <button
                    className="w-full border rounded-md p-3 text-left hover:bg-accent/10 transition-colors"
                    data-testid={`friend-card-${friend.id}`}
                  >
                    <div className="font-medium">{friend.name}</div>
                    <div className="text-xs text-muted-foreground">{friend.department || friend.profession || "Member"}</div>
                  </button>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
