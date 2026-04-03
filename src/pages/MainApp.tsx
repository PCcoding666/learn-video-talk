import { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import LeftPanel from "@/components/app/LeftPanel";
import CenterPanel from "@/components/app/CenterPanel";
import RightPanel from "@/components/app/RightPanel";
import Workbench from "@/components/app/Workbench";
import { apiService } from "@/services/api";
import type { CompiledMetadata, VideoSummaries } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { formatDuration } from "@/lib/utils";

// 简化状态机：idle(空) -> loading(加载中) -> ready(就绪，显示Workbench)
type ProcessingState = "idle" | "loading" | "ready" | "error";

interface TerminalLog {
  id: string;
  time: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "process";
}

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
  oss_video_url?: string;
  thumbnail_url?: string;      // 新增：缩略图 URL
  downloaded?: boolean;         // 新增：是否已下载到 OSS
  source_type?: 'youtube' | 'upload';  // 新增：来源类型
  original_url?: string;        // 新增：原始 YouTube URL
}

const MainApp = () => {
  const { toast } = useToast();
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [highlightedKeyframes, setHighlightedKeyframes] = useState<number[]>([]);
  
  // Ref for highlight timeout to prevent memory leaks
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 极客工作台状态
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [workbenchResults, setWorkbenchResults] = useState<Record<string, unknown>>({});
  
  const addLog = (message: string, type: TerminalLog["type"] = "info") => {
    const newLog: TerminalLog = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      type
    };
    setTerminalLogs(prev => [...prev, newLog].slice(-50));
  };

  const handleStartProcessing = async (input: string | File, type: "youtube" | "upload") => {
    setProcessingState("loading");
    setTerminalLogs([]);
    addLog(`INITIATING_INGEST: ${type.toUpperCase()}`, "process");
    
    try {
      addLog(`REQUESTING_ASSET_FROM_SOURCE...`, "info");
      
      const response = await apiService.processVideo({
        youtube_url: type === "youtube" ? (input as string) : undefined,
        video_file: type === "upload" ? (input as File) : undefined,
        mode: "ingest" // 原子化：仅摄入
      });

      if (response.status === "success") {
        addLog(`ASSET_LOCKED: ${response.video_id}`, "success");
        addLog(`METADATA_RECEIVED: TITLE="${response.title}"`, "info");
        
        // 判断是否已下载（上传的文件已在 OSS，YouTube 视频延迟下载）
        const isDownloaded = response.downloaded ?? !!response.oss_video_url;
        if (!isDownloaded) {
          addLog(`DEFERRED_DOWNLOAD: Video not yet downloaded`, "info");
        }

        const vData: VideoData = {
          id: response.video_id,
          title: response.title || "Untitled",
          duration: formatDuration(response.duration || 0),
          oss_video_url: response.oss_video_url,
          thumbnail_url: response.thumbnail_url,
          downloaded: isDownloaded,
          source_type: response.source_type,
          original_url: response.original_url,
          summary: "",
          keyframes: [],
          transcript: ""
        };

        setVideoData(vData);
        setProcessingState("ready");
        addLog(`WORKBENCH_READY: Waiting for module activation.`, "success");
      } else {
        throw new Error("Ingest failed");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      addLog(`FATAL_ERROR: ${message}`, "error");
      setProcessingState("error");
      toast({
        variant: "destructive",
        title: "Ingest Failed",
        description: message,
      });
    }
  };

  const handleModuleTrigger = async (moduleId: string) => {
    if (!videoData?.id) {
      toast({ variant: "destructive", title: "Error", description: "No video loaded" });
      throw new Error("No video loaded");
    }

    addLog(`TRIGGER_MODULE: ${moduleId.toUpperCase()}`, "process");
    
    // 埋点：记录模块点击事件
    try {
      await apiService.trackModuleClick(
        videoData.id, 
        moduleId as 'download' | 'transcript' | 'summary'
      );
      addLog(`TELEMETRY_SENT: ${moduleId}`, "info");
    } catch (e) {
      console.warn('Telemetry failed:', e);
    }
    
    addLog(`ALLOCATING_RESOURCES...`, "info");

    try {
      let result;
      
      switch (moduleId) {
        case 'download':
          // download 模块：延迟下载优化
          if (videoData.downloaded && videoData.oss_video_url) {
            // 已下载，直接打开下载链接
            addLog(`RESOURCE_READY: Download link available`, "success");
            window.open(videoData.oss_video_url, '_blank');
            toast({ title: "Download Ready", description: "Opening download link..." });
          } else if (videoData.source_type === 'youtube') {
            // YouTube 视频未下载，执行下载
            addLog(`LOGIC_EXECUTING: Downloading YouTube video...`, "info");
            result = await apiService.downloadVideo(videoData.id);
            if (result.status === 'success') {
              addLog(`MODULE_COMPLETED: DOWNLOAD | Video saved to OSS`, "success");
              // 更新 videoData 状态
              setVideoData(prev => prev ? { 
                ...prev, 
                oss_video_url: result.oss_video_url,
                downloaded: true 
              } : null);
              toast({ title: "Download Complete", description: "Video is ready for processing" });
              // 下载完成后打开链接
              if (result.oss_video_url) {
                window.open(result.oss_video_url, '_blank');
              }
            }
          } else {
            addLog(`ERROR: No download URL available`, "error");
            toast({ variant: "destructive", title: "Error", description: "No download URL available" });
            throw new Error("No download URL available");
          }
          return;

        case 'transcript':
          addLog(`LOGIC_EXECUTING: Calling Paraformer-v2...`, "info");
          result = await apiService.transcribeVideo(videoData.id);
          if (result.status === 'success') {
            addLog(`MODULE_COMPLETED: TRANSCRIPT | ${result.segments_count} segments`, "success");
            const transcriptText = result.segments
              ? result.segments.map(seg => seg.text).join(' ')
              : `Transcription completed: ${result.segments_count} segments`;
            setVideoData(prev => prev ? { 
              ...prev, 
              transcript: transcriptText
            } : null);
            setWorkbenchResults(prev => ({
              ...prev,
              transcript: {
                segments: result.segments || [],
                segments_count: result.segments_count,
                language: result.language,
                confidence: result.confidence,
              }
            }));
            toast({ title: "Transcription Complete", description: `${result.segments_count} segments extracted` });
          } else if (result.prerequisite === 'download') {
            addLog(`ERROR: Video not downloaded yet`, "error");
            toast({ 
              variant: "destructive", 
              title: "Prerequisite Missing", 
              description: "Please download the video first" 
            });
          }
          break;

        case 'summary':
          // Summary 模块：生成摘要 + 提取关键帧（内部处理）
          addLog(`LOGIC_EXECUTING: Extracting keyframes...`, "info");
          
          // 先提取关键帧（作为 summary 的内部步骤）
          try {
            const kfResult = await apiService.extractKeyframes(videoData.id);
            if (kfResult.status === 'success') {
              addLog(`KEYFRAMES_EXTRACTED: ${kfResult.keyframes_count} frames`, "info");
              const newKeyframes = (kfResult.keyframes || []).map((kf, idx) => ({
                id: kf.frame_id,
                timestamp: kf.timestamp,
                description: `Keyframe ${idx + 1}`,
                url: kf.oss_image_url
              }));
              setVideoData(prev => prev ? { ...prev, keyframes: newKeyframes } : null);
              setWorkbenchResults(prev => ({
                ...prev,
                keyframes: { keyframes: newKeyframes, count: newKeyframes.length }
              }));
            }
          } catch (kfError) {
            addLog(`KEYFRAMES_SKIPPED: ${kfError instanceof Error ? kfError.message : 'Failed'}`, "warning");
          }
          
          // 生成摘要
          addLog(`LOGIC_EXECUTING: Calling Qwen-VL for summary...`, "info");
          result = await apiService.summarizeVideo(videoData.id);
          if (result.status === 'success') {
            addLog(`MODULE_COMPLETED: SUMMARY generated`, "success");
            const summaryText = result.detailed_summary || result.standard_summary || result.brief_summary || '';
            setVideoData(prev => prev ? { ...prev, summary: summaryText } : null);
            setWorkbenchResults(prev => ({
              ...prev,
              summary: { text: summaryText }
            }));
            toast({ title: "Summary Generated", description: "AI summary is ready" });
          } else if (result.prerequisite === 'transcribe') {
            addLog(`ERROR: Requires transcription first`, "error");
            toast({ 
              variant: "destructive", 
              title: "Prerequisite Missing", 
              description: "Please run Speech-to-Text first" 
            });
          }
          break;

        default:
          addLog(`ERROR: Unknown module ${moduleId}`, "error");
      }

      if (result && result.status === 'error') {
        throw new Error(result.error || 'Unknown error');
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      addLog(`FATAL_ERROR: ${message}`, "error");
      toast({
        variant: "destructive",
        title: "Module Failed",
        description: message,
      });
      // Re-throw so Workbench can update tool status to "error"
      throw error;
    }
  };

  const handleTimestampJump = (timestamp: number) => {
    setCurrentTimestamp(timestamp);
  };

  const handleHighlightKeyframes = useCallback((frameIds: number[]) => {
    // Clear any existing timeout to prevent overlapping timers
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    setHighlightedKeyframes(frameIds);
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedKeyframes([]);
      highlightTimeoutRef.current = null;
    }, 3000);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // 加载历史记录时直接进入 ready 状态（统一 Workbench 界面）
  const handleLoadHistoryVideo = async (videoId: string) => {
    setProcessingState("loading");
    setTerminalLogs([]);
    addLog(`LOADING_ARCHIVE: ${videoId}`, "process");
    
    try {
      const response = await apiService.getVideoDetails(videoId);
      if (response.status === "success") {
        const metadata: CompiledMetadata | undefined = response.metadata;
        const summary: VideoSummaries | undefined = response.video_summary;
        
        const summaryText = summary?.detailed || summary?.standard || summary?.brief || "";
        
        let transcriptText = "";
        if (metadata?.transcript) {
          if (typeof metadata.transcript === 'string') transcriptText = metadata.transcript;
          else if (Array.isArray(metadata.transcript.segments)) transcriptText = metadata.transcript.segments.map((seg) => seg.text).join(" ");
        }
        
        const keyframes = (metadata?.keyframes || []).map((kf, idx) => ({
          id: kf.frame_id || idx + 1,
          timestamp: kf.timestamp,
          description: kf.scene_description || `Keyframe ${idx + 1}`,
          url: kf.oss_image_url,
        }));
        
        const vData: VideoData = {
          id: response.video_id,
          title: metadata?.video?.title || metadata?.title || "Untitled",
          duration: metadata?.video?.duration ? formatDuration(metadata.video.duration) : formatDuration(metadata?.duration || 0),
          summary: summaryText,
          keyframes,
          transcript: transcriptText,
          oss_video_url: metadata?.video?.oss_video_url,
          thumbnail_url: metadata?.video?.thumbnail_url,
          downloaded: !!metadata?.video?.oss_video_url,
          source_type: metadata?.video?.source_type,
          original_url: metadata?.video?.original_url,
        };
        
        setVideoData(vData);
        
        // 设置已有结果到 workbenchResults，以便 Workbench 显示正确状态
        const newResults: Record<string, unknown> = {};
        if (transcriptText) {
          newResults.transcript = {
            segments: metadata?.transcript?.segments || [],
            segments_count: metadata?.transcript?.segments?.length || 0,
            language: metadata?.transcript?.language,
          };
        }
        if (summaryText) {
          newResults.summary = { text: summaryText };
        }
        if (keyframes.length > 0) {
          newResults.keyframes = { keyframes, count: keyframes.length };
        }
        setWorkbenchResults(newResults);
        
        // 统一进入 ready 状态，由 Workbench 显示
        setProcessingState("ready");
        addLog(`ARCHIVE_RESTORED: ${vData.title}`, "success");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      addLog(`RESTORE_FAILED: ${message}`, "error");
      setProcessingState("error");
    }
  };

  // 处理示例视频
  const handleDemoClick = (demoUrl: string) => {
    handleStartProcessing(demoUrl, "youtube");
  };

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <Header />
      
      <div className="pt-12 h-screen flex flex-col">
        <div className="flex flex-1 w-full gap-3 p-3 overflow-hidden">
          <LeftPanel 
            onStartProcessing={handleStartProcessing}
            processingState={processingState === "ingest" || processingState === "loading" ? "processing" : "idle"}
            onVideoSelect={handleLoadHistoryVideo}
          />

          <main className="flex-1 min-w-0">
             <div className="h-full bg-card rounded-lg border border-border/60 overflow-y-auto">
                {processingState === "loading" ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-4"></div>
                      <p className="text-muted-foreground font-mono text-xs">LOADING_DATA...</p>
                    </div>
                ) : processingState === "ready" && videoData ? (
                    <Workbench 
                        videoData={videoData} 
                        logs={terminalLogs} 
                        onTriggerModule={handleModuleTrigger}
                        isIngesting={false}
                        moduleResults={workbenchResults}
                    />
                ) : (
                    <CenterPanel 
                        processingState={processingState === "error" ? "error" : "idle"}
                        videoData={null}
                        currentTimestamp={currentTimestamp}
                        highlightedKeyframes={highlightedKeyframes}
                        onTimestampJump={handleTimestampJump}
                        onDemoClick={handleDemoClick}
                        onRetry={() => setProcessingState("idle")}
                    />
                )}
             </div>
          </main>

          <RightPanel 
            videoData={processingState === "ready" ? videoData : null}
            onTimestampJump={handleTimestampJump}
            onHighlightKeyframes={handleHighlightKeyframes}
            selectedKeyframe={null}
            onKeyframeUsed={() => {}}
          />
        </div>
      </div>
    </div>
  );
};

export default MainApp;