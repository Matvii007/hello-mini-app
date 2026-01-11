import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";
import { Wind, Mail, Lock, User, Loader2, Cigarette, DollarSign } from "lucide-react";

const AuthPage = () => {
  const { login, register, telegramLogin, isTelegram } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);
  
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    name: "",
    cigarettes_per_day: 10,
    cost_per_pack: 10,
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await login(loginData.email, loginData.password);
      toast.success("Welcome back!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerData.email || !registerData.password || !registerData.name) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await register(registerData);
      toast.success("Account created! Let's start your journey.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramLogin = async () => {
    setLoading(true);
    try {
      await telegramLogin();
      toast.success("Welcome!");
    } catch (error) {
      toast.error("Telegram login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Wind className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-3xl font-heading font-bold text-foreground">NoSmoke</h1>
        <p className="text-muted-foreground mt-1">Your journey to freedom starts here</p>
      </div>

      {/* Telegram Login */}
      {isTelegram && (
        <div className="w-full max-w-sm mb-6 animate-fade-in animate-delay-100">
          <Button
            onClick={handleTelegramLogin}
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-[#0088cc] hover:bg-[#0088cc]/90 text-white font-semibold"
            data-testid="telegram-login-button"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                Continue with Telegram
              </>
            )}
          </Button>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>
        </div>
      )}

      {/* Auth Tabs */}
      <Card className="w-full max-w-sm glass rounded-2xl animate-fade-in animate-delay-200" data-testid="auth-card">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-secondary/50 rounded-xl mb-6">
              <TabsTrigger
                value="login"
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="login-tab"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid="register-tab"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="pl-10 bg-secondary/50 border-transparent focus:border-primary rounded-xl h-12"
                      data-testid="login-email-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="pl-10 bg-secondary/50 border-transparent focus:border-primary rounded-xl h-12"
                      data-testid="login-password-input"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary"
                  data-testid="login-submit-button"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log In"}
                </Button>
              </form>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register" className="mt-0">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Your name"
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    className="pl-10 bg-secondary/50 border-transparent focus:border-primary rounded-xl h-12"
                    data-testid="register-name-input"
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="pl-10 bg-secondary/50 border-transparent focus:border-primary rounded-xl h-12"
                    data-testid="register-email-input"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="pl-10 bg-secondary/50 border-transparent focus:border-primary rounded-xl h-12"
                    data-testid="register-password-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Cigarette className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="number"
                      placeholder="Cigs/day"
                      value={registerData.cigarettes_per_day}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, cigarettes_per_day: parseInt(e.target.value) })
                      }
                      className="pl-10 bg-secondary/50 border-transparent focus:border-primary rounded-xl h-12"
                      data-testid="register-cigarettes-input"
                    />
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="$/pack"
                      value={registerData.cost_per_pack}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, cost_per_pack: parseFloat(e.target.value) })
                      }
                      className="pl-10 bg-secondary/50 border-transparent focus:border-primary rounded-xl h-12"
                      data-testid="register-cost-input"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold glow-primary"
                  data-testid="register-submit-button"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start Your Journey"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-xs text-muted-foreground mt-6 text-center animate-fade-in animate-delay-300">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
};

export default AuthPage;
