# IPO Radar - Project TODO

## Database & Schema
- [x] Companies table (name, ticker, exchange, status, industry, metrics, etc.)
- [x] SEC filings table (company_id, document_type, file_url, upload date)
- [x] Document chunks table (filing_id, chunk_text, chunk_index, section_label)
- [x] Chat history table (company_id, user_id, messages)

## Backend API
- [x] Company CRUD procedures (list, get by id/slug)
- [x] Filing upload and management procedures (admin only)
- [x] Document chunking logic on upload
- [x] RAG chat procedure: retrieve relevant chunks + invoke LLM with grounding
- [x] Suggested questions generation per company based on filing content
- [x] Source citation extraction in LLM responses

## Frontend - IPO Dashboard
- [x] Public landing/dashboard page listing all tracked IPOs
- [x] Status badges (upcoming, priced, trading)
- [x] Key metrics display per company card (price range, size, date, exchange)
- [x] Search and filter functionality
- [x] Link through to individual company detail pages

## Frontend - Company Detail Page
- [x] Company Facts section (name, ticker, exchange, offering size, price range, expected date, industry)
- [x] Company overview/description section
- [x] Key metrics cards
- [x] Fix negative currency formatting (e.g. -$12M instead of $-12,000,000)

## Frontend - Conversational Chat Interface
- [x] Chat UI embedded below Company Facts on detail page
- [x] Suggested questions panel (dynamically generated per company from filing content)
- [x] Source citation display within each chat response (document name + excerpt)
- [ ] Load persisted chat session history on page mount
- [x] Loading states and error handling

## Admin - Filing Management
- [x] Admin dashboard page
- [x] Company management page (add/delete companies)
- [x] SEC filing upload interface per company
- [x] Filing list with status indicators
- [x] Document processing status display
- [ ] Company edit functionality on admin page

## Design & Polish
- [x] Dark financial terminal theme (navy/slate, accent blues/greens)
- [x] Inter font integration
- [x] Professional data-dense card layouts

## Testing
- [x] Vitest tests for document chunking (extractText, validateExtraction, chunkDocument)
- [x] Vitest tests for auth logout
- [x] Vitest tests for RAG response format (citation extraction, excerpt generation)
