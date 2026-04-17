import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  listCompanies, getCompanyBySlug, getCompanyById, createCompany, updateCompany, deleteCompany,
  listFilingsByCompany, getFilingById, createFiling, updateFiling, deleteFiling,
  createChunks, deleteChunksByFiling,
  getOrCreateChatSession, updateChatMessages,
  getCompanyStats,
} from "./db";
import { chunkDocument, extractText, validateExtraction } from "./chunker";
import { queryRAG, generateSuggestedQuestions } from "./rag";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Company Routes ─────────────────────────────────────────
  company: router({
    list: publicProcedure
      .input(z.object({
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return listCompanies(input);
      }),

    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return getCompanyBySlug(input.slug);
      }),

    stats: publicProcedure.query(async () => {
      return getCompanyStats();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        ticker: z.string().optional(),
        exchange: z.string().optional(),
        status: z.enum(["upcoming", "priced", "trading", "withdrawn"]).optional(),
        industry: z.string().optional(),
        sector: z.string().optional(),
        description: z.string().optional(),
        headquarters: z.string().optional(),
        founded: z.string().optional(),
        ceo: z.string().optional(),
        employees: z.string().optional(),
        website: z.string().optional(),
        logoUrl: z.string().optional(),
        priceLow: z.string().optional(),
        priceHigh: z.string().optional(),
        priceActual: z.string().optional(),
        sharesOffered: z.number().optional(),
        offeringSize: z.number().optional(),
        marketCap: z.number().optional(),
        expectedDate: z.date().optional(),
        pricedDate: z.date().optional(),
        revenue: z.number().optional(),
        netIncome: z.number().optional(),
        fiscalYear: z.string().optional(),
        leadUnderwriter: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const slug = input.name.toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          + "-" + nanoid(6);
        const id = await createCompany({ ...input, slug });
        return { id, slug };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        ticker: z.string().optional(),
        exchange: z.string().optional(),
        status: z.enum(["upcoming", "priced", "trading", "withdrawn"]).optional(),
        industry: z.string().optional(),
        sector: z.string().optional(),
        description: z.string().optional(),
        headquarters: z.string().optional(),
        founded: z.string().optional(),
        ceo: z.string().optional(),
        employees: z.string().optional(),
        website: z.string().optional(),
        logoUrl: z.string().optional(),
        priceLow: z.string().optional(),
        priceHigh: z.string().optional(),
        priceActual: z.string().optional(),
        sharesOffered: z.number().optional(),
        offeringSize: z.number().optional(),
        marketCap: z.number().optional(),
        expectedDate: z.date().optional(),
        pricedDate: z.date().optional(),
        revenue: z.number().optional(),
        netIncome: z.number().optional(),
        fiscalYear: z.string().optional(),
        leadUnderwriter: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateCompany(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCompany(input.id);
        return { success: true };
      }),
  }),

  // ─── Filing Routes ──────────────────────────────────────────
  filing: router({
    listByCompany: publicProcedure
      .input(z.object({ companyId: z.number() }))
      .query(async ({ input }) => {
        return listFilingsByCompany(input.companyId);
      }),

    upload: adminProcedure
      .input(z.object({
        companyId: z.number(),
        documentType: z.string(),
        documentName: z.string(),
        content: z.string(), // base64 encoded file content
        contentType: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // 1. Upload file to S3
        const fileBuffer = Buffer.from(input.content, "base64");
        const fileKey = `filings/${input.companyId}/${nanoid(10)}-${input.documentName}`;
        const { key, url } = await storagePut(fileKey, fileBuffer, input.contentType || "application/pdf");

        // 2. Create filing record
        const filingId = await createFiling({
          companyId: input.companyId,
          documentType: input.documentType,
          documentName: input.documentName,
          fileUrl: url,
          fileKey: key,
          fileSize: fileBuffer.length,
          status: "processing",
        });

        // 3. Process the document (extract text and chunk)
        try {
          const rawText = Buffer.from(input.content, "base64").toString("utf-8");
          const text = extractText(rawText);

          // Validate extraction quality
          const validation = validateExtraction(text);
          if (!validation.valid) {
            await updateFiling(filingId, {
              status: "error",
              errorMessage: validation.reason || "Failed to extract text from document.",
            });
            return { id: filingId, status: "error" as const };
          }

          const chunks = chunkDocument(text);

          if (chunks.length === 0) {
            await updateFiling(filingId, {
              status: "error",
              errorMessage: "No meaningful text chunks could be extracted from the document.",
            });
            return { id: filingId, status: "error" as const };
          }

          // 4. Store chunks
          await createChunks(chunks.map(c => ({
            filingId,
            companyId: input.companyId,
            chunkIndex: c.chunkIndex,
            chunkText: c.chunkText,
            sectionLabel: c.sectionLabel,
            tokenCount: c.tokenCount,
          })));

          // 5. Update filing status
          await updateFiling(filingId, {
            status: "ready",
            chunkCount: chunks.length,
            processedAt: new Date(),
          });

          return { id: filingId, status: "ready" as const, chunkCount: chunks.length };
        } catch (error: any) {
          await updateFiling(filingId, {
            status: "error",
            errorMessage: error.message || "Processing failed",
          });
          return { id: filingId, status: "error" as const };
        }
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteFiling(input.id);
        return { success: true };
      }),
  }),

  // ─── Chat / RAG Routes ─────────────────────────────────────
  chat: router({
    ask: publicProcedure
      .input(z.object({
        companyId: z.number(),
        companySlug: z.string(),
        question: z.string().min(1).max(2000),
        sessionId: z.string(),
        conversationHistory: z.array(z.object({
          role: z.string(),
          content: z.string(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get company
        const company = await getCompanyBySlug(input.companySlug);
        if (!company) {
          throw new Error("Company not found");
        }

        // Get or create chat session
        const session = await getOrCreateChatSession(
          input.sessionId,
          input.companyId,
          ctx.user?.id
        );

        // Query RAG
        const response = await queryRAG(
          input.companyId,
          company,
          input.question,
          input.conversationHistory || []
        );

        // Update session with new messages
        const currentMessages = (session.messages || []) as any[];
        currentMessages.push(
          { role: "user", content: input.question },
          { role: "assistant", content: response.answer, citations: response.citations }
        );
        await updateChatMessages(input.sessionId, currentMessages);

        return response;
      }),

    getHistory: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const db = (await import("./db")).getDb;
        const dbInstance = await db();
        if (!dbInstance) return [];
        const { chatSessions } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const rows = await dbInstance.select().from(chatSessions).where(eq(chatSessions.sessionId, input.sessionId)).limit(1);
        if (rows.length === 0) return [];
        return (rows[0].messages || []) as Array<{ role: string; content: string; citations?: Array<{ documentName: string; excerpt: string; sectionLabel?: string }> }>;
      }),

    suggestedQuestions: publicProcedure
      .input(z.object({
        companyId: z.number(),
        companySlug: z.string(),
      }))
      .query(async ({ input }) => {
        const company = await getCompanyBySlug(input.companySlug);
        if (!company) return [];
        return generateSuggestedQuestions(input.companyId, company);
      }),
  }),
});

export type AppRouter = typeof appRouter;
