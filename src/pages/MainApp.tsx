import { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import ReferencePanel from "@/components/app/ReferencePanel";
import type { ReferenceTab } from "@/components/app/ReferencePanel";
import InteractionPanel from "@/components/app/InteractionPanel";
import type { ModuleStatus } from "@/components/app/InteractionPanel";
import { apiService } from "@/services/api";
import type { CompiledMetadata, VideoSummaries, TranscriptSegment } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { formatDuration, cn } from "@/lib/utils";

type ProcessingState = "idle" | "loading" | "ready" | "error";

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
  thumbnail_url?: string;
  downloaded?: boolean;
  source_type?: "youtube" | "upload";
  original_url?: string;
}

const MainApp = () => {
  const { toast } = useToast();
  const [processingState, setProcessingState] =
    useState<ProcessingState>("idle");
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [highlightedKeyframes, setHighlightedKeyframes] = useState<number[]>(
    [],
  );
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Transcript segments (for ReferencePanel)
  const [transcriptSegments, setTranscriptSegments] = useState<
    TranscriptSegment[]
  >([]);
  const [transcriptLanguage, setTranscriptLanguage] = useState<
    string | undefined
  >();

  // Module status tracking
  const [moduleStatus, setModuleStatus] = useState<ModuleStatus>({
    download: "idle",
    transcript: "idle",
    summary: "idle",
  });

  // Active tab in ReferencePanel
  const [activeReferenceTab, setActiveReferenceTab] =
    useState<ReferenceTab>("transcript");

  // Sync module status from data (preserve "running" state)
  useEffect(() => {
    setModuleStatus((prev) => ({
      download:
        prev.download === "running"
          ? "running"
          : videoData?.downloaded
            ? "done"
            : "idle",
      transcript:
        prev.transcript === "running"
          ? "running"
          : transcriptSegments.length > 0 || videoData?.transcript
            ? "done"
            : "idle",
      summary:
        prev.summary === "running"
          ? "running"
          : videoData?.summary
            ? "done"
            : "idle",
    }));
  }, [videoData, transcriptSegments]);

  const handleStartProcessing = async (
    input: string | File,
    type: "youtube" | "upload",
  ) => {
    setProcessingState("loading");

    try {
      const response = await apiService.processVideo({
        youtube_url: type === "youtube" ? (input as string) : undefined,
        video_file: type === "upload" ? (input as File) : undefined,
        mode: "ingest",
      });

      if (response.status === "success") {
        const isDownloaded = response.downloaded ?? !!response.oss_video_url;

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
          transcript: "",
        };

        setVideoData(vData);
        setTranscriptSegments([]);
        setTranscriptLanguage(undefined);
        setModuleStatus({
          download: isDownloaded ? "done" : "idle",
          transcript: "idle",
          summary: "idle",
        });
        setProcessingState("ready");
      } else {
        throw new Error("Ingest failed");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "No video loaded",
      });
      throw new Error("No video loaded");
    }

    // Track telemetry
    try {
      await apiService.trackModuleClick(
        videoData.id,
        moduleId as "download" | "transcript" | "summary",
      );
    } catch (e) {
      console.warn("Telemetry failed:", e);
    }

    // Set running state
    setModuleStatus((prev) => ({ ...prev, [moduleId]: "running" }));

    try {
      let result;

      switch (moduleId) {
        case "download":
          if (videoData.downloaded && videoData.oss_video_url) {
            window.open(videoData.oss_video_url, "_blank");
            toast({
              title: "Download Ready",
              description: "Opening download link...",
            });
            setModuleStatus((prev) => ({ ...prev, download: "done" }));
          } else if (videoData.source_type === "youtube") {
            result = await apiService.downloadVideo(videoData.id);
            if (result.status === "success") {
              const ossUrl = (result as Record<string, unknown>)
                .oss_video_url as string | undefined;
              setVideoData((prev) =>
                prev
                  ? { ...prev, oss_video_url: ossUrl, downloaded: true }
                  : null,
              );
              setModuleStatus((prev) => ({ ...prev, download: "done" }));
              toast({
                title: "Download Complete",
                description: "Video is ready",
              });
              if (ossUrl) window.open(ossUrl, "_blank");
            }
          } else {
            setModuleStatus((prev) => ({ ...prev, download: "error" }));
            toast({
              variant: "destructive",
              title: "Error",
              description: "No download URL available",
            });
            throw new Error("No download URL available");
          }
          return;

        case "transcript":
          result = await apiService.transcribeVideo(videoData.id);
          if (result.status === "success") {
            const segments = result.segments || [];
            const transcriptText = segments.map((seg) => seg.text).join(" ");
            setVideoData((prev) =>
              prev ? { ...prev, transcript: transcriptText } : null,
            );
            setTranscriptSegments(segments);
            setTranscriptLanguage(result.language);
            setModuleStatus((prev) => ({ ...prev, transcript: "done" }));
            setActiveReferenceTab("transcript");
            toast({
              title: "Transcription Complete",
              description: `${result.segments_count} segments extracted`,
            });
          } else if (result.prerequisite === "download") {
            setModuleStatus((prev) => ({ ...prev, transcript: "error" }));
            toast({
              variant: "destructive",
              title: "Prerequisite Missing",
              description: "Please download the video first",
            });
          }
          break;

        case "summary":
          // Extract keyframes first
          try {
            const kfResult = await apiService.extractKeyframes(videoData.id);
            if (kfResult.status === "success") {
              const newKeyframes = (kfResult.keyframes || []).map(
                (kf, idx) => ({
                  id: kf.frame_id,
                  timestamp: kf.timestamp,
                  description: `Keyframe ${idx + 1}`,
                  url: kf.oss_image_url,
                }),
              );
              setVideoData((prev) =>
                prev ? { ...prev, keyframes: newKeyframes } : null,
              );
            }
          } catch (kfError) {
            console.warn("Keyframes extraction skipped:", kfError);
          }

          // Generate summary
          result = await apiService.summarizeVideo(videoData.id);
          if (result.status === "success") {
            const summaryText =
              result.detailed_summary ||
              result.standard_summary ||
              result.brief_summary ||
              "";
            setVideoData((prev) =>
              prev ? { ...prev, summary: summaryText } : null,
            );
            setModuleStatus((prev) => ({ ...prev, summary: "done" }));
            setActiveReferenceTab("summary");
            toast({
              title: "Summary Generated",
              description: "AI summary is ready",
            });
          } else if (result.prerequisite === "transcribe") {
            setModuleStatus((prev) => ({ ...prev, summary: "error" }));
            toast({
              variant: "destructive",
              title: "Prerequisite Missing",
              description: "Please run transcription first",
            });
          }
          break;

        default:
          break;
      }

      if (result && result.status === "error") {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      setModuleStatus((prev) => ({ ...prev, [moduleId]: "error" }));
      toast({
        variant: "destructive",
        title: "Module Failed",
        description: message,
      });
      throw error;
    }
  };

  const handleTimestampJump = (timestamp: number) => {
    // Find video element and seek to timestamp
    const videoEl = document.querySelector("video");
    if (videoEl) {
      videoEl.currentTime = timestamp;
      videoEl.play().catch(() => {});
    }
  };

  const handleHighlightKeyframes = useCallback((frameIds: number[]) => {
    if (highlightTimeoutRef.current)
      clearTimeout(highlightTimeoutRef.current);
    setHighlightedKeyframes(frameIds);
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedKeyframes([]);
      highlightTimeoutRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current)
        clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  // Load a video from history
  const handleLoadHistoryVideo = async (videoId: string) => {
    setProcessingState("loading");

    try {
      const response = await apiService.getVideoDetails(videoId);
      if (response.status === "success") {
        const metadata: CompiledMetadata | undefined = response.metadata;
        const summary: VideoSummaries | undefined = response.video_summary;

        const summaryText =
          summary?.detailed || summary?.standard || summary?.brief || "";

        let transcriptText = "";
        let segments: TranscriptSegment[] = [];
        if (metadata?.transcript) {
          if (typeof metadata.transcript === "string") {
            transcriptText = metadata.transcript as unknown as string;
          } else if (Array.isArray(metadata.transcript.segments)) {
            segments = metadata.transcript.segments;
            transcriptText = segments.map((seg) => seg.text).join(" ");
          }
        }

        const keyframes = (metadata?.keyframes || []).map((kf, idx) => ({
          id: kf.frame_id || idx + 1,
          timestamp: kf.timestamp,
          description: kf.scene_description || `Keyframe ${idx + 1}`,
          url: kf.oss_image_url,
        }));

        const vData: VideoData = {
          id: response.video_id,
          title:
            metadata?.video?.title || metadata?.title || "Untitled",
          duration: metadata?.video?.duration
            ? formatDuration(metadata.video.duration)
            : formatDuration(metadata?.duration || 0),
          summary: summaryText,
          keyframes,
          transcript: transcriptText,
          oss_video_url: metadata?.video?.oss_video_url,
          thumbnail_url: (metadata?.video as Record<string, unknown>)
            ?.thumbnail_url as string | undefined,
          downloaded: !!metadata?.video?.oss_video_url,
          source_type: metadata?.video?.source_type as
            | "youtube"
            | "upload"
            | undefined,
          original_url: metadata?.video?.original_url,
        };

        setVideoData(vData);
        setTranscriptSegments(segments);
        setTranscriptLanguage(
          metadata?.transcript &&
            typeof metadata.transcript !== "string"
            ? metadata.transcript.language
            : undefined,
        );
        setModuleStatus({
          download: vData.downloaded ? "done" : "idle",
          transcript: transcriptText ? "done" : "idle",
          summary: summaryText ? "done" : "idle",
        });
        setProcessingState("ready");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      setProcessingState("error");
      toast({
        variant: "destructive",
        title: "Failed to load video",
        description: message,
      });
    }
  };

  const handleDemoClick = (demoUrl: string) => {
    handleStartProcessing(demoUrl, "youtube");
  };

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      <Header onVideoSelect={handleLoadHistoryVideo} />

      <div className="pt-12 h-screen flex flex-col">
        <div className="flex flex-1 w-full gap-3 p-3 overflow-hidden">
          {/* Reference Panel - slides in when video is ready */}
          <div
            className={cn(
              "flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
              processingState === "ready" && videoData
                ? "w-[40%] opacity-100"
                : "w-0 opacity-0",
            )}
          >
            {videoData && (
              <ReferencePanel
                videoData={videoData}
                transcriptSegments={transcriptSegments}
                transcriptLanguage={transcriptLanguage}
                activeTab={activeReferenceTab}
                onTabChange={setActiveReferenceTab}
                onTimestampJump={handleTimestampJump}
              />
            )}
          </div>

          {/* Interaction Panel - always visible, takes remaining space */}
          <div className="flex-1 min-w-0">
            <InteractionPanel
              processingState={processingState}
              videoData={videoData}
              onStartProcessing={handleStartProcessing}
              onModuleTrigger={handleModuleTrigger}
              onTimestampJump={handleTimestampJump}
              onHighlightKeyframes={handleHighlightKeyframes}
              onDemoClick={handleDemoClick}
              onRetry={() => setProcessingState("idle")}
              moduleStatus={moduleStatus}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainApp;
