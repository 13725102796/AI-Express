import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// --- Users ---
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  phone: text("phone"),
  phoneHash: text("phone_hash").unique(),
  nickname: text("nickname").default(""),
  aiName: text("ai_name").default("留白"),
  companionStyle: text("companion_style", {
    enum: ["quiet", "warm", "rational"],
  }).default("warm"),
  preferredTime: text("preferred_time"),
  tier: text("tier", {
    enum: ["free", "deep", "echo"],
  }).default("free"),
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).default(false),
  darkMode: text("dark_mode", {
    enum: ["system", "light", "dark"],
  }).default("system"),
  notificationsEnabled: integer("notifications_enabled", { mode: "boolean" }).default(true),
  echoLetterReminder: integer("echo_letter_reminder", { mode: "boolean" }).default(true),
  breathingVibration: integer("breathing_vibration", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// --- Conversations ---
export const conversations = sqliteTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
    endedAt: integer("ended_at", { mode: "timestamp" }),
    messageCount: integer("message_count").default(0),
    primaryEmotion: text("primary_emotion"),
    emotionTags: text("emotion_tags"),
    preview: text("preview"),
    hasFossil: integer("has_fossil", { mode: "boolean" }).default(false),
  },
  (table) => [
    index("conversations_user_idx").on(table.userId),
    index("conversations_started_idx").on(table.startedAt),
  ]
);

// --- Messages ---
export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
    content: text("content").notNull(),
    emotion: text("emotion"),
    emotionIntensity: integer("emotion_intensity"),
    emotionColor: text("emotion_color"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("messages_conversation_idx").on(table.conversationId),
    index("messages_created_idx").on(table.createdAt),
  ]
);

// --- Fossils ---
export const fossils = sqliteTable(
  "fossils",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    inscription: text("inscription").notNull(),
    userNote: text("user_note"),
    emotionTags: text("emotion_tags").notNull(),
    primaryEmotion: text("primary_emotion").notNull(),
    emotionColor: text("emotion_color").notNull(),
    emotionIntensity: integer("emotion_intensity").notNull(),
    timeDisplay: text("time_display").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("fossils_user_idx").on(table.userId),
    index("fossils_created_idx").on(table.createdAt),
  ]
);

// --- Echo Letters ---
export const echoLetters = sqliteTable(
  "echo_letters",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    emotionBackground: text("emotion_background").notNull(),
    status: text("status", {
      enum: ["pending", "opened", "expired"],
    }).default("pending"),
    writtenAt: integer("written_at", { mode: "timestamp" }).notNull(),
    openAt: integer("open_at", { mode: "timestamp" }).notNull(),
    openedAt: integer("opened_at", { mode: "timestamp" }),
    retrospective: text("retrospective"),
  },
  (table) => [
    index("echo_letters_user_idx").on(table.userId),
    index("echo_letters_open_idx").on(table.openAt),
  ]
);

// --- Memories ---
export const memories = sqliteTable(
  "memories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["person", "event", "preference", "pattern", "personality"],
    }).notNull(),
    content: text("content").notNull(),
    source: text("source"),
    confidence: integer("confidence").default(80),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("memories_user_idx").on(table.userId),
    index("memories_type_idx").on(table.type),
  ]
);

// --- Verification Codes ---
export const verificationCodes = sqliteTable("verification_codes", {
  id: text("id").primaryKey(),
  phoneHash: text("phone_hash").notNull(),
  code: text("code").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  attempts: integer("attempts").default(0),
  used: integer("used", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// --- Safety Logs (independent, encrypted) ---
export const safetyLogs = sqliteTable("safety_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  triggerType: text("trigger_type").notNull(),
  severity: integer("severity").notNull(),
  context: text("context").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
