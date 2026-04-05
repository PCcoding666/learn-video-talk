import React, { useState, useEffect, useRef } from "react";
import {
  Play, Download, FileText, Zap,
  Terminal as TerminalIcon, CheckCircle2, AlertCircle,
  Loader2, Copy, Search, Image as ImageIcon, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, MessageSquare, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiService, QuotaResponse } from "@/services/api";

interface Log {
  id: string;
  time: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "process";
}

interface Tool {
  id: string;
  name: string;
  icon: React.ElementType;
  status: "idle" | "running" | "done" | "error";
  progress: number;
  cost: number;
}

interface TranscriptSegment {
  text: string;
  start_time: number;
  end_time: number;
  confidence: number;
}

interface TranscriptResult {
  segments: TranscriptSegment[];
  segments_count?: number;
  language?: string;
  confidence?: number;
}

interface KeyframeItem {
  id: number;
  timestamp: number;
  description: string;
  url?: string;
}

interface WorkbenchProps {
  videoData: {
    id: string;
    title: string;
    duration: string;
    url?: string;
    oss_video_url?: string;
    thumbnail_url?: string;
    downloaded?: boolean;
    source_type?: 'youtube' | 'upload';
    summary?: string;
    keyframes?: KeyframeItem[];
    transcript?: string;
  };
  logs: Log[];
  onTriggerModule: (moduleId: string) => Promise<void>;
  isIngesting?: boolean;
  moduleResults?: Record<string, unknown>;
}

const Workbench: React.FC<WorkbenchProps> = ({ videoData, logs, onTriggerModule, isIngesting = false, moduleResults = {} }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("summary");
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [selectedKeyframeIdx, setSelectedKeyframeIdx] = useState(0);

  const [tools, setTools] = useState<Tool[]>([
    { id: "download", name: "Download", icon: Download, status: "idle", progress: 0, cost: 0 },
    { id: "transcript", name: "Transcript", icon: FileText, status: "idle", progress: 0, cost: 10 },
    { id: "summary", name: "Summary", icon: Zap, status: "idle", progress: 0, cost: 20 }
  ]);

  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);

  // Sync tool states from moduleResults (for history loading)
  useEffect(() => {
    setTools(prev => prev.map(tool => {
      if (tool.id === 'download' && videoData.downloaded) {
        return { ...tool, status: "done" as const, progress: 100 };
      }
      if (tool.id === 'transcript' && (moduleResults.transcript || videoData.transcript)) {
        return { ...tool, status: "done" as const, progress: 100 };
      }
      if (tool.id === 'summary' && (moduleResults.summary || videoData.summary)) {
        return { ...tool, status: "done" as const, progress: 100 };
      }
      return tool;
    }));
  }, [moduleResults, videoData.downloaded, videoData.transcript, videoData.summary]);

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const quotaData = await apiService.getQuota();
        setQuota(quotaData);
      } catch {
        setQuota({ monthly_video_limit: 10, monthly_videos_used: 0, total_storage_mb: 500, used_storage_mb: 0, videos_remaining: 10, storage_remaining_mb: 500 });
      } finally {
        setQuotaLoading(false);
      }
    };
    fetchQuota();
  }, []);

  // Auto-expand terminal when any module is running, auto-collapse when done
  const anyRunning = tools.some(t => t.status === "running");
  useEffect(() => {
    if (anyRunning) setTerminalOpen(true);
  }, [anyRunning]);

  const handleToolClick = async (toolId: string) => {
    if (isIngesting) return;
    const tool = tools.find(t => t.id === toolId);
    if (!tool || tool.status === "running") return;

    // If already done, just switch to the relevant tab
    if (tool.status === "done") {
      if (toolId === "transcript") setActiveTab("transcript");
      else if (toolId === "summary") setActiveTab("summary");
      return;
    }

    setTools(prev => prev.map(t => t.id === toolId ? { ...t, status: "running" as const, progress: 0 } : t));
    try {
      await onTriggerModule(toolId);
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, status: "done" as const, progress: 100 } : t));
      // Auto-switch to result tab
      if (toolId === "transcript") setActiveTab("transcript");
      else if (toolId === "summary") setActiveTab("summary");
    } catch {
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, status: "error" as const, progress: 0 } : t));
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyTranscript = (segments: TranscriptSegment[]) => {
    const text = segments.map(seg => seg.text).join(' ');
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Transcript copied to clipboard" });
  };

  const handleCopySummary = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Summary copied to clipboard" });
  };

  const transcriptResult = moduleResults.transcript as TranscriptResult | undefined;
  const filteredSegments = transcriptResult?.segments?.filter(seg =>
    !transcriptSearch || seg.text.toLowerCase().includes(transcriptSearch.toLowerCase())
  ) || [];

  const summaryText = videoData.summary ||
    (moduleResults.summary as { text?: string } | undefined)?.text || "";

  const keyframes = videoData.keyframes ||
    (moduleResults.keyframes as { keyframes?: KeyframeItem[] } | undefined)?.keyframes || [];

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const getToolStatus = (id: string) => tools.find(t => t.id === id)?.status || "idle";

  const hasTranscript = !!(transcriptResult?.segments?.length || videoData.transcript);
  const hasSummary = !!summaryText;
  const hasKeyframes = keyframes.length > 0;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* ===== Header Bar ===== */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 shrink-0">
        {/* Left: Asset info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
            isIngesting ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
          )}>
            {isIngesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TerminalIcon className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0">
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-wider text-foreground truncate">
              {videoData.title}
            </h2>
            <p className="text-[9px] text-muted-foreground/60 font-mono">
              {videoData.id.substring(0, 8)} | {videoData.duration}
              {!quotaLoading && quota && (
                <span className="ml-2 text-primary/50">
                  {quota.videos_remaining}/{quota.monthly_video_limit} left
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Center: Module action buttons */}
        <div className="flex items-center gap-1.5">
          {tools.map((tool) => {
            const isRunning = tool.status === "running";
            const isDone = tool.status === "done";
            const isError = tool.status === "error";
            const isDisabled = isIngesting || isRunning;
            const needsDownload = !videoData.downloaded && tool.id !== 'download' && videoData.source_type === 'youtube' && tool.status === 'idle';

            return (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDisabled}
                    onClick={() => handleToolClick(tool.id)}
                    className={cn(
                      "h-7 px-2.5 gap-1.5 font-mono text-[10px] relative transition-all",
                      isDone && "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10",
                      isRunning && "text-primary hover:bg-primary/10",
                      isError && "text-red-400 hover:text-red-300 hover:bg-red-500/10",
                      !isDone && !isRunning && !isError && "text-muted-foreground/70 hover:text-foreground",
                      needsDownload && "opacity-40"
                    )}
                  >
                    {isRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isDone ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : isError ? (
                      <AlertCircle className="w-3 h-3" />
                    ) : (
                      <tool.icon className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">{tool.name}</span>
                    {isRunning && (
                      <span className="absolute -bottom-px left-2 right-2 h-[2px] bg-primary/60 rounded-full animate-pulse" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="font-mono text-[10px]">
                  {isRunning ? "Processing..." :
                   isDone ? `${tool.name} complete` :
                   isError ? `${tool.name} failed - click to retry` :
                   needsDownload ? "Download video first" :
                   `Run ${tool.name}${tool.cost > 0 ? ` (-${tool.cost}cr)` : ''}`}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Right: Status badge */}
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-[9px] border px-2 shrink-0",
            isIngesting
              ? "border-amber-500/30 text-amber-500 bg-amber-500/5"
              : "border-primary/30 text-primary bg-primary/5"
          )}
        >
          {isIngesting ? (
            <><Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" /> DOWNLOADING</>
          ) : (
            <><CheckCircle2 className="w-2.5 h-2.5 mr-1" /> READY</>
          )}
        </Badge>
      </div>

      {/* ===== Main Content: Left/Right Split ===== */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left column: Video + Terminal */}
        <div className="w-[45%] shrink-0 flex flex-col border-r border-border/30">
          {/* Video Player */}
          <div className="aspect-video shrink-0 bg-black/80 relative overflow-hidden">
            {videoData.oss_video_url ? (
              <video className="w-full h-full object-contain" controls src={videoData.oss_video_url} poster={videoData.thumbnail_url}>
                Your browser does not support the video tag.
              </video>
            ) : videoData.thumbnail_url ? (
              <div className="w-full h-full relative">
                <img src={videoData.thumbnail_url} alt={videoData.title} className="w-full h-full object-cover opacity-40" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Download className="w-8 h-8 text-white/40 mb-2" />
                  <p className="text-[11px] font-mono text-white/60">NOT_DOWNLOADED</p>
                  <p className="text-[9px] font-mono text-white/30 mt-1">Click Download in the toolbar above</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {isIngesting ? (
                  <Loader2 className="w-10 h-10 text-white/10 animate-spin" />
                ) : (
                  <Play className="w-10 h-10 text-white/10" />
                )}
              </div>
            )}
          </div>

          {/* Collapsible Terminal */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* Terminal toggle bar */}
            <button
              onClick={() => setTerminalOpen(prev => !prev)}
              className="flex items-center justify-between px-3 py-1.5 bg-[#080a0f] border-t border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors shrink-0"
            >
              <span className="text-muted-foreground/50 flex items-center gap-2 text-[10px] font-mono">
                <TerminalIcon className="w-3 h-3" />
                SYSTEM_LOG
                {logs.length > 0 && (
                  <Badge variant="outline" className="text-[8px] h-3.5 border-white/10 text-white/25 bg-transparent font-mono px-1">
                    {logs.length}
                  </Badge>
                )}
                {anyRunning && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                )}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/40" />
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500/40" />
                </div>
                {terminalOpen ? <ChevronDown className="w-3 h-3 text-white/20" /> : <ChevronUp className="w-3 h-3 text-white/20" />}
              </div>
            </button>

            {/* Terminal content */}
            {terminalOpen && (
              <div className="flex-1 min-h-0 bg-[#080a0f] animate-in slide-in-from-top-1 duration-150">
                <ScrollArea className="h-full p-3" ref={scrollRef}>
                  <div className="space-y-0.5 font-mono text-[11px]">
                    {logs.map((log) => (
                      <div key={log.id} className="flex gap-2 leading-relaxed">
                        <span className="text-white/15 shrink-0">[{log.time}]</span>
                        <span className={cn(
                          log.type === "success" && "text-emerald-400",
                          log.type === "error" && "text-red-400",
                          log.type === "warning" && "text-amber-400",
                          log.type === "process" && "text-cyan-400",
                          log.type === "info" && "text-slate-400"
                        )}>
                          <span className="text-white/20 mr-1">{log.type === "process" ? ">" : "$"}</span>
                          {log.message}
                        </span>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="text-white/10 italic">Awaiting process...</div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Spacer when terminal is closed */}
            {!terminalOpen && <div className="flex-1 bg-[#080a0f]" />}
          </div>
        </div>

        {/* Right column: Tabbed results */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            {/* Tab triggers */}
            <TabsList className="h-auto p-0 bg-transparent border-b border-border/30 rounded-none justify-start shrink-0">
              <TabsTrigger
                value="summary"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-mono text-[11px] px-4 py-2.5 gap-1.5 transition-colors"
              >
                <Zap className="w-3 h-3" />
                Summary
                {hasSummary && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </TabsTrigger>
              <TabsTrigger
                value="transcript"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-mono text-[11px] px-4 py-2.5 gap-1.5 transition-colors"
              >
                <FileText className="w-3 h-3" />
                Transcript
                {hasTranscript && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </TabsTrigger>
              <TabsTrigger
                value="keyframes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-mono text-[11px] px-4 py-2.5 gap-1.5 transition-colors"
              >
                <ImageIcon className="w-3 h-3" />
                Keyframes
                {hasKeyframes && (
                  <Badge variant="outline" className="text-[8px] h-3.5 border-white/10 text-white/40 bg-transparent font-mono px-1 ml-0.5">
                    {keyframes.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ===== Tab: Summary ===== */}
            <TabsContent value="summary" className="flex-1 min-h-0 mt-0">
              {hasSummary ? (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-border/20 shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">
                      AI-Generated Summary
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px] text-muted-foreground/50 hover:text-foreground font-mono gap-1"
                      onClick={() => handleCopySummary(summaryText)}
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 px-4 py-3">
                    <p className="text-[13px] text-foreground/85 leading-relaxed whitespace-pre-wrap">
                      {summaryText}
                    </p>
                  </ScrollArea>
                </div>
              ) : (
                <EmptyTabState
                  icon={Zap}
                  title="No summary yet"
                  description="Run the Summary module to generate an AI-powered overview of this video."
                  actionLabel={getToolStatus("summary") === "running" ? "Generating..." : "Generate Summary"}
                  actionDisabled={getToolStatus("summary") === "running" || isIngesting}
                  onAction={() => handleToolClick("summary")}
                  prerequisite={getToolStatus("transcript") !== "done" ? "Requires transcription first" : undefined}
                />
              )}
            </TabsContent>

            {/* ===== Tab: Transcript ===== */}
            <TabsContent value="transcript" className="flex-1 min-h-0 mt-0">
              {hasTranscript ? (
                <div className="h-full flex flex-col">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border/20 shrink-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="relative flex-1 max-w-[240px]">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/30" />
                        <Input
                          placeholder="Search transcript..."
                          value={transcriptSearch}
                          onChange={(e) => setTranscriptSearch(e.target.value)}
                          className="h-6 pl-7 text-[10px] bg-transparent border-border/30 text-foreground placeholder:text-muted-foreground/30 focus-visible:ring-0 focus-visible:border-primary/40 font-mono"
                        />
                      </div>
                      {transcriptResult?.segments?.length && (
                        <span className="text-[9px] font-mono text-muted-foreground/40 shrink-0">
                          {transcriptSearch ? `${filteredSegments.length}/` : ''}{transcriptResult.segments.length} segments
                          {transcriptResult.language && ` | ${transcriptResult.language}`}
                        </span>
                      )}
                    </div>
                    {transcriptResult?.segments && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-muted-foreground/50 hover:text-foreground font-mono gap-1 shrink-0"
                        onClick={() => handleCopyTranscript(transcriptResult.segments)}
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </Button>
                    )}
                  </div>

                  {/* Segments list */}
                  <ScrollArea className="flex-1">
                    <div className="px-4 py-2 space-y-0.5">
                      {transcriptResult?.segments?.length ? (
                        <>
                          {filteredSegments.map((seg, idx) => (
                            <div key={idx} className="flex gap-3 hover:bg-muted/30 rounded px-2 py-1 -mx-2 transition-colors group">
                              <span className="text-primary/40 whitespace-nowrap shrink-0 text-[10px] font-mono pt-0.5 group-hover:text-primary/70 transition-colors cursor-pointer">
                                {formatTime(seg.start_time)}
                              </span>
                              <span className="text-foreground/75 leading-relaxed text-[12px]">{seg.text}</span>
                            </div>
                          ))}
                          {transcriptSearch && filteredSegments.length === 0 && (
                            <div className="text-muted-foreground/30 italic text-center py-8 text-xs">No matches for "{transcriptSearch}"</div>
                          )}
                        </>
                      ) : (
                        <p className="text-foreground/75 leading-relaxed text-[12px] whitespace-pre-wrap py-2">
                          {videoData.transcript}
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <EmptyTabState
                  icon={FileText}
                  title="No transcript yet"
                  description="Run the Transcript module to extract speech from this video."
                  actionLabel={getToolStatus("transcript") === "running" ? "Transcribing..." : "Start Transcription"}
                  actionDisabled={getToolStatus("transcript") === "running" || isIngesting}
                  onAction={() => handleToolClick("transcript")}
                  prerequisite={!videoData.downloaded && videoData.source_type === 'youtube' ? "Download video first" : undefined}
                />
              )}
            </TabsContent>

            {/* ===== Tab: Keyframes ===== */}
            <TabsContent value="keyframes" className="flex-1 min-h-0 mt-0">
              {hasKeyframes ? (
                <div className="h-full flex flex-col">
                  {/* Timeline bar */}
                  <div className="px-4 pt-3 pb-2 border-b border-border/20 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">
                        {keyframes.length} Keyframes
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground/40">
                        {formatTime(keyframes[0]?.timestamp || 0)} - {formatTime(keyframes[keyframes.length - 1]?.timestamp || 0)}
                      </span>
                    </div>
                    {/* Interactive timeline */}
                    <div className="relative h-6 group">
                      {/* Track */}
                      <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[3px] bg-border/40 rounded-full" />
                      {/* Filled track up to selected keyframe */}
                      {(() => {
                        const maxTs = keyframes[keyframes.length - 1]?.timestamp || 1;
                        const selectedTs = keyframes[selectedKeyframeIdx]?.timestamp || 0;
                        const pct = (selectedTs / maxTs) * 100;
                        return (
                          <div
                            className="absolute top-1/2 -translate-y-1/2 left-0 h-[3px] bg-primary/50 rounded-full transition-all duration-200"
                            style={{ width: `${pct}%` }}
                          />
                        );
                      })()}
                      {/* Keyframe markers */}
                      {keyframes.map((kf, idx) => {
                        const maxTs = keyframes[keyframes.length - 1]?.timestamp || 1;
                        const pct = (kf.timestamp / maxTs) * 100;
                        const isSelected = idx === selectedKeyframeIdx;
                        return (
                          <button
                            key={kf.id}
                            onClick={() => setSelectedKeyframeIdx(idx)}
                            className={cn(
                              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full transition-all duration-200",
                              isSelected
                                ? "w-3.5 h-3.5 bg-primary ring-2 ring-primary/30 z-10"
                                : "w-2.5 h-2.5 bg-muted-foreground/40 hover:bg-primary/70 hover:scale-125"
                            )}
                            style={{ left: `${pct}%` }}
                          >
                            {isSelected && (
                              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono text-primary whitespace-nowrap">
                                {formatTime(kf.timestamp)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected keyframe detail */}
                  {keyframes[selectedKeyframeIdx] && (
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="flex gap-4 p-4 flex-1 min-h-0">
                        {/* Large image */}
                        <div className="w-[55%] shrink-0 flex flex-col">
                          <div className="relative rounded-lg overflow-hidden border border-border/30 bg-black/40 flex-1 min-h-0">
                            {keyframes[selectedKeyframeIdx].url ? (
                              <img
                                src={keyframes[selectedKeyframeIdx].url}
                                alt={keyframes[selectedKeyframeIdx].description}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-white/10" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Info panel */}
                        <div className="flex-1 min-w-0 flex flex-col gap-3">
                          {/* Navigation + timestamp */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-[10px] px-2 gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(keyframes[selectedKeyframeIdx].timestamp)}
                              </Badge>
                              <span className="text-[10px] font-mono text-muted-foreground/40">
                                {selectedKeyframeIdx + 1} / {keyframes.length}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground/40 hover:text-foreground"
                                disabled={selectedKeyframeIdx === 0}
                                onClick={() => setSelectedKeyframeIdx(prev => prev - 1)}
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground/40 hover:text-foreground"
                                disabled={selectedKeyframeIdx === keyframes.length - 1}
                                onClick={() => setSelectedKeyframeIdx(prev => prev + 1)}
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Scene description */}
                          <div className="flex-1 min-h-0">
                            <h4 className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider mb-1.5">
                              Scene Description
                            </h4>
                            <ScrollArea className="h-[calc(100%-24px)]">
                              <p className="text-[13px] text-foreground/80 leading-relaxed">
                                {keyframes[selectedKeyframeIdx].description}
                              </p>
                            </ScrollArea>
                          </div>

                          {/* Action */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-mono text-[11px] gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 w-full"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Ask AI about this frame
                          </Button>
                        </div>
                      </div>

                      {/* Filmstrip thumbnails */}
                      <div className="border-t border-border/20 px-4 py-2.5 shrink-0">
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                          {keyframes.map((kf, idx) => (
                            <button
                              key={kf.id}
                              onClick={() => setSelectedKeyframeIdx(idx)}
                              className={cn(
                                "shrink-0 w-16 rounded overflow-hidden border-2 transition-all",
                                idx === selectedKeyframeIdx
                                  ? "border-primary ring-1 ring-primary/30 opacity-100"
                                  : "border-transparent opacity-50 hover:opacity-80"
                              )}
                            >
                              <div className="aspect-video bg-black/40 relative">
                                {kf.url ? (
                                  <img src={kf.url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-3 h-3 text-white/10" />
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyTabState
                  icon={ImageIcon}
                  title="No keyframes yet"
                  description="Keyframes are extracted automatically when you run the Summary module."
                  actionLabel={getToolStatus("summary") === "running" ? "Extracting..." : "Generate Summary & Keyframes"}
                  actionDisabled={getToolStatus("summary") === "running" || isIngesting}
                  onAction={() => handleToolClick("summary")}
                  prerequisite={getToolStatus("transcript") !== "done" ? "Requires transcription first" : undefined}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

/* ===== Empty Tab Placeholder ===== */
interface EmptyTabStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel: string;
  actionDisabled: boolean;
  onAction: () => void;
  prerequisite?: string;
}

const EmptyTabState: React.FC<EmptyTabStateProps> = ({
  icon: Icon, title, description, actionLabel, actionDisabled, onAction, prerequisite
}) => (
  <div className="flex flex-col items-center justify-center h-full px-6">
    <div className="text-center space-y-4 max-w-[280px]">
      <div className="w-12 h-12 mx-auto rounded-lg bg-muted/30 border border-border/30 flex items-center justify-center">
        <Icon className="w-5 h-5 text-muted-foreground/30" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-sm font-mono font-medium text-foreground/80">{title}</h3>
        <p className="text-[11px] text-muted-foreground/50 leading-relaxed">{description}</p>
      </div>
      {prerequisite ? (
        <p className="text-[10px] text-amber-500/70 font-mono flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3 h-3" /> {prerequisite}
        </p>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={actionDisabled}
          onClick={onAction}
          className="font-mono text-[11px] gap-1.5 border-border/40 hover:border-primary/40 hover:text-primary"
        >
          {actionDisabled && <Loader2 className="w-3 h-3 animate-spin" />}
          {actionLabel}
        </Button>
      )}
    </div>
  </div>
);

export default Workbench;
