import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Download, FileDown, CheckCircle } from "lucide-react";
import { useState } from "react";
import MarkdownRenderer from "@/components/chat/MarkdownRenderer";
import type { VideoData } from "@/pages/MainApp";
import { useToast } from "@/hooks/use-toast";

interface SummaryViewProps {
  videoData: VideoData & {
    resolution?: string;
    file_size?: string;
  };
}

const SummaryView = ({ videoData }: SummaryViewProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(videoData.summary);
      setCopied(true);
      toast({ title: "Copied", description: "Summary copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Error", description: "Failed to copy", variant: "destructive" });
    }
  };

  const handleDownloadVideo = () => {
    if (videoData.oss_video_url) {
      window.open(videoData.oss_video_url, '_blank');
    } else {
      toast({ title: "Not available", description: "Video not downloaded yet", variant: "destructive" });
    }
  };

  const handleExportMD = () => {
    const content = `# ${videoData.title}\n\n## Summary\n\n${videoData.summary}\n\n## Transcript\n\n${videoData.transcript || 'N/A'}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoData.title.replace(/[^a-z0-9]/gi, '_')}_summary.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Summary exported as Markdown" });
  };

  return (
    <div className="space-y-6">
      {/* Detailed Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>📚</span>
            Summary
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={handleCopy}
          >
            {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <MarkdownRenderer content={videoData.summary || "No summary available yet. Run the AI Summary module to generate."} />
        </div>
      </Card>

      {/* Video Info */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📊</span>
          Video Info
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl mb-2">🕐</div>
            <p className="text-sm text-muted-foreground mb-1">Duration</p>
            <p className="font-semibold">{videoData.duration || "N/A"}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl mb-2">👁️</div>
            <p className="text-sm text-muted-foreground mb-1">Resolution</p>
            <p className="font-semibold">{videoData.resolution || "N/A"}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-2xl mb-2">💾</div>
            <p className="text-sm text-muted-foreground mb-1">File Size</p>
            <p className="font-semibold">{videoData.file_size || "N/A"}</p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button 
          variant="outline" 
          className="flex-1 gap-2"
          onClick={handleDownloadVideo}
          disabled={!videoData.oss_video_url}
        >
          <Download className="w-4 h-4" />
          Download Video
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 gap-2"
          onClick={handleExportMD}
          disabled={!videoData.summary}
        >
          <FileDown className="w-4 h-4" />
          Export as MD
        </Button>
      </div>
    </div>
  );
};

export default SummaryView;
