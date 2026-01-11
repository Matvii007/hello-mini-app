import { useState, useEffect, useCallback } from "react";
import { insightsApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Lightbulb, BookOpen, Lock, Sparkles, Clock, Heart, Award, Star } from "lucide-react";

const InsightsPage = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState(null);
  const [education, setEducation] = useState(null);
  const [loading, setLoading] = useState(true);

  const isPremium = user?.subscription_status === "premium";

  const fetchData = useCallback(async () => {
    try {
      const [insightsRes, educationRes] = await Promise.all([
        insightsApi.getAll(),
        insightsApi.getEducation(),
      ]);
      setInsights(insightsRes.data);
      setEducation(educationRes.data);
    } catch (error) {
      console.error("Failed to fetch insights:", error);
      toast.error("Failed to load insights");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getCategoryIcon = (category) => {
    switch (category) {
      case "pattern":
        return Sparkles;
      case "trigger":
        return Lightbulb;
      case "motivation":
        return Heart;
      case "analysis":
        return Star;
      case "strategy":
        return Award;
      default:
        return Lightbulb;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "pattern":
        return "text-chart-2";
      case "trigger":
        return "text-chart-3";
      case "motivation":
        return "text-primary";
      case "analysis":
        return "text-chart-4";
      case "strategy":
        return "text-chart-5";
      default:
        return "text-muted-foreground";
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
        <h1 className="text-2xl font-heading font-bold text-foreground">Insights</h1>
        <p className="text-muted-foreground text-sm">AI-powered tips for your journey</p>
      </div>

      {/* Daily Tip */}
      {insights?.daily_tip && (
        <Card className="glass rounded-2xl border-primary/30 animate-fade-in animate-delay-100" data-testid="daily-tip-card">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
                  Daily Tip
                </p>
                <p className="text-foreground leading-relaxed">{insights.daily_tip}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      <div className="space-y-3 animate-fade-in animate-delay-200">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Personalized Insights
        </h2>

        {insights?.insights?.map((insight, index) => {
          const Icon = getCategoryIcon(insight.category);
          const isLocked = insight.premium && !isPremium;

          return (
            <Card
              key={insight.id}
              className={`glass rounded-2xl card-hover ${isLocked ? "opacity-70" : ""}`}
              style={{ animationDelay: `${index * 100}ms` }}
              data-testid={`insight-card-${insight.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center flex-shrink-0`}>
                    {isLocked ? (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Icon className={`w-5 h-5 ${getCategoryColor(insight.category)}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{insight.title}</h3>
                      {insight.premium && (
                        <Badge
                          variant="secondary"
                          className="premium-badge text-xs px-2 py-0 text-white border-0"
                        >
                          PRO
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {isLocked
                        ? "Upgrade to Premium to unlock this insight"
                        : insight.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Health Milestones */}
      <div className="space-y-3 animate-fade-in animate-delay-300">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Heart className="w-4 h-4" />
          Health Milestones
        </h2>

        <Card className="glass rounded-2xl" data-testid="milestones-card">
          <CardContent className="p-4 space-y-3">
            {education?.milestones?.slice(0, 6).map((milestone, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <div className="w-16 text-center">
                  <span className="text-xs font-mono text-primary">{milestone.time}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">{milestone.benefit}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Educational Content */}
      <div className="space-y-3 animate-fade-in animate-delay-400">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Learn More
        </h2>

        {education?.articles?.map((article, index) => (
          <Card
            key={article.id}
            className="glass rounded-2xl card-hover cursor-pointer"
            data-testid={`article-card-${article.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">{article.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {article.summary}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground ml-4">
                  <Clock className="w-3 h-3" />
                  {article.read_time}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Premium CTA */}
      {!isPremium && (
        <Card className="glass rounded-2xl border-chart-4/30 animate-fade-in" data-testid="premium-cta-card">
          <CardContent className="p-4 text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-chart-4" />
            <h3 className="font-heading font-semibold text-foreground mb-1">
              Unlock Premium Insights
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Get personalized AI analysis, advanced patterns, and quit strategies.
            </p>
            <Badge className="premium-badge text-white border-0">
              Starting at $4.99/month
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InsightsPage;
