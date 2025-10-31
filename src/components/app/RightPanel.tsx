import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, Trash2 } from "lucide-react";
import type { VideoData } from "@/pages/MainApp";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  relatedKeyframes?: number[];
}

interface RightPanelProps {
  videoData: VideoData | null;
  onTimestampJump: (timestamp: number) => void;
  onHighlightKeyframes: (frameIds: number[]) => void;
}

const RightPanel = ({ videoData, onTimestampJump, onHighlightKeyframes }: RightPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const sessionReady = videoData !== null;

  const suggestedQuestions = [
    "这个视频主要讲什么？",
    "有哪些关键步骤？",
    "视频中讲了哪些重点？",
  ];

  const handleSend = () => {
    if (!input.trim() || !sessionReady) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Mock AI response with timestamp and keyframes
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "在 02:15-03:20 这段详细讲解了编程基础概念...",
        timestamp: 135,
        relatedKeyframes: [2, 3],
      };
      setMessages((prev) => [...prev, aiMessage]);
      
      // Highlight related keyframes
      if (aiMessage.relatedKeyframes) {
        onHighlightKeyframes(aiMessage.relatedKeyframes);
      }
    }, 1000);
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
    <aside className="w-[25%] min-w-[300px] max-w-[400px] border-l border-border bg-card/30 backdrop-blur-sm flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Chat with Video</h3>
        </div>
        
        {sessionReady ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
            会话已就绪
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
            等待视频处理完成
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-4">
          {messages.length === 0 && sessionReady && (
            <div className="text-center text-muted-foreground text-sm py-8">
              开始提问，探索视频内容 💬
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`p-3 max-w-[85%] ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {message.timestamp && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    onClick={() => handleTimestampClick(message.timestamp!)}
                  >
                    🎬 {Math.floor(message.timestamp / 60)}:{String(message.timestamp % 60).padStart(2, '0')}
                  </Button>
                )}
              </Card>
            </div>
          ))}
        </div>
      </ScrollArea>

      {sessionReady && (
        <div className="p-6 border-t border-border space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">💡 推荐问题</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handleQuestionClick(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="输入你的问题..."
              className="flex-1"
            />
            <Button onClick={handleSend} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={handleClearChat}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              清空对话
            </Button>
          )}
        </div>
      )}
    </aside>
  );
};

export default RightPanel;
