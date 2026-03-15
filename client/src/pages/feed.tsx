import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface PostWithAuthor {
  id: number;
  content: string;
  imageUrl?: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    photo?: string;
    profession?: string;
  };
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
}

interface PostComment {
  id: number;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    photo?: string;
  };
}

interface MemberProfile {
  id: string;
  name: string;
  photo?: string;
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

export default function FeedPage() {
  const { toast } = useToast();
  const [newPost, setNewPost] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [commentPostId, setCommentPostId] = useState<number | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: currentMember } = useQuery<MemberProfile>({
    queryKey: ["/api/auth/me"],
  });

  const { data: posts, isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/posts"],
  });

  const { data: comments } = useQuery<PostComment[]>({
    queryKey: ["/api/posts", commentPostId, "comments"],
    enabled: !!commentPostId,
  });

  const createPostMutation = useMutation({
    mutationFn: async ({ content, image }: { content: string; image?: File | null }) => {
      let imageUrl: string | undefined;

      if (image) {
        const formData = new FormData();
        formData.append("file", image);
        formData.append("kind", "feed");

        const uploadResponse = await fetch("/api/uploads/image", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!uploadResponse.ok) {
          const message = extractErrorMessage((await uploadResponse.text()) || "Image upload failed");
          throw new Error(message);
        }

        const uploadResult = await uploadResponse.json();
        imageUrl = uploadResult.url;
      }

      return apiRequest("POST", "/api/posts", { content, imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setNewPost("");
      setSelectedImage(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Could not create post",
        description: extractErrorMessage(error.message),
        variant: "destructive",
      });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      return apiRequest("POST", `/api/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: number; content: string }) => {
      return apiRequest("POST", `/api/posts/${postId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", commentPostId, "comments"] });
      setCommentDraft("");
    },
    onError: (error: Error) => {
      toast({
        title: "Could not post reply",
        description: extractErrorMessage(error.message),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPost.trim() || selectedImage) {
      createPostMutation.mutate({ content: newPost.trim(), image: selectedImage });
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentPostId || !commentDraft.trim()) return;
    addCommentMutation.mutate({ postId: commentPostId, content: commentDraft.trim() });
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit}>
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentMember?.photo || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {currentMember?.name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="resize-none min-h-[100px]"
                  data-testid="input-new-post"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      ref={imageInputRef}
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.webp,.gif"
                      onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => imageInputRef.current?.click()}
                      data-testid="button-add-image"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Photo
                    </Button>
                    {selectedImage && (
                      <span className="text-xs text-muted-foreground">{selectedImage.name}</span>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    disabled={(!newPost.trim() && !selectedImage) || createPostMutation.isPending}
                    data-testid="button-create-post"
                  >
                    {createPostMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} data-testid={`post-${post.id}`}>
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.author.photo} />
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    {post.author.name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{post.author.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {post.author.profession && `${post.author.profession} • `}
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                {post.imageUrl && (
                  <img 
                    src={post.imageUrl} 
                    alt="Post image" 
                    className="mt-3 rounded-lg w-full object-cover max-h-96"
                  />
                )}
              </CardContent>
              <CardFooter className="flex items-center gap-4 pt-0 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => likeMutation.mutate(post.id)}
                  className={post.isLiked ? "text-destructive" : ""}
                  data-testid={`button-like-${post.id}`}
                >
                  <Heart className={`h-4 w-4 mr-1 ${post.isLiked ? "fill-current" : ""}`} />
                  {post.likesCount}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCommentPostId(post.id)}
                  data-testid={`button-comment-${post.id}`}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {post.commentsCount}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">No posts yet</h3>
            <p className="text-muted-foreground">Be the first to share something with the community!</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!commentPostId} onOpenChange={(open) => !open && setCommentPostId(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Replies</DialogTitle>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
            {comments && comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.id} className="rounded-md border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={comment.author.photo} />
                      <AvatarFallback>{comment.author.name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{comment.author.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No replies yet. Be the first to reply.</p>
            )}
          </div>

          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
            <Input
              placeholder="Write a reply..."
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              data-testid="input-feed-comment"
            />
            <Button type="submit" disabled={!commentDraft.trim() || addCommentMutation.isPending}>
              {addCommentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
