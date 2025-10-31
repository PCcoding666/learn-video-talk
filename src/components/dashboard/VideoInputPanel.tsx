import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Youtube, Upload, Sparkles } from "lucide-react";

interface VideoInputPanelProps {
  onStartProcessing: (input: string, type: "youtube" | "upload") => void;
}

const VideoInputPanel = ({ onStartProcessing }: VideoInputPanelProps) => {
  const [inputType, setInputType] = useState<"youtube" | "upload">("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("auto");
  const [enableDiarization, setEnableDiarization] = useState(true);
  const [autoChapters, setAutoChapters] = useState(true);

  const handleSubmit = () => {
    if (inputType === "youtube" && youtubeUrl) {
      onStartProcessing(youtubeUrl, "youtube");
    } else if (inputType === "upload" && file) {
      onStartProcessing(file.name, "upload");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">🎬</span>
          视频输入
        </h2>

        <Tabs value={inputType} onValueChange={(v) => setInputType(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="youtube" className="gap-2">
              <Youtube className="w-4 h-4" />
              YouTube URL
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="w-4 h-4" />
              本地上传
            </TabsTrigger>
          </TabsList>

          <TabsContent value="youtube" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url">YouTube 链接</Label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                粘贴 YouTube 视频链接开始分析
              </p>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">上传视频文件</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <input
                  id="file-upload"
                  type="file"
                  accept="video/mp4,video/avi,video/mov,video/mkv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  {file ? (
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">点击上传或拖拽文件</p>
                      <p className="text-sm text-muted-foreground">
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
      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span>⚙️</span>
          处理参数
        </h3>

        <div className="space-y-2">
          <Label htmlFor="language">语言</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language">
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
          />
          <Label htmlFor="diarization" className="text-sm font-normal cursor-pointer">
            启用说话人分离
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="chapters"
            checked={autoChapters}
            onCheckedChange={(checked) => setAutoChapters(checked as boolean)}
          />
          <Label htmlFor="chapters" className="text-sm font-normal cursor-pointer">
            自动生成章节
          </Label>
        </div>
      </div>

      <Button
        className="w-full h-12 text-lg gap-2"
        onClick={handleSubmit}
        disabled={inputType === "youtube" ? !youtubeUrl : !file}
      >
        <Sparkles className="w-5 h-5" />
        开始分析
      </Button>
    </div>
  );
};

export default VideoInputPanel;
