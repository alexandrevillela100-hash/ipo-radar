import { eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  companies,
  filings,
  emailSignups,
  watchlistItems,
  userAlerts,
  InsertCompany,
  InsertFiling,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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

// ─── User Helpers ───────────────────────────────────────────────────────────

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
    const values: InsertUser = {
      openId: user.openId,
    };
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
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Company Helpers ────────────────────────────────────────────────────────

export async function upsertCompany(company: InsertCompany): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert company: database not available");
    return;
  }

  await db
    .insert(companies)
    .values(company)
    .onDuplicateKeyUpdate({
      set: {
        name: company.name,
        ticker: company.ticker,
        exchange: company.exchange,
        sic: company.sic,
        sicDescription: company.sicDescription,
        stateOfIncorporation: company.stateOfIncorporation,
        businessAddress: company.businessAddress,
        businessCity: company.businessCity,
        businessState: company.businessState,
        businessZip: company.businessZip,
        fiscalYearEnd: company.fiscalYearEnd,
        entityType: company.entityType,
      },
    });
}

export async function getAllCompanies() {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(companies).orderBy(desc(companies.updatedAt));
}

export async function getCompanyByCik(cik: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(companies)
    .where(eq(companies.cik, cik))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Filing Helpers ─────────────────────────────────────────────────────────

export async function insertFilingIfNew(
  filing: InsertFiling
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot insert filing: database not available");
    return false;
  }

  try {
    await db.insert(filings).values(filing);
    return true;
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY" || error?.cause?.code === "ER_DUP_ENTRY") {
      return false;
    }
    throw error;
  }
}

export async function getFilings(companyCik?: string) {
  const db = await getDb();
  if (!db) return [];

  if (companyCik) {
    return db
      .select()
      .from(filings)
      .where(eq(filings.companyCik, companyCik))
      .orderBy(desc(filings.filingDate));
  }

  return db.select().from(filings).orderBy(desc(filings.filingDate));
}

export async function getFilingsWithCompanies() {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select({
      filing: filings,
      company: companies,
    })
    .from(filings)
    .innerJoin(companies, eq(filings.companyCik, companies.cik))
    .orderBy(desc(filings.filingDate));

  return results;
}

// ─── Email Signup Helpers ───────────────────────────────────────────────────

export async function registerEmailSignup(email: string, source?: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.insert(emailSignups).values({ email: email.toLowerCase().trim(), source });
    return true;
  } catch (error: any) {
    if (
      error?.code === "ER_DUP_ENTRY" ||
      error?.cause?.code === "ER_DUP_ENTRY" ||
      error?.message?.includes("Duplicate entry") ||
      error?.cause?.message?.includes("Duplicate entry")
    ) {
      return false;
    }
    throw error;
  }
}

// ─── Watchlist Helpers ─────────────────────────────────────────────────────

export async function getWatchlistForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({ watchlistItem: watchlistItems, company: companies })
    .from(watchlistItems)
    .innerJoin(companies, eq(watchlistItems.companyCik, companies.cik))
    .where(eq(watchlistItems.userId, userId))
    .orderBy(desc(watchlistItems.createdAt));
}

export async function addToWatchlist(userId: number, companyCik: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const existing = await db
    .select()
    .from(watchlistItems)
    .where(sql`${watchlistItems.userId} = ${userId} AND ${watchlistItems.companyCik} = ${companyCik}`)
    .limit(1);

  if (existing.length > 0) return false;

  await db.insert(watchlistItems).values({ userId, companyCik });
  return true;
}

export async function removeFromWatchlist(userId: number, companyCik: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .delete(watchlistItems)
    .where(sql`${watchlistItems.userId} = ${userId} AND ${watchlistItems.companyCik} = ${companyCik}`);
}

export async function toggleWatchlistAlerts(userId: number, companyCik: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.execute(
    sql`UPDATE watchlistItems SET alertsEnabled = IF(alertsEnabled = 1, 0, 1) WHERE userId = ${userId} AND companyCik = ${companyCik}`
  );
}

// ─── Alert Helpers ─────────────────────────────────────────────────────────

export async function getAlertsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(userAlerts)
    .where(eq(userAlerts.userId, userId))
    .orderBy(desc(userAlerts.createdAt));
}

export async function markAlertRead(alertId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(userAlerts)
    .set({ isRead: 1 })
    .where(sql`${userAlerts.id} = ${alertId} AND ${userAlerts.userId} = ${userId}`);
}

export async function markAllAlertsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(userAlerts)
    .set({ isRead: 1 })
    .where(eq(userAlerts.userId, userId));
}

export async function getUnreadAlertCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userAlerts)
    .where(sql`${userAlerts.userId} = ${userId} AND ${userAlerts.isRead} = 0`);

  return result?.count ?? 0;
}

// ─── Email/Password Auth Helpers ──────────────────────────────────────────

import { hash, compare } from "bcryptjs";

export async function registerWithPassword(
  email: string,
  password: string,
  name: string
): Promise<{ user: typeof users.$inferSelect; isNew: boolean } | null> {
  const db = await getDb();
  if (!db) return null;

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing.length > 0) {
    return null;
  }

  const passwordHash = await hash(password, 12);
  const openId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  await db.insert(users).values({
    openId,
    name,
    email: normalizedEmail,
    passwordHash,
    loginMethod: "email",
    lastSignedIn: new Date(),
  });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return user ? { user, isNew: true } : null;
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<typeof users.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;

  const normalizedEmail = email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user || !user.passwordHash) return null;

  const isValid = await compare(password, user.passwordHash);
  if (!isValid) return null;

  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));

  return user;
}

// ─── Search Helpers ────────────────────────────────────────────────────────

export async function searchCompanies(query: string) {
  const db = await getDb();
  if (!db) return [];

  const searchTerm = `%${query}%`;
  return db
    .select()
    .from(companies)
    .where(
      sql`${companies.name} LIKE ${searchTerm} OR ${companies.ticker} LIKE ${searchTerm} OR ${companies.sicDescription} LIKE ${searchTerm} OR ${companies.cik} LIKE ${searchTerm}`
    )
    .orderBy(desc(companies.updatedAt))
    .limit(20);
}

export async function getStats() {
  const db = await getDb();
  if (!db) return { companies: 0, filings: 0 };

  const [companyCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(companies);
  const [filingCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(filings);

  return {
    companies: companyCount?.count ?? 0,
    filings: filingCount?.count ?? 0,
  };
}
