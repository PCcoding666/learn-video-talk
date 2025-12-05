import { Card } from "@/components/ui/card";
import VideoInputPanel from "@/components/dashboard/VideoInputPanel";
import HistoryPanel from "@/components/dashboard/HistoryPanel";

interface LeftPanelProps {
  onStartProcessing: (input: string | File, type: "youtube" | "upload") => void;
  processingState: "idle" | "processing" | "completed" | "error";
  onVideoSelect?: (videoId: string) => void;
}

const LeftPanel = ({ onStartProcessing, processingState, onVideoSelect }: LeftPanelProps) => {
  return (
    <aside className="w-[25%] min-w-[300px] max-w-[400px] flex flex-col gap-4 overflow-y-auto">
      {/* 视频输入卡片 */}
      <Card className="p-5 shadow-sm bg-card">
        <VideoInputPanel 
          onStartProcessing={onStartProcessing}
          disabled={processingState === "processing"}
        />
      </Card>
      
      {/* 历史记录卡片 */}
      <Card className="p-5 shadow-sm bg-card flex-1">
        <HistoryPanel onVideoSelect={onVideoSelect} />
      </Card>
    </aside>
  );
};

export default LeftPanel;