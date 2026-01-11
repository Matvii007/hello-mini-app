import { useState, useEffect, useCallback } from "react";
import { eventsApi, progressApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { Flame, Clock, TrendingDown, Shield, AlertCircle, CheckCircle } from "lucide-react";

const TodayPage = () => {
  const { user } = useAuth();
  const [todayStats, setTodayStats] = useState(null);
  const [progressSummary, setProgressSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUrgeDialog, setShowUrgeDialog] = useState(false);
  const [urgeContext, setUrgeContext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [timeSinceLastCig, setTimeSinceLastCig] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [todayRes, progressRes] = await Promise.all([
        eventsApi.getToday(),
        progressApi.getSummary(),
      ]);
      setTodayStats(todayRes.data);
      setProgressSummary(progressRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate time since last cigarette
  useEffect(() => {
    const calculateTime = () => {
      if (!todayStats?.last_cigarette) return;

      const lastCig = new Date(todayStats.last_cigarette);
      const now = new Date();
      const diff = now - lastCig;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeSinceLastCig(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeSinceLastCig(`${hours}h ${minutes}m`);
      } else {
        setTimeSinceLastCig(`${minutes}m`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [todayStats?.last_cigarette]);

  const handlePanicButton = () => {
    setShowUrgeDialog(true);
    setUrgeContext("");
  };

  const handleLogUrge = async (resisted) => {
    setSubmitting(true);
    try {
      await eventsApi.create({
        event_type: resisted ? "resisted" : "cigarette",
        context: urgeContext,
        intensity: 7,
      });
      
      setShowUrgeDialog(false);
      fetchData();
      
      if (resisted) {
        toast.success("Amazing! You resisted the urge! 💪", {
          description: "Every time you resist, you get stronger.",
        });
      } else {
        toast("Logged. Tomorrow is a new day.", {
          description: "Don't be too hard on yourself. Progress isn't linear.",
        });
      }
    } catch (error) {
      toast.error("Failed to log event");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 safe-bottom">
      {/* Header */}
      <div className="space-y-1 animate-fade-in">
        <p className="text-muted-foreground text-sm">Welcome back,</p>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          {user?.name?.split(" ")[0] || "Friend"}
        </h1>
      </div>

      {/* Timer Card */}
      <Card className="glass rounded-2xl overflow-hidden animate-fade-in animate-delay-100" data-testid="timer-card">
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Time smoke-free</span>
          </div>
          <div className="timer-display text-5xl font-heading font-bold text-primary">
            {timeSinceLastCig || "Start now"}
          </div>
          <p className="text-muted-foreground text-sm">
            {progressSummary?.current_streak > 0
              ? `${progressSummary.current_streak} day streak 🔥`
              : "Your journey begins today"}
          </p>
        </CardContent>
      </Card>

      {/* Panic Button */}
      <div className="flex justify-center animate-fade-in animate-delay-200">
        <Button
          onClick={handlePanicButton}
          className="panic-button w-full max-w-xs h-16 rounded-2xl bg-destructive text-destructive-foreground text-lg font-semibold glow-destructive hover:bg-destructive/90"
          data-testid="panic-button"
        >
          <Flame className="w-5 h-5 mr-2" />
          I want to smoke
        </Button>
      </div>

      {/* Today's Stats */}
      <div className="stats-grid animate-fade-in animate-delay-300">
        <Card className="glass rounded-2xl card-hover" data-testid="cigarettes-today-card">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-destructive/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">
              {todayStats?.cigarettes_today || 0}
            </p>
            <p className="text-xs text-muted-foreground">Cigarettes today</p>
          </CardContent>
        </Card>

        <Card className="glass rounded-2xl card-hover" data-testid="resisted-today-card">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">
              {todayStats?.resisted_today || 0}
            </p>
            <p className="text-xs text-muted-foreground">Urges resisted</p>
          </CardContent>
        </Card>

        <Card className="glass rounded-2xl card-hover" data-testid="money-saved-card">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-chart-3/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-chart-3" />
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">
              ${progressSummary?.money_saved?.toFixed(0) || 0}
            </p>
            <p className="text-xs text-muted-foreground">Money saved</p>
          </CardContent>
        </Card>

        <Card className="glass rounded-2xl card-hover" data-testid="cigarettes-avoided-card">
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-chart-2/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-chart-2" />
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">
              {progressSummary?.cigarettes_avoided || 0}
            </p>
            <p className="text-xs text-muted-foreground">Cigs avoided</p>
          </CardContent>
        </Card>
      </div>

      {/* Motivational Message */}
      <Card className="glass rounded-2xl animate-fade-in animate-delay-400" data-testid="motivation-card">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            💡 <strong className="text-foreground">Remember:</strong> Cravings typically last only 3-5 minutes. 
            Take deep breaths, drink water, or go for a short walk. You've got this!
          </p>
        </CardContent>
      </Card>

      {/* Urge Dialog */}
      <Dialog open={showUrgeDialog} onOpenChange={setShowUrgeDialog}>
        <DialogContent className="glass rounded-2xl max-w-sm mx-4" data-testid="urge-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Feeling an urge?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Take a moment. This feeling will pass. What triggered this urge?
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="What's happening right now? (optional)"
              value={urgeContext}
              onChange={(e) => setUrgeContext(e.target.value)}
              className="min-h-[80px] bg-secondary/50 border-transparent focus:border-primary rounded-xl"
              data-testid="urge-context-input"
            />
            
            <div className="space-y-3">
              <Button
                onClick={() => handleLogUrge(true)}
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary"
                data-testid="resisted-button"
              >
                <Shield className="w-4 h-4 mr-2" />
                I resisted! 💪
              </Button>
              
              <Button
                onClick={() => handleLogUrge(false)}
                disabled={submitting}
                variant="secondary"
                className="w-full h-12 rounded-xl"
                data-testid="smoked-button"
              >
                I smoked
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TodayPage;
