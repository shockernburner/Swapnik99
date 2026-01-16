import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { insertPostSchema, insertDiscussionSchema, insertEventSchema, insertBusinessListingSchema, insertMemberSchema } from "@shared/schema";
import OpenAI from "openai";
import { setupAuth } from "./replit_integrations/auth";
import { registerAuthRoutes } from "./replit_integrations/auth/routes";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function getMember(req: any) {
  return req.member;
}

function requireMember(req: any, res: any): boolean {
  const member = getMember(req);
  if (!member) {
    res.status(401).json({ message: "Please complete your profile" });
    return false;
  }
  if (member.status !== "approved") {
    res.status(403).json({ message: "Your membership is pending approval" });
    return false;
  }
  return true;
}

function requireAdmin(req: any, res: any): boolean {
  if (!requireMember(req, res)) return false;
  const member = getMember(req);
  if (member.role !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return false;
  }
  return true;
}

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  await setupAuth(app);
  registerAuthRoutes(app);
  app.use(async (req, res, next) => {
    if ((req as any).user) {
      const member = await storage.getMemberByUserId((req as any).user.id);
      (req as any).member = member;
    }
    next();
  });

  app.post("/api/members", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const existing = await storage.getMemberByUserId(user.id);
      if (existing) {
        return res.status(400).json({ message: "Member profile already exists" });
      }

      const data = insertMemberSchema.parse({
        ...req.body,
        userId: user.id,
        email: user.email || req.body.email,
        name: req.body.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Anonymous",
      });

      const member = await storage.createMember(data);
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/members", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const members = await storage.getApprovedMembers();
      const currentMember = getMember(req);
      
      res.json(members.map((m) => ({
        ...m,
        isFriend: false,
        friendshipStatus: null,
      })));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/posts", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);
      const posts = await storage.getPosts(member?.id);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/posts", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);
      
      const data = insertPostSchema.parse({
        ...req.body,
        authorId: member.id,
      });

      const post = await storage.createPost(data);
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/posts/:id/like", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);
      const postId = parseInt(req.params.id);

      const isLiked = await storage.getPostLike(postId, member.id);
      if (isLiked) {
        await storage.unlikePost(postId, member.id);
        res.json({ liked: false });
      } else {
        await storage.likePost(postId, member.id);
        res.json({ liked: true });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/discussions", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const discussions = await storage.getDiscussions();
      res.json(discussions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/discussions", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);

      const data = insertDiscussionSchema.parse({
        ...req.body,
        authorId: member.id,
      });

      const discussion = await storage.createDiscussion(data);

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant that creates brief, engaging summaries of discussion topics. Keep summaries under 100 words.",
            },
            {
              role: "user",
              content: `Please summarize this discussion topic:\n\nHeadline: ${data.headline}\n\nDescription: ${data.description}`,
            },
          ],
          max_completion_tokens: 150,
        });

        const summary = response.choices[0]?.message?.content;
        if (summary) {
          await storage.updateDiscussionSummary(discussion.id, summary);
          discussion.aiSummary = summary;
        }
      } catch (aiError) {
        console.error("AI summary generation failed:", aiError);
      }

      res.json(discussion);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/events", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);
      const events = await storage.getEvents(member?.id);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);

      const data = insertEventSchema.parse({
        ...req.body,
        createdBy: member.id,
        date: new Date(req.body.date),
      });

      const event = await storage.createEvent(data);
      res.json(event);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/events/:id/rsvp", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);
      const eventId = parseInt(req.params.id);

      const isGoing = await storage.getEventRsvp(eventId, member.id);
      if (isGoing) {
        await storage.unrsvpEvent(eventId, member.id);
        res.json({ going: false });
      } else {
        await storage.rsvpEvent(eventId, member.id);
        res.json({ going: true });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/posts/:id/comments", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const postId = parseInt(req.params.id);
      const comments = await storage.getPostComments(postId);
      res.json(comments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/posts/:id/comments", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);
      const postId = parseInt(req.params.id);

      const comment = await storage.createPostComment({
        postId,
        authorId: member.id,
        content: req.body.content,
      });

      res.json(comment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/discussions/:id", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const id = parseInt(req.params.id);
      const discussion = await storage.getDiscussion(id);
      if (!discussion) {
        return res.status(404).json({ message: "Discussion not found" });
      }
      res.json(discussion);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/discussions/:id/replies", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const discussionId = parseInt(req.params.id);
      const replies = await storage.getDiscussionReplies(discussionId);
      res.json(replies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/discussions/:id/replies", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);
      const discussionId = parseInt(req.params.id);

      const reply = await storage.createDiscussionReply({
        discussionId,
        authorId: member.id,
        content: req.body.content,
        parentId: req.body.parentId || null,
      });

      res.json(reply);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/business", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const listings = await storage.getBusinessListings();
      res.json(listings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/business", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);

      const data = insertBusinessListingSchema.parse({
        ...req.body,
        authorId: member.id,
      });

      const listing = await storage.createBusinessListing(data);
      res.json(listing);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/accounting", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const documents = await storage.getAccountingDocuments();
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/chat/rooms", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);
      const rooms = await storage.getChatRooms(member.id);
      res.json(rooms);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/chat/rooms/:id/messages", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const roomId = parseInt(req.params.id);
      const messages = await storage.getChatRoomMessages(roomId);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/chat/rooms/:id/messages", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);
      const roomId = parseInt(req.params.id);

      const message = await storage.createChatMessage({
        roomId,
        senderId: member.id,
        content: req.body.content,
      });

      res.json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/chat/rooms", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);

      const { name, memberIds, isGroup } = req.body;
      const allMemberIds = [...new Set([member.id, ...memberIds])];

      const room = await storage.createChatRoom(name, allMemberIds, isGroup || false);
      res.json(room);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/pending-members", async (req, res) => {
    try {
      if (!requireAdmin(req as any, res)) return;
      const members = await storage.getPendingMembers();
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/members", async (req, res) => {
    try {
      if (!requireAdmin(req as any, res)) return;
      const members = await storage.getAllMembers();
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/members/:id/approve", async (req, res) => {
    try {
      if (!requireAdmin(req as any, res)) return;
      const member = await storage.updateMemberStatus(req.params.id, "approved");
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/members/:id/reject", async (req, res) => {
    try {
      if (!requireAdmin(req as any, res)) return;
      const member = await storage.updateMemberStatus(req.params.id, "rejected");
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/accounting", async (req, res) => {
    try {
      if (!requireAdmin(req as any, res)) return;
      const member = getMember(req);

      const doc = await storage.createAccountingDocument({
        uploadedBy: member.id,
        title: req.body.title,
        category: req.body.category,
        year: parseInt(req.body.year),
        fileUrl: req.body.fileUrl || "/placeholder-document.pdf",
        fileType: req.body.fileType,
      });

      res.json(doc);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
}
