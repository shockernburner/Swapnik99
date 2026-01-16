import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Briefcase, GraduationCap, UserPlus, MessageCircle, Users } from "lucide-react";

interface MemberProfile {
  id: string;
  name: string;
  photo?: string;
  department?: string;
  profession?: string;
  location?: string;
  bio?: string;
  isFriend: boolean;
  friendshipStatus?: string;
}

export default function MembersPage() {
  const [search, setSearch] = useState("");

  const { data: members, isLoading } = useQuery<MemberProfile[]>({
    queryKey: ["/api/members", search],
  });

  const filteredMembers = members?.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.department?.toLowerCase().includes(search.toLowerCase()) ||
      m.profession?.toLowerCase().includes(search.toLowerCase()) ||
      m.location?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-muted-foreground">Connect with BUET '99 batchmates</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, department, profession..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-members"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="h-20 w-20 rounded-full bg-muted mb-4" />
                  <div className="h-5 bg-muted rounded w-32 mb-2" />
                  <div className="h-4 bg-muted rounded w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMembers && filteredMembers.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <Card key={member.id} className="hover-elevate transition-all" data-testid={`member-${member.id}`}>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 mb-4">
                    <AvatarImage src={member.photo} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {member.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg">{member.name}</h3>
                  {member.profession && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Briefcase className="h-3 w-3" />
                      <span>{member.profession}</span>
                    </div>
                  )}
                  {member.department && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <GraduationCap className="h-3 w-3" />
                      <span>{member.department}</span>
                    </div>
                  )}
                  {member.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      <span>{member.location}</span>
                    </div>
                  )}
                  {member.bio && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{member.bio}</p>
                  )}
                  <div className="flex items-center gap-2 mt-4">
                    {member.isFriend ? (
                      <Badge variant="secondary">Friends</Badge>
                    ) : member.friendshipStatus === "pending" ? (
                      <Badge variant="outline">Request Sent</Badge>
                    ) : (
                      <Button size="sm" variant="outline" data-testid={`button-add-friend-${member.id}`}>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add Friend
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" data-testid={`button-message-${member.id}`}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {search ? "No members found" : "No members yet"}
            </h3>
            <p className="text-muted-foreground">
              {search
                ? "Try adjusting your search terms"
                : "Members will appear here once they join"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
