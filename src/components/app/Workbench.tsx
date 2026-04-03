import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Download, FileText, Zap, 
  Terminal as TerminalIcon, CheckCircle2, AlertCircle, 
  Loader2, Copy, Search, X, Image as ImageIcon, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
  description: string;
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
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [showKeyframes, setShowKeyframes] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState("");
  
  // 三个核心模块：Download, Transcript, Summary
  const [tools, setTools] = useState<Tool[]>([
    { id: "download", name: "Media Export", description: "Download original video", icon: Download, status: "idle", progress: 0, cost: 0 },
    { id: "transcript", name: "Speech-to-Text", description: "Extract full transcript", icon: FileText, status: "idle", progress: 0, cost: 10 },
    { id: "summary", name: "AI Synthesis", description: "Generate summary + keyframes", icon: Zap, status: "idle", progress: 0, cost: 20 }
  ]);

  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);

  // 根据 moduleResults 初始化工具状态（用于历史记录加载）
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

  const handleToolClick = async (toolId: string) => {
    if (isIngesting) return;
    const tool = tools.find(t => t.id === toolId);
    if (!tool || tool.status === "running") return;
    
    // 如果已完成，切换展开状态
    if (tool.status === "done") {
      if (toolId === "transcript") {
        setTranscriptExpanded(prev => !prev);
        setSummaryExpanded(false);
      } else if (toolId === "summary") {
        setSummaryExpanded(prev => !prev);
        setTranscriptExpanded(false);
      }
      return;
    }
    
    setTools(prev => prev.map(t => t.id === toolId ? { ...t, status: "running" as const, progress: 0 } : t));
    try {
      await onTriggerModule(toolId);
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, status: "done" as const, progress: 100 } : t));
      // 自动展开结果
      if (toolId === "transcript") {
        setTranscriptExpanded(true);
        setSummaryExpanded(false);
      } else if (toolId === "summary") {
        setSummaryExpanded(true);
        setTranscriptExpanded(false);
      }
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

  // 获取摘要文本
  const summaryText = videoData.summary || 
    (moduleResults.summary as { text?: string } | undefined)?.text || "";
  
  // 获取关键帧
  const keyframes = videoData.keyframes || 
    (moduleResults.keyframes as { keyframes?: KeyframeItem[] } | undefined)?.keyframes || [];

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center",
            isIngesting ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"
          )}>
            {isIngesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <TerminalIcon className="w-4 h-4" />}
          </div>
          <div>
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
              {isIngesting ? "INGESTING..." : `ASSET:${videoData.id.substring(0, 8)}`}
            </h2>
            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[300px]">
              {videoData.title} | {videoData.duration}
            </p>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "font-mono text-[9px] border px-2",
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

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 overflow-hidden p-4">
        {/* Left: Player + Terminal + Result Panels */}
        <div className="lg:col-span-8 flex flex-col gap-3 min-h-0 overflow-hidden">
          {/* Video */}
          <div className="aspect-video shrink-0 bg-black/80 rounded-md border border-white/[0.04] relative overflow-hidden">
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
                  <p className="text-[9px] font-mono text-white/30 mt-1">Run Media Export to download</p>
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

          {/* Terminal */}
          <Card className={cn(
            "bg-[#080a0f] border-white/[0.04] p-0 font-mono text-[11px] overflow-hidden flex flex-col relative",
            (transcriptExpanded || summaryExpanded) ? "h-28 shrink-0" : "flex-1"
          )}>
            <div className="bg-white/[0.02] px-3 py-1.5 border-b border-white/[0.04] flex items-center justify-between">
              <span className="text-muted-foreground/60 flex items-center gap-2 text-[10px]">
                <TerminalIcon className="w-3 h-3" /> SYSTEM_LOG
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500/40" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/40" />
                <div className="w-2 h-2 rounded-full bg-green-500/40" />
              </div>
            </div>
            <ScrollArea className="flex-1 p-3" ref={scrollRef}>
              <div className="space-y-0.5">
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
          </Card>

          {/* Transcript Panel */}
          {transcriptExpanded && (transcriptResult?.segments?.length || videoData.transcript) ? (
            <Card className="flex-1 min-h-[160px] max-h-[40%] bg-[#080a0f] border-white/[0.04] p-0 font-mono text-[11px] overflow-hidden flex flex-col animate-in slide-in-from-bottom-2 duration-200">
              <div className="bg-white/[0.02] px-3 py-1.5 border-b border-white/[0.04] flex items-center justify-between shrink-0">
                <span className="text-emerald-400/80 flex items-center gap-2 text-[10px]">
                  <FileText className="w-3 h-3" />
                  TRANSCRIPT {transcriptResult?.segments?.length ? `| ${transcriptResult.segments.length} segments` : ''}
                  {transcriptResult?.language && (
                    <Badge variant="outline" className="text-[8px] h-3.5 border-white/10 text-white/30 bg-transparent ml-1 font-mono">
                      {transcriptResult.language}
                    </Badge>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  {transcriptResult?.segments && (
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] text-white/30 hover:text-white hover:bg-white/5" onClick={() => handleCopyTranscript(transcriptResult.segments)}>
                      <Copy className="w-2.5 h-2.5 mr-1" /> Copy
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-white/30 hover:text-white hover:bg-white/5" onClick={() => setTranscriptExpanded(false)}>
                    <X className="w-2.5 h-2.5" />
                  </Button>
                </div>
              </div>
              {transcriptResult?.segments?.length ? (
                <>
                  <div className="px-3 py-1 border-b border-white/[0.03] shrink-0">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/15" />
                      <Input
                        placeholder="Search..."
                        value={transcriptSearch}
                        onChange={(e) => setTranscriptSearch(e.target.value)}
                        className="h-6 pl-7 text-[10px] bg-transparent border-white/[0.04] text-slate-300 placeholder:text-white/15 focus-visible:ring-0 focus-visible:border-white/10"
                      />
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-1">
                      {filteredSegments.map((seg, idx) => (
                        <div key={idx} className="flex gap-2 hover:bg-white/[0.02] rounded px-1 py-0.5 -mx-1 transition-colors">
                          <span className="text-white/20 whitespace-nowrap shrink-0 text-[10px]">[{formatTime(seg.start_time)}]</span>
                          <span className="text-slate-300/80 leading-relaxed text-[11px]">{seg.text}</span>
                        </div>
                      ))}
                      {transcriptSearch && filteredSegments.length === 0 && (
                        <div className="text-white/15 italic text-center py-4">No matches</div>
                      )}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <ScrollArea className="flex-1 p-3">
                  <p className="text-slate-300/80 leading-relaxed text-[11px] whitespace-pre-wrap">
                    {videoData.transcript}
                  </p>
                </ScrollArea>
              )}
            </Card>
          ) : null}

          {/* Summary Panel (includes optional keyframes) */}
          {summaryExpanded && summaryText ? (
            <Card className="flex-1 min-h-[160px] max-h-[50%] bg-[#080a0f] border-white/[0.04] p-0 font-mono text-[11px] overflow-hidden flex flex-col animate-in slide-in-from-bottom-2 duration-200">
              <div className="bg-white/[0.02] px-3 py-1.5 border-b border-white/[0.04] flex items-center justify-between shrink-0">
                <span className="text-amber-400/80 flex items-center gap-2 text-[10px]">
                  <Zap className="w-3 h-3" />
                  AI SUMMARY
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] text-white/30 hover:text-white hover:bg-white/5" onClick={() => handleCopySummary(summaryText)}>
                    <Copy className="w-2.5 h-2.5 mr-1" /> Copy
                  </Button>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-white/30 hover:text-white hover:bg-white/5" onClick={() => setSummaryExpanded(false)}>
                    <X className="w-2.5 h-2.5" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-4">
                  {/* Summary text */}
                  <p className="text-slate-300/90 leading-relaxed text-[11px] whitespace-pre-wrap">
                    {summaryText}
                  </p>
                  
                  {/* Keyframes section (collapsible) */}
                  {keyframes.length > 0 && (
                    <div className="border-t border-white/[0.04] pt-3">
                      <button 
                        onClick={() => setShowKeyframes(!showKeyframes)}
                        className="flex items-center gap-2 text-[10px] text-white/40 hover:text-white/60 transition-colors w-full"
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>View Keyframes ({keyframes.length})</span>
                        {showKeyframes ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                      </button>
                      
                      {showKeyframes && (
                        <div className="grid grid-cols-3 gap-2 mt-3 animate-in fade-in duration-200">
                          {keyframes.map((kf) => (
                            <div key={kf.id} className="relative group">
                              <div className="aspect-video bg-black/40 rounded overflow-hidden border border-white/[0.04]">
                                {kf.url ? (
                                  <img src={kf.url} alt={kf.description} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <ImageIcon className="w-4 h-4 text-white/10" />
                                  </div>
                                )}
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5">
                                <span className="text-[8px] text-white/60">{formatTime(kf.timestamp)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          ) : null}
        </div>

        {/* Right: Module cards */}
        <div className="lg:col-span-4 flex flex-col gap-2 min-h-0">
          <h3 className="text-[9px] font-mono font-bold text-muted-foreground/50 uppercase tracking-[0.2em] pl-0.5">
            Modules
          </h3>
          
          <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto">
            {tools.map((tool) => (
              <div 
                key={tool.id}
                className={cn(
                  "group relative p-3 rounded-md border transition-all",
                  "bg-card/50 border-border/40",
                  isIngesting ? "opacity-40 cursor-not-allowed" : "hover:border-primary/40 hover:bg-primary/5 cursor-pointer",
                  tool.status === "running" && "border-primary/50 bg-primary/5",
                  tool.status === "done" && "border-emerald-500/20",
                  tool.status === "done" && tool.id === "transcript" && transcriptExpanded && "border-emerald-500/40 bg-emerald-500/5",
                  tool.status === "done" && tool.id === "summary" && summaryExpanded && "border-emerald-500/40 bg-emerald-500/5"
                )}
                onClick={() => handleToolClick(tool.id)}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center border transition-colors",
                    tool.status === "running" ? "bg-primary/15 border-primary/30 text-primary" :
                    tool.status === "done" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                    "bg-muted/30 border-border/40 text-muted-foreground/50 group-hover:text-primary group-hover:border-primary/30"
                  )}>
                    <tool.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-mono font-bold tracking-tight">{tool.name}</h4>
                      <div className="flex items-center gap-1.5">
                        {tool.cost > 0 && tool.status === "idle" && (
                          <span className="text-[8px] font-mono text-muted-foreground/40">-{tool.cost}cr</span>
                        )}
                        {tool.status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        {tool.status === "error" && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground/50 font-mono mt-0.5">{tool.description}</p>
                    {!videoData.downloaded && tool.id !== 'download' && videoData.source_type === 'youtube' && tool.status === 'idle' && (
                      <p className="text-[8px] text-amber-500/60 font-mono mt-1 flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" /> Requires download
                      </p>
                    )}
                    {tool.status === "done" && (tool.id === "transcript" || tool.id === "summary") && (
                      <p className="text-[8px] text-emerald-500/60 font-mono mt-1">
                        Click to {(tool.id === "transcript" ? transcriptExpanded : summaryExpanded) ? 'collapse' : 'expand'}
                      </p>
                    )}
                  </div>
                </div>

                {tool.status === "running" && (
                  <div className="mt-2.5">
                    <div className="flex justify-between text-[8px] font-mono text-primary/80 mb-1 animate-pulse">
                      <span>EXECUTING...</span>
                    </div>
                    <Progress value={tool.progress} className="h-[2px] bg-white/5" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quota */}
          <div className="mt-auto pt-3 border-t border-border/30">
            <div className="bg-primary/5 border border-primary/15 rounded-md p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-mono text-primary/80 font-bold tracking-wider">QUOTA</span>
                {quotaLoading ? (
                  <Loader2 className="w-2.5 h-2.5 text-primary animate-spin" />
                ) : (
                  <span className="text-[9px] font-mono text-primary/70">
                    {quota ? `${quota.videos_remaining}/${quota.monthly_video_limit}` : "N/A"}
                  </span>
                )}
              </div>
              <Progress 
                value={quota ? ((quota.monthly_videos_used / quota.monthly_video_limit) * 100) : 0} 
                className="h-[2px] bg-white/5" 
              />
              {quota && (
                <p className="text-[8px] font-mono text-muted-foreground/40 mt-1.5">
                  {quota.used_storage_mb}/{quota.total_storage_mb}MB
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workbench;
