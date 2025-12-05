import { Card } from "@/components/ui/card";
import ProcessingStatus from "@/components/dashboard/ProcessingStatus";
import TimelineNavigator from "./TimelineNavigator";
import KeyframesGallery from "@/components/dashboard/KeyframesGallery";
import SummaryView from "@/components/dashboard/SummaryView";
import TranscriptViewer from "@/components/dashboard/TranscriptViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Image, ScrollText, Play, BookOpen, Mic } from "lucide-react";
import type { VideoData } from "@/pages/MainApp";

interface CenterPanelProps {
  processingState: "idle" | "processing" | "completed" | "error";
  videoData: VideoData | null;
  currentTimestamp: number;
  highlightedKeyframes: number[];
  onTimestampJump: (timestamp: number) => void;
  onAskWithKeyframe?: (frameId: number, frameUrl: string) => void;
  onDemoClick?: (url: string) => void;
}

// 示例视频数据
const demoVideos = [
  {
    id: "tech",
    title: "科技新闻",
    description: "AI 最新发展趋势",
    url: "https://www.youtube.com/watch?v=example1",
    icon: BookOpen,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "cooking",
    title: "烹饪教程",
    description: "5分钟快手菜谱",
    url: "https://www.youtube.com/watch?v=example2",
    icon: Mic,
    color: "from-orange-500 to-red-500",
  },
  {
    id: "ted",
    title: "TED 演讲",
    description: "思想改变世界",
    url: "https://www.youtube.com/watch?v=example3",
    icon: Play,
    color: "from-purple-500 to-pink-500",
  },
];

const CenterPanel = ({ 
  processingState, 
  videoData, 
  currentTimestamp,
  highlightedKeyframes,
  onTimestampJump,
  onAskWithKeyframe,
  onDemoClick
}: CenterPanelProps) => {
  return (
    <main className="flex-1 w-[50%] overflow-y-auto">
      <Card className="h-full p-6 shadow-sm bg-card">
        {processingState === "idle" && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center space-y-6 max-w-lg">
              {/* 主图标 */}
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-pulse" />
                <div className="absolute inset-2 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                  <Play className="w-10 h-10 text-primary-foreground ml-1" />
                </div>
              </div>
              
              {/* 标题和描述 */}
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">开始分析你的视频</h2>
                <p className="text-muted-foreground">
                  在左侧输入 YouTube 链接或上传本地视频，让 AI 为你解析视频内容
                </p>
              </div>
              
              {/* 示例视频卡片 */}
              <div className="pt-6">
                <p className="text-sm text-muted-foreground mb-4">或者试试分析这些视频：</p>
                <div className="grid grid-cols-3 gap-3">
                  {demoVideos.map((demo) => (
                    <button
                      key={demo.id}
                      onClick={() => onDemoClick?.(demo.url)}
                      className="group p-4 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 text-left"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${demo.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                        <demo.icon className="w-5 h-5 text-white" />
                      </div>
                      <p className="font-medium text-sm text-foreground">{demo.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{demo.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {processingState === "processing" && (
          <ProcessingStatus />
        )}

        {processingState === "completed" && videoData && (
          <div className="space-y-6">
            <TimelineNavigator 
              keyframes={videoData.keyframes}
              duration={videoData.duration}
              currentTimestamp={currentTimestamp}
              onTimestampClick={onTimestampJump}
            />
            
            <Tabs defaultValue="keyframes" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="keyframes" className="gap-2">
                  <Image className="w-4 h-4" />
                  关键帧
                </TabsTrigger>
                <TabsTrigger value="summary" className="gap-2">
                  <FileText className="w-4 h-4" />
                  内容总结
                </TabsTrigger>
                <TabsTrigger value="transcript" className="gap-2">
                  <ScrollText className="w-4 h-4" />
                  转录文本
                </TabsTrigger>
              </TabsList>

              <TabsContent value="keyframes">
                <KeyframesGallery 
                  keyframes={videoData.keyframes}
                  highlightedKeyframes={highlightedKeyframes}
                  onTimestampClick={onTimestampJump}
                  onAskWithKeyframe={onAskWithKeyframe}
                />
              </TabsContent>

              <TabsContent value="summary">
                <SummaryView videoData={videoData} />
              </TabsContent>

              <TabsContent value="transcript">
                <TranscriptViewer transcript={videoData.transcript} />
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        {processingState === "error" && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <span className="text-4xl">❌</span>
              </div>
              <h2 className="text-xl font-semibold text-destructive">处理失败</h2>
              <p className="text-muted-foreground">
                视频处理过程中出现错误，请检查视频链接或文件后重试
              </p>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
};

export default CenterPanel;