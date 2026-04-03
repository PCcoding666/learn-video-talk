import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, PlayCircle, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { apiService, type VideoHistoryItem } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatDuration } from "@/lib/utils";

interface HistoryPanelProps {
  onVideoSelect?: (videoId: string) => void;
}

const HistoryPanel = ({ onVideoSelect }: HistoryPanelProps = {}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async (limit: number = 10) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getVideoHistory(limit);
      
      if (response.status === "success") {
        setVideos(response.videos || []);
        
        if (response.message && response.videos.length === 0) {
          setError(response.message);
        }
      }
    } catch (err) {
      console.error("加载历史记录失败:", err);
      setError("Unable to load");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAll = async () => {
    if (showAll) {
      // Show less - reload with default limit
      await loadHistory(10);
      setShowAll(false);
    } else {
      // Show all - reload with larger limit
      await loadHistory(100);
      setShowAll(true);
    }
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleVideoClick = async (video: VideoHistoryItem) => {
    // 只有 processing 和 failed 状态不允许点击
    // pending 和 completed 都允许（pending 进入 workbench，completed 进入结果页）
    if (video.processing_status === 'processing') {
      toast({
        variant: "default",
        title: "Video processing",
        description: t('status.processing'),
      });
      return;
    }
    
    if (video.processing_status === 'failed') {
      toast({
        variant: "destructive",
        title: "Processing failed",
        description: t('status.failed'),
      });
      return;
    }

    if (onVideoSelect) {
      onVideoSelect(video.id);
    }
  };

  const getStatusDot = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-500",
      processing: "bg-blue-500 animate-pulse",
      pending: "bg-yellow-500",
      failed: "bg-red-500",
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="space-y-2 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground/60" />
          <h3 className="text-[10px] font-mono font-bold text-muted-foreground/70 uppercase tracking-wider">Recent</h3>
        </div>
        {error && !isLoading && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-primary/10"
            onClick={loadHistory}
          >
            <RefreshCw className="w-2.5 h-2.5" />
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
            <span className="text-[10px] font-mono">Loading...</span>
          </div>
        ) : error && videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="w-4 h-4 text-muted-foreground/40 mb-1.5" />
            <span className="text-[10px] font-mono text-muted-foreground/60">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1.5 h-6 text-[10px] font-mono"
              onClick={loadHistory}
            >
              <RefreshCw className="w-2.5 h-2.5 mr-1" />
              Retry
            </Button>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <PlayCircle className="w-4 h-4 text-muted-foreground/30 mb-1.5" />
            <span className="text-[10px] font-mono text-muted-foreground/40">No videos yet</span>
          </div>
        ) : (
          <div className="space-y-0.5">
            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => handleVideoClick(video)}
                className="w-full px-2 py-1.5 rounded hover:bg-muted/30 transition-colors text-left group"
              >
                <div className="flex items-start gap-2">
                  <div className="relative mt-0.5">
                    <PlayCircle className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${getStatusDot(video.processing_status)}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono text-foreground/80 line-clamp-1 group-hover:text-primary transition-colors">
                      {video.title}
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground/40 mt-0.5">
                      <span>{formatTime(video.created_at)}</span>
                      <span>·</span>
                      <span>{formatDuration(video.duration)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {videos.length > 0 && (
        <Button 
          variant="ghost" 
          className="w-full text-[10px] font-mono h-7 text-muted-foreground/50 hover:text-primary hover:bg-primary/5" 
          size="sm"
          onClick={handleViewAll}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />
          ) : null}
          {showAll ? "Show less" : "View all"}
        </Button>
      )}
    </div>
  );
};

export default HistoryPanel;