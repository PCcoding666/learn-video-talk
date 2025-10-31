import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Copy, Search } from "lucide-react";

const mockTranscript = [
  {
    timestamp: "00:00:00 - 00:00:15",
    speaker: null,
    text: "大家好，今天我们来讨论如何学习编程。这是一个非常重要的话题，特别是对于初学者来说。",
  },
  {
    timestamp: "00:00:15 - 00:00:32",
    speaker: "说话人 A",
    text: "首先，选择一门适合初学者的语言非常重要。我个人推荐从 Python 开始，因为它的语法简洁，容易理解。",
  },
  {
    timestamp: "00:00:32 - 00:00:50",
    speaker: "说话人 A",
    text: "其次，要建立系统化的学习计划。不要盲目地跟随教程，而是要理解每个概念背后的原理。",
  },
  {
    timestamp: "00:00:50 - 00:01:15",
    speaker: "说话人 B",
    text: "实践非常重要！光看理论是不够的，一定要动手写代码。可以从小项目开始，比如制作一个简单的计算器。",
  },
];

const TranscriptViewer = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索转录内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Copy className="w-4 h-4" />
          复制全文
        </Button>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-6">
          {mockTranscript.map((item, index) => (
            <div
              key={index}
              className="group hover:bg-muted/30 p-4 rounded-lg transition-colors"
            >
              <div className="flex items-start gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-primary shrink-0"
                >
                  {item.timestamp}
                </Button>
                <div className="flex-1">
                  {item.speaker && (
                    <p className="text-xs font-semibold text-primary mb-2">
                      {item.speaker}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{item.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default TranscriptViewer;
