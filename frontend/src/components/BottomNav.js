import { NavLink, useLocation } from "react-router-dom";
import { Home, TrendingUp, Zap, Lightbulb, User } from "lucide-react";

const navItems = [
  { path: "/", label: "Today", icon: Home },
  { path: "/progress", label: "Progress", icon: TrendingUp },
  { path: "/triggers", label: "Triggers", icon: Zap },
  { path: "/insights", label: "Insights", icon: Lightbulb },
  { path: "/profile", label: "Profile", icon: User },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bottom-nav border-t border-border/50 bg-background/80"
      data-testid="bottom-navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <Icon
                className={`w-5 h-5 mb-1 transition-transform ${
                  isActive ? "scale-110" : ""
                }`}
              />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
      {/* Safe area spacer for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
};
