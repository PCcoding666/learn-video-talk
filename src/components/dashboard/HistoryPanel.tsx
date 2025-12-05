import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, PlayCircle, Loader2, RefreshCw } from "lucide-react";
import { apiService, type VideoHistoryItem } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface HistoryPanelProps {
  onVideoSelect?: (videoId: string) => void;
}

const HistoryPanel = ({ onVideoSelect }: HistoryPanelProps = {}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getVideoHistory(10);
      
      if (response.status === "success") {
        setVideos(response.videos || []);
        
        if (response.message && response.videos.length === 0) {
          setError(response.message);
        }
      }
    } catch (err) {
      console.error("加载历史记录失败:", err);
      setError("暂时无法加载");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const handleVideoClick = async (video: VideoHistoryItem) => {
    if (video.processing_status !== 'completed') {
      toast({
        variant: "default",
        title: "视频未完成处理",
        description: video.processing_status === 'processing' ? "视频正在处理中，请稍后查看" : "视频处理失败或等待中",
      });
      return;
    }

    if (onVideoSelect) {
      onVideoSelect(video.id);
    } else {
      toast({
        title: "加载视频详情",
        description: `正在加载: ${video.title}`,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      completed: { text: "完成", color: "text-green-600 bg-green-50 dark:bg-green-950/30" },
      processing: { text: "处理中", color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30" },
      pending: { text: "等待中", color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30" },
      failed: { text: "失败", color: "text-red-600 bg-red-50 dark:bg-red-950/30" },
    };
    const badge = statusMap[status] || statusMap.pending;
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="w-4 h-4" />
          最近处理
        </h3>
        {error && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={loadHistory}
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </div>

      <ScrollArea className="h-[240px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-sm">加载中...</span>
          </div>
        ) : error && videos.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <PlayCircle className="w-5 h-5 opacity-50 mr-2" />
            <span className="text-sm">还没有处理记录</span>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <PlayCircle className="w-5 h-5 opacity-50 mr-2" />
            <span className="text-sm">还没有处理记录</span>
          </div>
        ) : (
          <div className="space-y-2">
            {videos.map((video) => (
              <div
                key={video.id}
                onClick={() => handleVideoClick(video)}
                className="p-3 rounded-lg bg-muted/50 hover:bg-accent/50 border border-transparent hover:border-border cursor-pointer transition-all group"
              >
                <div className="flex items-start gap-2">
                  <PlayCircle className="w-4 h-4 text-primary mt-0.5 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-sm line-clamp-1 flex-1">
                        {video.title}
                      </p>
                      {getStatusBadge(video.processing_status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatTime(video.created_at)}</span>
                      <span>·</span>
                      <span>{formatDuration(video.duration)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {videos.length > 0 && (
        <Button variant="ghost" className="w-full text-xs h-8 text-muted-foreground hover:text-foreground" size="sm">
          查看全部历史
        </Button>
      )}
    </div>
  );
};

export default HistoryPanel;