import VideoInputPanel from "@/components/dashboard/VideoInputPanel";
import HistoryPanel from "@/components/dashboard/HistoryPanel";

interface LeftPanelProps {
  onStartProcessing: (input: string | File, type: "youtube" | "upload") => void;
  processingState: "idle" | "processing" | "completed" | "error";
  onVideoSelect?: (videoId: string) => void;
}

const LeftPanel = ({ onStartProcessing, processingState, onVideoSelect }: LeftPanelProps) => {
  return (
    <aside className="w-[25%] min-w-[300px] max-w-[400px] border-r border-border bg-card/30 backdrop-blur-sm overflow-y-auto">
      <div className="p-6 space-y-6">
        <VideoInputPanel 
          onStartProcessing={onStartProcessing}
          disabled={processingState === "processing"}
        />
        <HistoryPanel onVideoSelect={onVideoSelect} />
      </div>
    </aside>
  );
};

export default LeftPanel;
