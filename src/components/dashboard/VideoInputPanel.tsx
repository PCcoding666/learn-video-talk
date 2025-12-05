import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Youtube, Upload, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoInputPanelProps {
  onStartProcessing: (input: string | File, type: "youtube" | "upload") => void;
  disabled?: boolean;
}

const VideoInputPanel = ({ onStartProcessing, disabled = false }: VideoInputPanelProps) => {
  const { toast } = useToast();
  const [inputType, setInputType] = useState<"youtube" | "upload">("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("auto");
  const [enableDiarization, setEnableDiarization] = useState(true);
  const [autoChapters, setAutoChapters] = useState(true);

  const handleSubmit = () => {
    if (inputType === "youtube") {
      if (!youtubeUrl) {
        toast({
          variant: "destructive",
          title: "请输入链接",
          description: "请先输入 YouTube 视频链接",
        });
        return;
      }
      onStartProcessing(youtubeUrl, "youtube");
    } else if (inputType === "upload") {
      if (!file) {
        toast({
          variant: "destructive",
          title: "请选择文件",
          description: "请先选择要上传的视频文件",
        });
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
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-medium text-foreground mb-4 flex items-center gap-2">
          <Youtube className="w-5 h-5 text-primary" />
          视频输入
        </h2>

        <Tabs value={inputType} onValueChange={(v) => setInputType(v as any)}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="youtube" className="gap-2 text-sm" disabled={disabled}>
              <Youtube className="w-4 h-4" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2 text-sm" disabled={disabled}>
              <Upload className="w-4 h-4" />
              本地上传
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="youtube-url" className="text-sm text-muted-foreground">YouTube 链接</Label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="h-11"
                disabled={disabled}
              />
              <p className="text-xs text-muted-foreground">
                粘贴 YouTube 视频链接开始分析
              </p>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="text-sm text-muted-foreground">上传视频文件</Label>
              <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${disabled ? 'bg-muted/30 cursor-not-allowed' : 'hover:border-primary/50 cursor-pointer'} ${file ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                <input
                  id="file-upload"
                  type="file"
                  accept="video/mp4,video/avi,video/mov,video/mkv"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={disabled}
                />
                <label htmlFor="file-upload" className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}>
                  <Upload className={`w-10 h-10 mx-auto mb-3 ${file ? 'text-primary' : 'text-muted-foreground'}`} />
                  {file ? (
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-sm">点击上传或拖拽文件</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        支持 MP4, AVI, MOV, MKV
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Processing Parameters */}
      <div className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          ⚙️ 处理参数
        </h3>

        <div className="space-y-2">
          <Label htmlFor="language" className="text-xs text-muted-foreground">语言</Label>
          <Select value={language} onValueChange={setLanguage} disabled={disabled}>
            <SelectTrigger id="language" className="h-10">
              <SelectValue placeholder="选择语言" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">自动检测</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="en">英文</SelectItem>
              <SelectItem value="ja">日文</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="diarization"
            checked={enableDiarization}
            onCheckedChange={(checked) => setEnableDiarization(checked as boolean)}
            disabled={disabled}
          />
          <Label htmlFor="diarization" className="text-sm font-normal cursor-pointer text-muted-foreground">
            启用说话人分离
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="chapters"
            checked={autoChapters}
            onCheckedChange={(checked) => setAutoChapters(checked as boolean)}
            disabled={disabled}
          />
          <Label htmlFor="chapters" className="text-sm font-normal cursor-pointer text-muted-foreground">
            自动生成章节
          </Label>
        </div>
      </div>

      <Button
        className="w-full h-11 text-base gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/25"
        onClick={handleSubmit}
        disabled={isButtonDisabled}
      >
        {disabled ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            处理中...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            开始分析
          </>
        )}
      </Button>
    </div>
  );
};

export default VideoInputPanel;