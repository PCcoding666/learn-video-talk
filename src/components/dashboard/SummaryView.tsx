import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Download, FileDown } from "lucide-react";

interface SummaryViewProps {
  videoData: any;
}

const SummaryView = ({ videoData }: SummaryViewProps) => {
  const keyPoints = [
    "选择一门适合初学者的编程语言(如 Python)",
    "建立扎实的基础知识体系",
    "通过实际项目练习巩固所学",
    "加入开发者社区获取帮助",
    "保持持续学习和更新知识",
  ];

  return (
    <div className="space-y-6">
      {/* Key Points */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>🎯</span>
          核心观点
        </h3>
        <div className="space-y-3">
          {keyPoints.map((point, index) => (
            <div
              key={index}
              className="flex gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <span className="text-primary font-semibold">•</span>
              <p className="flex-1">{point}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Detailed Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>📚</span>
            详细总结
          </h3>
          <Button variant="ghost" size="sm" className="gap-2">
            <Copy className="w-4 h-4" />
            复制
          </Button>
        </div>
        <div className="prose prose-sm max-w-none">
          <p className="text-foreground/90 leading-relaxed">
            这个视频详细介绍了学习编程的完整路径。首先强调了选择合适编程语言的重要性，推荐初学者从Python开始。
            视频中讲解了如何建立系统化的学习计划，包括理论学习和实践项目的平衡。特别强调了通过实际项目来巩固所学知识的必要性。
            同时建议加入开发者社区，通过与他人交流来加速学习进程。最后提醒学习者要保持持续学习的态度，
            因为技术领域日新月异，需要不断更新自己的知识体系。
          </p>
        </div>
      </Card>

      {/* Video Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📊</span>
          视频信息
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl mb-2">🕐</div>
            <p className="text-sm text-muted-foreground mb-1">时长</p>
            <p className="font-semibold">{videoData.duration}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl mb-2">👁️</div>
            <p className="text-sm text-muted-foreground mb-1">分辨率</p>
            <p className="font-semibold">1080p</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl mb-2">💾</div>
            <p className="text-sm text-muted-foreground mb-1">文件大小</p>
            <p className="font-semibold">45.2 MB</p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="outline" className="flex-1 gap-2">
          <Download className="w-4 h-4" />
          下载原视频
        </Button>
        <Button variant="outline" className="flex-1 gap-2">
          <FileDown className="w-4 h-4" />
          导出总结为 MD
        </Button>
      </div>
    </div>
  );
};

export default SummaryView;
