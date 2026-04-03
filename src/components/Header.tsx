import { Button } from "@/components/ui/button";
import { Terminal, LogOut, User } from "lucide-react";
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

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isLoginPage = location.pathname === '/login';
  const isMainApp = location.pathname === '/app';
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };
  
  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 ${
      isMainApp 
        ? 'bg-background/80 backdrop-blur-xl border-b border-border/40' 
        : 'bg-background/60 backdrop-blur-2xl border-b border-border/30'
    }`}>
      <div className={isMainApp ? 'px-5' : 'container mx-auto px-4 sm:px-6 lg:px-8'}>
        <div className={`flex items-center justify-between ${isMainApp ? 'h-12' : 'h-14'}`}>
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center rounded-md bg-primary/10 border border-primary/20 ${
              isMainApp ? 'h-7 w-7' : 'h-8 w-8'
            }`}>
              <Terminal className={`text-primary ${isMainApp ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
            </div>
            <span className={`font-bold font-mono tracking-tight ${isMainApp ? 'text-sm' : 'text-base'}`}>
              <span className="text-primary">vid</span>
              <span className="text-foreground">snap</span>
            </span>
            {isMainApp && (
              <span className="text-[10px] font-mono text-muted-foreground/60 hidden sm:inline">
                v3.1.0
              </span>
            )}
          </div>
          
          {/* Nav - Landing page only */}
          {!isMainApp && (
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
            </nav>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-md hover:bg-primary/10">
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
                      <p className="text-sm font-mono font-medium leading-none">{user.email}</p>
                      <p className="text-xs leading-none text-muted-foreground font-mono">free tier</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/app')} className="font-mono text-xs">
                    <User className="mr-2 h-3.5 w-3.5" />
                    My Videos
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive font-mono text-xs">
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
                  onClick={() => navigate('/login')}
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
