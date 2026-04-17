import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, decimal, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * IPO Companies table — stores all tracked IPO companies.
 */
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ticker: varchar("ticker", { length: 20 }),
  exchange: varchar("exchange", { length: 50 }),
  status: mysqlEnum("status", ["upcoming", "priced", "trading", "withdrawn"]).default("upcoming").notNull(),
  industry: varchar("industry", { length: 255 }),
  sector: varchar("sector", { length: 255 }),
  description: text("description"),
  headquarters: varchar("headquarters", { length: 255 }),
  founded: varchar("founded", { length: 10 }),
  ceo: varchar("ceo", { length: 255 }),
  employees: varchar("employees", { length: 50 }),
  website: varchar("website", { length: 500 }),
  logoUrl: varchar("logoUrl", { length: 1000 }),

  // Offering details
  priceLow: decimal("priceLow", { precision: 10, scale: 2 }),
  priceHigh: decimal("priceHigh", { precision: 10, scale: 2 }),
  priceActual: decimal("priceActual", { precision: 10, scale: 2 }),
  sharesOffered: bigint("sharesOffered", { mode: "number" }),
  offeringSize: bigint("offeringSize", { mode: "number" }),
  marketCap: bigint("marketCap", { mode: "number" }),
  expectedDate: timestamp("expectedDate"),
  pricedDate: timestamp("pricedDate"),

  // Financials snapshot
  revenue: bigint("revenue", { mode: "number" }),
  netIncome: bigint("netIncome", { mode: "number" }),
  fiscalYear: varchar("fiscalYear", { length: 10 }),

  // Underwriters
  leadUnderwriter: varchar("leadUnderwriter", { length: 500 }),

  slug: varchar("slug", { length: 255 }).notNull().unique(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * SEC Filings table — stores uploaded documents per company.
 */
export const filings = mysqlTable("filings", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  documentType: varchar("documentType", { length: 50 }).notNull(), // S-1, S-1/A, prospectus, etc.
  documentName: varchar("documentName", { length: 500 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1000 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileSize: bigint("fileSize", { mode: "number" }),
  status: mysqlEnum("filingStatus", ["processing", "ready", "error"]).default("processing").notNull(),
  chunkCount: int("chunkCount").default(0),
  errorMessage: text("errorMessage"),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
});

export type Filing = typeof filings.$inferSelect;
export type InsertFiling = typeof filings.$inferInsert;

/**
 * Document Chunks table — stores chunked text from filings for RAG retrieval.
 */
export const documentChunks = mysqlTable("document_chunks", {
  id: int("id").autoincrement().primaryKey(),
  filingId: int("filingId").notNull(),
  companyId: int("companyId").notNull(),
  chunkIndex: int("chunkIndex").notNull(),
  chunkText: text("chunkText").notNull(),
  sectionLabel: varchar("sectionLabel", { length: 500 }),
  tokenCount: int("tokenCount"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertDocumentChunk = typeof documentChunks.$inferInsert;

/**
 * Chat sessions table — stores conversation history per user per company.
 */
export const chatSessions = mysqlTable("chat_sessions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  userId: int("userId"),
  sessionId: varchar("sessionId", { length: 64 }).notNull().unique(),
  messages: json("messages").$type<Array<{ role: string; content: string; citations?: Array<{ documentName: string; excerpt: string }> }>>().default([]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;
