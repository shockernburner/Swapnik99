import type { Express } from "express";
import type { Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import {
  insertPostSchema,
  insertDiscussionSchema,
  insertEventSchema,
  insertBusinessListingSchema,
  insertMemberSchema,
} from "@shared/schema";
import OpenAI from "openai";
import { setupAuth } from "./replit_integrations/auth";
import { registerAuthRoutes } from "./replit_integrations/auth/routes";
import { hashPassword, verifyPassword } from "./auth";
import {
  sendPasswordResetEmail,
  sendFriendRequestEmail,
} from "./email";
import {
  approveMemberWithMailbox,
  provisionMailboxForApprovedMember,
} from "./services/member-approval";
import { saveUploadedFile } from "./upload-storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
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
  if (member.approvalStatus !== "approved") {
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

export async function registerRoutes(
  server: Server,
  app: Express,
): Promise<void> {
  await setupAuth(app);
  registerAuthRoutes(app);

  setInterval(() => {
    storage.markInactiveMembersOffline(5).catch((error) => {
      console.error("Failed to mark inactive members offline:", error);
    });
  }, 60 * 1000);

  // Custom email/password authentication endpoints
  app.post("/api/auth/register", async (req, res) => {
    try {
      const {
        email,
        password,
        name,
        rollNumber,
        department,
        currentLocation,
        profession,
        company,
        phone,
        bio,
      } = req.body;

      if (!email || !password || !name) {
        return res
          .status(400)
          .json({ message: "Email, password, and name are required" });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }

      const existing = await storage.getMemberByLoginIdentifier(email);
      if (existing) {
        return res
          .status(400)
          .json({ message: "An account with this email already exists" });
      }

      const normalizedEmail = email.toLowerCase();
      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
      const isBootstrapAdmin = !!adminEmail && normalizedEmail === adminEmail;

      const hashedPassword = await hashPassword(password);

      const member = await storage.createMember({
        email: normalizedEmail,
        password: hashedPassword,
        name,
        rollNumber: rollNumber || null,
        department: department || null,
        location: currentLocation || null,
        profession: profession || null,
        company: company || null,
        phone: phone || null,
        bio: bio || null,
        role: isBootstrapAdmin ? "admin" : "user",
        approvalStatus: isBootstrapAdmin ? "approved" : "pending",
      });

      // Set session
      (req.session as any).memberId = member.id;

      res.json({
        message: "Registration successful",
        member: { ...member, password: undefined },
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const member = await storage.getMemberByLoginIdentifier(email);
      if (!member) {
        return res
          .status(401)
          .json({ message: "Invalid email or password", notRegistered: true });
      }

      if (!member.password) {
        return res.status(401).json({
          message:
            "Please use the social login option you originally registered with",
        });
      }

      const isValid = await verifyPassword(password, member.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (member.approvalStatus !== "approved") {
        return res
          .status(403)
          .json({ message: "Your account is awaiting admin approval." });
      }

      // Set session
      (req.session as any).memberId = member.id;

      res.json({ member: { ...member, password: undefined } });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const clearSession = () => {
      (req.session as any).memberId = undefined;
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out successfully" });
      });
    };

    if (typeof (req as any).logout === "function") {
      (req as any).logout((logoutError: Error | null) => {
        if (logoutError) {
          return res.status(500).json({ message: "Logout failed" });
        }
        clearSession();
      });
      return;
    }

    clearSession();
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const sessionMemberId = (req.session as any)?.memberId;

      let member = null;
      if (sessionMemberId) {
        member = await storage.getMemberById(sessionMemberId);
      } else if ((req as any).user?.id) {
        member = await storage.getMemberByUserId((req as any).user.id);
      }

      if (!member) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const latestMember = await storage.getMemberById(member.id);
      if (!latestMember) {
        return res.status(401).json({ message: "Member not found" });
      }

      res.json({ ...latestMember, password: undefined });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Password reset - request token
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const member = await storage.getMemberByLoginIdentifier(email.toLowerCase());

      console.log("FORGOT PASSWORD REQUEST:", email);
      console.log("MEMBER FOUND:", member?.id);

      if (!member) {
        return res.json({
          message:
            "If an account exists with this email, a password reset link has been sent",
        });
      }

      const crypto = await import("crypto");
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

      console.log("CREATING RESET TOKEN");

      await storage.createPasswordResetToken(member.id, token, expiresAt);

      // Send password reset email
      try {
        await sendPasswordResetEmail(member.email, token, member.name);
        console.log(`Password reset email sent to ${email}`);
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        return res.status(500).json({
          message: "Failed to send reset email. Please try again later.",
        });
      }

      res.json({
        message:
          "If an account exists with this email, a password reset link has been sent",
      });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Password reset - validate token
  app.get("/api/auth/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const resetToken = await storage.getPasswordResetToken(token);

      if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
        return res
          .status(400)
          .json({ message: "Invalid or expired reset token" });
      }

      res.json({ valid: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Password reset - set new password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res
          .status(400)
          .json({ message: "Token and password are required" });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }

      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
        return res
          .status(400)
          .json({ message: "Invalid or expired reset token" });
      }

      const hashedPassword = await hashPassword(password);
      await storage.updateMemberPassword(resetToken.memberId, hashedPassword);
      await storage.markPasswordResetTokenUsed(token);

      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Middleware to set member on request
  app.use(async (req, res, next) => {
    // Check custom session first
    const memberId = (req.session as any)?.memberId;
    if (memberId) {
      const member = await storage.getMemberById(memberId);
      (req as any).member = member;
      if (member) {
        storage.updateMemberPresence(member.id, true).catch((error) => {
          console.error("Failed to update member presence:", error);
        });
      }
    } else if ((req as any).user) {
      // Fallback to Replit Auth
      const member = await storage.getMemberByUserId((req as any).user.id);
      (req as any).member = member;
      if (member) {
        storage.updateMemberPresence(member.id, true).catch((error) => {
          console.error("Failed to update member presence:", error);
        });
      }
    }
    next();
  });

  app.post("/api/presence/ping", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);
      await storage.updateMemberPresence(member.id, true);
      res.json({ success: true, lastSeen: new Date().toISOString() });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/member/me", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const member = await storage.getMemberByUserId(user.id);
      if (!member) {
        return res.status(404).json({ message: "No member profile" });
      }
      res.json(member);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/member/profile", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;

      const member = getMember(req);
      const latestMember = await storage.getMemberById(member.id);
      if (!latestMember) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.json(latestMember);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/member/profile", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;

      const member = getMember(req);
      const payload = req.body ?? {};

      const normalize = (value: unknown): string | null => {
        if (value === undefined) return null;
        const text = String(value).trim();
        return text.length > 0 ? text : null;
      };

      const updates = {
        name: payload.name !== undefined ? String(payload.name).trim() : undefined,
        rollNumber: payload.rollNumber !== undefined ? normalize(payload.rollNumber) : undefined,
        department: payload.department !== undefined ? normalize(payload.department) : undefined,
        location:
          payload.currentLocation !== undefined
            ? normalize(payload.currentLocation)
            : payload.location !== undefined
              ? normalize(payload.location)
              : undefined,
        profession: payload.profession !== undefined ? normalize(payload.profession) : undefined,
        company: payload.company !== undefined ? normalize(payload.company) : undefined,
        phone: payload.phone !== undefined ? normalize(payload.phone) : undefined,
        bio: payload.bio !== undefined ? normalize(payload.bio) : undefined,
      };

      if (updates.name !== undefined && !updates.name) {
        return res.status(400).json({ message: "Name is required" });
      }

      const updatedMember = await storage.updateMemberProfile(member.id, updates);
      if (!updatedMember) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.json(updatedMember);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/member/photo", upload.single("file"), async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;

      if (!req.file) {
        return res.status(400).json({ message: "Photo file is required" });
      }

      const member = getMember(req);
      const saved = await saveUploadedFile(req.file, "profiles");
      const updatedMember = await storage.updateMemberProfile(member.id, {
        photo: saved.url,
      });

      if (!updatedMember) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.json({
        photo: updatedMember.photo,
        fileType: saved.fileType,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/uploads/image", upload.single("file"), async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;

      if (!req.file) {
        return res.status(400).json({ message: "Image file is required" });
      }

      const kind = req.body.kind === "profile" ? "profiles" : "feed";
      const saved = await saveUploadedFile(req.file, kind);
      res.json(saved);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/members", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const existing = await storage.getMemberByUserId(user.id);
      if (existing) {
        return res
          .status(400)
          .json({ message: "Member profile already exists" });
      }

      // Get email from claims, user object, or database
      const userEmail = user.claims?.email || user.email;
      const dbUser = await storage.getUser(user.id);
      const email =
        userEmail || dbUser?.email || req.body.email || "unknown@example.com";

      const data = insertMemberSchema.parse({
        ...req.body,
        userId: user.id,
        email,
        name:
          req.body.name ||
          `${user.firstName || user.claims?.first_name || ""} ${user.lastName || user.claims?.last_name || ""}`.trim() ||
          "Anonymous",
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

      const enrichedMembers = await Promise.all(
        members
          .filter((member) => member.id !== currentMember.id)
          .map(async (member) => {
            const friendship = await storage.getFriendshipBetweenMembers(
              currentMember.id,
              member.id,
            );

            return {
              ...member,
              isFriend: friendship?.status === "accepted",
              friendshipStatus: friendship?.status || null,
              friendshipDirection:
                friendship?.status === "pending"
                  ? friendship.requesterId === currentMember.id
                    ? "outgoing"
                    : "incoming"
                  : null,
            };
          }),
      );

      res.json(enrichedMembers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/members/:id", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;

      const currentMember = getMember(req);
      const profile = await storage.getMemberProfile(req.params.id, currentMember.id);

      if (!profile.member || profile.member.approvalStatus !== "approved") {
        return res.status(404).json({ message: "Member not found" });
      }

      res.json({
        member: profile.member,
        friends: profile.friends,
        friend_count: profile.friendCount,
        mutual_friend_count: profile.mutualFriendCount,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);
      const friends = await storage.getFriends(member.id);
      res.json(friends);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/friends/request/:memberId", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;

      const sender = getMember(req);
      const recipient = await storage.getMemberById(req.params.memberId);

      if (!recipient || recipient.approvalStatus !== "approved") {
        return res.status(404).json({ message: "Member not found" });
      }

      const friendship = await storage.createFriendRequest(sender.id, recipient.id);

      sendFriendRequestEmail(sender, recipient).catch((emailError) => {
        console.error("Failed to send friend request email:", emailError);
      });

      res.json(friendship);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/friends/accept/:memberId", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;

      const currentMember = getMember(req);
      const friendship = await storage.acceptFriendRequest(
        req.params.memberId,
        currentMember.id,
      );

      if (!friendship) {
        return res.status(404).json({ message: "Friend request not found" });
      }

      const room = await storage.createDirectChatRoom(req.params.memberId, currentMember.id);
      res.json({ friendship, room });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/friends/:memberId", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;

      const currentMember = getMember(req);
      await storage.removeFriendship(currentMember.id, req.params.memberId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
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
              content:
                "You are a helpful assistant that creates brief, engaging summaries of discussion topics. Keep summaries under 100 words.",
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
      const allMemberIds = Array.from(new Set([member.id, ...memberIds]));

      const room = await storage.createChatRoom(
        name,
        allMemberIds,
        isGroup || false,
      );
      res.json(room);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/chat/direct/:memberId", async (req, res) => {
    try {
      if (!requireMember(req as any, res)) return;
      const member = getMember(req);
      const otherMember = await storage.getMemberById(req.params.memberId);

      if (!otherMember || otherMember.approvalStatus !== "approved") {
        return res.status(404).json({ message: "Member not found" });
      }

      const room = await storage.createDirectChatRoom(member.id, otherMember.id);
      res.json(room);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/pending-users", async (req, res) => {
    try {
      if (!requireAdmin(req as any, res)) return;
      const members = await storage.getPendingMembers();
      res.json(
        members.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          rollNumber: member.rollNumber,
          department: member.department,
          createdAt: member.createdAt,
        })),
      );
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/approve/:id", async (req, res) => {
    try {
      if (!requireAdmin(req as any, res)) return;
      const result = await approveMemberWithMailbox(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/reject/:id", async (req, res) => {
    try {
      if (!requireAdmin(req as any, res)) return;
      const member = await storage.updateMemberStatus(
        req.params.id,
        "rejected",
      );
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Backward-compatible aliases for existing clients.
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
      const result = await approveMemberWithMailbox(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/members/:id/provision-mailbox", async (req, res) => {
    try {
      if (!requireAdmin(req as any, res)) return;
      const result = await provisionMailboxForApprovedMember(req.params.id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/mailboxes/backfill", async (req, res) => {
    try {
      if (!requireAdmin(req as any, res)) return;
      const candidates = await storage.getApprovedMembersMissingMailbox();
      const settled = await Promise.allSettled(
        candidates.map((member) => provisionMailboxForApprovedMember(member.id)),
      );

      const results = settled.map((entry, index) => {
        const candidate = candidates[index];
        if (entry.status === "fulfilled") {
          return entry.value;
        }

        return {
          memberId: candidate.id,
          member: candidate,
          approved: candidate.approvalStatus === "approved",
          mailboxStatus: "failed" as const,
          alumniEmail: candidate.alumniEmail,
          mailboxProvisioned: false,
          mailboxError: entry.reason instanceof Error ? entry.reason.message : "Mailbox provisioning failed",
          welcomeEmailSent: false,
        };
      });

      res.json({
        total: candidates.length,
        provisioned: results.filter((result) => result.mailboxStatus === "provisioned").length,
        skipped: results.filter((result) => result.mailboxStatus === "skipped").length,
        conflict: results.filter((result) => result.mailboxStatus === "conflict").length,
        validationFailed: results.filter((result) => result.mailboxStatus === "validation_failed").length,
        failed: results.filter((result) => result.mailboxStatus === "failed").length,
        results,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/members/:id/reject", async (req, res) => {
    try {
      if (!requireAdmin(req as any, res)) return;
      const member = await storage.updateMemberStatus(
        req.params.id,
        "rejected",
      );
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/members/:id/make-admin", async (req, res) => {
    try {
      if (!requireAdmin(req as any, res)) return;
      const member = await storage.updateMemberRole(req.params.id, "admin");
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/members/:id/remove-admin", async (req, res) => {
    try {
      if (!requireAdmin(req as any, res)) return;
      const member = await storage.updateMemberRole(req.params.id, "user");
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/accounting", upload.single("file"), async (req, res) => {
    try {
      if (!requireAdmin(req as any, res)) return;
      const member = getMember(req);

      const title = String(req.body.title || "").trim();
      const category = String(req.body.category || "").trim();
      const parsedYear = parseInt(String(req.body.year || ""), 10);

      if (!title || !category || Number.isNaN(parsedYear)) {
        return res.status(400).json({ message: "Title, category, and year are required" });
      }

      let fileUrl = req.body.fileUrl as string | undefined;
      let fileType = req.body.fileType as string | undefined;

      if (req.file) {
        const saved = await saveUploadedFile(req.file, "accounting");
        fileUrl = saved.url;
        fileType = saved.fileType;
      }

      if (!fileUrl) {
        return res.status(400).json({ message: "Document file is required" });
      }

      const doc = await storage.createAccountingDocument({
        uploadedBy: member.id,
        title,
        category,
        year: parsedYear,
        fileUrl,
        fileType: fileType ?? null,
      });

      res.json(doc);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
}
