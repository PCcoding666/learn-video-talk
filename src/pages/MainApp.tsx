import { useState } from "react";
import Header from "@/components/Header";
import LeftPanel from "@/components/app/LeftPanel";
import CenterPanel from "@/components/app/CenterPanel";
import RightPanel from "@/components/app/RightPanel";
import Workbench from "@/components/app/Workbench";
import { apiService } from "@/services/api";
import type { CompiledMetadata, VideoSummaries } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { formatDuration } from "@/lib/utils";

type ProcessingState = "idle" | "ingest" | "workbench" | "completed" | "error" | "loading";

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
}

const MainApp = () => {
  const { toast } = useToast();
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [highlightedKeyframes, setHighlightedKeyframes] = useState<number[]>([]);
  
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
    setProcessingState("ingest");
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

        const vData: VideoData = {
          id: response.video_id,
          title: response.title || "Untitled",
          duration: formatDuration(response.duration || 0),
          oss_video_url: response.oss_video_url,
          summary: "",
          keyframes: [],
          transcript: ""
        };

        setVideoData(vData);
        setProcessingState("workbench");
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
        moduleId as 'download' | 'transcript' | 'keyframes' | 'summary'
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
          // download 模块：直接提供 OSS URL
          if (videoData.oss_video_url) {
            addLog(`RESOURCE_READY: Download link available`, "success");
            window.open(videoData.oss_video_url, '_blank');
            toast({ title: "Download Ready", description: "Opening download link..." });
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
          }
          break;

        case 'keyframes':
          addLog(`LOGIC_EXECUTING: Running scene detection...`, "info");
          result = await apiService.extractKeyframes(videoData.id);
          if (result.status === 'success') {
            addLog(`MODULE_COMPLETED: KEYFRAMES | ${result.keyframes_count} frames`, "success");
            const newKeyframes = (result.keyframes || []).map((kf, idx) => ({
              id: kf.frame_id,
              timestamp: kf.timestamp,
              description: `Keyframe ${idx + 1}`,
              url: kf.oss_image_url
            }));
            setVideoData(prev => prev ? { ...prev, keyframes: newKeyframes } : null);
            toast({ title: "Keyframes Extracted", description: `${result.keyframes_count} keyframes found` });
          }
          break;

        case 'summary':
          addLog(`LOGIC_EXECUTING: Calling Qwen-VL...`, "info");
          result = await apiService.summarizeVideo(videoData.id);
          if (result.status === 'success') {
            addLog(`MODULE_COMPLETED: SUMMARY generated`, "success");
            const summaryText = result.detailed_summary || result.standard_summary || result.brief_summary || '';
            setVideoData(prev => prev ? { ...prev, summary: summaryText } : null);
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

  const handleHighlightKeyframes = (frameIds: number[]) => {
    setHighlightedKeyframes(frameIds);
    setTimeout(() => setHighlightedKeyframes([]), 3000);
  };

  // 加载历史记录时直接进入 completed 状态
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
        };
        
        setVideoData(vData);
        
        // 根据是否有处理数据决定进入哪个状态
        const hasProcessedData = keyframes.length > 0 || transcriptText || summaryText;
        if (hasProcessedData) {
          setProcessingState("completed");
          addLog(`ARCHIVE_RESTORED: ${vData.title}`, "success");
        } else {
          // 只是摄入了，进入 workbench 让用户选择处理
          setProcessingState("workbench");
          addLog(`ASSET_LOADED: ${vData.title} (no processed data)`, "info");
        }
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] text-foreground">
      <Header />
      
      <div className="pt-16 h-screen flex flex-col">
        <div className="flex flex-1 w-full gap-5 p-5 overflow-hidden">
          <LeftPanel 
            onStartProcessing={handleStartProcessing}
            processingState={processingState === "ingest" || processingState === "loading" ? "processing" : "idle"}
            onVideoSelect={handleLoadHistoryVideo}
          />

          <main className="flex-1 min-w-0">
             <div className="h-full bg-card rounded-2xl border border-border/60 shadow-sm p-6 overflow-y-auto">
                {processingState === "loading" ? (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                      <p className="text-muted-foreground font-mono text-sm">Loading video data...</p>
                    </div>
                ) : (processingState === "workbench" || processingState === "ingest") && videoData ? (
                    <Workbench 
                        videoData={videoData} 
                        logs={terminalLogs} 
                        onTriggerModule={handleModuleTrigger}
                        isIngesting={processingState === "ingest"}
                        moduleResults={workbenchResults}
                    />
                ) : processingState === "ingest" ? (
                    <Workbench 
                        videoData={{ id: "", title: "Ingesting...", duration: "0:00", summary: "", keyframes: [], transcript: "" }} 
                        logs={terminalLogs} 
                        onTriggerModule={async () => {}}
                        isIngesting={true}
                    />
                ) : (
                    <CenterPanel 
                        processingState={processingState === "completed" ? "completed" : "idle"}
                        videoData={videoData}
                        currentTimestamp={currentTimestamp}
                        highlightedKeyframes={highlightedKeyframes}
                        onTimestampJump={handleTimestampJump}
                        onDemoClick={handleDemoClick}
                    />
                )}
             </div>
          </main>

          <RightPanel 
            videoData={processingState === "completed" ? videoData : null}
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