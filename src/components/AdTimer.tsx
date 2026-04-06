import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, X } from "lucide-react";

interface AdTimerProps {
  ad: { id: string; title: string; url: string; reward: string; view_time: number; open_link?: boolean };
  onComplete: (adId: string) => void;
  onClose: () => void;
}

const AdTimer = ({ ad, onComplete, onClose }: AdTimerProps) => {
  const [seconds, setSeconds] = useState(ad.view_time || 10);
  const [completed, setCompleted] = useState(false);
  const [urlOpened, setUrlOpened] = useState(false);
  const totalTime = ad.view_time || 10;

  useEffect(() => {
    if (seconds <= 0) {
      setCompleted(true);
      return;
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  // Open the ad URL in a new tab after 3 seconds
  useEffect(() => {
    if (!urlOpened && ad.open_link !== false && totalTime - seconds >= 3) {
      setUrlOpened(true);
      window.open(ad.url, "_blank", "noopener,noreferrer");
    }
  }, [seconds, urlOpened, ad.url, ad.open_link, totalTime]);

  const handleConfirm = useCallback(() => {
    onComplete(ad.id);
    onClose();
  }, [ad.id, onComplete, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card rounded-2xl p-8 w-full max-w-sm text-center glow-primary animate-slide-up">
        <h3 className="font-heading text-xl font-bold mb-2">{ad.title}</h3>
        <p className="text-muted-foreground text-sm mb-6">
          {completed ? "Clique validado!" : "Aguarde para validar o clique"}
        </p>

        {!completed ? (
          <div className="mb-6">
            <div className="relative w-24 h-24 mx-auto">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * (totalTime - seconds)) / totalTime}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-heading text-3xl font-bold text-primary animate-count" key={seconds}>
                {seconds}
              </span>
            </div>
            <p className="text-muted-foreground text-xs mt-3">
              <Clock className="h-3 w-3 inline mr-1" />
              Não feche esta janela
            </p>
          </div>
        ) : (
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-3" />
            <p className="text-primary font-semibold text-lg">+{ad.reward} creditado!</p>
          </div>
        )}

        {completed ? (
          <Button variant="hero" className="w-full" onClick={handleConfirm}>
            Confirmar
          </Button>
        ) : (
          <button onClick={onClose} className="text-muted-foreground text-xs hover:text-foreground transition-colors">
            <X className="h-3 w-3 inline mr-1" />
            Cancelar (sem recompensa)
          </button>
        )}
      </div>
    </div>
  );
};

export default AdTimer;
