import { useState, useEffect, useCallback } from "react";
import { progressApi } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Trophy, Flame, DollarSign, Heart, TrendingUp } from "lucide-react";

const ProgressPage = () => {
  const [summary, setSummary] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("weekly");

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, weeklyRes, monthlyRes] = await Promise.all([
        progressApi.getSummary(),
        progressApi.getWeekly(),
        progressApi.getMonthly(),
      ]);
      setSummary(summaryRes.data);
      setWeeklyData(weeklyRes.data);
      setMonthlyData(monthlyRes.data);
    } catch (error) {
      console.error("Failed to fetch progress:", error);
      toast.error("Failed to load progress data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const chartColors = {
    cigarettes: "hsl(0, 84%, 60%)",
    urges: "hsl(38, 92%, 50%)",
    resisted: "hsl(160, 84%, 39%)",
  };

  return (
    <div className="px-4 py-6 space-y-6 safe-bottom">
      {/* Header */}
      <div className="space-y-1 animate-fade-in">
        <h1 className="text-2xl font-heading font-bold text-foreground">Progress</h1>
        <p className="text-muted-foreground text-sm">Track your journey to freedom</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 animate-fade-in animate-delay-100">
        <Card className="glass rounded-2xl" data-testid="days-smoke-free-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-foreground">
                  {summary?.days_smoke_free || 0}
                </p>
                <p className="text-xs text-muted-foreground">Days smoke-free</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass rounded-2xl" data-testid="streak-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-chart-3/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-foreground">
                  {summary?.current_streak || 0}
                </p>
                <p className="text-xs text-muted-foreground">Day streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass rounded-2xl" data-testid="money-saved-progress-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-chart-2/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-foreground">
                  ${summary?.money_saved?.toFixed(0) || 0}
                </p>
                <p className="text-xs text-muted-foreground">Money saved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass rounded-2xl" data-testid="cigarettes-avoided-progress-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-chart-4/20 flex items-center justify-center">
                <Heart className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-foreground">
                  {summary?.cigarettes_avoided || 0}
                </p>
                <p className="text-xs text-muted-foreground">Cigs avoided</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card className="glass rounded-2xl animate-fade-in animate-delay-200" data-testid="charts-card">
        <CardHeader className="pb-2">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-secondary/50 rounded-xl mb-4">
              <TabsTrigger 
                value="weekly" 
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="weekly-tab"
              >
                Weekly
              </TabsTrigger>
              <TabsTrigger 
                value="monthly"
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="monthly-tab"
              >
                Monthly
              </TabsTrigger>
            </TabsList>

            <TabsContent value="weekly" className="mt-0">
              <div className="h-64" data-testid="weekly-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData?.days || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
                    <XAxis
                      dataKey="day_name"
                      stroke="hsl(215, 20%, 65%)"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="hsl(215, 20%, 65%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 47%, 6%)",
                        border: "1px solid hsl(217, 33%, 17%)",
                        borderRadius: "12px",
                        color: "hsl(210, 40%, 98%)",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="cigarettes"
                      fill={chartColors.cigarettes}
                      radius={[4, 4, 0, 0]}
                      name="Cigarettes"
                    />
                    <Bar
                      dataKey="resisted"
                      fill={chartColors.resisted}
                      radius={[4, 4, 0, 0]}
                      name="Resisted"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="monthly" className="mt-0">
              <div className="h-64" data-testid="monthly-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData?.weeks || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
                    <XAxis
                      dataKey="week"
                      stroke="hsl(215, 20%, 65%)"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="hsl(215, 20%, 65%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222, 47%, 6%)",
                        border: "1px solid hsl(217, 33%, 17%)",
                        borderRadius: "12px",
                        color: "hsl(210, 40%, 98%)",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="cigarettes"
                      fill={chartColors.cigarettes}
                      radius={[4, 4, 0, 0]}
                      name="Cigarettes"
                    />
                    <Bar
                      dataKey="resisted"
                      fill={chartColors.resisted}
                      radius={[4, 4, 0, 0]}
                      name="Resisted"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quit Date Info */}
      {summary?.quit_date && (
        <Card className="glass rounded-2xl animate-fade-in animate-delay-300" data-testid="quit-date-card">
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground text-sm">
              Your journey started on{" "}
              <span className="text-foreground font-medium">
                {new Date(summary.quit_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProgressPage;
