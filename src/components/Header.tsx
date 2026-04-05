import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Terminal, LogOut, User, Clock, PlayCircle, Loader2, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiService, type VideoHistoryItem } from "@/services/api";
import { formatDuration } from "@/lib/utils";

interface HeaderProps {
  onVideoSelect?: (videoId: string) => void;
}

const Header = ({ onVideoSelect }: HeaderProps = {}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [videos, setVideos] = useState<VideoHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const isLoginPage = location.pathname === "/login";
  const isMainApp = location.pathname === "/app";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await apiService.getVideoHistory(10);
      if (response.status === "success") {
        setVideos(response.videos || []);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getStatusDot = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-500",
      processing: "bg-blue-500 animate-pulse",
      pending: "bg-yellow-500",
      failed: "bg-red-500",
    };
    return colors[status] || colors.pending;
  };

  const handleVideoClick = (video: VideoHistoryItem) => {
    if (
      video.processing_status === "processing" ||
      video.processing_status === "failed"
    )
      return;
    onVideoSelect?.(video.id);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 ${
        isMainApp
          ? "bg-background/80 backdrop-blur-xl border-b border-border/40"
          : "bg-background/60 backdrop-blur-2xl border-b border-border/30"
      }`}
    >
      <div
        className={
          isMainApp
            ? "px-5"
            : "container mx-auto px-4 sm:px-6 lg:px-8"
        }
      >
        <div
          className={`flex items-center justify-between ${isMainApp ? "h-12" : "h-14"}`}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className={`flex items-center justify-center rounded-md bg-primary/10 border border-primary/20 ${
                isMainApp ? "h-7 w-7" : "h-8 w-8"
              }`}
            >
              <Terminal
                className={`text-primary ${isMainApp ? "h-3.5 w-3.5" : "h-4 w-4"}`}
              />
            </div>
            <span
              className={`font-bold font-mono tracking-tight ${isMainApp ? "text-sm" : "text-base"}`}
            >
              <span className="text-primary">vid</span>
              <span className="text-foreground">snap</span>
            </span>
            {isMainApp && (
              <span className="text-[10px] font-mono text-muted-foreground/60 hidden sm:inline">
                v3.2.0
              </span>
            )}
          </div>

          {/* Nav - Landing page only */}
          {!isMainApp && (
            <nav className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                How It Works
              </a>
            </nav>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* History Dropdown - Only on main app */}
            {isMainApp && onVideoSelect && (
              <DropdownMenu
                onOpenChange={(open) => {
                  if (open) loadHistory();
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 gap-1.5 font-mono text-[10px] text-muted-foreground/70 hover:text-foreground"
                  >
                    <Clock className="w-3 h-3" />
                    <span className="hidden sm:inline">History</span>
                    <ChevronDown className="w-2.5 h-2.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                    Recent Videos
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-3 h-3 animate-spin mr-1.5 text-muted-foreground" />
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Loading...
                      </span>
                    </div>
                  ) : videos.length === 0 ? (
                    <div className="py-4 text-center">
                      <span className="text-[10px] font-mono text-muted-foreground/40">
                        No videos yet
                      </span>
                    </div>
                  ) : (
                    videos.map((video) => (
                      <DropdownMenuItem
                        key={video.id}
                        onClick={() => handleVideoClick(video)}
                        className="flex items-start gap-2 py-2 cursor-pointer"
                        disabled={
                          video.processing_status === "processing" ||
                          video.processing_status === "failed"
                        }
                      >
                        <div className="relative mt-0.5 shrink-0">
                          <PlayCircle className="w-3.5 h-3.5 text-muted-foreground/50" />
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${getStatusDot(video.processing_status)}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-mono text-foreground/80 line-clamp-1">
                            {video.title}
                          </p>
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground/40 mt-0.5">
                            <span>{formatTime(video.created_at)}</span>
                            <span>&middot;</span>
                            <span>{formatDuration(video.duration)}</span>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-md hover:bg-primary/10"
                  >
                    <Avatar className="h-7 w-7 rounded-md">
                      <AvatarFallback className="rounded-md bg-primary/10 text-primary text-xs font-mono font-bold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-mono font-medium leading-none">
                        {user.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground font-mono">
                        free tier
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate("/app")}
                    className="font-mono text-xs"
                  >
                    <User className="mr-2 h-3.5 w-3.5" />
                    My Videos
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive font-mono text-xs"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              !isLoginPage && (
                <Button
                  size="sm"
                  className="h-8 text-xs font-mono bg-primary hover:bg-primary/90 transition-colors"
                  onClick={() => navigate("/login")}
                >
                  Get Started
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
