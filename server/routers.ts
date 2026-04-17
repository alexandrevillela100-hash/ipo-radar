import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { z } from "zod";
import {
  getAllCompanies,
  getCompanyByCik,
  getFilings,
  getFilingsWithCompanies,
  getStats,
  registerEmailSignup,
  getWatchlistForUser,
  addToWatchlist,
  removeFromWatchlist,
  toggleWatchlistAlerts,
  getAlertsForUser,
  markAlertRead,
  markAllAlertsRead,
  getUnreadAlertCount,
  searchCompanies,
  registerWithPassword,
  loginWithPassword,
} from "./db";
import { runIngestion } from "./edgarIngestion";
import { invokeLLM } from "./_core/llm";
import {
  generateGroundedResponse,
  generateSuggestedQuestions,
  saveChatSession,
  loadChatSession,
} from "./rag";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Email Signup (Start Free) ───────────────────────────────────────────

  signup: router({
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          source: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const isNew = await registerEmailSignup(input.email, input.source);
        return { success: true, isNew };
      }),
  }),

  // ─── Email/Password Auth ──────────────────────────────────────────────────

  emailAuth: router({
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(8, "Password must be at least 8 characters"),
          name: z.string().min(1, "Name is required"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await registerWithPassword(input.email, input.password, input.name);
        if (!result) {
          return { success: false, error: "Email already registered. Please log in instead." };
        }

        const sessionToken = await sdk.createSessionToken(result.user.openId, {
          name: result.user.name || input.name,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, user: { id: result.user.id, name: result.user.name, email: result.user.email } };
      }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(1, "Password is required"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const user = await loginWithPassword(input.email, input.password);
        if (!user) {
          return { success: false, error: "Invalid email or password." };
        }

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, user: { id: user.id, name: user.name, email: user.email } };
      }),
  }),

  // ─── SEC EDGAR Data Routes ──────────────────────────────────────────────

  edgar: router({
    filings: publicProcedure.query(async () => {
      return getFilingsWithCompanies();
    }),

    companyFilings: publicProcedure
      .input(z.object({ cik: z.string() }))
      .query(async ({ input }) => {
        const [company, companyFilings] = await Promise.all([
          getCompanyByCik(input.cik),
          getFilings(input.cik),
        ]);
        return { company, filings: companyFilings };
      }),

    companies: publicProcedure.query(async () => {
      return getAllCompanies();
    }),

    company: publicProcedure
      .input(z.object({ cik: z.string() }))
      .query(async ({ input }) => {
        return getCompanyByCik(input.cik);
      }),

    stats: publicProcedure.query(async () => {
      return getStats();
    }),

    ingest: publicProcedure
      .input(
        z
          .object({
            lookbackDays: z.number().min(1).max(365).default(30),
          })
          .optional()
      )
      .mutation(async ({ input }) => {
        const lookbackDays = input?.lookbackDays ?? 30;
        const result = await runIngestion(lookbackDays);
        return result;
      }),

    search: publicProcedure
      .input(z.object({ query: z.string().min(1) }))
      .query(async ({ input }) => {
        return searchCompanies(input.query);
      }),
  }),

  // ─── Watchlist (requires auth) ──────────────────────────────────────────

  watchlist: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getWatchlistForUser(ctx.user.id);
    }),

    add: protectedProcedure
      .input(z.object({ companyCik: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const added = await addToWatchlist(ctx.user.id, input.companyCik);
        return { success: true, added };
      }),

    remove: protectedProcedure
      .input(z.object({ companyCik: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await removeFromWatchlist(ctx.user.id, input.companyCik);
        return { success: true };
      }),

    toggleAlerts: protectedProcedure
      .input(z.object({ companyCik: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await toggleWatchlistAlerts(ctx.user.id, input.companyCik);
        return { success: true };
      }),
  }),

  // ─── Alerts (requires auth) ─────────────────────────────────────────────

  alerts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getAlertsForUser(ctx.user.id);
    }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return getUnreadAlertCount(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markAlertRead(input.alertId, ctx.user.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllAlertsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Stripe Billing ────────────────────────────────────────────────────

  billing: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const { getSubscriptionStatus } = await import("./stripe/stripe");
      return getSubscriptionStatus(ctx.user.id);
    }),

    createCheckout: protectedProcedure
      .input(
        z.object({
          planKey: z.string(),
          origin: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { createCheckoutSession } = await import("./stripe/stripe");
        return createCheckoutSession({
          userId: ctx.user.id,
          email: ctx.user.email || "",
          name: ctx.user.name,
          planKey: input.planKey,
          origin: input.origin,
        });
      }),

    createPortalSession: protectedProcedure
      .input(z.object({ origin: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { createBillingPortalSession } = await import("./stripe/stripe");
        return createBillingPortalSession({
          userId: ctx.user.id,
          origin: input.origin,
        });
      }),
  }),

  // ─── Company Chat (RAG-based) ────────────────────────────────────────────

  chat: router({
    ask: publicProcedure
      .input(
        z.object({
          cik: z.string(),
          message: z.string().min(1),
          sessionId: z.string(),
          history: z.array(
            z.object({
              role: z.enum(["system", "user", "assistant"]),
              content: z.string(),
            })
          ).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const company = await getCompanyByCik(input.cik);
        if (!company) {
          return {
            answer: "Company not found.",
            citations: [],
            hasDocuments: false,
          };
        }

        const response = await generateGroundedResponse(
          input.cik,
          company.name,
          input.message,
          input.history || []
        );

        // Persist the session
        const updatedHistory = [
          ...(input.history || []),
          { role: "user" as const, content: input.message },
          { role: "assistant" as const, content: response.answer },
        ];

        await saveChatSession(
          input.sessionId,
          input.cik,
          company.id,
          ctx.user?.id ?? null,
          updatedHistory
        );

        return response;
      }),

    suggestedQuestions: publicProcedure
      .input(z.object({ cik: z.string() }))
      .query(async ({ input }) => {
        const company = await getCompanyByCik(input.cik);
        if (!company) return [];
        return generateSuggestedQuestions(input.cik, company.name);
      }),

    loadSession: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return loadChatSession(input.sessionId);
      }),
  }),

  // ─── AI Report Generation ──────────────────────────────────────────────

  aiReport: router({
    generate: publicProcedure
      .input(z.object({ cik: z.string() }))
      .mutation(async ({ input }) => {
        const [company, companyFilings] = await Promise.all([
          getCompanyByCik(input.cik),
          getFilings(input.cik),
        ]);

        if (!company) {
          return { success: false, error: "Company not found" };
        }

        const filingsSummary = companyFilings
          .map(
            (f) =>
              `- ${f.formType} filed on ${f.filingDate} (Accession: ${f.accessionNumber})`
          )
          .join("\n");

        const prompt = `You are an institutional equity research analyst writing a First-Look Initiation Report for an upcoming IPO. 

Company: ${company.name}
CIK: ${company.cik}
Ticker: ${company.ticker || "TBD"}
Exchange: ${company.exchange || "TBD"}
Industry (SIC): ${company.sicDescription || "N/A"} (Code: ${company.sic || "N/A"})
State of Incorporation: ${company.stateOfIncorporation || "N/A"}
Headquarters: ${company.businessCity || ""}, ${company.businessState || ""}
Fiscal Year End: ${company.fiscalYearEnd || "N/A"}

SEC Filing History:
${filingsSummary || "No filings found"}

Based on the company profile and filing information above, generate a comprehensive First-Look IPO Report in the following JSON format. Be analytical, specific, and use realistic financial analysis language. Generate plausible but clearly hypothetical financial estimates based on the industry and company type.

Return ONLY valid JSON with this exact structure:
{
  "executiveSummary": "2-3 paragraph executive summary of the IPO opportunity",
  "sections": [
    {
      "title": "Business Overview",
      "content": "Detailed analysis of the business model, products/services, and market position"
    },
    {
      "title": "Market Opportunity",
      "content": "Analysis of the total addressable market, growth drivers, and competitive landscape"
    },
    {
      "title": "Financial Analysis",
      "content": "Revenue trends, profitability metrics, and key financial ratios (use hypothetical but realistic numbers)"
    },
    {
      "title": "IPO Valuation Assessment",
      "content": "Estimated valuation range, comparable company analysis, and pricing considerations"
    },
    {
      "title": "Risk Factors",
      "content": "Key risks including market, operational, regulatory, and financial risks"
    }
  ],
  "risks": [
    { "title": "Risk name", "severity": "High|Medium|Low", "description": "Brief description" }
  ],
  "verdict": {
    "rating": "Favorable|Neutral|Cautious",
    "summary": "One paragraph investment verdict"
  }
}`;

        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content:
                  "You are an expert equity research analyst. Return only valid JSON, no markdown formatting.",
              },
              { role: "user", content: prompt },
            ],
          });

          const rawContent = response.choices?.[0]?.message?.content || "";
          const content = typeof rawContent === "string" ? rawContent : "";
          let report;
          try {
            const cleaned = content
              .replace(/```json\n?/g, "")
              .replace(/```\n?/g, "")
              .trim();
            report = JSON.parse(cleaned);
          } catch {
            report = {
              executiveSummary: content,
              sections: [],
              risks: [],
              verdict: {
                rating: "Neutral",
                summary: "Report generation produced unstructured output.",
              },
            };
          }

          return {
            success: true,
            report: {
              companyName: company.name,
              cik: company.cik,
              ticker: company.ticker || "TBD",
              industry: company.sicDescription || "N/A",
              generatedAt: new Date().toISOString(),
              ...report,
            },
          };
        } catch (error: any) {
          console.error("[AI Report] LLM invocation failed:", error);
          return {
            success: false,
            error: "Failed to generate report. Please try again.",
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
