/**
 * RAG (Retrieval-Augmented Generation) engine for grounded IPO Q&A.
 * All responses are strictly grounded in uploaded SEC filings.
 */

import { invokeLLM } from "./_core/llm";
import { searchChunks, getChunksByCompany, listFilingsByCompany } from "./db";
import type { DocumentChunk, Company, Filing } from "../drizzle/schema";

export interface Citation {
  documentName: string;
  excerpt: string;
  sectionLabel?: string;
}

export interface RAGResponse {
  answer: string;
  citations: Citation[];
}

const SYSTEM_PROMPT = `You are an IPO research analyst assistant for IPO Radar. Your role is to answer questions about companies preparing for or completing their IPO, strictly based on their SEC filings (S-1, S-1/A, prospectuses, and related documents).

CRITICAL RULES — YOU MUST FOLLOW ALL OF THESE:
1. ONLY use information from the provided document excerpts below. NEVER generate, infer, or assume information not explicitly stated in the excerpts.
2. If the provided excerpts do not contain enough information to fully answer the question, state clearly: "Based on the available filing documents, I don't have sufficient information to answer this question completely." Then share only what IS supported by the excerpts.
3. For EVERY factual claim, reference the source using [Source N] notation (e.g., [Source 1], [Source 3]).
4. Do NOT speculate, extrapolate, or provide opinions beyond what the documents explicitly state.
5. Use professional financial language appropriate for investment research.
6. Format your response with clear markdown: use headers (##), bullet points, and bold text for key figures.
7. When discussing financial figures, always include the time period, currency context, and whether the figures are audited or unaudited if that information is available in the excerpts.
8. If a question asks about something not covered in the excerpts at all, say so — do not fabricate an answer.

RESPONSE FORMAT:
- Start with a direct answer to the question.
- Support each claim with [Source N] references.
- Use markdown formatting for readability.
- End with a brief note if important caveats apply.`;

/**
 * Build context from retrieved chunks, including filing metadata.
 */
function buildContext(chunks: DocumentChunk[], filingsMap: Map<number, Filing>): string {
  return chunks.map((chunk, i) => {
    const filing = filingsMap.get(chunk.filingId);
    const docName = filing ? `${filing.documentType} — ${filing.documentName}` : "Unknown Document";
    const section = chunk.sectionLabel ? ` | Section: ${chunk.sectionLabel}` : "";
    return `[Source ${i + 1}] Document: ${docName}${section}\n---\n${chunk.chunkText}`;
  }).join("\n\n===\n\n");
}

/**
 * Extract citations from the LLM response by matching [Source N] references.
 * Returns the specific relevant portion of each cited chunk.
 */
export function extractCitations(
  answer: string,
  chunks: DocumentChunk[],
  filingsMap: Map<number, Filing>
): Citation[] {
  const citations: Citation[] = [];
  const sourceRefs = answer.match(/\[Source\s+(\d+)\]/g) || [];
  const seenIndices = new Set<number>();

  for (const ref of sourceRefs) {
    const match = ref.match(/\d+/);
    if (!match) continue;
    const idx = parseInt(match[0], 10) - 1;
    if (idx < 0 || idx >= chunks.length || seenIndices.has(idx)) continue;
    seenIndices.add(idx);

    const chunk = chunks[idx];
    const filing = filingsMap.get(chunk.filingId);
    const docName = filing ? `${filing.documentType} — ${filing.documentName}` : "Unknown Document";

    // Find the most relevant sentence(s) from the chunk that relate to the context
    // around where [Source N] appears in the answer
    const excerpt = extractRelevantExcerpt(chunk.chunkText);

    citations.push({
      documentName: docName,
      excerpt,
      sectionLabel: chunk.sectionLabel || undefined,
    });
  }

  return citations;
}

/**
 * Extract the most meaningful excerpt from a chunk.
 * Picks the first substantive paragraph/sentences up to ~400 chars.
 */
export function extractRelevantExcerpt(chunkText: string): string {
  // Split into sentences
  const sentences = chunkText
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 20);

  if (sentences.length === 0) {
    return chunkText.substring(0, 400).trim() + (chunkText.length > 400 ? "..." : "");
  }

  // Build excerpt from sentences up to ~400 chars
  let excerpt = "";
  for (const sentence of sentences) {
    if (excerpt.length + sentence.length > 400) break;
    excerpt += (excerpt ? " " : "") + sentence.trim();
  }

  if (!excerpt) {
    excerpt = sentences[0].substring(0, 400);
  }

  return excerpt + (chunkText.length > excerpt.length ? "..." : "");
}

/**
 * Main RAG query function.
 * Retrieves relevant chunks, builds context, and queries the LLM.
 */
export async function queryRAG(
  companyId: number,
  company: Company,
  question: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<RAGResponse> {
  // 1. Retrieve relevant chunks
  const chunks = await searchChunks(companyId, question, 15);

  if (chunks.length === 0) {
    return {
      answer: "No SEC filing documents have been uploaded for this company yet. Please ask an administrator to upload the relevant filings (S-1, prospectus, etc.) so I can provide grounded answers based on the actual documents.",
      citations: [],
    };
  }

  // 2. Get filing metadata for citations
  const companyFilings = await listFilingsByCompany(companyId);
  const filingsMap = new Map<number, Filing>();
  for (const f of companyFilings) {
    filingsMap.set(f.id, f);
  }

  // 3. Build context
  const context = buildContext(chunks, filingsMap);

  // 4. Build messages
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: `You are answering questions about **${company.name}**${company.ticker ? ` (${company.ticker})` : ""}${company.industry ? `, in the ${company.industry} industry` : ""}.\n\nHere are the relevant excerpts from their SEC filings. Use ONLY these excerpts to answer:\n\n${context}`,
    },
  ];

  // Add conversation history (last 6 exchanges max)
  const recentHistory = conversationHistory.slice(-12);
  for (const msg of recentHistory) {
    if (msg.role === "user" || msg.role === "assistant") {
      messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
    }
  }

  // Add the current question
  messages.push({ role: "user", content: question });

  // 5. Invoke LLM
  const result = await invokeLLM({ messages });
  const answer = typeof result.choices[0]?.message?.content === "string"
    ? result.choices[0].message.content
    : "I was unable to generate a response. Please try again.";

  // 6. Extract citations
  const citations = extractCitations(answer, chunks, filingsMap);

  return { answer, citations };
}

/**
 * Generate suggested questions for a company based on available filing content.
 * Questions are specific to the company and grounded in what the filings actually contain.
 */
export async function generateSuggestedQuestions(companyId: number, company: Company): Promise<string[]> {
  const chunks = await getChunksByCompany(companyId);

  if (chunks.length === 0) {
    // No filings uploaded — return generic but useful prompts
    return [
      `What does ${company.name} do?`,
      "What are the key risk factors?",
      "How will the IPO proceeds be used?",
    ];
  }

  // Collect unique section labels and sample content from different sections
  const sectionSamples = new Map<string, string>();
  for (const chunk of chunks) {
    const label = chunk.sectionLabel || "GENERAL";
    if (!sectionSamples.has(label)) {
      sectionSamples.set(label, chunk.chunkText.substring(0, 300));
    }
  }

  const sectionsInfo = Array.from(sectionSamples.entries())
    .slice(0, 10)
    .map(([label, sample]) => `Section: ${label}\nSample: ${sample}`)
    .join("\n\n---\n\n");

  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You generate suggested questions for users exploring IPO filings. The questions must be:
1. Specific to this company (use the company name)
2. Answerable from the filing sections provided
3. Covering different aspects: business model, risks, financials, use of proceeds, competition, management
4. Written as natural questions a potential investor would ask

Return ONLY a JSON object with a "questions" array of exactly 5 strings.`,
        },
        {
          role: "user",
          content: `Company: ${company.name}${company.ticker ? ` (${company.ticker})` : ""}
Industry: ${company.industry || "Not specified"}
Status: ${company.status}

Available filing content by section:

${sectionsInfo}

Generate 5 specific, insightful questions about ${company.name}'s IPO.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "suggested_questions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["questions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = typeof result.choices[0]?.message?.content === "string"
      ? result.choices[0].message.content
      : "";

    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return parsed.questions.slice(0, 5);
    }
  } catch (e) {
    console.error("[RAG] Failed to generate suggested questions:", e);
  }

  // Fallback: section-aware questions specific to this company
  const fallback: string[] = [];
  const sections = Array.from(sectionSamples.keys());

  if (sections.some(s => s.includes("RISK"))) {
    fallback.push(`What are the key risk factors for ${company.name}'s business?`);
  }
  if (sections.some(s => s.includes("PROCEEDS"))) {
    fallback.push(`How does ${company.name} plan to use the IPO proceeds?`);
  }
  if (sections.some(s => s.includes("BUSINESS") || s.includes("COMPANY"))) {
    fallback.push(`What is ${company.name}'s core business model?`);
  }
  if (sections.some(s => s.includes("FINANCIAL") || s.includes("DISCUSSION"))) {
    fallback.push(`What are ${company.name}'s key financial metrics and trends?`);
  }
  if (sections.some(s => s.includes("COMPENSATION") || s.includes("MANAGEMENT"))) {
    fallback.push(`Who are the key executives at ${company.name}?`);
  }

  // Fill remaining with generic company-specific questions
  while (fallback.length < 5) {
    const generic = [
      `What competitive advantages does ${company.name} have?`,
      `What is ${company.name}'s growth strategy?`,
      `What market does ${company.name} operate in?`,
      `What are the terms of ${company.name}'s IPO offering?`,
      `What is ${company.name}'s revenue model?`,
    ];
    for (const q of generic) {
      if (fallback.length >= 5) break;
      if (!fallback.includes(q)) fallback.push(q);
    }
  }

  return fallback.slice(0, 5);
}
