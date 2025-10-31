import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";

const mockKeyframes = [
  { id: 1, timestamp: "00:15", description: "课程介绍" },
  { id: 2, timestamp: "01:23", description: "编程语言对比" },
  { id: 3, timestamp: "02:45", description: "学习路径图" },
  { id: 4, timestamp: "03:56", description: "实践项目推荐" },
  { id: 5, timestamp: "04:30", description: "社区资源" },
  { id: 6, timestamp: "05:10", description: "总结回顾" },
];

const KeyframesGallery = () => {
  return (
    <div className="grid grid-cols-3 gap-6">
      {mockKeyframes.map((frame) => (
        <Card
          key={frame.id}
          className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl opacity-50">🎬</span>
            </div>
            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {frame.timestamp}
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm font-medium group-hover:text-primary transition-colors">
              {frame.description}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default KeyframesGallery;
