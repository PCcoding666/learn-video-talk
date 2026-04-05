import { useState } from "react";
import { Play, Download, Search, Copy, FileText, ImageIcon, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import MarkdownRenderer from "@/components/chat/MarkdownRenderer";
import type { VideoData } from "@/pages/MainApp";
import type { TranscriptSegment } from "@/services/api";

export type ReferenceTab = "transcript" | "summary" | "keyframes";

interface ReferencePanelProps {
  videoData: VideoData;
  transcriptSegments: TranscriptSegment[];
  transcriptLanguage?: string;
  activeTab: ReferenceTab;
  onTabChange: (tab: ReferenceTab) => void;
  onTimestampJump: (timestamp: number) => void;
}

const ReferencePanel = ({
  videoData,
  transcriptSegments,
  transcriptLanguage,
  activeTab,
  onTabChange,
  onTimestampJump,
}: ReferencePanelProps) => {
  const { toast } = useToast();
  const [transcriptSearch, setTranscriptSearch] = useState("");

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const filteredSegments = transcriptSegments.filter(
    (seg) =>
      !transcriptSearch ||
      seg.text.toLowerCase().includes(transcriptSearch.toLowerCase()),
  );

  const handleCopyTranscript = () => {
    const text = transcriptSegments.map((seg) => seg.text).join(" ");
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Transcript copied to clipboard" });
  };

  const hasTranscript =
    transcriptSegments.length > 0 || !!videoData.transcript;

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border/60 overflow-hidden">
      {/* Video Player */}
      <div className="aspect-video shrink-0 bg-black/80 relative overflow-hidden rounded-t-lg">
        {videoData.oss_video_url ? (
          <video
            className="w-full h-full object-contain"
            controls
            src={videoData.oss_video_url}
            poster={videoData.thumbnail_url}
          >
            Your browser does not support the video tag.
          </video>
        ) : videoData.thumbnail_url ? (
          <div className="w-full h-full relative">
            <img
              src={videoData.thumbnail_url}
              alt={videoData.title}
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Download className="w-8 h-8 text-white/40 mb-2" />
              <p className="text-[11px] font-mono text-white/60">
                NOT_DOWNLOADED
              </p>
              <p className="text-[9px] font-mono text-white/30 mt-1">
                Download via quick actions
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-10 h-10 text-white/10" />
          </div>
        )}
      </div>

      {/* Video Info Bar */}
      <div className="px-3 py-2 border-b border-border/30 shrink-0">
        <h2 className="text-[11px] font-mono font-bold text-foreground truncate">
          {videoData.title}
        </h2>
        <p className="text-[9px] text-muted-foreground/60 font-mono mt-0.5">
          {videoData.id.substring(0, 8)} | {videoData.duration}
        </p>
      </div>

      {/* Tabbed Content Section */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => onTabChange(v as ReferenceTab)}
        className="flex-1 min-h-0 flex flex-col"
      >
        <TabsList className="h-8 w-full rounded-none border-b border-border/20 bg-transparent p-0 shrink-0">
          <TabsTrigger
            value="transcript"
            className="flex-1 h-full rounded-none border-b-2 border-transparent text-[10px] font-mono text-muted-foreground/50 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1"
          >
            <FileText className="w-3 h-3" />
            Transcript
            {hasTranscript && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="summary"
            className="flex-1 h-full rounded-none border-b-2 border-transparent text-[10px] font-mono text-muted-foreground/50 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1"
          >
            <BookOpen className="w-3 h-3" />
            Summary
            {videoData.summary && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="keyframes"
            className="flex-1 h-full rounded-none border-b-2 border-transparent text-[10px] font-mono text-muted-foreground/50 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none gap-1"
          >
            <ImageIcon className="w-3 h-3" />
            Keyframes
            {videoData.keyframes.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Transcript Tab */}
        <TabsContent value="transcript" className="flex-1 min-h-0 flex flex-col mt-0">
          {hasTranscript ? (
            <>
              {/* Search + Copy Bar */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/20 shrink-0">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative flex-1 max-w-[200px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/30" />
                    <Input
                      placeholder="Search transcript..."
                      value={transcriptSearch}
                      onChange={(e) => setTranscriptSearch(e.target.value)}
                      className="h-6 pl-7 text-[10px] bg-transparent border-border/30 text-foreground placeholder:text-muted-foreground/30 focus-visible:ring-0 focus-visible:border-primary/40 font-mono"
                    />
                  </div>
                  {transcriptSegments.length > 0 && (
                    <span className="text-[9px] font-mono text-muted-foreground/40 shrink-0">
                      {transcriptSearch
                        ? `${filteredSegments.length}/`
                        : ""}
                      {transcriptSegments.length} seg
                      {transcriptLanguage && ` | ${transcriptLanguage}`}
                    </span>
                  )}
                </div>
                {transcriptSegments.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] text-muted-foreground/50 hover:text-foreground font-mono gap-1 shrink-0"
                    onClick={handleCopyTranscript}
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </Button>
                )}
              </div>

              {/* Segments List */}
              <ScrollArea className="flex-1">
                <div className="px-3 py-2 space-y-0.5">
                  {transcriptSegments.length > 0 ? (
                    <>
                      {filteredSegments.map((seg, idx) => (
                        <div
                          key={idx}
                          className="flex gap-3 hover:bg-muted/30 rounded px-2 py-1 -mx-2 transition-colors group cursor-pointer"
                          onClick={() => onTimestampJump(seg.start_time)}
                        >
                          <span className="text-primary/40 whitespace-nowrap shrink-0 text-[10px] font-mono pt-0.5 group-hover:text-primary/70 transition-colors">
                            {formatTime(seg.start_time)}
                          </span>
                          <span className="text-foreground/75 leading-relaxed text-[12px]">
                            {seg.text}
                          </span>
                        </div>
                      ))}
                      {transcriptSearch && filteredSegments.length === 0 && (
                        <div className="text-muted-foreground/30 italic text-center py-8 text-xs">
                          No matches for &ldquo;{transcriptSearch}&rdquo;
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-foreground/75 leading-relaxed text-[12px] whitespace-pre-wrap py-2">
                      {videoData.transcript}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 px-4">
              <FileText className="w-5 h-5 text-muted-foreground/20 mb-2" />
              <p className="text-[10px] font-mono text-muted-foreground/40 text-center">
                No transcript yet.
                <br />
                Use &ldquo;Transcribe&rdquo; to extract speech.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="flex-1 min-h-0 flex flex-col mt-0">
          {videoData.summary ? (
            <ScrollArea className="flex-1">
              <div className="px-4 py-3">
                <MarkdownRenderer content={videoData.summary} />
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 px-4">
              <BookOpen className="w-5 h-5 text-muted-foreground/20 mb-2" />
              <p className="text-[10px] font-mono text-muted-foreground/40 text-center">
                No summary yet.
                <br />
                Use &ldquo;Summary&rdquo; to generate an AI summary.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Keyframes Tab */}
        <TabsContent value="keyframes" className="flex-1 min-h-0 flex flex-col mt-0">
          {videoData.keyframes.length > 0 ? (
            <ScrollArea className="flex-1">
              <div className="px-3 py-2 grid grid-cols-2 gap-2">
                {videoData.keyframes.map((kf) => (
                  <div
                    key={kf.id}
                    className="group rounded-md overflow-hidden border border-border/30 bg-muted/20 hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => onTimestampJump(kf.timestamp)}
                  >
                    {kf.url ? (
                      <img
                        src={kf.url}
                        alt={kf.description}
                        className="w-full aspect-video object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-muted/40 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="px-2 py-1.5">
                      <span className="text-[9px] font-mono text-primary/50 group-hover:text-primary/80 transition-colors">
                        {formatTime(kf.timestamp)}
                      </span>
                      <p className="text-[10px] text-foreground/60 leading-tight mt-0.5 line-clamp-2">
                        {kf.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 px-4">
              <ImageIcon className="w-5 h-5 text-muted-foreground/20 mb-2" />
              <p className="text-[10px] font-mono text-muted-foreground/40 text-center">
                No keyframes yet.
                <br />
                Use &ldquo;Summary&rdquo; to extract key frames.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReferencePanel;
