import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Calendar, MapPin, Users, Check, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface EventWithRsvp {
  id: number;
  title: string;
  description?: string;
  date: string;
  venue?: string;
  imageUrl?: string;
  createdAt: string;
  goingCount: number;
  isGoing: boolean;
}

export default function EventsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [venue, setVenue] = useState("");

  const { data: events, isLoading } = useQuery<EventWithRsvp[]>({
    queryKey: ["/api/events"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; date: string; venue: string }) => {
      return apiRequest("POST", "/api/events", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setIsOpen(false);
      setTitle("");
      setDescription("");
      setDate("");
      setVenue("");
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return apiRequest("POST", `/api/events/${eventId}/rsvp`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && date) {
      createMutation.mutate({ title, description, date, venue });
    }
  };

  const upcomingEvents = events?.filter((e) => new Date(e.date) >= new Date()) || [];
  const pastEvents = events?.filter((e) => new Date(e.date) < new Date()) || [];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground">Reunions, meetups, and special occasions</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-event">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Event name"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-event-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What's this event about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="input-event-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date & Time</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    data-testid="input-event-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue</Label>
                  <Input
                    id="venue"
                    placeholder="Location"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    data-testid="input-event-venue"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-event">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-40 bg-muted rounded-t-lg" />
              <CardContent className="p-4">
                <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {upcomingEvents.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Upcoming Events</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {upcomingEvents.map((event) => (
                  <Card key={event.id} className="overflow-hidden" data-testid={`event-${event.id}`}>
                    {event.imageUrl ? (
                      <img src={event.imageUrl} alt={event.title} className="h-40 w-full object-cover" />
                    ) : (
                      <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Calendar className="h-12 w-12 text-primary/50" />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(event.date), "PPP 'at' p")}</span>
                      </div>
                      {event.venue && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{event.venue}</span>
                        </div>
                      )}
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                      )}
                    </CardContent>
                    <CardFooter className="flex items-center justify-between pt-0">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {event.goingCount} going
                      </Badge>
                      <Button
                        size="sm"
                        variant={event.isGoing ? "secondary" : "default"}
                        onClick={() => rsvpMutation.mutate(event.id)}
                        disabled={rsvpMutation.isPending}
                        data-testid={`button-rsvp-${event.id}`}
                      >
                        {event.isGoing ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Going
                          </>
                        ) : (
                          "RSVP"
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pastEvents.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-muted-foreground">Past Events</h2>
              <div className="grid md:grid-cols-2 gap-4 opacity-75">
                {pastEvents.map((event) => (
                  <Card key={event.id} className="overflow-hidden" data-testid={`event-past-${event.id}`}>
                    {event.imageUrl ? (
                      <img src={event.imageUrl} alt={event.title} className="h-32 w-full object-cover grayscale" />
                    ) : (
                      <div className="h-32 bg-muted flex items-center justify-center">
                        <Calendar className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{event.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.date), "PPP")} • {event.goingCount} attended
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {events?.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No events yet</h3>
                <p className="text-muted-foreground mb-4">Create the first event for our batch!</p>
                <Button onClick={() => setIsOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
