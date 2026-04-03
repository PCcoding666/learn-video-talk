import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";

const steps = [
  { id: 1, label: "Video download", status: "completed", time: "2s" },
  { id: 2, label: "Keyframe extraction", status: "completed", time: "8s" },
  { id: 3, label: "Audio transcription", status: "processing", time: "~30s remaining" },
  { id: 4, label: "AI summary", status: "pending", time: "" },
];

const ProcessingStatus = () => {
  const progress = 45;

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-background rounded-md p-5 border border-border/40">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <h2 className="text-sm font-mono font-bold text-foreground uppercase tracking-wide">
                Processing
              </h2>
              <span className="text-[10px] font-mono text-muted-foreground/50 ml-auto">{progress}%</span>
            </div>
            
            <Progress value={progress} className="h-1.5" />
          </div>

          <div className="space-y-1.5">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex items-center gap-3 px-3 py-2 rounded border border-border/20 bg-muted/10"
              >
                <div>
                  {step.status === "completed" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  )}
                  {step.status === "processing" && (
                    <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  )}
                  {step.status === "pending" && (
                    <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />
                  )}
                </div>
                
                <div className="flex-1 flex items-center justify-between">
                  <p className="text-xs font-mono text-foreground/80">{step.label}</p>
                  {step.time && (
                    <p className="text-[10px] font-mono text-muted-foreground/50">
                      {step.time}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingStatus;
