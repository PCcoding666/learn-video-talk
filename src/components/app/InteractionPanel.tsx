import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Sparkles,
  User,
  Bot,
  X,
  MessageSquare,
  Zap,
  FileSearch,
  Youtube,
  Upload,
  Loader2,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Terminal,
  Radio,
  BookOpen,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import type { VideoData } from "@/pages/MainApp";
import { apiService } from "@/services/api";
import type { SSEChatEvent, SSEToolCallEvent } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import MarkdownRenderer from "@/components/chat/MarkdownRenderer";
import AgentThinkingBubble from "@/components/chat/AgentThinkingBubble";
import { cn } from "@/lib/utils";

type ProcessingState = "idle" | "loading" | "ready" | "error";

export interface ModuleStatus {
  download: "idle" | "running" | "done" | "error";
  transcript: "idle" | "running" | "done" | "error";
  summary: "idle" | "running" | "done" | "error";
}

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

interface InteractionPanelProps {
  processingState: ProcessingState;
  videoData: VideoData | null;
  onStartProcessing: (
    input: string | File,
    type: "youtube" | "upload",
  ) => void;
  onModuleTrigger: (moduleId: string) => Promise<void>;
  onTimestampJump: (timestamp: number) => void;
  onHighlightKeyframes: (frameIds: number[]) => void;
  onDemoClick: (url: string) => void;
  onRetry: () => void;
  moduleStatus: ModuleStatus;
}

// Demo videos for idle state
const demoVideos = [
  {
    id: "tech",
    title: "Tech Review",
    description: "Hardware breakdown",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    icon: Terminal,
    tag: "TECH",
  },
  {
    id: "podcast",
    title: "Podcast",
    description: "Interview clip",
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    icon: Radio,
    tag: "AUDIO",
  },
  {
    id: "tutorial",
    title: "Tutorial",
    description: "Step-by-step",
    url: "https://www.youtube.com/watch?v=9bZkp7q19f0",
    icon: BookOpen,
    tag: "LEARN",
  },
];

const InteractionPanel = ({
  processingState,
  videoData,
  onStartProcessing,
  onModuleTrigger,
  onTimestampJump,
  onHighlightKeyframes,
  onDemoClick,
  onRetry,
  moduleStatus,
}: InteractionPanelProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionVideoId, setSessionVideoId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedKeyframes, setSelectedKeyframes] = useState<
    Array<{ id: number; url: string }>
  >([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Video input state (for idle mode)
  const [inputType, setInputType] = useState<"youtube" | "upload">("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const MAX_KEYFRAMES = 5;
  const sessionReady = sessionId !== null;

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

  // Initialize chat session when video data becomes available
  useEffect(() => {
    if (!videoData || sessionId) return;

    let cancelled = false;
    const initSession = async () => {
      setIsInitializing(true);
      try {
        const response = await apiService.startChatSession({
          video_id: videoData.id,
        });
        if (!cancelled && response.status === "success") {
          setSessionId(response.session_id);
          setSessionVideoId(videoData.id);
        }
      } catch (error: unknown) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Unable to start chat";
        toast({
          variant: "destructive",
          title: "Session Init Failed",
          description: message,
        });
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    };
    initSession();
    return () => {
      cancelled = true;
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
      imageUrls:
        selectedKeyframes.length > 0
          ? selectedKeyframes.map((kf) => kf.url)
          : undefined,
      imageFrameIds:
        selectedKeyframes.length > 0
          ? selectedKeyframes.map((kf) => kf.id)
          : undefined,
    };

    const aiMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
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
          keyframe_ids:
            selectedKeyframes.length > 0
              ? selectedKeyframes.map((kf) => kf.id)
              : undefined,
          top_k: 5,
          auto_keyframes: true,
        },
        (event: SSEChatEvent) => {
          switch (event.type) {
            case "tool_call":
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? {
                        ...msg,
                        toolCalls: updateToolCalls(
                          msg.toolCalls || [],
                          event,
                        ),
                      }
                    : msg,
                ),
              );
              break;
            case "answer_chunk":
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, content: msg.content + event.content }
                    : msg,
                ),
              );
              break;
            case "references":
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? {
                        ...msg,
                        timestamp: event.time_ranges?.[0]?.start_time,
                        relatedKeyframes: event.keyframe_ids,
                      }
                    : msg,
                ),
              );
              if (event.keyframe_ids?.length) {
                onHighlightKeyframes(event.keyframe_ids);
              }
              break;
            case "done":
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, isStreaming: false }
                    : msg,
                ),
              );
              break;
            case "error":
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? {
                        ...msg,
                        content:
                          msg.content ||
                          `Sorry, an error occurred: ${event.error}`,
                        isStreaming: false,
                        toolCalls: [],
                      }
                    : msg,
                ),
              );
              break;
          }
        },
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unable to get response";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content: `Sorry, an error occurred: ${message}`,
                isStreaming: false,
              }
            : msg,
        ),
      );
    } finally {
      setIsSending(false);
      setSelectedKeyframes([]);
    }
  }, [
    input,
    sessionReady,
    isSending,
    sessionId,
    selectedKeyframes,
    onHighlightKeyframes,
  ]);

  const handleRemoveKeyframe = (frameId: number) => {
    setSelectedKeyframes((prev) => prev.filter((kf) => kf.id !== frameId));
  };

  const handleQuestionClick = (question: string) => {
    setInput(question);
  };

  const handleTimestampClick = (timestamp: number) => {
    onTimestampJump(timestamp);
  };

  // Video input handlers
  const handleSubmit = () => {
    if (inputType === "youtube") {
      if (!youtubeUrl.trim()) {
        toast({
          variant: "destructive",
          title: "Missing URL",
          description: "Please enter a YouTube video URL",
        });
        return;
      }
      onStartProcessing(youtubeUrl.trim(), "youtube");
    } else {
      if (!videoFile) {
        toast({
          variant: "destructive",
          title: "No file selected",
          description: "Please select a video file",
        });
        return;
      }
      onStartProcessing(videoFile, "upload");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setVideoFile(e.target.files[0]);
  };

  const handleModuleClick = async (moduleId: string) => {
    try {
      await onModuleTrigger(moduleId);
    } catch {
      // Error handled by parent
    }
  };

  const isSubmitDisabled =
    processingState === "loading" ||
    (inputType === "youtube" ? !youtubeUrl.trim() : !videoFile);

  // =================== RENDER ===================

  // === IDLE STATE: Video Input ===
  if (processingState === "idle") {
    return (
      <div className="flex flex-col h-full bg-card rounded-lg border border-border/60 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6">
            {/* Welcome */}
            <div className="text-center space-y-3">
              <div className="relative mx-auto w-14 h-14">
                <div className="absolute inset-0 bg-primary/5 rounded-lg border border-primary/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-base font-mono font-bold text-foreground tracking-tight">
                  The AI that{" "}
                  <span className="text-primary">sees</span> your videos
                </h2>
                <p className="text-xs text-muted-foreground/70 font-mono leading-relaxed mt-1.5">
                  Paste a URL or upload a video. Ask anything — I understand
                  both speech and visuals.
                </p>
              </div>
            </div>

            {/* Input Form */}
            <div className="space-y-3">
              {/* Segmented Control */}
              <div className="flex p-0.5 bg-muted/50 rounded-md">
                <button
                  onClick={() => setInputType("youtube")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-mono font-medium transition-all ${
                    inputType === "youtube"
                      ? "bg-card text-foreground shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Youtube className="w-3 h-3" />
                  YouTube
                </button>
                <button
                  onClick={() => setInputType("upload")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-mono font-medium transition-all ${
                    inputType === "upload"
                      ? "bg-card text-foreground shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  Upload
                </button>
              </div>

              {/* URL / File input */}
              {inputType === "youtube" ? (
                <div className="space-y-1.5">
                  <Input
                    placeholder="https://youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      !isSubmitDisabled &&
                      handleSubmit()
                    }
                    className="h-10 bg-background text-sm font-mono border-border/60 focus-visible:ring-primary/30 focus-visible:border-primary/50 placeholder:text-muted-foreground/40"
                  />
                  <p className="text-[10px] text-muted-foreground/50 font-mono">
                    YouTube, Bilibili, and other major platforms
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div
                    className={`border border-dashed rounded-md p-4 text-center transition-all ${
                      videoFile
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/60 hover:border-primary/40 cursor-pointer"
                    }`}
                  >
                    <input
                      id="file-upload-interaction"
                      type="file"
                      accept="video/mp4,video/avi,video/mov,video/mkv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="file-upload-interaction"
                      className="cursor-pointer"
                    >
                      <Upload
                        className={`w-5 h-5 mx-auto mb-1.5 ${videoFile ? "text-primary" : "text-muted-foreground/40"}`}
                      />
                      {videoFile ? (
                        <div>
                          <p className="font-mono text-xs font-medium">
                            {videoFile.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                          </p>
                        </div>
                      ) : (
                        <p className="font-mono text-xs text-muted-foreground/60">
                          MP4, AVI, MOV, MKV
                        </p>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Submit */}
              <Button
                className="w-full h-10 text-xs font-mono font-bold gap-2 bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all"
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
              >
                START ANALYSIS
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Demo cards */}
            <div className="pt-2">
              <p className="text-[10px] font-mono text-muted-foreground/40 mb-3 text-center uppercase tracking-widest">
                // try a sample
              </p>
              <div className="grid grid-cols-3 gap-2">
                {demoVideos.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => onDemoClick(demo.url)}
                    className="group relative overflow-hidden rounded-md border border-border/40 bg-background hover:border-primary/40 transition-all duration-150 text-left"
                  >
                    <div className="aspect-[4/3] bg-muted/20 flex flex-col items-center justify-center gap-1.5 relative">
                      <demo.icon className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors duration-150" />
                      <span className="text-[8px] font-mono text-muted-foreground/30 tracking-wider">
                        {demo.tag}
                      </span>
                    </div>
                    <div className="px-2 py-1.5 border-t border-border/30">
                      <p className="font-mono font-medium text-[10px] text-foreground/80 group-hover:text-primary transition-colors flex items-center gap-1">
                        {demo.title}
                        <ChevronRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </p>
                      <p className="text-[9px] font-mono text-muted-foreground/40 mt-0.5">
                        {demo.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === LOADING STATE ===
  if (processingState === "loading") {
    return (
      <div className="flex flex-col h-full bg-card rounded-lg border border-border/60 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-4" />
          <p className="text-muted-foreground font-mono text-xs">
            LOADING_VIDEO...
          </p>
        </div>
      </div>
    );
  }

  // === ERROR STATE ===
  if (processingState === "error") {
    return (
      <div className="flex flex-col h-full bg-card rounded-lg border border-border/60 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-12 h-12 mx-auto rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <span className="text-lg font-mono text-destructive font-bold">
                !
              </span>
            </div>
            <h2 className="text-sm font-mono font-bold text-destructive uppercase">
              Process Failed
            </h2>
            <p className="text-xs font-mono text-muted-foreground/60">
              Error processing video. Check the URL or file and retry.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-mono text-xs border-border/40 hover:border-primary/40 hover:text-primary"
              onClick={onRetry}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              RETRY
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // === READY STATE: Quick Actions + Chat ===
  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border/60 overflow-hidden">
      {/* Quick Actions Bar */}
      <div className="px-4 py-2.5 border-b border-border/40 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3 text-primary" />
            </div>
            <span className="text-[11px] font-mono font-bold text-foreground truncate max-w-[200px]">
              {videoData?.title}
            </span>
          </div>

          {/* Module quick actions */}
          <div className="flex items-center gap-1">
            <QuickActionButton
              label="Download"
              icon={Download}
              status={moduleStatus.download}
              onClick={() => handleModuleClick("download")}
              disabled={moduleStatus.download === "running"}
            />
            <QuickActionButton
              label="Transcribe"
              icon={FileText}
              status={moduleStatus.transcript}
              onClick={() => handleModuleClick("transcript")}
              disabled={moduleStatus.transcript === "running"}
              needsPrereq={
                !videoData?.downloaded &&
                videoData?.source_type === "youtube" &&
                moduleStatus.download !== "done"
              }
            />
            <QuickActionButton
              label="Summary"
              icon={Zap}
              status={moduleStatus.summary}
              onClick={() => handleModuleClick("summary")}
              disabled={moduleStatus.summary === "running"}
              needsPrereq={moduleStatus.transcript !== "done"}
            />
          </div>

          {/* Session status */}
          {sessionReady ? (
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              READY
            </div>
          ) : isInitializing ? (
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              INIT
            </div>
          ) : (
            <div className="w-16 shrink-0" />
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 px-4 py-3" ref={scrollAreaRef}>
        <div className="space-y-4">
          {/* Welcome message when session is ready but no messages yet */}
          {messages.length === 0 && sessionReady && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 bg-muted/30 rounded-lg rounded-tl-sm px-4 py-3 border border-border/30">
                <p className="text-sm text-foreground font-medium mb-2">
                  Video loaded! What would you like to know?
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                    <FileSearch className="w-3.5 h-3.5 text-primary/70" />
                    <span>I can analyze speech, visuals, and context</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                    <MessageSquare className="w-3.5 h-3.5 text-primary/70" />
                    <span>Ask questions or request summaries</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                    <Zap className="w-3.5 h-3.5 text-primary/70" />
                    <span>Use quick actions above for specific tasks</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Initializing state */}
          {messages.length === 0 && !sessionReady && isInitializing && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              </div>
              <div className="flex-1 bg-muted/30 rounded-lg rounded-tl-sm px-4 py-3 border border-border/30">
                <p className="text-xs text-muted-foreground font-mono">
                  Initializing AI session...
                </p>
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((message) => {
            const isUser = message.role === "user";
            const hasToolCalls =
              !isUser && message.toolCalls && message.toolCalls.length > 0;
            const isStreaming = message.isStreaming && !isUser;

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`flex flex-col max-w-[80%] ${isUser ? "items-end" : "items-start"}`}
                >
                  {/* User image attachments */}
                  {isUser && message.imageUrls && message.imageUrls.length > 0 && (
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      {message.imageUrls.map((url, idx) => (
                        <div
                          key={idx}
                          className="rounded overflow-hidden border border-border/40"
                        >
                          <img
                            src={url}
                            alt={`Frame ${idx + 1}`}
                            className="max-w-[80px] max-h-[60px] object-cover"
                          />
                          <div className="bg-muted/50 px-1 py-0 text-[8px] text-muted-foreground text-center font-mono">
                            #{message.imageFrameIds?.[idx]}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tool calls */}
                  {hasToolCalls && (
                    <AgentThinkingBubble toolCalls={message.toolCalls!} />
                  )}

                  {/* Message bubble */}
                  <div
                    className={`rounded-lg px-4 py-3 ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted/30 border border-border/30 rounded-tl-sm"
                    }`}
                  >
                    {isUser ? (
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    ) : isStreaming && message.content ? (
                      <>
                        <MarkdownRenderer content={message.content} />
                        <span className="inline-block w-1 h-4 ml-1 bg-primary animate-pulse" />
                      </>
                    ) : isStreaming && !message.content ? (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50 font-mono py-1">
                        <div className="w-3 h-3 border-[1.5px] border-primary border-t-transparent rounded-full animate-spin" />
                        Thinking...
                      </div>
                    ) : (
                      <MarkdownRenderer content={message.content} />
                    )}
                  </div>

                  {/* Timestamp link */}
                  {!isUser && message.timestamp !== undefined && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-6 text-[10px] font-mono hover:bg-primary/10 text-muted-foreground/60 hover:text-primary transition-colors px-2"
                      onClick={() => handleTimestampClick(message.timestamp!)}
                    >
                      @{" "}
                      {Math.floor(message.timestamp / 60)}:
                      {String(Math.floor(message.timestamp % 60)).padStart(
                        2,
                        "0",
                      )}
                    </Button>
                  )}
                </div>
                {isUser && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-md bg-muted/50 border border-border/30 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      {sessionReady && (
        <div className="px-4 py-3 border-t border-border/40 space-y-2 shrink-0">
          {/* Suggested questions */}
          <div className="flex flex-wrap gap-1.5">
            {suggestedQuestions.map((q, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-[10px] font-mono h-6 px-2.5 border-border/40 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                onClick={() => handleQuestionClick(q)}
                disabled={isSending}
              >
                {q}
              </Button>
            ))}
          </div>

          {/* Keyframe attachments */}
          {selectedKeyframes.length > 0 && (
            <div className="flex flex-wrap gap-1 p-1.5 bg-muted/20 rounded border border-border/30">
              {selectedKeyframes.map((kf) => (
                <div key={kf.id} className="relative group">
                  <img
                    src={kf.url}
                    alt={`#${kf.id}`}
                    className="h-10 rounded border border-primary/40"
                  />
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

          {/* Text input + send */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !isSending &&
                  handleSend()
                }
                placeholder={
                  selectedKeyframes.length > 0
                    ? `Ask about ${selectedKeyframes.length} frame(s)...`
                    : "Ask anything about this video..."
                }
                className="pr-8 bg-background h-9 text-sm font-mono border-border/40 focus-visible:ring-primary/30 focus-visible:border-primary/40 placeholder:text-muted-foreground/30"
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
              className="h-9 w-9 bg-primary hover:bg-primary/90 active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// === Quick Action Button Component ===
interface QuickActionButtonProps {
  label: string;
  icon: React.ElementType;
  status: "idle" | "running" | "done" | "error";
  onClick: () => void;
  disabled?: boolean;
  needsPrereq?: boolean;
}

const QuickActionButton = ({
  label,
  icon: Icon,
  status,
  onClick,
  disabled,
  needsPrereq,
}: QuickActionButtonProps) => {
  const isRunning = status === "running";
  const isDone = status === "done";
  const isError = status === "error";

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled || needsPrereq}
      onClick={onClick}
      className={cn(
        "h-7 px-2.5 gap-1.5 font-mono text-[10px] relative transition-all",
        isDone &&
          "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10",
        isRunning && "text-primary hover:bg-primary/10",
        isError && "text-red-400 hover:text-red-300 hover:bg-red-500/10",
        !isDone &&
          !isRunning &&
          !isError &&
          "text-muted-foreground/70 hover:text-foreground",
        needsPrereq && "opacity-40",
      )}
    >
      {isRunning ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : isDone ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : isError ? (
        <AlertCircle className="w-3 h-3" />
      ) : (
        <Icon className="w-3 h-3" />
      )}
      <span className="hidden sm:inline">{label}</span>
      {isRunning && (
        <span className="absolute -bottom-px left-2 right-2 h-[2px] bg-primary/60 rounded-full animate-pulse" />
      )}
    </Button>
  );
};

// Helper: update tool calls list
function updateToolCalls(
  existing: SSEToolCallEvent[],
  event: SSEToolCallEvent,
): SSEToolCallEvent[] {
  const idx = existing.findIndex(
    (tc) => tc.tool === event.tool && tc.round === event.round,
  );
  if (idx >= 0) {
    const updated = [...existing];
    updated[idx] = event;
    return updated;
  }
  return [...existing, event];
}

export default InteractionPanel;
