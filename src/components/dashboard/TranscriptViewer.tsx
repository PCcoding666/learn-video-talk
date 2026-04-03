import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Copy, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptViewerProps {
  transcript: string;
}

const TranscriptViewer = ({ transcript }: TranscriptViewerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(transcript);
    toast({
      title: "Copied",
      description: "Transcript copied to clipboard",
    });
  };

  // Highlight search matches in the transcript
  const highlightedTranscript = useMemo(() => {
    if (!searchQuery.trim()) {
      return transcript;
    }
    
    try {
      // Escape special regex characters
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      const parts = transcript.split(regex);
      
      return parts.map((part, index) => {
        if (part.toLowerCase() === searchQuery.toLowerCase()) {
          return (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
              {part}
            </mark>
          );
        }
        return part;
      });
    } catch {
      return transcript;
    }
  }, [transcript, searchQuery]);

  // Count matches
  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    try {
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedQuery, 'gi');
      const matches = transcript.match(regex);
      return matches ? matches.length : 0;
    } catch {
      return 0;
    }
  }, [transcript, searchQuery]);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {searchQuery && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {matchCount} {matchCount === 1 ? 'match' : 'matches'}
          </span>
        )}
        <Button variant="outline" className="gap-2" onClick={handleCopyTranscript}>
          <Copy className="w-4 h-4" />
          Copy
        </Button>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="prose prose-sm max-w-none">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{highlightedTranscript}</p>
        </div>
      </ScrollArea>
    </Card>
  );
};

export default TranscriptViewer;
