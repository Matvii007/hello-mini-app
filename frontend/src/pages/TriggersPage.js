import { useState, useEffect, useCallback } from "react";
import { triggersApi } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { Plus, Zap, MapPin, Clock, TrendingUp, AlertTriangle, Coffee, Users, Brain, MoreHorizontal } from "lucide-react";

const TRIGGER_TYPES = [
  { value: "stress", label: "Stress", icon: AlertTriangle, color: "text-destructive" },
  { value: "boredom", label: "Boredom", icon: Clock, color: "text-chart-3" },
  { value: "social", label: "Social", icon: Users, color: "text-chart-2" },
  { value: "habit", label: "Habit", icon: Coffee, color: "text-chart-4" },
  { value: "emotional", label: "Emotional", icon: Brain, color: "text-chart-5" },
  { value: "other", label: "Other", icon: MoreHorizontal, color: "text-muted-foreground" },
];

const TriggersPage = () => {
  const [triggers, setTriggers] = useState([]);
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTrigger, setNewTrigger] = useState({
    trigger_type: "",
    description: "",
    location: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [triggersRes, patternsRes] = await Promise.all([
        triggersApi.getAll(),
        triggersApi.getPatterns(),
      ]);
      setTriggers(triggersRes.data);
      setPatterns(patternsRes.data);
    } catch (error) {
      console.error("Failed to fetch triggers:", error);
      toast.error("Failed to load triggers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddTrigger = async () => {
    if (!newTrigger.trigger_type) {
      toast.error("Please select a trigger type");
      return;
    }

    setSubmitting(true);
    try {
      await triggersApi.create(newTrigger);
      setShowAddDialog(false);
      setNewTrigger({ trigger_type: "", description: "", location: "" });
      fetchData();
      toast.success("Trigger logged successfully");
    } catch (error) {
      toast.error("Failed to log trigger");
    } finally {
      setSubmitting(false);
    }
  };

  const getTriggerIcon = (type) => {
    const trigger = TRIGGER_TYPES.find((t) => t.value === type);
    if (!trigger) return Zap;
    return trigger.icon;
  };

  const getTriggerColor = (type) => {
    const trigger = TRIGGER_TYPES.find((t) => t.value === type);
    if (!trigger) return "text-muted-foreground";
    return trigger.color;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Just now";
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
      <div className="flex items-center justify-between animate-fade-in">
        <div className="space-y-1">
          <h1 className="text-2xl font-heading font-bold text-foreground">Triggers</h1>
          <p className="text-muted-foreground text-sm">Understand what makes you crave</p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          size="icon"
          className="rounded-xl bg-primary text-primary-foreground glow-primary"
          data-testid="add-trigger-button"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Patterns Summary */}
      {patterns && patterns.total_triggers > 0 && (
        <Card className="glass rounded-2xl animate-fade-in animate-delay-100" data-testid="patterns-card">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Your Patterns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {patterns.most_common && (
              <div className="p-3 rounded-xl bg-secondary/50">
                <p className="text-sm text-muted-foreground">Most common trigger</p>
                <p className="text-lg font-semibold text-foreground capitalize">
                  {patterns.most_common}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {patterns.top_triggers?.slice(0, 4).map(([type, count]) => {
                const Icon = getTriggerIcon(type);
                return (
                  <div
                    key={type}
                    className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"
                  >
                    <Icon className={`w-4 h-4 ${getTriggerColor(type)}`} />
                    <span className="text-sm text-foreground capitalize">{type}</span>
                    <span className="ml-auto text-sm text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Triggers */}
      <div className="space-y-3 animate-fade-in animate-delay-200">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Recent Triggers
        </h2>

        {triggers.length === 0 ? (
          <Card className="glass rounded-2xl" data-testid="no-triggers-card">
            <CardContent className="p-6 text-center">
              <Zap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No triggers logged yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Tap the + button to log what triggers your cravings
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {triggers.slice(0, 20).map((trigger, index) => {
              const Icon = getTriggerIcon(trigger.trigger_type);
              return (
                <Card
                  key={trigger.id}
                  className="glass rounded-xl card-hover"
                  style={{ animationDelay: `${index * 50}ms` }}
                  data-testid={`trigger-card-${trigger.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${getTriggerColor(trigger.trigger_type)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-foreground capitalize">
                            {trigger.trigger_type}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(trigger.created_at)}
                          </span>
                        </div>
                        {trigger.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {trigger.description}
                          </p>
                        )}
                        {trigger.location && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground/70">
                            <MapPin className="w-3 h-3" />
                            {trigger.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Trigger Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="glass rounded-2xl max-w-sm mx-4" data-testid="add-trigger-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Log a Trigger</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              What caused your craving? Understanding triggers helps you prepare.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Trigger Type</label>
              <Select
                value={newTrigger.trigger_type}
                onValueChange={(value) =>
                  setNewTrigger({ ...newTrigger, trigger_type: value })
                }
              >
                <SelectTrigger className="bg-secondary/50 border-transparent rounded-xl" data-testid="trigger-type-select">
                  <SelectValue placeholder="Select trigger type" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border rounded-xl">
                  {TRIGGER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className={`w-4 h-4 ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                placeholder="What happened? (optional)"
                value={newTrigger.description}
                onChange={(e) =>
                  setNewTrigger({ ...newTrigger, description: e.target.value })
                }
                className="min-h-[80px] bg-secondary/50 border-transparent focus:border-primary rounded-xl"
                data-testid="trigger-description-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Location</label>
              <Input
                placeholder="Where were you? (optional)"
                value={newTrigger.location}
                onChange={(e) =>
                  setNewTrigger({ ...newTrigger, location: e.target.value })
                }
                className="bg-secondary/50 border-transparent focus:border-primary rounded-xl"
                data-testid="trigger-location-input"
              />
            </div>

            <Button
              onClick={handleAddTrigger}
              disabled={submitting || !newTrigger.trigger_type}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary"
              data-testid="save-trigger-button"
            >
              {submitting ? "Saving..." : "Save Trigger"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TriggersPage;
