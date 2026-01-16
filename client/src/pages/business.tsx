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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Briefcase, MessageCircle, Loader2, HandHelping, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface BusinessListingWithAuthor {
  id: number;
  title: string;
  description: string;
  type: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    photo?: string;
    profession?: string;
  };
  commentsCount: number;
}

export default function BusinessPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("");

  const { data: listings, isLoading } = useQuery<BusinessListingWithAuthor[]>({
    queryKey: ["/api/business"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; type: string }) => {
      return apiRequest("POST", "/api/business", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
      setIsOpen(false);
      setTitle("");
      setDescription("");
      setType("");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && description.trim() && type) {
      createMutation.mutate({ title, description, type });
    }
  };

  const needs = listings?.filter((l) => l.type === "need") || [];
  const offers = listings?.filter((l) => l.type === "offer") || [];

  const ListingCard = ({ listing }: { listing: BusinessListingWithAuthor }) => (
    <Card className="hover-elevate transition-all" data-testid={`listing-${listing.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={listing.author.photo} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {listing.author.name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-base">{listing.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">{listing.author.name}</span>
              {listing.author.profession && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{listing.author.profession}</span>
                </>
              )}
            </div>
          </div>
          <Badge variant={listing.type === "need" ? "secondary" : "default"}>
            {listing.type === "need" ? (
              <>
                <HandHelping className="h-3 w-3 mr-1" />
                Need
              </>
            ) : (
              <>
                <Megaphone className="h-3 w-3 mr-1" />
                Offer
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="text-muted-foreground">{listing.description}</p>
        <p className="text-xs text-muted-foreground mt-2">
          {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}
        </p>
      </CardContent>
      <CardFooter className="flex items-center gap-2 pt-0">
        <Button variant="ghost" size="sm" data-testid={`button-comment-listing-${listing.id}`}>
          <MessageCircle className="h-4 w-4 mr-1" />
          {listing.commentsCount} Comments
        </Button>
        <Button size="sm" data-testid={`button-contact-${listing.id}`}>
          Contact
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business Connect</h1>
          <p className="text-muted-foreground">Network and support each other's ventures</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-listing">
              <Plus className="h-4 w-4 mr-2" />
              Post Listing
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Post a Business Listing</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-listing-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="need">I Need (Looking for service/product)</SelectItem>
                    <SelectItem value="offer">I Offer (Providing service/product)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Brief title for your listing"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-listing-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what you need or offer in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px]"
                  data-testid="input-listing-description"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-listing">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Post
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="needs" data-testid="tab-needs">Needs ({needs.length})</TabsTrigger>
          <TabsTrigger value="offers" data-testid="tab-offers">Offers ({offers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="flex-1">
                        <div className="h-5 bg-muted rounded w-48 mb-2" />
                        <div className="h-4 bg-muted rounded w-32" />
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : listings && listings.length > 0 ? (
            <div className="space-y-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No listings yet</h3>
                <p className="text-muted-foreground mb-4">Be the first to post a business need or offer!</p>
                <Button onClick={() => setIsOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Post Listing
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="needs" className="mt-4">
          {needs.length > 0 ? (
            <div className="space-y-4">
              {needs.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <HandHelping className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No needs posted yet</h3>
                <p className="text-muted-foreground">Looking for something? Post a need!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="offers" className="mt-4">
          {offers.length > 0 ? (
            <div className="space-y-4">
              {offers.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No offers posted yet</h3>
                <p className="text-muted-foreground">Have something to offer? Share it!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
