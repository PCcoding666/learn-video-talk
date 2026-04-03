import type { SSEToolCallEvent } from "@/services/api";

interface AgentThinkingBubbleProps {
  toolCalls: SSEToolCallEvent[];
}

const TOOL_LABELS: Record<string, string> = {
  search_transcript: "Searching transcript",
  segment_chapters: "Analyzing chapters",
  analyze_visual_scene: "Analyzing visuals",
  analyze_emotion: "Analyzing emotion",
  summarize_segment: "Summarizing segment",
  compare_keyframes: "Comparing keyframes",
  search_web: "Searching web",
  extract_clip: "Extracting clip",
};

const TOOL_ICONS: Record<string, string> = {
  search_transcript: "search",
  segment_chapters: "list",
  analyze_visual_scene: "eye",
  analyze_emotion: "heart",
  summarize_segment: "file-text",
  compare_keyframes: "git-compare",
  search_web: "globe",
  extract_clip: "scissors",
};

const AgentThinkingBubble = ({ toolCalls }: AgentThinkingBubbleProps) => {
  if (!toolCalls.length) return null;

  return (
    <div className="flex flex-col gap-1 mb-1.5">
      {toolCalls.map((tc, idx) => {
        const isRunning = tc.status === "running";
        const label = TOOL_LABELS[tc.tool] || tc.tool;

        return (
          <div
            key={`${tc.tool}-${tc.round}-${idx}`}
            className={`flex items-center gap-2 text-[10px] font-mono px-2.5 py-1.5 rounded-md border transition-all ${
              isRunning
                ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}
          >
            {isRunning ? (
              <div className="w-3 h-3 border-[1.5px] border-cyan-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            ) : (
              <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
            )}
            <span className="truncate">{label}</span>
            {!isRunning && tc.preview && (
              <span className="text-muted-foreground/50 truncate ml-auto max-w-[120px]">
                {tc.preview}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AgentThinkingBubble;
