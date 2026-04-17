# Project TODO

## Design System — Dark Terminal Luxe
- [x] Deep charcoal background, teal primary, gold highlights in index.css
- [x] DM Sans + JetBrains Mono typography via Google Fonts
- [x] Grain overlay and radial gradient hero effects
- [x] OKLCH color tokens for all design variables
- [x] Dark theme as default in ThemeProvider

## Public Marketing Pages
- [x] Landing page with hero, SEC pipeline bar, Upcoming/Recent IPOs, features grid
- [x] IPO Discovery page with search and filters
- [x] IPO Calendar (public view)
- [x] Sectors overview page
- [x] Company Comparison page
- [x] Filing Diff Viewer page
- [x] Market Commentary page
- [x] Pricing page with tier comparison
- [x] About page
- [x] Contact page
- [x] Legal (Terms/Privacy) page
- [x] Sample Report Preview page

## Authenticated App Shell
- [x] Sidebar-navigated AppShell layout
- [x] IPO Calendar (authenticated, with filing dots)
- [x] IPO News feed with filter tabs
- [x] IPO Stats with charts and breakdowns
- [x] Screens with filterable data tables

## User Dashboard
- [x] Watchlist page (persisted to database)
- [x] Alerts management page (persisted to database)
- [x] Saved Reports page
- [x] Account Settings page

## Authentication
- [x] Email/password login page with tabs (Sign In / Create Account)
- [x] bcrypt password hashing
- [x] JWT session management
- [x] Start Free email registration flow

## SEC EDGAR Integration Pipeline
- [x] EDGAR client module (server/edgar/client.ts)
- [x] Real-time S-1/F-1 filing ingestion
- [x] SIC-to-sector mapping
- [x] Company submissions and XBRL financial data
- [x] Full-text filing search
- [x] EDGAR ingestion pipeline (edgarIngestion.ts)

## AI-Generated IPO Initiation Reports
- [x] AI Report page with Generate button
- [x] LLM-powered report using verified SEC data only
- [x] Section-by-section narrative output
- [x] No hallucinated financial figures

## Database Schema
- [x] users table
- [x] companies table
- [x] filings table
- [x] emailSignups table
- [x] watchlistItems table
- [x] userAlerts table
- [x] Drizzle ORM with full migration history

## Stripe Subscription Billing
- [x] Checkout session creation endpoint
- [x] Webhook handler for subscription events
- [x] Paywall gate component
- [x] Subscription management page

## Global UX Utilities
- [x] Command-palette search (⌘K)
- [x] Watchlist toggle button component
- [x] Alert notification bell with unread count
- [x] Navbar with auth-aware state
- [x] Footer component
- [x] Error boundary

## Testing
- [x] 72-test Vitest suite covering auth, EDGAR, watchlist, alerts, and Stripe (exceeds 56-test requirement)

## Bug Fixes
- [x] Fix NotFound page to use Dark Terminal Luxe theme (was using light background)

## GitHub Integration
- [x] Push all project files to GitHub repository (alexandrevillela100-hash/IPO-Tracker-)

## Landing Page Enhancements
- [x] Add "Common Questions" FAQ section with Usuro.ai-style visuals
- [x] Clickable question switching with subtle transitions
- [x] Animation between question states (Framer Motion)

## Conversational Chat Feature (NEW)
- [x] Add document_chunks table to schema for RAG retrieval
- [x] Add chat_sessions and chat_messages tables for persistence
- [x] Create chunker utility for processing SEC filing text
- [x] Create RAG engine (retrieve chunks + grounded LLM responses with citations)
- [x] Add chat tRPC procedures (sendMessage, getHistory, getSuggestedQuestions)
- [x] Build CompanyChat UI component with message display, input, citations, suggested questions
- [x] Integrate CompanyChat into SECIPODetail.tsx below Company Facts section
- [x] Write vitest tests for new chat functionality (5 tests for citation extraction)
- [x] Verify no existing pages were modified (all 77 tests pass, landing page confirmed intact)

## Filing Text Ingestion Pipeline
- [x] Identify a company with S-1 filings in the database (GeoVax Labs, CIK 0000832489)
- [x] Build script to download actual S-1 filing text from SEC EDGAR (ingest-filing-text.mjs)
- [x] Chunk the filing text and store in document_chunks table (468 chunks across 16 sections)
- [x] Test the conversational chat with real grounded data (risk factors question answered with citations)
- [x] Add admin-facing "Index Filing" endpoint (indexing.indexFiling + indexing.indexCompany tRPC procedures)
