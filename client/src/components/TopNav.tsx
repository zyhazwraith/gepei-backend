import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface TopNavProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export default function TopNav({ title, showBack = false, rightAction }: TopNavProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };

  return (
    <header className="sticky top-0 left-0 right-0 bg-primary text-primary-foreground z-40">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-1 hover:bg-primary-foreground/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
}
