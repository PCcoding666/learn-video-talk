import { useState } from "react";
import Header from "@/components/Header";
import LeftPanel from "@/components/app/LeftPanel";
import CenterPanel from "@/components/app/CenterPanel";
import RightPanel from "@/components/app/RightPanel";

type ProcessingState = "idle" | "processing" | "completed" | "error";

export interface Keyframe {
  id: number;
  timestamp: number;
  description: string;
  url?: string;
}

export interface VideoData {
  id: string;
  title: string;
  duration: string;
  summary: string;
  keyframes: Keyframe[];
  transcript: string;
}

const MainApp = () => {
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [highlightedKeyframes, setHighlightedKeyframes] = useState<number[]>([]);

  const handleStartProcessing = (input: string, type: "youtube" | "upload") => {
    setProcessingState("processing");
    // TODO: Integrate with backend API
    setTimeout(() => {
      setProcessingState("completed");
      setVideoData({
        id: "mock-video-1",
        title: "示例视频 - 如何学习编程",
        duration: "5:23",
        summary: "这是一个AI生成的视频总结示例...",
        keyframes: [
          { id: 1, timestamp: 15, description: "课程介绍" },
          { id: 2, timestamp: 83, description: "编程语言对比" },
          { id: 3, timestamp: 165, description: "学习路径图" },
          { id: 4, timestamp: 236, description: "实践项目推荐" },
          { id: 5, timestamp: 270, description: "社区资源" },
          { id: 6, timestamp: 310, description: "总结回顾" },
        ],
        transcript: "大家好，今天我们来讨论如何学习编程...",
      });
    }, 3000);
  };

  const handleTimestampJump = (timestamp: number) => {
    setCurrentTimestamp(timestamp);
  };

  const handleHighlightKeyframes = (frameIds: number[]) => {
    setHighlightedKeyframes(frameIds);
    setTimeout(() => setHighlightedKeyframes([]), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex h-[calc(100vh-64px)] w-full">
        {/* Left Panel - 25% */}
        <LeftPanel 
          onStartProcessing={handleStartProcessing}
          processingState={processingState}
        />

        {/* Center Panel - 50% */}
        <CenterPanel 
          processingState={processingState}
          videoData={videoData}
          currentTimestamp={currentTimestamp}
          highlightedKeyframes={highlightedKeyframes}
          onTimestampJump={handleTimestampJump}
        />

        {/* Right Panel - 25% */}
        <RightPanel 
          videoData={videoData}
          onTimestampJump={handleTimestampJump}
          onHighlightKeyframes={handleHighlightKeyframes}
        />
      </div>
    </div>
  );
};

export default MainApp;
