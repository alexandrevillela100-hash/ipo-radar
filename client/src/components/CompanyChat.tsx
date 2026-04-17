import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Send,
  User,
  Sparkles,
  MessageSquare,
  FileText,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { Streamdown } from "streamdown";
import { nanoid } from "nanoid";

interface Citation {
  documentName: string;
  excerpt: string;
  sectionLabel?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export default function CompanyChat({
  companyId,
  companySlug,
  companyName,
}: {
  companyId: number;
  companySlug: string;
  companyName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId] = useState(() => {
    const storageKey = `ipo-chat-session-${companyId}`;
    const existing = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    if (existing) return existing;
    const newId = nanoid(20);
    if (typeof window !== 'undefined') localStorage.setItem(storageKey, newId);
    return newId;
  });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load persisted chat session history
  const sessionInput = useMemo(() => ({ sessionId }), [sessionId]);
  const { data: historyData } = trpc.chat.getHistory.useQuery(sessionInput, {
    refetchOnWindowFocus: false,
  });

  // Restore history on mount
  useEffect(() => {
    if (historyData && historyData.length > 0 && messages.length === 0) {
      setMessages(
        historyData.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
          citations: m.citations || [],
        }))
      );
    }
  }, [historyData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch suggested questions
  const suggestedQInput = useMemo(
    () => ({ companyId, companySlug }),
    [companyId, companySlug]
  );
  const { data: suggestedQuestions, isLoading: loadingSuggestions } =
    trpc.chat.suggestedQuestions.useQuery(suggestedQInput);

  // Chat mutation
  const chatMutation = trpc.chat.ask.useMutation({
    onSuccess: (response) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.answer,
          citations: response.citations,
        },
      ]);
    },
    onError: (error) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I encountered an error while processing your question. Please try again.",
          citations: [],
        },
      ]);
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLDivElement;
    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      });
    }
  }, [messages, chatMutation.isPending]);

  const handleSend = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || chatMutation.isPending) return;

    const newUserMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");

    chatMutation.mutate({
      companyId,
      companySlug,
      question: trimmed,
      sessionId,
      conversationHistory: [...messages, newUserMsg].map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const displayMessages = messages;
  const isLoading = chatMutation.isPending;

  return (
    <div className="mb-12">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        Ask About {companyName}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Ask questions about this company's IPO, business model, risks, financials, and more.
        All answers are grounded in SEC filings — no hallucinations.
      </p>

      <Card className="bg-card/50 border-border/50">
        <div className="flex flex-col" style={{ height: "600px" }}>
          {/* Messages Area */}
          <div ref={scrollAreaRef} className="flex-1 overflow-hidden">
            {displayMessages.length === 0 ? (
              <div className="flex h-full flex-col p-6">
                <div className="flex flex-1 flex-col items-center justify-center gap-6 text-muted-foreground">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-7 w-7 text-primary/60" />
                    </div>
                    <p className="text-sm text-center max-w-md">
                      Ask me anything about <strong className="text-foreground">{companyName}</strong>'s
                      IPO filing. I'll answer based strictly on the SEC documents.
                    </p>
                  </div>

                  {/* Suggested Questions */}
                  {loadingSuggestions ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating suggested questions...
                    </div>
                  ) : suggestedQuestions && suggestedQuestions.length > 0 ? (
                    <div className="w-full max-w-lg">
                      <p className="text-xs text-muted-foreground mb-3 text-center uppercase tracking-wider font-medium">
                        Suggested Questions
                      </p>
                      <div className="flex flex-col gap-2">
                        {suggestedQuestions.map((q: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => handleSend(q)}
                            disabled={isLoading}
                            className="text-left rounded-lg border border-border/50 bg-secondary/30 px-4 py-3 text-sm transition-all hover:bg-secondary/60 hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="flex flex-col space-y-4 p-4">
                  {displayMessages.map((message, index) => (
                    <div key={index}>
                      <div
                        className={cn(
                          "flex gap-3",
                          message.role === "user"
                            ? "justify-end items-start"
                            : "justify-start items-start"
                        )}
                      >
                        {message.role === "assistant" && (
                          <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                            <Sparkles className="size-4 text-primary" />
                          </div>
                        )}

                        <div
                          className={cn(
                            "max-w-[85%] rounded-lg px-4 py-2.5",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/50 text-foreground"
                          )}
                        >
                          {message.role === "assistant" ? (
                            <div className="prose prose-sm prose-invert max-w-none">
                              <Streamdown>{message.content}</Streamdown>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm">
                              {message.content}
                            </p>
                          )}
                        </div>

                        {message.role === "user" && (
                          <div className="size-8 shrink-0 mt-1 rounded-full bg-secondary flex items-center justify-center">
                            <User className="size-4 text-secondary-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Citations */}
                      {message.role === "assistant" &&
                        message.citations &&
                        message.citations.length > 0 && (
                          <CitationBlock citations={message.citations} />
                        )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-start gap-3">
                      <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="size-4 text-primary" />
                      </div>
                      <div className="rounded-lg bg-muted/50 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" />
                          Searching filings and generating response...
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show suggested questions after messages too */}
                  {displayMessages.length > 0 &&
                    !isLoading &&
                    suggestedQuestions &&
                    suggestedQuestions.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">
                          Ask another question
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {suggestedQuestions.slice(0, 3).map((q: string, i: number) => (
                            <button
                              key={i}
                              onClick={() => handleSend(q)}
                              disabled={isLoading}
                              className="rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-xs transition-all hover:bg-secondary/60 hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Input Area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex gap-2 p-4 border-t border-border/50 bg-background/30 items-end"
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${companyName}'s IPO, risks, financials...`}
              className="flex-1 max-h-32 resize-none min-h-9 bg-input/50"
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="shrink-0 h-[38px] w-[38px]"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

function CitationBlock({ citations }: { citations: Citation[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ml-11 mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <FileText className="h-3 w-3" />
        <span className="font-medium">
          {citations.length} source{citations.length !== 1 ? "s" : ""} cited
        </span>
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {citations.map((citation, i) => (
            <div
              key={i}
              className="rounded-md border border-border/50 bg-secondary/20 p-3"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-foreground truncate">
                  {citation.documentName}
                </span>
                {citation.sectionLabel && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                    {citation.sectionLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                "{citation.excerpt}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
