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
import { useToast } from "@/hooks/use-toast";

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

interface DiscussionDetail {
  id: number;
  headline: string;
  description: string;
  aiSummary?: string;
  createdAt: string;
  author?: {
    id: string;
    name: string;
    photo?: string;
  };
  replies?: DiscussionReply[];
}

interface DiscussionReply {
  id: number;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    photo?: string;
  };
}

function parseCompiledSummary(summary?: string): {
  mainTopic: string;
  proposal: string;
  memberComments: string;
} {
  if (!summary) {
    return {
      mainTopic: "Summary will appear after the discussion is analyzed.",
      proposal: "No proposal inferred yet.",
      memberComments: "No member comment synthesis yet.",
    };
  }

  const mainTopicMatch = summary.match(/Main Topic:\s*([\s\S]*?)(?=\n\s*Proposal:|$)/i);
  const proposalMatch = summary.match(/Proposal:\s*([\s\S]*?)(?=\n\s*Member Comments:|$)/i);
  const memberCommentsMatch = summary.match(/Member Comments:\s*([\s\S]*)$/i);

  return {
    mainTopic: mainTopicMatch?.[1]?.trim() || "No topic summary available.",
    proposal: proposalMatch?.[1]?.trim() || "No proposal summary available.",
    memberComments: memberCommentsMatch?.[1]?.trim() || "No member comment synthesis available.",
  };
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

export default function DiscussionsPage() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
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
    onError: (error: Error) => {
      toast({
        title: "Could not create discussion",
        description: extractErrorMessage(error.message),
        variant: "destructive",
      });
    },
  });

  const selectedDiscussion = discussions?.find((discussion) => discussion.id === selectedDiscussionId);

  const { data: discussionDetail } = useQuery<DiscussionDetail>({
    queryKey: ["/api/discussions", selectedDiscussionId],
    enabled: !!selectedDiscussionId,
  });

  const { data: replies } = useQuery<DiscussionReply[]>({
    queryKey: ["/api/discussions", selectedDiscussionId, "replies"],
    enabled: !!selectedDiscussionId,
  });

  const replyMutation = useMutation({
    mutationFn: async ({ discussionId, content }: { discussionId: number; content: string }) => {
      return apiRequest("POST", `/api/discussions/${discussionId}/replies`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", selectedDiscussionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", selectedDiscussionId, "replies"] });
      setReplyDraft("");
    },
    onError: (error: Error) => {
      toast({
        title: "Could not post reply",
        description: extractErrorMessage(error.message),
        variant: "destructive",
      });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (headline.trim() && description.trim()) {
      createMutation.mutate({ headline, description });
    }
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDiscussionId || !replyDraft.trim()) return;
    replyMutation.mutate({ discussionId: selectedDiscussionId, content: replyDraft.trim() });
  };

  const activeReplies = replies || discussionDetail?.replies || [];
  const compiledSummary = parseCompiledSummary(discussionDetail?.aiSummary || selectedDiscussion?.aiSummary);

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
            <Card
              key={discussion.id}
              className="hover-elevate cursor-pointer transition-all"
              data-testid={`discussion-${discussion.id}`}
              onClick={() => {
                setSelectedDiscussionId(discussion.id);
                setReplyDraft("");
              }}
            >
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

      <Dialog
        open={!!selectedDiscussionId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDiscussionId(null);
            setReplyDraft("");
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{discussionDetail?.headline || selectedDiscussion?.headline || "Discussion"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-3">
              <div className="rounded-md border p-4">
                {(discussionDetail?.author || selectedDiscussion?.author) && (
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={discussionDetail?.author?.photo || selectedDiscussion?.author.photo} />
                      <AvatarFallback>
                        {discussionDetail?.author?.name?.[0] || selectedDiscussion?.author.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {discussionDetail?.author?.name || selectedDiscussion?.author.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(discussionDetail?.createdAt || selectedDiscussion?.createdAt || Date.now()), { addSuffix: true })}
                    </span>
                  </div>
                )}

                <p className="text-sm whitespace-pre-wrap">
                  {discussionDetail?.description || selectedDiscussion?.description || ""}
                </p>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-3 pr-2">
                {activeReplies.length > 0 ? (
                  activeReplies.map((reply) => (
                    <div key={reply.id} className="rounded-md border p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={reply.author.photo} />
                          <AvatarFallback>{reply.author.name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{reply.author.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No replies yet. Be the first to reply.</p>
                )}
              </div>

              <form onSubmit={handleReplySubmit} className="flex items-center gap-2">
                <Input
                  placeholder="Write a reply..."
                  value={replyDraft}
                  onChange={(e) => setReplyDraft(e.target.value)}
                  data-testid="input-discussion-reply"
                />
                <Button type="submit" disabled={!replyDraft.trim() || replyMutation.isPending}>
                  {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                </Button>
              </form>
            </div>

            <div className="rounded-md border bg-accent/10 p-4 space-y-4 lg:col-span-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-accent">Discussion Summary</span>
              </div>

              {replyMutation.isPending && (
                <p className="text-xs text-muted-foreground">Refreshing summary with latest member comments...</p>
              )}

              <div className="space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Main Topic</h4>
                <p className="text-sm whitespace-pre-wrap">{compiledSummary.mainTopic}</p>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proposal</h4>
                <p className="text-sm whitespace-pre-wrap">{compiledSummary.proposal}</p>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Member Comments</h4>
                <p className="text-sm whitespace-pre-wrap">{compiledSummary.memberComments}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
