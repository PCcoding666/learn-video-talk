import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, PlayCircle } from "lucide-react";

const mockHistory = [
  { id: 1, title: "如何学习编程 - 完整教程", time: "2分钟前", duration: "5:23" },
  { id: 2, title: "AI 技术解析", time: "1小时前", duration: "12:45" },
  { id: 3, title: "产品设计思维", time: "3小时前", duration: "8:15" },
];

const HistoryPanel = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <span>📚</span>
        最近处理
      </h3>

      <ScrollArea className="h-[300px]">
        <div className="space-y-3">
          {mockHistory.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-lg bg-card hover:bg-accent/50 border border-border cursor-pointer transition-all hover:shadow-md group"
            >
              <div className="flex items-start gap-3">
                <PlayCircle className="w-5 h-5 text-primary mt-0.5 group-hover:scale-110 transition-transform" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-2 mb-1">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{item.time}</span>
                    <span>·</span>
                    <span>{item.duration}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Button variant="outline" className="w-full" size="sm">
        查看全部历史
      </Button>
    </div>
  );
};

export default HistoryPanel;
