import { useState } from "react";
import Header from "@/components/Header";
import VideoInputPanel from "@/components/dashboard/VideoInputPanel";
import ProcessingStatus from "@/components/dashboard/ProcessingStatus";
import ResultTabs from "@/components/dashboard/ResultTabs";
import HistoryPanel from "@/components/dashboard/HistoryPanel";

type ProcessingState = "idle" | "processing" | "completed" | "error";

const Dashboard = () => {
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [videoData, setVideoData] = useState<any>(null);

  const handleStartProcessing = (input: string, type: "youtube" | "upload") => {
    setProcessingState("processing");
    // TODO: Integrate with backend API
    setTimeout(() => {
      setProcessingState("completed");
      setVideoData({
        title: "示例视频",
        duration: "5:23",
        summary: "这是一个AI生成的视频总结示例...",
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel */}
        <aside className="w-[360px] border-r border-border bg-card/30 backdrop-blur-sm overflow-y-auto">
          <div className="p-6 space-y-6">
            <VideoInputPanel onStartProcessing={handleStartProcessing} />
            <HistoryPanel />
          </div>
        </aside>

        {/* Main Work Area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto p-8">
            {processingState === "idle" && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 max-w-md">
                  <div className="text-6xl mb-4">🎬</div>
                  <h2 className="text-2xl font-bold">开始分析你的视频</h2>
                  <p className="text-muted-foreground">
                    在左侧输入 YouTube 链接或上传本地视频，让 AI 为你解析视频内容
                  </p>
                </div>
              </div>
            )}

            {processingState === "processing" && (
              <ProcessingStatus />
            )}

            {processingState === "completed" && videoData && (
              <ResultTabs videoData={videoData} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
