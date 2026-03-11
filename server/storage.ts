import { db } from "./db";
import { eq, and, desc, or, sql, count } from "drizzle-orm";
import {
  users, members, posts, postLikes, postComments,
  discussions, discussionReplies, events, eventRsvps,
  accountingDocuments, businessListings, businessComments,
  chatRooms, chatRoomMembers, chatMessages, friendships,
  passwordResetTokens,
  type User, type Member, type Post, type Discussion, type Event,
  type BusinessListing, type ChatRoom, type ChatMessage, type AccountingDocument,
  type InsertPost, type InsertDiscussion, type InsertEvent, type InsertBusinessListing,
  type InsertMember, type InsertChatMessage, type PostComment, type DiscussionReply,
  type InsertComment, type InsertDiscussionReply
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getMemberByUserId(userId: string): Promise<Member | undefined>;
  getMemberById(id: string): Promise<Member | undefined>;
  getMemberByEmail(email: string): Promise<Member | undefined>;
  createMember(data: InsertMember): Promise<Member>;
  updateMemberStatus(id: string, approvalStatus: "approved" | "rejected"): Promise<Member | undefined>;
  updateMemberRole(id: string, role: "admin" | "user"): Promise<Member | undefined>;
  getPendingMembers(): Promise<Member[]>;
  getApprovedMembers(): Promise<Member[]>;
  getAllMembers(): Promise<Member[]>;

  getPosts(memberId?: string): Promise<(Post & { author: Member; likesCount: number; commentsCount: number; isLiked: boolean })[]>;
  createPost(data: InsertPost): Promise<Post>;
  likePost(postId: number, memberId: string): Promise<void>;
  unlikePost(postId: number, memberId: string): Promise<void>;
  getPostLike(postId: number, memberId: string): Promise<boolean>;
  getPostComments(postId: number): Promise<(PostComment & { author: Member })[]>;
  createPostComment(data: InsertComment): Promise<PostComment>;

  getDiscussions(): Promise<(Discussion & { author: Member; repliesCount: number })[]>;
  getDiscussion(id: number): Promise<Discussion | undefined>;
  createDiscussion(data: InsertDiscussion): Promise<Discussion>;
  updateDiscussionSummary(id: number, summary: string): Promise<void>;
  getDiscussionReplies(discussionId: number): Promise<(DiscussionReply & { author: Member })[]>;
  createDiscussionReply(data: InsertDiscussionReply): Promise<DiscussionReply>;

  getEvents(memberId?: string): Promise<(Event & { goingCount: number; isGoing: boolean })[]>;
  createEvent(data: InsertEvent): Promise<Event>;
  rsvpEvent(eventId: number, memberId: string): Promise<void>;
  unrsvpEvent(eventId: number, memberId: string): Promise<void>;
  getEventRsvp(eventId: number, memberId: string): Promise<boolean>;

  getBusinessListings(): Promise<(BusinessListing & { author: Member; commentsCount: number })[]>;
  createBusinessListing(data: InsertBusinessListing): Promise<BusinessListing>;

  getAccountingDocuments(): Promise<AccountingDocument[]>;
  createAccountingDocument(data: Omit<AccountingDocument, "id" | "createdAt">): Promise<AccountingDocument>;

  getChatRooms(memberId: string): Promise<(ChatRoom & { members: Member[]; lastMessage?: string; lastMessageTime?: string })[]>;
  getChatRoomMessages(roomId: number): Promise<(ChatMessage & { sender: Member })[]>;
  createChatMessage(data: InsertChatMessage): Promise<ChatMessage>;
  createChatRoom(name: string, memberIds: string[], isGroup: boolean): Promise<ChatRoom>;

  createPasswordResetToken(memberId: string, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ memberId: string; expiresAt: Date; used: boolean | null } | undefined>;
  markPasswordResetTokenUsed(token: string): Promise<void>;
  updateMemberPassword(memberId: string, password: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getMemberByUserId(userId: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.userId, userId));
    return member;
  }

  async getMemberById(id: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member;
  }

  async getMemberByEmail(email: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.email, email.toLowerCase()));
    return member;
  }

  async createMember(data: InsertMember): Promise<Member> {
    const [member] = await db.insert(members).values(data).returning();
    return member;
  }

  async updateMemberStatus(id: string, approvalStatus: "approved" | "rejected"): Promise<Member | undefined> {
    const [member] = await db
      .update(members)
      .set({ approvalStatus, updatedAt: new Date() })
      .where(eq(members.id, id))
      .returning();
    return member;
  }

  async updateMemberRole(id: string, role: "admin" | "user"): Promise<Member | undefined> {
    const [member] = await db
      .update(members)
      .set({ role, updatedAt: new Date() })
      .where(eq(members.id, id))
      .returning();
    return member;
  }

  async getPendingMembers(): Promise<Member[]> {
    return db.select().from(members).where(eq(members.approvalStatus, "pending")).orderBy(desc(members.createdAt));
  }

  async getApprovedMembers(): Promise<Member[]> {
    return db.select().from(members).where(eq(members.approvalStatus, "approved")).orderBy(members.name);
  }

  async getAllMembers(): Promise<Member[]> {
    return db.select().from(members).orderBy(desc(members.createdAt));
  }

  async getPosts(currentMemberId?: string): Promise<(Post & { author: Member; likesCount: number; commentsCount: number; isLiked: boolean })[]> {
    const allPosts = await db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt));

    const result = await Promise.all(
      allPosts.map(async (post) => {
        const [author] = await db.select().from(members).where(eq(members.id, post.authorId));
        const [likesResult] = await db
          .select({ count: count() })
          .from(postLikes)
          .where(eq(postLikes.postId, post.id));
        const [commentsResult] = await db
          .select({ count: count() })
          .from(postComments)
          .where(eq(postComments.postId, post.id));
        
        let isLiked = false;
        if (currentMemberId) {
          const [like] = await db
            .select()
            .from(postLikes)
            .where(and(eq(postLikes.postId, post.id), eq(postLikes.memberId, currentMemberId)));
          isLiked = !!like;
        }

        return {
          ...post,
          author,
          likesCount: likesResult?.count || 0,
          commentsCount: commentsResult?.count || 0,
          isLiked,
        };
      })
    );

    return result;
  }

  async createPost(data: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(data).returning();
    return post;
  }

  async likePost(postId: number, memberId: string): Promise<void> {
    await db.insert(postLikes).values({ postId, memberId }).onConflictDoNothing();
  }

  async unlikePost(postId: number, memberId: string): Promise<void> {
    await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.memberId, memberId)));
  }

  async getPostLike(postId: number, memberId: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.memberId, memberId)));
    return !!like;
  }

  async getPostComments(postId: number): Promise<(PostComment & { author: Member })[]> {
    const comments = await db
      .select()
      .from(postComments)
      .where(eq(postComments.postId, postId))
      .orderBy(postComments.createdAt);

    return Promise.all(
      comments.map(async (comment) => {
        const [author] = await db.select().from(members).where(eq(members.id, comment.authorId));
        return { ...comment, author };
      })
    );
  }

  async createPostComment(data: InsertComment): Promise<PostComment> {
    const [comment] = await db.insert(postComments).values(data).returning();
    return comment;
  }

  async getDiscussions(): Promise<(Discussion & { author: Member; repliesCount: number })[]> {
    const allDiscussions = await db
      .select()
      .from(discussions)
      .orderBy(desc(discussions.createdAt));

    return Promise.all(
      allDiscussions.map(async (discussion) => {
        const [author] = await db.select().from(members).where(eq(members.id, discussion.authorId));
        const [repliesResult] = await db
          .select({ count: count() })
          .from(discussionReplies)
          .where(eq(discussionReplies.discussionId, discussion.id));

        return {
          ...discussion,
          author,
          repliesCount: repliesResult?.count || 0,
        };
      })
    );
  }

  async getDiscussion(id: number): Promise<Discussion | undefined> {
    const [discussion] = await db.select().from(discussions).where(eq(discussions.id, id));
    return discussion;
  }

  async createDiscussion(data: InsertDiscussion): Promise<Discussion> {
    const [discussion] = await db.insert(discussions).values(data).returning();
    return discussion;
  }

  async updateDiscussionSummary(id: number, summary: string): Promise<void> {
    await db.update(discussions).set({ aiSummary: summary, updatedAt: new Date() }).where(eq(discussions.id, id));
  }

  async getDiscussionReplies(discussionId: number): Promise<(DiscussionReply & { author: Member })[]> {
    const replies = await db
      .select()
      .from(discussionReplies)
      .where(eq(discussionReplies.discussionId, discussionId))
      .orderBy(discussionReplies.createdAt);

    return Promise.all(
      replies.map(async (reply) => {
        const [author] = await db.select().from(members).where(eq(members.id, reply.authorId));
        return { ...reply, author };
      })
    );
  }

  async createDiscussionReply(data: InsertDiscussionReply): Promise<DiscussionReply> {
    const [reply] = await db.insert(discussionReplies).values(data).returning();
    return reply;
  }

  async getEvents(currentMemberId?: string): Promise<(Event & { goingCount: number; isGoing: boolean })[]> {
    const allEvents = await db
      .select()
      .from(events)
      .orderBy(events.date);

    return Promise.all(
      allEvents.map(async (event) => {
        const [goingResult] = await db
          .select({ count: count() })
          .from(eventRsvps)
          .where(eq(eventRsvps.eventId, event.id));

        let isGoing = false;
        if (currentMemberId) {
          const [rsvp] = await db
            .select()
            .from(eventRsvps)
            .where(and(eq(eventRsvps.eventId, event.id), eq(eventRsvps.memberId, currentMemberId)));
          isGoing = !!rsvp;
        }

        return {
          ...event,
          goingCount: goingResult?.count || 0,
          isGoing,
        };
      })
    );
  }

  async createEvent(data: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(data).returning();
    return event;
  }

  async rsvpEvent(eventId: number, memberId: string): Promise<void> {
    await db.insert(eventRsvps).values({ eventId, memberId, status: "going" }).onConflictDoNothing();
  }

  async unrsvpEvent(eventId: number, memberId: string): Promise<void> {
    await db.delete(eventRsvps).where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.memberId, memberId)));
  }

  async getEventRsvp(eventId: number, memberId: string): Promise<boolean> {
    const [rsvp] = await db
      .select()
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.memberId, memberId)));
    return !!rsvp;
  }

  async getBusinessListings(): Promise<(BusinessListing & { author: Member; commentsCount: number })[]> {
    const allListings = await db
      .select()
      .from(businessListings)
      .orderBy(desc(businessListings.createdAt));

    return Promise.all(
      allListings.map(async (listing) => {
        const [author] = await db.select().from(members).where(eq(members.id, listing.authorId));
        const [commentsResult] = await db
          .select({ count: count() })
          .from(businessComments)
          .where(eq(businessComments.listingId, listing.id));

        return {
          ...listing,
          author,
          commentsCount: commentsResult?.count || 0,
        };
      })
    );
  }

  async createBusinessListing(data: InsertBusinessListing): Promise<BusinessListing> {
    const [listing] = await db.insert(businessListings).values(data).returning();
    return listing;
  }

  async getAccountingDocuments(): Promise<AccountingDocument[]> {
    return db.select().from(accountingDocuments).orderBy(desc(accountingDocuments.year), desc(accountingDocuments.createdAt));
  }

  async createAccountingDocument(data: Omit<AccountingDocument, "id" | "createdAt">): Promise<AccountingDocument> {
    const [doc] = await db.insert(accountingDocuments).values(data).returning();
    return doc;
  }

  async getChatRooms(memberId: string): Promise<(ChatRoom & { members: Member[]; lastMessage?: string; lastMessageTime?: string })[]> {
    const memberRooms = await db
      .select({ roomId: chatRoomMembers.roomId })
      .from(chatRoomMembers)
      .where(eq(chatRoomMembers.memberId, memberId));

    const roomIds = memberRooms.map((r) => r.roomId);
    if (roomIds.length === 0) return [];

    const rooms = await db
      .select()
      .from(chatRooms)
      .where(sql`${chatRooms.id} = ANY(${roomIds})`);

    return Promise.all(
      rooms.map(async (room) => {
        const roomMemberRecords = await db
          .select({ memberId: chatRoomMembers.memberId })
          .from(chatRoomMembers)
          .where(eq(chatRoomMembers.roomId, room.id));

        const membersList = await Promise.all(
          roomMemberRecords.map(async (rm) => {
            const [member] = await db.select().from(members).where(eq(members.id, rm.memberId));
            return member;
          })
        );

        const [lastMsg] = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.roomId, room.id))
          .orderBy(desc(chatMessages.createdAt))
          .limit(1);

        return {
          ...room,
          members: membersList.filter(Boolean),
          lastMessage: lastMsg?.content,
          lastMessageTime: lastMsg?.createdAt?.toISOString(),
        };
      })
    );
  }

  async getChatRoomMessages(roomId: number): Promise<(ChatMessage & { sender: Member })[]> {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.roomId, roomId))
      .orderBy(chatMessages.createdAt);

    return Promise.all(
      messages.map(async (msg) => {
        const [sender] = await db.select().from(members).where(eq(members.id, msg.senderId));
        return { ...msg, sender };
      })
    );
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessages).values(data).returning();
    return message;
  }

  async createChatRoom(name: string, memberIds: string[], isGroup: boolean): Promise<ChatRoom> {
    const [room] = await db.insert(chatRooms).values({ name, isGroup }).returning();
    
    await Promise.all(
      memberIds.map((memberId) =>
        db.insert(chatRoomMembers).values({ roomId: room.id, memberId })
      )
    );

    return room;
  }

  async createPasswordResetToken(memberId: string, token: string, expiresAt: Date): Promise<void> {
    await db.insert(passwordResetTokens).values({ memberId, token, expiresAt });
  }

  async getPasswordResetToken(token: string): Promise<{ memberId: string; expiresAt: Date; used: boolean | null } | undefined> {
    const [result] = await db
      .select({
        memberId: passwordResetTokens.memberId,
        expiresAt: passwordResetTokens.expiresAt,
        used: passwordResetTokens.used,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return result;
  }

  async markPasswordResetTokenUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.token, token));
  }

  async updateMemberPassword(memberId: string, password: string): Promise<void> {
    await db
      .update(members)
      .set({ password, updatedAt: new Date() })
      .where(eq(members.id, memberId));
  }
}

export const storage = new DatabaseStorage();
