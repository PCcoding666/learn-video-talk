import VideoInputPanel from "@/components/dashboard/VideoInputPanel";
import HistoryPanel from "@/components/dashboard/HistoryPanel";

interface LeftPanelProps {
  onStartProcessing: (input: string | File, type: "youtube" | "upload") => void;
  processingState: "idle" | "processing" | "completed" | "error";
  onVideoSelect?: (videoId: string) => void;
}

const LeftPanel = ({ onStartProcessing, processingState, onVideoSelect }: LeftPanelProps) => {
  return (
    <aside className="w-[280px] flex-shrink-0 flex flex-col gap-2">
      {/* Video Input */}
      <div className="bg-card rounded-lg border border-border/60 p-4">
        <VideoInputPanel 
          onStartProcessing={onStartProcessing}
          disabled={processingState === "processing"}
        />
      </div>
      
      {/* History */}
      <div className="bg-card rounded-lg border border-border/60 p-4 flex-1 min-h-0">
        <HistoryPanel onVideoSelect={onVideoSelect} />
      </div>
    </aside>
  );
};

export default LeftPanel;
