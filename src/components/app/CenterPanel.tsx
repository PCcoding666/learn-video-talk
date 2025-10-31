import ProcessingStatus from "@/components/dashboard/ProcessingStatus";
import TimelineNavigator from "./TimelineNavigator";
import KeyframesGallery from "@/components/dashboard/KeyframesGallery";
import SummaryView from "@/components/dashboard/SummaryView";
import TranscriptViewer from "@/components/dashboard/TranscriptViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Image, ScrollText } from "lucide-react";
import type { VideoData } from "@/pages/MainApp";

interface CenterPanelProps {
  processingState: "idle" | "processing" | "completed" | "error";
  videoData: VideoData | null;
  currentTimestamp: number;
  highlightedKeyframes: number[];
  onTimestampJump: (timestamp: number) => void;
}

const CenterPanel = ({ 
  processingState, 
  videoData, 
  currentTimestamp,
  highlightedKeyframes,
  onTimestampJump 
}: CenterPanelProps) => {
  return (
    <main className="flex-1 w-[50%] overflow-y-auto bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto p-8">
        {processingState === "idle" && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-6xl mb-4">🎬</div>
              <h2 className="text-2xl font-bold">开始分析你的视频</h2>
              <p className="text-muted-foreground">
                在左侧输入 YouTube 链接或上传本地视频，让 AI 为你解析视频内容
              </p>
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
      </div>
    </main>
  );
};

export default CenterPanel;
