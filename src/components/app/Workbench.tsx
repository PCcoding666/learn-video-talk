import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Download, 
  FileText, 
  Zap, 
  Terminal as TerminalIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Copy,
  Search,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

interface WorkbenchProps {
  videoData: {
    id: string;
    title: string;
    duration: string;
    url?: string;
    oss_video_url?: string;
  };
  logs: Log[];
  onTriggerModule: (moduleId: string) => Promise<void>;
  isIngesting?: boolean;
  moduleResults?: Record<string, unknown>;
}

const Workbench: React.FC<WorkbenchProps> = ({ videoData, logs, onTriggerModule, isIngesting = false, moduleResults = {} }) => {
  const { toast } = useToast();
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [transcriptSearch, setTranscriptSearch] = useState("");
  const [tools, setTools] = useState<Tool[]>([
    {
      id: "download",
      name: "Media Export",
      description: "Download original Video/Audio assets",
      icon: Download,
      status: "idle",
      progress: 0,
      cost: 0
    },
    {
      id: "transcript",
      name: "Speech-to-Text",
      description: "Extract full transcript (SRT/TXT)",
      icon: FileText,
      status: "idle",
      progress: 0,
      cost: 10
    },
    {
      id: "summary",
      name: "AI Synthesis",
      description: "Generate structured content summary",
      icon: Zap,
      status: "idle",
      progress: 0,
      cost: 20
    }
  ]);

  const handleToolClick = async (toolId: string) => {
    if (isIngesting) return;
    const tool = tools.find(t => t.id === toolId);
    if (!tool || tool.status === "running") return;

    // If transcript is done, toggle the expanded panel
    if (toolId === "transcript" && tool.status === "done" && moduleResults.transcript) {
      setTranscriptExpanded(prev => !prev);
      return;
    }

    // Set tool to running
    setTools(prev => prev.map(t => t.id === toolId ? { ...t, status: "running" as const, progress: 0 } : t));

    try {
      await onTriggerModule(toolId);
      // Set tool to done on success
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, status: "done" as const, progress: 100 } : t));
      // Auto-expand transcript panel when transcript completes
      if (toolId === "transcript") {
        setTranscriptExpanded(true);
      }
    } catch {
      // Set tool to error on failure
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

  const transcriptResult = moduleResults.transcript as TranscriptResult | undefined;
  const filteredSegments = transcriptResult?.segments?.filter(seg =>
    !transcriptSearch || seg.text.toLowerCase().includes(transcriptSearch.toLowerCase())
  ) || [];

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "w-10 h-10 rounded flex items-center justify-center border",
            isIngesting ? "bg-amber-500/10 border-amber-500/20" : "bg-primary/10 border-primary/20"
          )}>
            {isIngesting ? (
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            ) : (
              <TerminalIcon className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-mono font-bold uppercase tracking-tighter">
              {isIngesting ? "INGESTING_ASSET..." : `Asset Ingested: ${videoData.id.substring(0, 8)}`}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">{videoData.title} | {videoData.duration}</p>
          </div>
        </div>
        {isIngesting ? (
          <Badge variant="outline" className="font-mono text-[10px] border-amber-500/50 text-amber-500 bg-amber-500/5">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> DOWNLOADING
          </Badge>
        ) : (
          <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/50 text-emerald-500 bg-emerald-500/5">
            <CheckCircle2 className="w-3 h-3 mr-1" /> READY_FOR_PROCESSING
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">
        {/* Left: Video Player + Terminal + Transcript */}
        <div className="lg:col-span-8 flex flex-col space-y-4 overflow-hidden">
          {/* Video Player / Preview */}
          <div className="aspect-video bg-black rounded-lg border border-white/[0.06] relative overflow-hidden">
            {videoData.oss_video_url ? (
              <video
                className="w-full h-full object-contain"
                controls
                src={videoData.oss_video_url}
                poster=""
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="w-full h-full flex items-center justify-center group">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-[10px] font-mono text-white/70">SOURCE_STREAM: {isIngesting ? "LOADING" : "READY"}</p>
                </div>
                {isIngesting ? (
                  <Loader2 className="w-12 h-12 text-white/20 animate-spin" />
                ) : (
                  <Play className="w-12 h-12 text-white/20" />
                )}
                <div className="absolute top-2 right-2 flex space-x-1">
                  <div className={cn("w-2 h-2 rounded-full", isIngesting ? "bg-amber-500 animate-pulse" : "bg-white/10")} />
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                </div>
              </div>
            )}
          </div>

          {/* Terminal Console */}
          <Card className={cn(
            "bg-[#0a0a0a] border-white/[0.06] p-0 font-mono text-[11px] overflow-hidden flex flex-col shadow-2xl",
            transcriptExpanded ? "h-32 shrink-0" : "flex-1"
          )}>
            <div className="bg-white/[0.03] px-3 py-1 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-2">
                    <TerminalIcon className="w-3 h-3" /> SYSTEM_LOGS
                </span>
                <span className="text-white/20">v3.1.0-stable</span>
            </div>
            <ScrollArea className="flex-1 p-3" ref={scrollRef}>
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className="flex space-x-2 leading-relaxed">
                    <span className="text-white/25">[{log.time}]</span>
                    <span className={cn(
                      "flex-1",
                      log.type === "success" && "text-emerald-400",
                      log.type === "error" && "text-red-400",
                      log.type === "warning" && "text-amber-400",
                      log.type === "process" && "text-blue-400",
                      log.type === "info" && "text-slate-300"
                    )}>
                      <span className="mr-1">{log.type === "process" ? ">" : "$"}</span>
                      {log.message}
                    </span>
                  </div>
                ))}
                {logs.length === 0 && (
                   <div className="text-white/15 italic">Waiting for process initiation...</div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Transcript Panel -- slides in when transcript is available and expanded */}
          {transcriptExpanded && transcriptResult?.segments?.length ? (
            <Card className="flex-1 min-h-0 bg-[#0a0a0a] border-white/[0.06] p-0 font-mono text-[11px] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white/[0.03] px-3 py-1.5 border-b border-white/[0.06] flex items-center justify-between shrink-0">
                <span className="text-emerald-400 flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  TRANSCRIPT_OUTPUT | {transcriptResult.segments.length} segments
                  {transcriptResult.language && (
                    <Badge variant="outline" className="text-[9px] h-4 border-white/10 text-white/40 bg-transparent ml-1">
                      {transcriptResult.language}
                    </Badge>
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-2 text-[10px] text-white/40 hover:text-white hover:bg-white/5"
                    onClick={() => handleCopyTranscript(transcriptResult.segments)}
                  >
                    <Copy className="w-3 h-3 mr-1" /> Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-white/40 hover:text-white hover:bg-white/5"
                    onClick={() => setTranscriptExpanded(false)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="px-3 py-1.5 border-b border-white/[0.04] shrink-0">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20" />
                  <Input
                    placeholder="Search transcript..."
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    className="h-6 pl-7 text-[11px] bg-transparent border-white/[0.06] text-slate-300 placeholder:text-white/20 focus-visible:ring-0 focus-visible:border-white/15"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-1.5">
                  {filteredSegments.map((seg, idx) => (
                    <div key={idx} className="flex gap-2 group hover:bg-white/[0.03] rounded px-1 py-0.5 -mx-1 transition-colors">
                      <span className="text-white/25 whitespace-nowrap shrink-0 text-[10px] pt-0.5">
                        [{formatTime(seg.start_time)}]
                      </span>
                      <span className="text-slate-300 leading-relaxed text-[11px]">{seg.text}</span>
                    </div>
                  ))}
                  {transcriptSearch && filteredSegments.length === 0 && (
                    <div className="text-white/20 italic text-center py-4">No matching segments found</div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          ) : null}
        </div>

        {/* Right: Toolbox */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          <h3 className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest pl-1">Available Modules</h3>
          
          <div className="space-y-2 overflow-y-auto pr-1">
            {tools.map((tool) => (
              <Card 
                key={tool.id}
                className={cn(
                  "p-3 bg-[#0a0a0a] border-white/[0.06] transition-all relative overflow-hidden",
                  isIngesting ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 cursor-pointer group",
                  tool.status === "running" && "border-primary shadow-[0_0_15px_rgba(var(--primary),0.1)]",
                  tool.status === "done" && tool.id === "transcript" && transcriptExpanded && "border-emerald-500/30"
                )}
                onClick={() => handleToolClick(tool.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    "p-2 rounded border transition-colors",
                    tool.status === "running"
                      ? "bg-primary/20 border-primary text-primary"
                      : tool.status === "done"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-white/[0.03] border-white/[0.06] text-white/40 group-hover:text-primary group-hover:border-primary/30"
                  )}>
                    <tool.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold font-mono tracking-tight">{tool.name}</h4>
                      {tool.cost > 0 && <span className="text-[9px] font-mono text-white/25">-{tool.cost} CR</span>}
                    </div>
                    <p className="text-[10px] text-white/30 font-mono mt-0.5 leading-tight">{tool.description}</p>
                  </div>
                </div>

                {tool.status === "running" && (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-primary animate-pulse">
                      <span>EXECUTING_LOGIC...</span>
                      <span>{tool.progress}%</span>
                    </div>
                    <Progress value={tool.progress} className="h-[2px] bg-white/5" />
                  </div>
                )}

                {tool.status === "done" && (
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    {tool.id === "transcript" && moduleResults.transcript && (
                      <span className="text-[9px] font-mono text-emerald-500/60">
                        {transcriptExpanded ? "VIEWING" : "VIEW"}
                      </span>
                    )}
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                )}

                {tool.status === "error" && (
                  <div className="absolute top-2 right-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                )}

                {tool.status === "idle" && !isIngesting && (
                  <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-3 h-3 text-primary" />
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-border/40">
             {/* TODO: Replace hardcoded quota values (842 CR, 84.2%, 12 days) with real user quota from backend */}
             <div className="bg-primary/5 border border-primary/20 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-primary font-bold">SYSTEM_QUOTA</span>
                    <span className="text-[10px] font-mono text-primary">842 CR</span>
                </div>
                <Progress value={84.2} className="h-1 bg-white/5" />
                <p className="text-[9px] font-mono text-white/30 mt-2">Credits refresh in 12 days. <span className="text-primary cursor-pointer hover:underline">UPGRADE_SYSTEM</span></p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workbench;
