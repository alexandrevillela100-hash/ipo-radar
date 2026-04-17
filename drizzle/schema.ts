import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 256 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 256 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 256 }),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "pro", "enterprise"]).default("free").notNull(),
  subscriptionStatus: varchar("subscriptionStatus", { length: 32 }).default("none"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── SEC EDGAR Companies ────────────────────────────────────────────────────
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  cik: varchar("cik", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 512 }).notNull(),
  ticker: varchar("ticker", { length: 20 }),
  exchange: varchar("exchange", { length: 20 }),
  sic: varchar("sic", { length: 10 }),
  sicDescription: varchar("sicDescription", { length: 256 }),
  stateOfIncorporation: varchar("stateOfIncorporation", { length: 10 }),
  businessAddress: text("businessAddress"),
  businessCity: varchar("businessCity", { length: 128 }),
  businessState: varchar("businessState", { length: 10 }),
  businessZip: varchar("businessZip", { length: 20 }),
  fiscalYearEnd: varchar("fiscalYearEnd", { length: 4 }),
  entityType: varchar("entityType", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// ─── SEC EDGAR Filings ──────────────────────────────────────────────────────
export const filings = mysqlTable("filings", {
  id: int("id").autoincrement().primaryKey(),
  accessionNumber: varchar("accessionNumber", { length: 25 }).notNull().unique(),
  companyCik: varchar("companyCik", { length: 10 }).notNull(),
  formType: varchar("formType", { length: 10 }).notNull(),
  filingDate: varchar("filingDate", { length: 10 }).notNull(),
  primaryDocument: varchar("primaryDocument", { length: 256 }),
  primaryDocDescription: varchar("primaryDocDescription", { length: 512 }),
  filingUrl: text("filingUrl"),
  filingStatus: varchar("filingStatus", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Filing = typeof filings.$inferSelect;
export type InsertFiling = typeof filings.$inferInsert;

// ─── Email Signups ────────────────────────────────────────────────────────
export const emailSignups = mysqlTable("emailSignups", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  source: varchar("source", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailSignup = typeof emailSignups.$inferSelect;
export type InsertEmailSignup = typeof emailSignups.$inferInsert;

// ─── Watchlist ──────────────────────────────────────────────────────────────
export const watchlistItems = mysqlTable("watchlistItems", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyCik: varchar("companyCik", { length: 10 }).notNull(),
  alertsEnabled: int("alertsEnabled").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type InsertWatchlistItem = typeof watchlistItems.$inferInsert;

// ─── User Alerts ────────────────────────────────────────────────────────────
export const userAlerts = mysqlTable("userAlerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  message: text("message"),
  companyCik: varchar("companyCik", { length: 10 }),
  isRead: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserAlert = typeof userAlerts.$inferSelect;
export type InsertUserAlert = typeof userAlerts.$inferInsert;

// ─── Document Chunks (for RAG) ─────────────────────────────────────────────
export const documentChunks = mysqlTable("document_chunks", {
  id: int("id").autoincrement().primaryKey(),
  filingId: int("filingId").notNull(),
  companyId: int("companyId").notNull(),
  chunkIndex: int("chunkIndex").notNull(),
  chunkText: text("chunkText").notNull(),
  sectionLabel: varchar("sectionLabel", { length: 500 }),
  tokenCount: int("tokenCount"),
  companyCik: varchar("companyCik", { length: 10 }),
  documentName: varchar("documentName", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertDocumentChunk = typeof documentChunks.$inferInsert;

// ─── Chat Sessions ─────────────────────────────────────────────────────────
export const chatSessions = mysqlTable("chat_sessions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  userId: int("userId"),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  messages: text("messages"), // JSON array of messages
  companyCik: varchar("companyCik", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;