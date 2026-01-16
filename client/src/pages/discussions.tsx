import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, MessageSquare, Sparkles, ChevronRight, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface DiscussionWithAuthor {
  id: number;
  headline: string;
  description: string;
  aiSummary?: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    photo?: string;
  };
  repliesCount: number;
}

export default function DiscussionsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");

  const { data: discussions, isLoading } = useQuery<DiscussionWithAuthor[]>({
    queryKey: ["/api/discussions"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { headline: string; description: string }) => {
      return apiRequest("POST", "/api/discussions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions"] });
      setIsOpen(false);
      setHeadline("");
      setDescription("");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (headline.trim() && description.trim()) {
      createMutation.mutate({ headline, description });
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discussions</h1>
          <p className="text-muted-foreground">Engage in community topics with AI-powered summaries</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-discussion">
              <Plus className="h-4 w-4 mr-2" />
              New Discussion
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a Discussion</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  placeholder="What's the topic?"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  data-testid="input-discussion-headline"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the topic in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px]"
                  data-testid="input-discussion-description"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-discussion">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : discussions && discussions.length > 0 ? (
        <div className="space-y-4">
          {discussions.map((discussion) => (
            <Card key={discussion.id} className="hover-elevate cursor-pointer transition-all" data-testid={`discussion-${discussion.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{discussion.headline}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={discussion.author.photo} />
                        <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                          {discussion.author.name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">{discussion.author.name}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(discussion.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-muted-foreground line-clamp-2">{discussion.description}</p>
                {discussion.aiSummary && (
                  <div className="mt-3 p-3 bg-accent/10 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <span className="text-xs font-medium text-accent">AI Summary</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{discussion.aiSummary}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0">
                <Badge variant="secondary" className="gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {discussion.repliesCount} replies
                </Badge>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No discussions yet</h3>
            <p className="text-muted-foreground mb-4">Start a new discussion to spark conversation!</p>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Start Discussion
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
