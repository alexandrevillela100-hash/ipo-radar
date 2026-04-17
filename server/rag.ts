/**
 * RAG Engine — Retrieval-Augmented Generation for SEC Filing Q&A
 *
 * Retrieves relevant document chunks from the database, builds a grounded
 * prompt with strict citation requirements, and invokes the LLM.
 * All responses are grounded in actual SEC filings — no hallucinations.
 */

import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { documentChunks, chatSessions, companies } from "../drizzle/schema";
import { eq, sql, and, desc } from "drizzle-orm";

// ─── Chunk Retrieval ─────────────────────────────────────────────────────────

/**
 * Retrieve the most relevant document chunks for a query.
 * Uses keyword matching against chunk text and section labels.
 */
export async function retrieveChunks(
  companyCik: string,
  query: string,
  limit = 12
) {
  const db = await getDb();
  if (!db) return [];

  // Extract meaningful keywords from the query (3+ chars, no stop words)
  const stopWords = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
    "her", "was", "one", "our", "out", "has", "his", "how", "its", "may",
    "who", "did", "get", "let", "say", "she", "too", "use", "what", "when",
    "where", "which", "will", "with", "this", "that", "from", "they", "been",
    "have", "many", "some", "them", "than", "each", "make", "like", "does",
    "into", "over", "such", "about", "their", "would", "could", "should",
    "these", "other", "there", "being", "those",
  ]);

  const keywords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  if (keywords.length === 0) {
    // Fallback: return first N chunks ordered by section relevance
    return db
      .select()
      .from(documentChunks)
      .where(eq(documentChunks.companyCik, companyCik))
      .orderBy(documentChunks.chunkIndex)
      .limit(limit);
  }

  // Build a relevance score using LIKE matching
  const likeClauses = keywords.map(
    (kw) => sql`(LOWER(${documentChunks.chunkText}) LIKE ${`%${kw}%`})`
  );
  const sectionClauses = keywords.map(
    (kw) => sql`(LOWER(COALESCE(${documentChunks.sectionLabel}, '')) LIKE ${`%${kw}%`})`
  );

  // Score = number of keyword matches in text + bonus for section label matches
  const scoreExpr = sql`(${sql.join(likeClauses, sql` + `)} + ${sql.join(sectionClauses, sql` + `)} * 2)`;

  const results = await db
    .select({
      id: documentChunks.id,
      filingId: documentChunks.filingId,
      companyId: documentChunks.companyId,
      chunkIndex: documentChunks.chunkIndex,
      chunkText: documentChunks.chunkText,
      sectionLabel: documentChunks.sectionLabel,
      tokenCount: documentChunks.tokenCount,
      companyCik: documentChunks.companyCik,
      documentName: documentChunks.documentName,
      createdAt: documentChunks.createdAt,
      relevance: scoreExpr.as("relevance"),
    })
    .from(documentChunks)
    .where(eq(documentChunks.companyCik, companyCik))
    .orderBy(sql`relevance DESC, ${documentChunks.chunkIndex} ASC`)
    .limit(limit);

  // Filter out zero-relevance results if we have enough matches
  const relevant = results.filter((r: any) => (r as any).relevance > 0);
  return relevant.length > 0 ? relevant : results;
}

// ─── Suggested Questions ─────────────────────────────────────────────────────

/**
 * Generate suggested questions based on available filing content.
 * Analyzes section labels and chunk content to produce relevant questions.
 */
export async function generateSuggestedQuestions(
  companyCik: string,
  companyName: string
): Promise<string[]> {
  const db = await getDb();
  if (!db) return getDefaultQuestions(companyName);

  // Check what sections are available
  const sections = await db
    .select({ sectionLabel: documentChunks.sectionLabel })
    .from(documentChunks)
    .where(
      and(
        eq(documentChunks.companyCik, companyCik),
        sql`${documentChunks.sectionLabel} IS NOT NULL AND ${documentChunks.sectionLabel} != ''`
      )
    )
    .groupBy(documentChunks.sectionLabel);

  const sectionLabels = sections
    .map((s) => (s.sectionLabel || "").toLowerCase())
    .filter(Boolean);

  // Check if there are any chunks at all
  const [chunkCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(documentChunks)
    .where(eq(documentChunks.companyCik, companyCik));

  if (!chunkCount || chunkCount.count === 0) {
    return getDefaultQuestions(companyName);
  }

  // Use LLM to generate contextual questions based on available sections
  try {
    const sectionList = sectionLabels.length > 0
      ? sectionLabels.join(", ")
      : "general company information";

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You generate exactly 5 short, specific questions an investor would ask about a company's IPO filing. Each question should be answerable from SEC filing documents. Return ONLY a JSON array of 5 strings, nothing else.`,
        },
        {
          role: "user",
          content: `Company: ${companyName} (CIK: ${companyCik}). Available filing sections: ${sectionList}. Generate 5 investor-relevant questions.`,
        },
      ],
    });

    const raw = typeof response.choices?.[0]?.message?.content === "string"
      ? response.choices[0].message.content
      : "";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 5);
    }
  } catch {
    // Fall through to section-based defaults
  }

  return buildSectionBasedQuestions(companyName, sectionLabels);
}

function getDefaultQuestions(companyName: string): string[] {
  return [
    `What does ${companyName} do?`,
    `What are the main risk factors?`,
    `How will IPO proceeds be used?`,
    `Who are the key executives?`,
    `What is the competitive landscape?`,
  ];
}

function buildSectionBasedQuestions(
  companyName: string,
  sectionLabels: string[]
): string[] {
  const questions: string[] = [];
  const sectionSet = new Set(sectionLabels);

  const sectionMap: Record<string, string> = {
    "risk factors": "What are the key risk factors disclosed in the filing?",
    "use of proceeds": "How does the company plan to use the IPO proceeds?",
    "business": `What is ${companyName}'s core business model?`,
    "management": "Who are the key members of the management team?",
    "competition": `Who are ${companyName}'s main competitors?`,
    "financial": `What are ${companyName}'s recent financial results?`,
    "dilution": "What dilution can existing shareholders expect?",
    "dividend": "Does the company plan to pay dividends?",
    "capitalization": "What is the company's capitalization structure?",
    "description of capital stock": "What types of stock does the company have?",
  };

  for (const [keyword, question] of Object.entries(sectionMap)) {
    if (questions.length >= 5) break;
    const found = sectionLabels.some((s) => s.includes(keyword));
    if (found) questions.push(question);
  }

  // Fill remaining with defaults
  const defaults = getDefaultQuestions(companyName);
  for (const q of defaults) {
    if (questions.length >= 5) break;
    if (!questions.includes(q)) questions.push(q);
  }

  return questions.slice(0, 5);
}

// ─── Grounded Chat ───────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  answer: string;
  citations: Array<{
    documentName: string;
    sectionLabel: string;
    excerpt: string;
  }>;
  hasDocuments: boolean;
}

/**
 * Generate a grounded response using RAG.
 * The LLM is strictly instructed to only use information from the provided
 * document chunks, and to cite sources with [DOC:name|section] markers.
 */
export async function generateGroundedResponse(
  companyCik: string,
  companyName: string,
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  // Retrieve relevant chunks
  const chunks = await retrieveChunks(companyCik, userMessage);

  if (chunks.length === 0) {
    return {
      answer:
        "I don't have any SEC filing documents for this company yet. Once S-1 or other filing documents are uploaded and indexed, I'll be able to answer questions grounded in the actual filings.",
      citations: [],
      hasDocuments: false,
    };
  }

  // Build context from chunks
  const contextParts = chunks.map((chunk, i) => {
    const docName = chunk.documentName || "SEC Filing";
    const section = chunk.sectionLabel || "General";
    return `[Source ${i + 1}: ${docName} — ${section}]\n${chunk.chunkText}`;
  });

  const context = contextParts.join("\n\n---\n\n");

  const systemPrompt = `You are an IPO research analyst assistant for ${companyName}. You answer questions STRICTLY based on the SEC filing documents provided below. 

CRITICAL RULES:
1. ONLY use information from the provided document excerpts. Do NOT add any information from your general knowledge.
2. If the documents don't contain enough information to answer the question, say so explicitly.
3. After each factual claim, cite the source using this exact format: [DOC:document_name|section_name]
4. Be precise and analytical. Use financial terminology appropriately.
5. Format your response with clear structure using markdown.
6. If asked about something not covered in the documents, respond: "This information is not available in the current filing documents."

AVAILABLE DOCUMENT EXCERPTS:
${context}`;

  // Build messages array with conversation history
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
  ];

  // Add recent conversation history (last 6 messages to stay within context)
  const recentHistory = conversationHistory.slice(-6);
  for (const msg of recentHistory) {
    if (msg.role !== "system") {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add current user message
  messages.push({ role: "user", content: userMessage });

  try {
    const response = await invokeLLM({ messages });

    const rawContent = response.choices?.[0]?.message?.content;
    const answer = typeof rawContent === "string" ? rawContent : "";

    // Extract citations from [DOC:name|section] markers
    const citations = extractCitations(answer, chunks);

    return {
      answer,
      citations,
      hasDocuments: true,
    };
  } catch (error) {
    console.error("[RAG] LLM invocation failed:", error);
    return {
      answer:
        "I encountered an error while processing your question. Please try again.",
      citations: [],
      hasDocuments: true,
    };
  }
}

/**
 * Extract citation markers from the LLM response and match them to source chunks.
 */
export function extractCitations(
  answer: string,
  chunks: Array<{ documentName?: string | null; sectionLabel?: string | null; chunkText: string }>
): Array<{ documentName: string; sectionLabel: string; excerpt: string }> {
  const citationRegex = /\[DOC:([^\]|]+)\|([^\]]+)\]/g;
  const seen = new Set<string>();
  const citations: Array<{ documentName: string; sectionLabel: string; excerpt: string }> = [];

  let match;
  while ((match = citationRegex.exec(answer)) !== null) {
    const docName = match[1].trim();
    const section = match[2].trim();
    const key = `${docName}|${section}`;

    if (seen.has(key)) continue;
    seen.add(key);

    // Find the matching chunk to get an excerpt
    const matchingChunk = chunks.find((c) => {
      const chunkDoc = (c.documentName || "SEC Filing").toLowerCase();
      const chunkSection = (c.sectionLabel || "General").toLowerCase();
      return (
        chunkDoc.includes(docName.toLowerCase()) ||
        docName.toLowerCase().includes(chunkDoc)
      ) && (
        chunkSection.includes(section.toLowerCase()) ||
        section.toLowerCase().includes(chunkSection)
      );
    });

    const excerpt = matchingChunk
      ? matchingChunk.chunkText.substring(0, 200) + (matchingChunk.chunkText.length > 200 ? "..." : "")
      : "";

    citations.push({ documentName: docName, sectionLabel: section, excerpt });
  }

  return citations;
}

// ─── Chat Session Persistence ────────────────────────────────────────────────

export async function saveChatSession(
  sessionId: string,
  companyCik: string,
  companyId: number,
  userId: number | null,
  messages: ChatMessage[]
) {
  const db = await getDb();
  if (!db) return;

  const messagesJson = JSON.stringify(messages);

  try {
    await db
      .insert(chatSessions)
      .values({
        sessionId,
        companyCik,
        companyId,
        userId,
        messages: messagesJson,
      })
      .onDuplicateKeyUpdate({
        set: { messages: messagesJson },
      });
  } catch (error) {
    console.error("[RAG] Failed to save chat session:", error);
  }
}

export async function loadChatSession(
  sessionId: string
): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.sessionId, sessionId))
    .limit(1);

  if (result.length === 0 || !result[0].messages) return [];

  try {
    return JSON.parse(result[0].messages);
  } catch {
    return [];
  }
}
