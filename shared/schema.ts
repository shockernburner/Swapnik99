import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean, pgEnum, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);
export const userStatusEnum = pgEnum("user_status", ["pending", "approved", "rejected"]);
export const friendshipStatusEnum = pgEnum("friendship_status", ["pending", "accepted", "rejected"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const members = pgTable("members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  email: varchar("email").notNull().unique(),
  password: varchar("password"),
  name: varchar("name").notNull(),
  rollNumber: varchar("roll_number"),
  department: varchar("department"),
  graduationYear: integer("graduation_year").default(1999),
  photo: varchar("photo"),
  bio: text("bio"),
  profession: varchar("profession"),
  company: varchar("company"),
  location: varchar("location"),
  phone: varchar("phone"),
  role: userRoleEnum("role").default("member"),
  status: userStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  requesterId: varchar("requester_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  addresseeId: varchar("addressee_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  status: friendshipStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  authorId: varchar("author_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  imageUrl: varchar("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const postLikes = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postComments = pgTable("post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const discussions = pgTable("discussions", {
  id: serial("id").primaryKey(),
  authorId: varchar("author_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  headline: varchar("headline").notNull(),
  description: text("description").notNull(),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const discussionReplies = pgTable("discussion_replies", {
  id: serial("id").primaryKey(),
  discussionId: integer("discussion_id").notNull().references(() => discussions.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  createdBy: varchar("created_by").notNull().references(() => members.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  venue: varchar("venue"),
  imageUrl: varchar("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eventRsvps = pgTable("event_rsvps", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  status: varchar("status").notNull().default("going"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const accountingDocuments = pgTable("accounting_documents", {
  id: serial("id").primaryKey(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => members.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  category: varchar("category").notNull(),
  year: integer("year").notNull(),
  fileUrl: varchar("file_url").notNull(),
  fileType: varchar("file_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const businessListings = pgTable("business_listings", {
  id: serial("id").primaryKey(),
  authorId: varchar("author_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  type: varchar("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const businessComments = pgTable("business_comments", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => businessListings.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  name: varchar("name"),
  isGroup: boolean("is_group").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatRoomMembers = pgTable("chat_room_members", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const membersRelations = relations(members, ({ many }) => ({
  posts: many(posts),
  friendshipsAsRequester: many(friendships, { relationName: "requester" }),
  friendshipsAsAddressee: many(friendships, { relationName: "addressee" }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(members, { fields: [posts.authorId], references: [members.id] }),
  likes: many(postLikes),
  comments: many(postComments),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMemberSchema = createInsertSchema(members).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentSchema = createInsertSchema(postComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDiscussionSchema = createInsertSchema(discussions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  aiSummary: true,
});

export const insertDiscussionReplySchema = createInsertSchema(discussionReplies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessListingSchema = createInsertSchema(businessListings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type PostComment = typeof postComments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type PostLike = typeof postLikes.$inferSelect;
export type Friendship = typeof friendships.$inferSelect;
export type Discussion = typeof discussions.$inferSelect;
export type InsertDiscussion = z.infer<typeof insertDiscussionSchema>;
export type DiscussionReply = typeof discussionReplies.$inferSelect;
export type InsertDiscussionReply = z.infer<typeof insertDiscussionReplySchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventRsvp = typeof eventRsvps.$inferSelect;
export type AccountingDocument = typeof accountingDocuments.$inferSelect;
export type BusinessListing = typeof businessListings.$inferSelect;
export type InsertBusinessListing = z.infer<typeof insertBusinessListingSchema>;
export type BusinessComment = typeof businessComments.$inferSelect;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
