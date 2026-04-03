import { Button } from "@/components/ui/button";
import { Play, Terminal, Radio, BookOpen, RefreshCw, ChevronRight } from "lucide-react";

interface CenterPanelProps {
  processingState: "idle" | "error";
  videoData: null;  // CenterPanel 现在只用于 idle/error 状态，不再展示视频数据
  currentTimestamp: number;
  highlightedKeyframes: number[];
  onTimestampJump: (timestamp: number) => void;
  onAskWithKeyframe?: (frameId: number, frameUrl: string) => void;
  onDemoClick?: (url: string) => void;
  onRetry?: () => void;
}

const demoVideos = [
  {
    id: "tech",
    title: "Tech Review",
    description: "Hardware breakdown",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    icon: Terminal,
    tag: "TECH",
  },
  {
    id: "podcast",
    title: "Podcast",
    description: "Interview clip",
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    icon: Radio,
    tag: "AUDIO",
  },
  {
    id: "tutorial",
    title: "Tutorial",
    description: "Step-by-step",
    url: "https://www.youtube.com/watch?v=9bZkp7q19f0",
    icon: BookOpen,
    tag: "LEARN",
  },
];

const CenterPanel = ({ 
  processingState, 
  onDemoClick,
  onRetry
}: CenterPanelProps) => {
  return (
    <main className="flex-1 min-w-0">
      <div className="h-full bg-card rounded-lg border border-border/60 p-4 overflow-y-auto">
        {processingState === "idle" && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center space-y-6 max-w-sm">
              {/* Icon */}
              <div className="relative mx-auto w-14 h-14">
                <div className="absolute inset-0 bg-primary/5 rounded-lg border border-primary/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-6 h-6 text-primary ml-0.5" />
                </div>
              </div>
              
              {/* Title */}
              <div className="space-y-2">
                <h2 className="text-base font-mono font-bold text-foreground tracking-tight">START ANALYSIS</h2>
                <p className="text-xs text-muted-foreground/70 font-mono leading-relaxed">
                  Paste a YouTube URL or upload a file.<br />
                  AI-powered insights in seconds.
                </p>
              </div>
              
              {/* Demo cards */}
              <div className="pt-2">
                <p className="text-[10px] font-mono text-muted-foreground/40 mb-3 uppercase tracking-widest">// samples</p>
                <div className="grid grid-cols-3 gap-2">
                  {demoVideos.map((demo) => (
                    <button
                      key={demo.id}
                      onClick={() => onDemoClick?.(demo.url)}
                      className="group relative overflow-hidden rounded-md border border-border/40 bg-background hover:border-primary/40 transition-all duration-150 text-left"
                    >
                      <div className="aspect-[4/3] bg-muted/20 flex flex-col items-center justify-center gap-1.5 relative">
                        <demo.icon className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors duration-150" />
                        <span className="text-[8px] font-mono text-muted-foreground/30 tracking-wider">{demo.tag}</span>
                      </div>
                      <div className="px-2 py-1.5 border-t border-border/30">
                        <p className="font-mono font-medium text-[10px] text-foreground/80 group-hover:text-primary transition-colors flex items-center gap-1">
                          {demo.title}
                          <ChevronRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                        <p className="text-[9px] font-mono text-muted-foreground/40 mt-0.5">{demo.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {processingState === "error" && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-12 h-12 mx-auto rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <span className="text-lg font-mono text-destructive font-bold">!</span>
              </div>
              <h2 className="text-sm font-mono font-bold text-destructive uppercase">Process Failed</h2>
              <p className="text-xs font-mono text-muted-foreground/60">
                Error processing video. Check the URL or file and retry.
              </p>
              {onRetry && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-1.5 font-mono text-xs border-border/40 hover:border-primary/40 hover:text-primary"
                  onClick={onRetry}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  RETRY
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default CenterPanel;
