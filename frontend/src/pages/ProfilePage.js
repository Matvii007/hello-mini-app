import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { profileApi, subscriptionApi } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import {
  User,
  Settings,
  Crown,
  LogOut,
  Calendar,
  DollarSign,
  Cigarette,
  Edit2,
  Check,
  X,
  Loader2,
  CreditCard,
  ExternalLink,
} from "lucide-react";

const ProfilePage = () => {
  const { user, logout, updateUser, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [plans, setPlans] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  const isPremium = user?.subscription_status === "premium";

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, plansRes] = await Promise.all([
        profileApi.getStats(),
        subscriptionApi.getPlans(),
      ]);
      setStats(statsRes.data);
      setPlans(plansRes.data.plans);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle payment callback
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const status = searchParams.get("status");

    if (sessionId && status === "success") {
      // Poll for payment status
      const pollPaymentStatus = async (attempts = 0) => {
        if (attempts >= 5) {
          toast.error("Payment verification timed out. Please check your subscription status.");
          return;
        }

        try {
          const response = await subscriptionApi.getStatus(sessionId);
          if (response.data.payment_status === "paid") {
            toast.success("Payment successful! Welcome to Premium!");
            refreshUser();
            // Clear URL params
            window.history.replaceState({}, document.title, "/profile");
          } else {
            setTimeout(() => pollPaymentStatus(attempts + 1), 2000);
          }
        } catch (error) {
          console.error("Payment status check failed:", error);
          setTimeout(() => pollPaymentStatus(attempts + 1), 2000);
        }
      };

      toast("Verifying payment...", { icon: <Loader2 className="w-4 h-4 animate-spin" /> });
      pollPaymentStatus();
    } else if (status === "cancelled") {
      toast("Payment cancelled");
      window.history.replaceState({}, document.title, "/profile");
    }
  }, [searchParams, refreshUser]);

  const handleStartEdit = () => {
    setEditData({
      name: user?.name || "",
      cigarettes_per_day: user?.cigarettes_per_day || 10,
      cost_per_pack: user?.cost_per_pack || 10,
      cigarettes_per_pack: user?.cigarettes_per_pack || 20,
    });
    setEditing(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await profileApi.update(editData);
      updateUser(response.data);
      setEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSubscribe = async (planId) => {
    setProcessingPayment(true);
    try {
      const response = await subscriptionApi.createCheckout({
        plan_id: planId,
        origin_url: window.location.origin,
      });
      // Redirect to Stripe
      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error("Failed to start checkout");
      setProcessingPayment(false);
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
        <h1 className="text-2xl font-heading font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your account</p>
      </div>

      {/* User Card */}
      <Card className="glass rounded-2xl animate-fade-in animate-delay-100" data-testid="user-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-heading font-bold text-foreground truncate">
                  {user?.name}
                </h2>
                {isPremium && (
                  <Badge className="premium-badge text-white border-0 flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    PRO
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {user?.email || `@${user?.username || "telegram_user"}`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleStartEdit}
              className="rounded-xl"
              data-testid="edit-profile-button"
            >
              <Edit2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="text-center p-3 rounded-xl bg-secondary/50">
              <p className="text-2xl font-heading font-bold text-primary">
                {stats?.total_events_logged || 0}
              </p>
              <p className="text-xs text-muted-foreground">Events logged</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-secondary/50">
              <p className="text-2xl font-heading font-bold text-chart-3">
                {stats?.total_triggers_logged || 0}
              </p>
              <p className="text-xs text-muted-foreground">Triggers</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-secondary/50">
              <p className="text-2xl font-heading font-bold text-chart-2">
                {user?.cigarettes_per_day || 0}
              </p>
              <p className="text-xs text-muted-foreground">Cigs/day (prev)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="glass rounded-2xl animate-fade-in animate-delay-200" data-testid="settings-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Quit Date</p>
                <p className="text-xs text-muted-foreground">
                  {user?.quit_date
                    ? new Date(user.quit_date).toLocaleDateString()
                    : "Not set"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Cost per Pack</p>
                <p className="text-xs text-muted-foreground">${user?.cost_per_pack || 10}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
            <div className="flex items-center gap-3">
              <Cigarette className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Cigarettes per Pack</p>
                <p className="text-xs text-muted-foreground">{user?.cigarettes_per_pack || 20}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="glass rounded-2xl animate-fade-in animate-delay-300" data-testid="subscription-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Crown className="w-5 h-5 text-chart-4" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPremium ? (
            <div className="p-4 rounded-xl bg-chart-4/10 border border-chart-4/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="premium-badge text-white border-0">Premium Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Your premium subscription is active until{" "}
                <span className="text-foreground font-medium">
                  {user?.subscription_end
                    ? new Date(user.subscription_end).toLocaleDateString()
                    : "Forever"}
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Unlock advanced insights, personalized strategies, and more.
              </p>
              <Button
                onClick={() => setShowSubscriptionDialog(true)}
                className="w-full rounded-xl bg-chart-4 text-white hover:bg-chart-4/90"
                data-testid="upgrade-button"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="ghost"
        onClick={logout}
        className="w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
        data-testid="logout-button"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Log Out
      </Button>

      {/* Edit Profile Dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="glass rounded-2xl max-w-sm mx-4" data-testid="edit-profile-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Edit Profile</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update your profile information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="bg-secondary/50 border-transparent focus:border-primary rounded-xl"
                data-testid="edit-name-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Cigarettes per Day (before quitting)
              </label>
              <Input
                type="number"
                value={editData.cigarettes_per_day}
                onChange={(e) =>
                  setEditData({ ...editData, cigarettes_per_day: parseInt(e.target.value) })
                }
                className="bg-secondary/50 border-transparent focus:border-primary rounded-xl"
                data-testid="edit-cigarettes-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cost per Pack ($)</label>
              <Input
                type="number"
                step="0.01"
                value={editData.cost_per_pack}
                onChange={(e) =>
                  setEditData({ ...editData, cost_per_pack: parseFloat(e.target.value) })
                }
                className="bg-secondary/50 border-transparent focus:border-primary rounded-xl"
                data-testid="edit-cost-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Cigarettes per Pack</label>
              <Input
                type="number"
                value={editData.cigarettes_per_pack}
                onChange={(e) =>
                  setEditData({ ...editData, cigarettes_per_pack: parseInt(e.target.value) })
                }
                className="bg-secondary/50 border-transparent focus:border-primary rounded-xl"
                data-testid="edit-pack-size-input"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setEditing(false)}
                className="flex-1 rounded-xl"
                disabled={saving}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                className="flex-1 rounded-xl bg-primary text-primary-foreground"
                disabled={saving}
                data-testid="save-profile-button"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subscription Dialog */}
      <Dialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <DialogContent className="glass rounded-2xl max-w-sm mx-4" data-testid="subscription-dialog">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <Crown className="w-5 h-5 text-chart-4" />
              Choose Your Plan
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Unlock premium features to accelerate your quit journey
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {plans &&
              Object.entries(plans).map(([planId, plan]) => (
                <Card
                  key={planId}
                  className={`rounded-xl cursor-pointer transition-all ${
                    planId === "premium_yearly"
                      ? "border-chart-4/50 bg-chart-4/5"
                      : "border-border bg-secondary/30"
                  }`}
                  onClick={() => handleSubscribe(planId)}
                  data-testid={`plan-card-${planId}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{plan.name}</h3>
                          {planId === "premium_yearly" && (
                            <Badge variant="secondary" className="text-xs bg-chart-4/20 text-chart-4">
                              Best Value
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ${plan.price}/{plan.period === "yearly" ? "year" : "month"}
                        </p>
                      </div>
                      <CreditCard className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}

            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                Secure payment via Stripe
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePage;
