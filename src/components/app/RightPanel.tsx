import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, User, Bot, X, MessageSquare, Zap, FileSearch, Video } from "lucide-react";
import type { VideoData } from "@/pages/MainApp";
import { apiService } from "@/services/api";
import type { SSEChatEvent, SSEToolCallEvent } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import StreamingMessage from "@/components/chat/StreamingMessage";
import MarkdownRenderer from "@/components/chat/MarkdownRenderer";
import AgentThinkingBubble from "@/components/chat/AgentThinkingBubble";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  relatedKeyframes?: number[];
  imageUrls?: string[];
  imageFrameIds?: number[];
  toolCalls?: SSEToolCallEvent[];
  isStreaming?: boolean;
}

interface RightPanelProps {
  videoData: VideoData | null;
  onTimestampJump: (timestamp: number) => void;
  onHighlightKeyframes: (frameIds: number[]) => void;
  selectedKeyframe?: { id: number; url: string } | null;
  onKeyframeUsed?: () => void;
}

const RightPanel = ({ 
  videoData, 
  onTimestampJump, 
  onHighlightKeyframes, 
  selectedKeyframe,
  onKeyframeUsed
}: RightPanelProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionVideoId, setSessionVideoId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedKeyframes, setSelectedKeyframes] = useState<Array<{ id: number; url: string }>>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const MAX_KEYFRAMES = 5;
  const sessionReady = sessionId !== null;

  const selectedKeyframesRef = useRef(selectedKeyframes);
  selectedKeyframesRef.current = selectedKeyframes;

  // Reset chat session when video changes
  useEffect(() => {
    if (videoData?.id && videoData.id !== sessionVideoId) {
      setSessionId(null);
      setSessionVideoId(null);
      setMessages([]);
      setSelectedKeyframes([]);
      setInput("");
    }
  }, [videoData?.id, sessionVideoId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Handle keyframe selection from external prop
  useEffect(() => {
    if (!selectedKeyframe) return;

    const current = selectedKeyframesRef.current;
    
    if (current.length >= MAX_KEYFRAMES) {
      toast({
        variant: "destructive",
        title: t("chat.keyframeLimit"),
        description: t("chat.keyframeLimitDesc", { max: MAX_KEYFRAMES }),
      });
      return;
    }
    
    if (current.some(kf => kf.id === selectedKeyframe.id)) {
      toast({
        title: t("chat.keyframeSelected"),
        description: t("chat.keyframeSelectedDesc", { id: selectedKeyframe.id }),
      });
      return;
    }
    
    setSelectedKeyframes(prev => [...prev, selectedKeyframe]);
    if (current.length === 0) {
      setInput(t("chat.analyzePrompt"));
    }
    toast({
      title: t("chat.keyframeAdded"),
      description: t("chat.keyframeAddedDesc", { current: current.length + 1, max: MAX_KEYFRAMES }),
    });
  }, [selectedKeyframe, toast, t]);
  
  // Initialize chat session when video data becomes available
  useEffect(() => {
    if (!videoData || sessionId) return;

    let cancelled = false;
    const abortController = new AbortController();

    const initSession = async () => {
      setIsInitializing(true);
      try {
        const response = await apiService.startChatSession({
          video_id: videoData.id
        });

        if (!cancelled && response.status === "success") {
          setSessionId(response.session_id);
          setSessionVideoId(videoData.id);
          console.log("Chat session initialized:", response.session_id, "for video:", videoData.id);
        }
      } catch (error: unknown) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Unable to start chat";
        console.error("Chat session init failed:", error);
        toast({
          variant: "destructive",
          title: "Session Init Failed",
          description: message,
        });
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    };

    initSession();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [videoData, sessionId, toast]);

  const suggestedQuestions = [
    "What's the main topic?",
    "Key takeaways?",
    "Summarize briefly",
  ];

  const handleSend = useCallback(async () => {
    if (!input.trim() || !sessionReady || isSending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      imageUrls: selectedKeyframes.length > 0 ? selectedKeyframes.map(kf => kf.url) : undefined,
      imageFrameIds: selectedKeyframes.length > 0 ? selectedKeyframes.map(kf => kf.id) : undefined,
    };

    const aiMessageId = (Date.now() + 1).toString();

    setMessages(prev => [
      ...prev,
      userMessage,
      {
        id: aiMessageId,
        role: "assistant",
        content: "",
        toolCalls: [],
        isStreaming: true,
      },
    ]);
    setInput("");
    setIsSending(true);

    try {
      await apiService.sendChatMessageSSE(
        {
          session_id: sessionId!,
          question: userMessage.content,
          keyframe_ids: selectedKeyframes.length > 0 ? selectedKeyframes.map(kf => kf.id) : undefined,
          top_k: 5,
          auto_keyframes: true,
        },
        (event: SSEChatEvent) => {
          switch (event.type) {
            case "tool_call":
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === aiMessageId
                    ? {
                        ...msg,
                        toolCalls: updateToolCalls(msg.toolCalls || [], event),
                      }
                    : msg
                )
              );
              break;

            case "answer_chunk":
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === aiMessageId
                    ? { ...msg, content: msg.content + event.content }
                    : msg
                )
              );
              break;

            case "references":
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === aiMessageId
                    ? {
                        ...msg,
                        timestamp: event.time_ranges?.[0]?.start_time,
                        relatedKeyframes: event.keyframe_ids,
                      }
                    : msg
                )
              );
              if (event.keyframe_ids && event.keyframe_ids.length > 0) {
                onHighlightKeyframes(event.keyframe_ids);
              }
              break;

            case "done":
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === aiMessageId
                    ? { ...msg, isStreaming: false }
                    : msg
                )
              );
              break;

            case "error":
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === aiMessageId
                    ? {
                        ...msg,
                        content: msg.content || `Sorry, an error occurred: ${event.error}`,
                        isStreaming: false,
                        toolCalls: [],
                      }
                    : msg
                )
              );
              break;

            default:
              break;
          }
        }
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unable to get response";
      console.error("Chat message SSE failed:", error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId
            ? { ...msg, content: `Sorry, an error occurred: ${message}`, isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsSending(false);
      setSelectedKeyframes([]);
      onKeyframeUsed?.();
    }
  }, [input, sessionReady, isSending, sessionId, selectedKeyframes, onHighlightKeyframes, onKeyframeUsed]);

  const handleRemoveKeyframe = (frameId: number) => {
    setSelectedKeyframes(prev => prev.filter(kf => kf.id !== frameId));
  };

  const handleQuestionClick = (question: string) => {
    setInput(question);
  };

  const handleTimestampClick = (timestamp: number) => {
    onTimestampJump(timestamp);
  };

  return (
    <aside className="w-[300px] flex-shrink-0 flex flex-col">
      <div className="flex-1 flex flex-col bg-card rounded-lg border border-border/60 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold text-foreground">AI_AGENT</h3>
                <p className="text-[9px] font-mono text-muted-foreground/60">ReAct video assistant</p>
              </div>
            </div>
            {sessionReady ? (
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                READY
              </div>
            ) : isInitializing ? (
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                INIT
              </div>
            ) : null}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-3 py-3" ref={scrollAreaRef}>
          <div className="space-y-3">
            {/* Welcome */}
            {!sessionReady && !isInitializing && (
              <div className="flex gap-2.5">
                <div className="flex-shrink-0 w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Bot className="w-3 h-3 text-primary" />
                </div>
                <div className="flex-1 bg-muted/30 rounded-md rounded-tl-sm px-3 py-2.5 border border-border/30">
                  <p className="text-xs text-foreground font-medium mb-2">
                    Video assistant ready.
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                      <FileSearch className="w-3 h-3 text-primary/70" />
                      <span>Summaries & insights</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                      <MessageSquare className="w-3 h-3 text-primary/70" />
                      <span>Q&A over content</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                      <Zap className="w-3 h-3 text-primary/70" />
                      <span>Key point extraction</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/20 flex items-center gap-1.5 text-[9px] text-muted-foreground/50 font-mono">
                    <Video className="w-3 h-3" />
                    Paste a URL to start
                  </div>
                </div>
              </div>
            )}
            
            {/* Session ready empty */}
            {messages.length === 0 && sessionReady && (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 border border-primary/20 mb-2">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <p className="text-[10px] text-muted-foreground/60 font-mono">Session active. Ask a question.</p>
              </div>
            )}
            
            {/* Messages */}
            {messages.map((message) => {
              const isUser = message.role === "user";
              const hasToolCalls = !isUser && message.toolCalls && message.toolCalls.length > 0;
              const isStreaming = message.isStreaming && !isUser;
              
              return (
                <div key={message.id} className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Bot className="w-3 h-3 text-primary" />
                    </div>
                  )}
                  
                  <div className={`flex flex-col max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
                    {isUser && message.imageUrls && message.imageUrls.length > 0 && (
                      <div className="mb-1.5 flex flex-wrap gap-1">
                        {message.imageUrls.map((url, idx) => (
                          <div key={idx} className="rounded overflow-hidden border border-border/40">
                            <img src={url} alt={`Frame ${idx + 1}`} className="max-w-[80px] max-h-[60px] object-cover" />
                            <div className="bg-muted/50 px-1 py-0 text-[8px] text-muted-foreground text-center font-mono">#{message.imageFrameIds?.[idx]}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Agent tool calls bubble */}
                    {hasToolCalls && (
                      <AgentThinkingBubble toolCalls={message.toolCalls!} />
                    )}
                    
                    <div className={`rounded-md px-3 py-2 ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted/30 border border-border/30 rounded-tl-sm"
                    }`}>
                      {isUser ? (
                        <p className="text-xs whitespace-pre-wrap">{message.content}</p>
                      ) : isStreaming && message.content ? (
                        <>
                          <MarkdownRenderer content={message.content} />
                          <span className="inline-block w-1 h-4 ml-1 bg-primary animate-pulse" />
                        </>
                      ) : isStreaming && !message.content ? (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50 font-mono py-1">
                          <div className="w-3 h-3 border-[1.5px] border-primary border-t-transparent rounded-full animate-spin" />
                          Thinking...
                        </div>
                      ) : (
                        <MarkdownRenderer content={message.content} />
                      )}
                    </div>
                    
                    {!isUser && message.timestamp !== undefined && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-6 text-[10px] font-mono hover:bg-primary/10 text-muted-foreground/60 hover:text-primary transition-colors px-2"
                        onClick={() => handleTimestampClick(message.timestamp!)}
                      >
                        @ {Math.floor(message.timestamp / 60)}:{String(Math.floor(message.timestamp % 60)).padStart(2, '0')}
                      </Button>
                    )}
                  </div>
                  
                  {isUser && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-md bg-muted/50 border border-border/30 flex items-center justify-center">
                      <User className="w-3 h-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        {sessionReady && (
          <div className="px-3 py-3 border-t border-border/40 space-y-2">
            <div className="flex flex-wrap gap-1">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-[10px] font-mono h-6 px-2 border-border/40 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                  onClick={() => handleQuestionClick(q)}
                  disabled={isSending}
                >
                  {q}
                </Button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              {selectedKeyframes.length > 0 && (
                <div className="flex flex-wrap gap-1 p-1.5 bg-muted/20 rounded border border-border/30">
                  {selectedKeyframes.map((kf) => (
                    <div key={kf.id} className="relative group">
                      <img src={kf.url} alt={`#${kf.id}`} className="h-10 rounded border border-primary/40" />
                      <button
                        onClick={() => handleRemoveKeyframe(kf.id)}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-3.5 h-3.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    </div>
                  ))}
                  <span className="text-[8px] font-mono text-muted-foreground/50 self-center px-1">
                    {selectedKeyframes.length}/{MAX_KEYFRAMES}
                  </span>
                </div>
              )}
              
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !isSending && handleSend()}
                    placeholder={selectedKeyframes.length > 0 ? `Ask about ${selectedKeyframes.length} frame(s)...` : "Ask anything..."}
                    className="pr-8 bg-background h-8 text-xs font-mono border-border/40 focus-visible:ring-primary/30 focus-visible:border-primary/40 placeholder:text-muted-foreground/30"
                    disabled={isSending}
                  />
                  {isSending && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleSend} 
                  size="icon"
                  disabled={isSending || !input.trim()}
                  className="h-8 w-8 bg-primary hover:bg-primary/90 active:scale-95 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

// Helper: update tool calls list with a new event (upsert by tool+round)
function updateToolCalls(
  existing: SSEToolCallEvent[],
  event: SSEToolCallEvent,
): SSEToolCallEvent[] {
  const idx = existing.findIndex(
    tc => tc.tool === event.tool && tc.round === event.round,
  );
  if (idx >= 0) {
    const updated = [...existing];
    updated[idx] = event;
    return updated;
  }
  return [...existing, event];
}

export default RightPanel;
