import { useState } from "react";
import Header from "@/components/Header";
import LeftPanel from "@/components/app/LeftPanel";
import CenterPanel from "@/components/app/CenterPanel";
import RightPanel from "@/components/app/RightPanel";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type ProcessingState = "idle" | "processing" | "completed" | "error";

export interface Keyframe {
  id: number;
  timestamp: number;
  description: string;
  url?: string;
}

export interface VideoData {
  id: string;
  title: string;
  duration: string;
  summary: string;
  keyframes: Keyframe[];
  transcript: string;
}

const MainApp = () => {
  const { toast } = useToast();
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [highlightedKeyframes, setHighlightedKeyframes] = useState<number[]>([]);
  
  // 用于从关键帧传递图片到聊天
  const [selectedKeyframeForChat, setSelectedKeyframeForChat] = useState<{ id: number; url: string } | null>(null);

  const handleStartProcessing = async (input: string | File, type: "youtube" | "upload") => {
    setProcessingState("processing");
    
    try {
      toast({
        title: "开始处理视频",
        description: type === "youtube" ? "正在下载并分析YouTube视频..." : "正在上传并分析视频文件...",
      });

      const response = await apiService.processVideo({
        youtube_url: type === "youtube" ? (input as string) : undefined,
        video_file: type === "upload" ? (input as File) : undefined,
      });

      if (response.status === "success") {
        console.log("✅ 后端响应数据:", response);
        
        try {
          setProcessingState("completed");
          
          // 转换后端数据格式到前端格式
          const metadata = response.metadata;
          const summary = response.video_summary;
          
          console.log("metadata:", metadata);
          console.log("summary:", summary);
          
          // 处理duration: 从秒数转换为 "M:SS" 格式
          const formatDuration = (seconds: number | string): string => {
            if (typeof seconds === 'string') return seconds;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
          };
          
          // 处理summary: 优先使用 detailed，其次是 standard，最后是 brief
          const summaryText = summary?.detailed || summary?.standard || summary?.brief || "暂无总结";
          
          // 处理transcript: 处理多种可能的数据结构
          let transcriptText = "";
          if (metadata?.transcript) {
            if (typeof metadata.transcript === 'string') {
              transcriptText = metadata.transcript;
            } else if (Array.isArray(metadata.transcript.segments)) {
              transcriptText = metadata.transcript.segments.map((seg: any) => seg.text).join(" ");
            } else if (metadata.transcript.full_text) {
              transcriptText = metadata.transcript.full_text;
            }
          }
          
          // 处理keyframes: 使用 scene_description 或 description
          const keyframes = (metadata?.keyframes || []).map((kf: any, idx: number) => ({
            id: kf.frame_id || idx + 1,
            timestamp: kf.timestamp,
            description: kf.scene_description || kf.description || `关键帧 ${idx + 1}`,
            url: kf.oss_image_url,
          }));
          
          const videoData = {
            id: response.video_id,
            title: metadata?.video?.title || metadata?.title || "未命名视频",
            duration: metadata?.video?.duration ? formatDuration(metadata.video.duration) : (metadata?.duration ? formatDuration(metadata.duration) : "未知"),
            summary: summaryText,
            keyframes,
            transcript: transcriptText,
          };
          
          console.log("✅ 转换后的视频数据:", videoData);
          setVideoData(videoData);

          toast({
            title: "✅ 处理完成",
            description: `视频已成功分析，生成了 ${keyframes.length} 个关键帧`,
          });
        } catch (dataError: any) {
          console.error("数据转换失败:", dataError);
          throw new Error(`数据转换失败: ${dataError.message}`);
        }
      } else {
        throw new Error("处理失败");
      }
    } catch (error: any) {
      console.error("视频处理失败:", error);
      setProcessingState("error");
      
      toast({
        variant: "destructive",
        title: "❌ 处理失败",
        description: error.message || "视频处理过程中发生错误，请重试",
      });
    }
  };

  const handleTimestampJump = (timestamp: number) => {
    setCurrentTimestamp(timestamp);
  };

  const handleHighlightKeyframes = (frameIds: number[]) => {
    setHighlightedKeyframes(frameIds);
    setTimeout(() => setHighlightedKeyframes([]), 3000);
  };

  // 加载历史视频详情
  const handleLoadHistoryVideo = async (videoId: string) => {
    setProcessingState("processing");
    
    try {
      toast({
        title: "加载历史记录",
        description: "正在加载视频详情...",
      });

      const response = await apiService.getVideoDetails(videoId);

      if (response.status === "success") {
        console.log("✅ 加载历史视频数据:", response);
        
        setProcessingState("completed");
        
        // 转换后端数据格式到前端格式
        const metadata = response.metadata;
        const summary = response.video_summary;
        
        // 处理duration: 从秒数转换为 "M:SS" 格式
        const formatDuration = (seconds: number | string): string => {
          if (typeof seconds === 'string') return seconds;
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        
        // 处理summary: 优先使用 detailed，其次是 standard，最后是 brief
        const summaryText = summary?.detailed || summary?.standard || summary?.brief || "暂无总结";
        
        // 处理transcript
        let transcriptText = "";
        if (metadata?.transcript) {
          if (typeof metadata.transcript === 'string') {
            transcriptText = metadata.transcript;
          } else if (Array.isArray(metadata.transcript.segments)) {
            transcriptText = metadata.transcript.segments.map((seg: any) => seg.text).join(" ");
          } else if (metadata.transcript.full_text) {
            transcriptText = metadata.transcript.full_text;
          }
        }
        
        // 处理keyframes
        const keyframes = (metadata?.keyframes || []).map((kf: any, idx: number) => ({
          id: kf.frame_id || idx + 1,
          timestamp: kf.timestamp,
          description: kf.scene_description || kf.description || `关键帧 ${idx + 1}`,
          url: kf.oss_image_url,
        }));
        
        const videoData = {
          id: response.video_id,
          title: metadata?.video?.title || metadata?.title || "未命名视频",
          duration: metadata?.video?.duration ? formatDuration(metadata.video.duration) : (metadata?.duration ? formatDuration(metadata.duration) : "未知"),
          summary: summaryText,
          keyframes,
          transcript: transcriptText,
        };
        
        console.log("✅ 转换后的视频数据:", videoData);
        setVideoData(videoData);

        toast({
          title: "✅ 加载成功",
          description: `已加载视频: ${videoData.title}`,
        });
      } else {
        throw new Error("加载失败");
      }
    } catch (error: any) {
      console.error("加载历史视频失败:", error);
      setProcessingState("error");
      
      toast({
        variant: "destructive",
        title: "❌ 加载失败",
        description: error.message || "加载视频详情失败，请重试",
      });
    }
  };

  // 处理示例视频点击
  const handleDemoClick = (demoUrl: string) => {
    handleStartProcessing(demoUrl, "youtube");
  };

  // 处理从关键帧点击"用这张图提问"
  const handleAskWithKeyframe = (frameId: number, frameUrl: string) => {
    setSelectedKeyframeForChat({ id: frameId, url: frameUrl });
    console.log("选中关键帧用于提问:", frameId, frameUrl);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      
      {/* 主应用内容区域 */}
      <div className="pt-16 h-screen flex flex-col">
        <div className="flex flex-1 w-full gap-4 p-4">
          {/* Left Panel - 25% */}
          <LeftPanel 
            onStartProcessing={handleStartProcessing}
            processingState={processingState}
            onVideoSelect={handleLoadHistoryVideo}
          />

          {/* Center Panel - 50% */}
          <CenterPanel 
            processingState={processingState}
            videoData={videoData}
            currentTimestamp={currentTimestamp}
            highlightedKeyframes={highlightedKeyframes}
            onTimestampJump={handleTimestampJump}
            onAskWithKeyframe={handleAskWithKeyframe}
            onDemoClick={handleDemoClick}
          />

          {/* Right Panel - 25% */}
          <RightPanel 
            videoData={videoData}
            onTimestampJump={handleTimestampJump}
            onHighlightKeyframes={handleHighlightKeyframes}
            selectedKeyframe={selectedKeyframeForChat}
            onKeyframeUsed={() => setSelectedKeyframeForChat(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default MainApp;