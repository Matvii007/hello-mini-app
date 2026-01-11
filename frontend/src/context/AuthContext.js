import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("nosmoke_token"));
  const [loading, setLoading] = useState(true);
  const [isTelegram, setIsTelegram] = useState(false);

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Check if running in Telegram
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initData) {
      setIsTelegram(true);
      tg.ready();
      tg.expand();
    }
  }, []);

  // Fetch current user
  const fetchUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      localStorage.removeItem("nosmoke_token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Register
  const register = async (data) => {
    const response = await axios.post(`${API}/auth/register`, data);
    const { access_token, user: userData } = response.data;
    localStorage.setItem("nosmoke_token", access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  // Login
  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem("nosmoke_token", access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  // Telegram login
  const telegramLogin = async () => {
    const tg = window.Telegram?.WebApp;
    if (!tg || !tg.initDataUnsafe?.user) {
      throw new Error("Telegram WebApp not available");
    }

    const telegramUser = tg.initDataUnsafe.user;
    const response = await axios.post(`${API}/auth/telegram`, {
      init_data: tg.initData,
      telegram_id: telegramUser.id,
      first_name: telegramUser.first_name,
      last_name: telegramUser.last_name || "",
      username: telegramUser.username || "",
    });

    const { access_token, user: userData } = response.data;
    localStorage.setItem("nosmoke_token", access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("nosmoke_token");
    setToken(null);
    setUser(null);
  };

  // Update user
  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  // Refresh user data
  const refreshUser = async () => {
    await fetchUser();
  };

  const value = {
    user,
    token,
    loading,
    isTelegram,
    isAuthenticated: !!user,
    register,
    login,
    telegramLogin,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
