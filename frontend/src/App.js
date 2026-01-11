import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import { BottomNav } from "./components/BottomNav";

// Pages
import AuthPage from "./pages/AuthPage";
import TodayPage from "./pages/TodayPage";
import ProgressPage from "./pages/ProgressPage";
import TriggersPage from "./pages/TriggersPage";
import InsightsPage from "./pages/InsightsPage";
import ProfilePage from "./pages/ProfilePage";

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

// Auth Route wrapper (redirect if already logged in)
const AuthRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Main Layout with Bottom Navigation
const MainLayout = ({ children }) => {
  return (
    <div className="app-container bg-background min-h-screen">
      <main className="pb-20">{children}</main>
      <BottomNav />
    </div>
  );
};

// App Routes Component
const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth Route */}
      <Route
        path="/auth"
        element={
          <AuthRoute>
            <AuthPage />
          </AuthRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              <TodayPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/progress"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProgressPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/triggers"
        element={
          <ProtectedRoute>
            <MainLayout>
              <TriggersPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <ProtectedRoute>
            <MainLayout>
              <InsightsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProfilePage />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster 
          position="top-center" 
          toastOptions={{
            style: {
              background: 'hsl(222, 47%, 6%)',
              border: '1px solid hsl(217, 33%, 17%)',
              color: 'hsl(210, 40%, 98%)',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
