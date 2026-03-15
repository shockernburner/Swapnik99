import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Plus, Users, MessageCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface ChatRoom {
  id: number;
  name: string;
  isGroup: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  members: Array<{
    id: string;
    name: string;
    photo?: string;
  }>;
}

interface ChatMessageType {
  id: number;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    photo?: string;
  };
}

interface MemberDirectoryItem {
  id: string;
  name: string;
  photo?: string;
  department?: string;
  profession?: string;
}

interface CurrentMember {
  id: string;
}

export default function ChatPage() {
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryParams = new URLSearchParams(window.location.search);
  const roomIdFromQuery = queryParams.get("room");
  const memberIdFromQuery = queryParams.get("memberId");

  const { data: currentMember } = useQuery<CurrentMember>({
    queryKey: ["/api/auth/me"],
  });

  const { data: rooms, isLoading: roomsLoading } = useQuery<ChatRoom[]>({
    queryKey: ["/api/chat/rooms"],
  });

  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery<ChatMessageType[]>({
    queryKey: ["/api/chat/rooms", selectedRoom, "messages"],
    enabled: !!selectedRoom,
  });

  const { data: allMembers } = useQuery<MemberDirectoryItem[]>({
    queryKey: ["/api/members"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/chat/rooms/${selectedRoom}/messages`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms", selectedRoom, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setMessage("");
    },
  });

  const createDirectRoomMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const response = await apiRequest("POST", `/api/chat/direct/${memberId}`);
      return response.json() as Promise<{ id: number }>;
    },
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/rooms"] });
      setSelectedRoom(room.id);
      setNewChatOpen(false);
      setMemberSearch("");
      window.history.replaceState({}, "", `/chat?room=${room.id}`);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (selectedRoom) {
      const interval = setInterval(() => {
        refetchMessages();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedRoom, refetchMessages]);

  useEffect(() => {
    if (!rooms || rooms.length === 0) {
      return;
    }

    if (roomIdFromQuery) {
      const targetRoomId = Number(roomIdFromQuery);
      if (!Number.isNaN(targetRoomId)) {
        const existingRoom = rooms.find((room) => room.id === targetRoomId);
        if (existingRoom) {
          setSelectedRoom(existingRoom.id);
        }
      }
    }
  }, [rooms, roomIdFromQuery]);

  useEffect(() => {
    if (memberIdFromQuery && !createDirectRoomMutation.isPending) {
      createDirectRoomMutation.mutate(memberIdFromQuery);
    }
  }, [memberIdFromQuery]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && selectedRoom) {
      sendMessageMutation.mutate(message);
    }
  };

  const selectedRoomData = rooms?.find((r) => r.id === selectedRoom);
  const filteredMembers = (allMembers || []).filter((member) => {
    const searchText = memberSearch.trim().toLowerCase();
    if (!searchText) return true;

    return (
      member.name.toLowerCase().includes(searchText) ||
      member.department?.toLowerCase().includes(searchText) ||
      member.profession?.toLowerCase().includes(searchText)
    );
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4 p-4">
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Messages</CardTitle>
            <Button
              size="icon"
              variant="ghost"
              data-testid="button-new-chat"
              onClick={() => setNewChatOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            {roomsLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-24" />
                      <div className="h-3 bg-muted rounded w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : rooms && rooms.length > 0 ? (
              <div className="divide-y">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={`w-full flex items-center gap-3 p-3 text-left hover-elevate transition-colors ${
                      selectedRoom === room.id ? "bg-accent/10" : ""
                    }`}
                    data-testid={`chat-room-${room.id}`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={room.members[0]?.photo} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {room.isGroup ? <Users className="h-4 w-4" /> : room.name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{room.name}</p>
                      {room.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate">{room.lastMessage}</p>
                      )}
                    </div>
                    {room.lastMessageTime && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(room.lastMessageTime), { addSuffix: false })}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start a new chat to connect</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            <CardHeader className="border-b pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedRoomData?.members[0]?.photo} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {selectedRoomData?.isGroup ? <Users className="h-4 w-4" /> : selectedRoomData?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{selectedRoomData?.name}</CardTitle>
                  {selectedRoomData?.isGroup && (
                    <p className="text-xs text-muted-foreground">
                      {selectedRoomData.members.length} members
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages && messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isOwn = msg.sender.id === currentMember?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={msg.sender.photo} />
                            <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                              {msg.sender.name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                            <div
                              className={`rounded-2xl px-4 py-2 inline-block ${
                                isOwn
                                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                                  : "bg-muted rounded-tl-sm"
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">No messages yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Send a message to start the conversation</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1"
                  data-testid="input-chat-message"
                />
                <Button 
                  type="submit" 
                  disabled={!message.trim() || sendMessageMutation.isPending} 
                  data-testid="button-send-message"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Select a conversation</h3>
              <p className="text-muted-foreground text-sm">Choose a chat or start a new one</p>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Start New Chat</DialogTitle>
          </DialogHeader>

          <Input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search members by name, department, or profession"
            data-testid="input-new-chat-search"
          />

          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.photo} />
                      <AvatarFallback>{member.name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.profession || member.department || "Member"}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => createDirectRoomMutation.mutate(member.id)}
                    disabled={createDirectRoomMutation.isPending}
                    data-testid={`button-start-chat-${member.id}`}
                  >
                    Chat
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No members found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
