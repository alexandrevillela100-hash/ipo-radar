import { eq, desc, asc, sql, and, like, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  companies, InsertCompany, Company,
  filings, InsertFiling, Filing,
  documentChunks, InsertDocumentChunk, DocumentChunk,
  chatSessions, InsertChatSession, ChatSession,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User Helpers ───────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Company Helpers ────────────────────────────────────────────

export async function listCompanies(filters?: { status?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(companies);
  const conditions = [];
  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(companies.status, filters.status as any));
  }
  if (filters?.search) {
    conditions.push(
      sql`(${companies.name} LIKE ${`%${filters.search}%`} OR ${companies.ticker} LIKE ${`%${filters.search}%`})`
    );
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  return (query as any).orderBy(desc(companies.updatedAt));
}

export async function getCompanyBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCompanyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCompany(data: InsertCompany) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(companies).values(data);
  return result[0].insertId;
}

export async function updateCompany(id: number, data: Partial<InsertCompany>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(companies).set(data).where(eq(companies.id, id));
}

export async function deleteCompany(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(documentChunks).where(eq(documentChunks.companyId, id));
  await db.delete(filings).where(eq(filings.companyId, id));
  await db.delete(chatSessions).where(eq(chatSessions.companyId, id));
  await db.delete(companies).where(eq(companies.id, id));
}

// ─── Filing Helpers ─────────────────────────────────────────────

export async function listFilingsByCompany(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(filings).where(eq(filings.companyId, companyId)).orderBy(desc(filings.uploadedAt));
}

export async function getFilingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(filings).where(eq(filings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createFiling(data: InsertFiling) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(filings).values(data);
  return result[0].insertId;
}

export async function updateFiling(id: number, data: Partial<InsertFiling>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(filings).set(data).where(eq(filings.id, id));
}

export async function deleteFiling(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(documentChunks).where(eq(documentChunks.filingId, id));
  await db.delete(filings).where(eq(filings.id, id));
}

// ─── Document Chunk Helpers ─────────────────────────────────────

export async function createChunks(chunks: InsertDocumentChunk[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (chunks.length === 0) return;
  // Insert in batches of 100
  for (let i = 0; i < chunks.length; i += 100) {
    const batch = chunks.slice(i, i + 100);
    await db.insert(documentChunks).values(batch);
  }
}

export async function getChunksByCompany(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documentChunks)
    .where(eq(documentChunks.companyId, companyId))
    .orderBy(asc(documentChunks.filingId), asc(documentChunks.chunkIndex));
}

export async function getChunksByFiling(filingId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documentChunks)
    .where(eq(documentChunks.filingId, filingId))
    .orderBy(asc(documentChunks.chunkIndex));
}

export async function deleteChunksByFiling(filingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(documentChunks).where(eq(documentChunks.filingId, filingId));
}

/**
 * Simple keyword-based retrieval for RAG.
 * Searches chunk text for keywords and returns the most relevant chunks.
 */
export async function searchChunks(companyId: number, query: string, limit = 15): Promise<DocumentChunk[]> {
  const db = await getDb();
  if (!db) return [];

  // Extract keywords from the query (remove common stop words)
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "out", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "every", "both", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "because", "but", "and", "or", "if", "while", "about", "what", "which", "who", "whom", "this", "that", "these", "those", "am", "it", "its", "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", "they", "them", "their", "theirs", "themselves"]);

  const keywords = query.toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  if (keywords.length === 0) {
    // Return first N chunks if no meaningful keywords
    return db.select().from(documentChunks)
      .where(eq(documentChunks.companyId, companyId))
      .orderBy(asc(documentChunks.chunkIndex))
      .limit(limit);
  }

  // Build a relevance score using LIKE matches
  const conditions = keywords.map(kw =>
    sql`LOWER(${documentChunks.chunkText}) LIKE ${`%${kw}%`}`
  );

  // Score = number of keyword matches
  const scoreExpr = sql<number>`(${sql.join(
    keywords.map(kw => sql`IF(LOWER(${documentChunks.chunkText}) LIKE ${`%${kw}%`}, 1, 0)`),
    sql` + `
  )})`;

  // Get chunks that match at least one keyword
  const orCondition = sql`(${sql.join(conditions, sql` OR `)})`;

  const results = await db.select({
    id: documentChunks.id,
    filingId: documentChunks.filingId,
    companyId: documentChunks.companyId,
    chunkIndex: documentChunks.chunkIndex,
    chunkText: documentChunks.chunkText,
    sectionLabel: documentChunks.sectionLabel,
    tokenCount: documentChunks.tokenCount,
    createdAt: documentChunks.createdAt,
    score: scoreExpr,
  })
    .from(documentChunks)
    .where(and(eq(documentChunks.companyId, companyId), orCondition))
    .orderBy(sql`${scoreExpr} DESC`)
    .limit(limit);

  return results.map(({ score, ...chunk }) => chunk);
}

// ─── Chat Session Helpers ───────────────────────────────────────

export async function getOrCreateChatSession(sessionId: string, companyId: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(chatSessions)
    .where(eq(chatSessions.sessionId, sessionId)).limit(1);

  if (existing.length > 0) return existing[0];

  await db.insert(chatSessions).values({
    sessionId,
    companyId,
    userId: userId ?? null,
    messages: [],
  });

  const created = await db.select().from(chatSessions)
    .where(eq(chatSessions.sessionId, sessionId)).limit(1);
  return created[0];
}

export async function updateChatMessages(sessionId: string, messages: any[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(chatSessions)
    .set({ messages })
    .where(eq(chatSessions.sessionId, sessionId));
}

// ─── Stats Helpers ──────────────────────────────────────────────

export async function getCompanyStats() {
  const db = await getDb();
  if (!db) return { total: 0, upcoming: 0, priced: 0, trading: 0 };
  const result = await db.select({
    total: sql<number>`COUNT(*)`,
    upcoming: sql<number>`SUM(CASE WHEN ${companies.status} = 'upcoming' THEN 1 ELSE 0 END)`,
    priced: sql<number>`SUM(CASE WHEN ${companies.status} = 'priced' THEN 1 ELSE 0 END)`,
    trading: sql<number>`SUM(CASE WHEN ${companies.status} = 'trading' THEN 1 ELSE 0 END)`,
  }).from(companies);
  return result[0] ?? { total: 0, upcoming: 0, priced: 0, trading: 0 };
}
