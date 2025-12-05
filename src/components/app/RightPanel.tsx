import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Trash2, StopCircle, User, Bot, X, MessageSquare, Zap, FileSearch } from "lucide-react";
import type { VideoData } from "@/pages/MainApp";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import StreamingMessage from "@/components/chat/StreamingMessage";
import MarkdownRenderer from "@/components/chat/MarkdownRenderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  relatedKeyframes?: number[];
  imageUrls?: string[];
  imageFrameIds?: number[];
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
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [selectedKeyframes, setSelectedKeyframes] = useState<Array<{ id: number; url: string }>>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const MAX_KEYFRAMES = 5;
  const sessionReady = sessionId !== null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  useEffect(() => {
    if (selectedKeyframe) {
      if (selectedKeyframes.length >= MAX_KEYFRAMES) {
        toast({
          variant: "destructive",
          title: "已达上限",
          description: `最多只能选择 ${MAX_KEYFRAMES} 张关键帧`,
        });
        return;
      }
      
      if (selectedKeyframes.some(kf => kf.id === selectedKeyframe.id)) {
        toast({
          title: "已选择",
          description: `关键帧 #${selectedKeyframe.id} 已在选择列表中`,
        });
        return;
      }
      
      setSelectedKeyframes(prev => [...prev, selectedKeyframe]);
      if (selectedKeyframes.length === 0) {
        setInput("请分析这些场景的内容");
      }
      toast({
        title: "关键帧已添加",
        description: `已选中 ${selectedKeyframes.length + 1}/${MAX_KEYFRAMES} 张关键帧`,
      });
    }
  }, [selectedKeyframe]);
  
  useEffect(() => {
    if (videoData && !sessionId) {
      initializeChatSession();
    }
  }, [videoData]);

  const initializeChatSession = async () => {
    if (!videoData || isInitializing) return;
    
    setIsInitializing(true);
    try {
      const response = await apiService.startChatSession({
        video_id: videoData.id
      });

      if (response.status === "success") {
        setSessionId(response.session_id);
        console.log("✅ 聊天会话已初始化:", response.session_id);
      }
    } catch (error: any) {
      console.error("聊天会话初始化失败:", error);
      toast({
        variant: "destructive",
        title: "会话初始化失败",
        description: error.message || "无法启动聊天功能",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const suggestedQuestions = [
    "这个视频主要讲什么？",
    "有哪些关键步骤？",
    "视频中讲了哪些重点？",
  ];

  const handleSend = async () => {
    if (!input.trim() || !sessionReady || isSending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      imageUrls: selectedKeyframes.length > 0 ? selectedKeyframes.map(kf => kf.url) : undefined,
      imageFrameIds: selectedKeyframes.length > 0 ? selectedKeyframes.map(kf => kf.id) : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    const aiMessageId = (Date.now() + 1).toString();
    const placeholderMessage: Message = {
      id: aiMessageId,
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, placeholderMessage]);
    setStreamingMessageId(aiMessageId);

    try {
      const response = await apiService.sendChatMessage({
        session_id: sessionId!,
        question: userMessage.content,
        keyframe_ids: selectedKeyframes.length > 0 ? selectedKeyframes.map(kf => kf.id) : undefined,
        top_k: 5,
        auto_keyframes: false,
      });

      if (response.status === "success") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? {
                  ...msg,
                  content: response.answer,
                  timestamp:
                    response.references?.time_ranges?.[0]?.start_time,
                  relatedKeyframes: response.references?.keyframe_ids,
                }
              : msg
          )
        );

        if (response.references?.keyframe_ids && response.references.keyframe_ids.length > 0) {
          onHighlightKeyframes(response.references.keyframe_ids);
        }

        setTimeout(() => {
          setStreamingMessageId(null);
        }, response.answer.length * 20 + 500);
      }
    } catch (error: any) {
      console.error("发送消息失败:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content: `❌ 抱歉，发生错误: ${error.message || '无法获取回答'}`,
              }
            : msg
        )
      );
      setStreamingMessageId(null);
    } finally {
      setIsSending(false);
      setSelectedKeyframes([]);
      onKeyframeUsed?.();
    }
  };

  const handleRemoveKeyframe = (frameId: number) => {
    setSelectedKeyframes(prev => prev.filter(kf => kf.id !== frameId));
  };

  const handleQuestionClick = (question: string) => {
    setInput(question);
  };

  const handleTimestampClick = (timestamp: number) => {
    onTimestampJump(timestamp);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <aside className="w-[25%] min-w-[300px] max-w-[400px] flex flex-col">
      <Card className="flex-1 flex flex-col shadow-sm bg-card overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-base font-medium text-foreground">AI 助手</h3>
              <p className="text-xs text-muted-foreground">与视频内容对话</p>
            </div>
          </div>
          
          {sessionReady ? (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
              <span className="font-medium">就绪</span>
            </div>
          ) : isInitializing ? (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="font-medium">初始化中...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span>等待视频处理</span>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4 py-6" ref={scrollAreaRef}>
          <div className="space-y-6">
            {/* 欢迎消息 - 未处理视频时显示 */}
            {!sessionReady && !isInitializing && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm max-w-[85%]">
                    <p className="text-sm text-foreground">
                      👋 嗨！我是你的视频助手。
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      上传视频后，我可以帮你：
                    </p>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileSearch className="w-4 h-4 text-primary" />
                        <span>总结视频摘要</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <span>回答相关问题</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Zap className="w-4 h-4 text-primary" />
                        <span>提取关键信息</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 会话就绪但无消息时的提示 */}
            {messages.length === 0 && sessionReady && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
                  <Bot className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">开始提问，探索视频内容</p>
              </div>
            )}
            
            {messages.map((message) => {
              const isUser = message.role === "user";
              const isStreaming = streamingMessageId === message.id;
              
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary-foreground" />
                    </div>
                  )}
                  
                  <div className={`flex flex-col max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
                    {isUser && message.imageUrls && message.imageUrls.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {message.imageUrls.map((url, idx) => (
                          <div key={idx} className="rounded-lg overflow-hidden border border-border shadow-sm">
                            <img 
                              src={url} 
                              alt={`关键帧 ${idx + 1}`}
                              className="max-w-[120px] max-h-[90px] object-cover"
                            />
                            <div className="bg-muted px-2 py-1 text-xs text-muted-foreground text-center">
                              帧 #{message.imageFrameIds?.[idx]}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        isUser
                          ? "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg"
                          : "bg-card border border-border shadow-sm"
                      }`}
                    >
                      {isUser ? (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      ) : isStreaming ? (
                        <StreamingMessage content={message.content} isStreaming={true} speed={15} />
                      ) : (
                        <MarkdownRenderer content={message.content} />
                      )}
                    </div>
                    
                    {!isUser && message.timestamp !== undefined && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-8 text-xs hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => handleTimestampClick(message.timestamp!)}
                      >
                        <span className="mr-1">🎬</span>
                        跳转到 {Math.floor(message.timestamp / 60)}:{String(Math.floor(message.timestamp % 60)).padStart(2, '0')}
                      </Button>
                    )}
                  </div>
                  
                  {isUser && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
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
          <div className="p-4 border-t border-border space-y-4">
            {/* 推荐问题 */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">💡 快速提问</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 hover:bg-primary/10 hover:text-primary hover:border-primary transition-all"
                    onClick={() => handleQuestionClick(q)}
                    disabled={isSending}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>

            {/* 输入框 */}
            <div className="flex flex-col gap-2">
              {selectedKeyframes.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
                  {selectedKeyframes.map((kf) => (
                    <div key={kf.id} className="relative group">
                      <img 
                        src={kf.url} 
                        alt={`关键帧 #${kf.id}`}
                        className="h-16 rounded border-2 border-primary"
                      />
                      <button
                        onClick={() => handleRemoveKeyframe(kf.id)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-destructive/90 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 text-center">
                        #{kf.id}
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground self-center px-2">
                    {selectedKeyframes.length}/{MAX_KEYFRAMES}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !isSending && handleSend()}
                    placeholder={selectedKeyframes.length > 0 ? `输入关于这 ${selectedKeyframes.length} 张图片的问题...` : "输入你的问题..."}
                    className="pr-10 bg-background h-11"
                    disabled={isSending}
                  />
                  {isSending && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <Button 
                  onClick={handleSend} 
                  size="icon"
                  disabled={isSending || !input.trim()}
                  className="h-11 w-11 bg-gradient-to-br from-primary to-accent hover:opacity-90 hover:scale-105 transition-all"
                >
                  {isSending ? (
                    <StopCircle className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* 清除对话 */}
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={handleClearChat}
                disabled={isSending}
              >
                <Trash2 className="w-3 h-3 mr-2" />
                清除对话
              </Button>
            )}
          </div>
        )}
      </Card>
    </aside>
  );
};

export default RightPanel;