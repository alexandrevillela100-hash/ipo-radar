import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type Citation = {
  documentName: string;
  sectionLabel: string;
  excerpt: string;
};

type AssistantMeta = {
  citations: Citation[];
  hasDocuments: boolean;
};

export function CompanyChat({
  cik,
  companyName,
}: {
  cik: string;
  companyName: string;
}) {
  // Session ID persisted per company in localStorage
  const sessionId = useMemo(() => {
    const key = `ipo-chat-session-${cik}`;
    let id = localStorage.getItem(key);
    if (!id) {
      id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(key, id);
    }
    return id;
  }, [cik]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [citationMap, setCitationMap] = useState<Record<number, AssistantMeta>>(
    {}
  );
  const [input, setInput] = useState("");
  const [expandedCitations, setExpandedCitations] = useState<
    Record<number, boolean>
  >({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load persisted session
  const { data: savedSession } = trpc.chat.loadSession.useQuery(
    { sessionId },
    { enabled: !!sessionId, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (savedSession && savedSession.length > 0 && messages.length === 0) {
      setMessages(savedSession);
    }
  }, [savedSession]);

  // Load suggested questions
  const { data: suggestedQuestions, isLoading: suggestionsLoading } =
    trpc.chat.suggestedQuestions.useQuery(
      { cik },
      { refetchOnWindowFocus: false, staleTime: 1000 * 60 * 10 }
    );

  // Chat mutation
  const chatMutation = trpc.chat.ask.useMutation({
    onSuccess: (response) => {
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: response.answer,
      };
      setMessages((prev) => {
        const newMessages = [...prev, assistantMsg];
        const assistantIndex = newMessages.length - 1;
        setCitationMap((prevMap) => ({
          ...prevMap,
          [assistantIndex]: {
            citations: response.citations,
            hasDocuments: response.hasDocuments,
          },
        }));
        return newMessages;
      });
    },
  });

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    const viewport = scrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLDivElement | null;
    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatMutation.isPending]);

  const handleSend = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || chatMutation.isPending) return;

      const userMsg: ChatMessage = { role: "user", content: trimmed };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");

      chatMutation.mutate({
        cik,
        message: trimmed,
        sessionId,
        history: messages,
      });

      textareaRef.current?.focus();
    },
    [messages, chatMutation, cik, sessionId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleNewChat = () => {
    const key = `ipo-chat-session-${cik}`;
    const newId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, newId);
    setMessages([]);
    setCitationMap({});
    setExpandedCitations({});
    window.location.reload();
  };

  const toggleCitation = (index: number) => {
    setExpandedCitations((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const cleanCitationMarkers = (text: string) => {
    return text.replace(/\[DOC:[^\]]+\]/g, "").trim();
  };

  const displayMessages = messages.filter((m) => m.role !== "system");

  return (
    <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Ask about {companyName}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Answers grounded in SEC filings only
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            New Chat
          </Button>
        )}
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="h-[480px]">
        {displayMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 py-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-primary/30" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Ask a question about this company's IPO
            </p>
            <p className="text-[11px] text-muted-foreground/60 mb-6">
              All responses are sourced from SEC filing documents
            </p>

            {/* Suggested Questions */}
            {suggestionsLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading suggestions...
              </div>
            ) : (
              suggestedQuestions &&
              suggestedQuestions.length > 0 && (
                <div className="w-full max-w-md space-y-2">
                  {suggestedQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(question)}
                      disabled={chatMutation.isPending}
                      className="w-full text-left px-4 py-2.5 rounded-lg border border-border/50 bg-secondary/20 text-sm text-foreground/80 hover:bg-secondary/40 hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-4 p-5">
              {displayMessages.map((msg, index) => {
                const meta = citationMap[index];
                const isExpanded = expandedCitations[index] ?? false;

                return (
                  <div key={index}>
                    <div
                      className={cn(
                        "flex gap-2.5",
                        msg.role === "user"
                          ? "justify-end items-start"
                          : "justify-start items-start"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 shrink-0 mt-0.5 rounded-full bg-primary/10 flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}

                      <div
                        className={cn(
                          "max-w-[85%] rounded-xl px-4 py-2.5",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/30 text-foreground"
                        )}
                      >
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-li:my-0.5 prose-headings:mb-2 prose-headings:mt-3">
                            <Streamdown>
                              {cleanCitationMarkers(msg.content)}
                            </Streamdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        )}
                      </div>

                      {msg.role === "user" && (
                        <div className="w-7 h-7 shrink-0 mt-0.5 rounded-full bg-secondary flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-secondary-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Citations for assistant messages */}
                    {msg.role === "assistant" &&
                      meta &&
                      meta.citations.length > 0 && (
                        <div className="ml-9 mt-2">
                          <button
                            onClick={() => toggleCitation(index)}
                            className="flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            {meta.citations.length} source
                            {meta.citations.length !== 1 ? "s" : ""} cited
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-2">
                              {meta.citations.map((citation, ci) => (
                                <div
                                  key={ci}
                                  className="rounded-lg border border-border/30 bg-secondary/10 p-3"
                                >
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <FileText className="w-3 h-3 text-primary/50" />
                                    <span className="text-[11px] font-semibold text-foreground/80">
                                      {citation.documentName}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      — {citation.sectionLabel}
                                    </span>
                                  </div>
                                  {citation.excerpt && (
                                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                      "{citation.excerpt}"
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                    {/* No documents warning */}
                    {msg.role === "assistant" &&
                      meta &&
                      !meta.hasDocuments && (
                        <div className="ml-9 mt-2 flex items-center gap-1.5 text-[11px] text-amber-400/70">
                          <AlertTriangle className="w-3 h-3" />
                          No filing documents available for this company yet
                        </div>
                      )}
                  </div>
                );
              })}

              {/* Loading indicator */}
              {chatMutation.isPending && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="rounded-xl bg-secondary/30 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary/60" />
                      <span className="text-xs text-muted-foreground">
                        Searching filings...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error state */}
              {chatMutation.isError && (
                <div className="ml-9 flex items-center gap-1.5 text-[11px] text-red-400/80">
                  <AlertTriangle className="w-3 h-3" />
                  Failed to get a response. Please try again.
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Suggested questions after conversation started */}
      {displayMessages.length > 0 &&
        !chatMutation.isPending &&
        suggestedQuestions &&
        suggestedQuestions.length > 0 && (
          <div className="px-5 py-2 border-t border-border/30">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[10px] text-muted-foreground/50 shrink-0">
                Try:
              </span>
              {suggestedQuestions.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="shrink-0 px-3 py-1 rounded-full border border-border/30 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                >
                  {q.length > 50 ? q.substring(0, 47) + "..." : q}
                </button>
              ))}
            </div>
          </div>
        )}

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="flex gap-2 p-4 border-t border-border/50 bg-background/30"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask about ${companyName}'s IPO filing...`}
          className="flex-1 max-h-24 resize-none min-h-9 bg-secondary/20 border-border/30 text-sm"
          rows={1}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || chatMutation.isPending}
          className="shrink-0 h-[38px] w-[38px]"
        >
          {chatMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
