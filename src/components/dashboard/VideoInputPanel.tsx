import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Youtube, Upload, Loader2, ChevronDown, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface VideoInputPanelProps {
  onStartProcessing: (input: string | File, type: "youtube" | "upload") => void;
  disabled?: boolean;
}

const VideoInputPanel = ({ onStartProcessing, disabled = false }: VideoInputPanelProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [inputType, setInputType] = useState<"youtube" | "upload">("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("auto");
  const [enableDiarization, setEnableDiarization] = useState(true);
  const [autoChapters, setAutoChapters] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = () => {
    if (inputType === "youtube") {
      if (!youtubeUrl) {
        toast({ variant: "destructive", title: "Missing URL", description: "Please enter a YouTube video URL" });
        return;
      }
      onStartProcessing(youtubeUrl, "youtube");
    } else if (inputType === "upload") {
      if (!file) {
        toast({ variant: "destructive", title: "No file selected", description: "Please select a video file to upload" });
        return;
      }
      onStartProcessing(file, "upload");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const isButtonDisabled = disabled || (inputType === "youtube" ? !youtubeUrl : !file);

  return (
    <div className="space-y-3">
      {/* Segmented Control */}
      <div className="flex p-0.5 bg-muted/50 rounded-md">
        <button
          onClick={() => setInputType("youtube")}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-mono font-medium transition-all ${
            inputType === "youtube"
              ? "bg-card text-foreground shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Youtube className="w-3 h-3" />
          YouTube
        </button>
        <button
          onClick={() => setInputType("upload")}
          disabled={disabled}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-mono font-medium transition-all ${
            inputType === "upload"
              ? "bg-card text-foreground shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Upload className="w-3 h-3" />
          Upload
        </button>
      </div>

      {/* Input */}
      {inputType === "youtube" ? (
        <div className="space-y-1.5">
          <Input
            placeholder="https://youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="h-9 bg-background text-xs font-mono border-border/60 focus-visible:ring-primary/30 focus-visible:border-primary/50 placeholder:text-muted-foreground/40"
            disabled={disabled}
          />
          <p className="text-[10px] text-muted-foreground/60 font-mono">
            YouTube, Bilibili, and other major platforms
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className={`border border-dashed rounded-md p-4 text-center transition-all ${
            disabled ? 'bg-muted/20 cursor-not-allowed' : 'hover:border-primary/40 cursor-pointer'
          } ${file ? 'border-primary/40 bg-primary/5' : 'border-border/60'}`}>
            <input
              id="file-upload"
              type="file"
              accept="video/mp4,video/avi,video/mov,video/mkv"
              onChange={handleFileChange}
              className="hidden"
              disabled={disabled}
            />
            <label htmlFor="file-upload" className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}>
              <Upload className={`w-5 h-5 mx-auto mb-1.5 ${file ? 'text-primary' : 'text-muted-foreground/40'}`} />
              {file ? (
                <div>
                  <p className="font-mono text-xs font-medium">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              ) : (
                <p className="font-mono text-xs text-muted-foreground/60">
                  MP4, AVI, MOV, MKV
                </p>
              )}
            </label>
          </div>
        </div>
      )}

      {/* Advanced Options */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1">
            <span>ADVANCED_OPTIONS</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="language" className="text-[10px] font-mono text-muted-foreground">LANG</Label>
            <Select value={language} onValueChange={setLanguage} disabled={disabled}>
              <SelectTrigger id="language" className="h-8 text-xs font-mono">
                <SelectValue placeholder="Auto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto detect</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="diarization" checked={enableDiarization} onCheckedChange={(c) => setEnableDiarization(c as boolean)} disabled={disabled} />
              <Label htmlFor="diarization" className="text-[10px] font-mono font-normal cursor-pointer text-muted-foreground">Speaker diarization</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="chapters" checked={autoChapters} onCheckedChange={(c) => setAutoChapters(c as boolean)} disabled={disabled} />
              <Label htmlFor="chapters" className="text-[10px] font-mono font-normal cursor-pointer text-muted-foreground">Auto chapters</Label>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Submit */}
      <Button
        className="w-full h-9 text-xs font-mono font-bold gap-2 bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all"
        onClick={handleSubmit}
        disabled={isButtonDisabled}
      >
        {disabled ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            PROCESSING...
          </>
        ) : (
          <>
            START ANALYSIS
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </Button>
    </div>
  );
};

export default VideoInputPanel;
