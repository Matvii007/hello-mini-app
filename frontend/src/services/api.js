import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Events API
export const eventsApi = {
  create: (data) => axios.post(`${API}/events`, data),
  getAll: (params) => axios.get(`${API}/events`, { params }),
  getToday: () => axios.get(`${API}/events/today`),
};

// Triggers API
export const triggersApi = {
  create: (data) => axios.post(`${API}/triggers`, data),
  getAll: (params) => axios.get(`${API}/triggers`, { params }),
  getPatterns: () => axios.get(`${API}/triggers/patterns`),
};

// Progress API
export const progressApi = {
  getSummary: () => axios.get(`${API}/progress/summary`),
  getWeekly: () => axios.get(`${API}/progress/weekly`),
  getMonthly: () => axios.get(`${API}/progress/monthly`),
};

// Profile API
export const profileApi = {
  update: (data) => axios.put(`${API}/profile`, data),
  getStats: () => axios.get(`${API}/profile/stats`),
};

// Subscription API
export const subscriptionApi = {
  getPlans: () => axios.get(`${API}/subscription/plans`),
  createCheckout: (data) => axios.post(`${API}/subscription/checkout`, data),
  getStatus: (sessionId) => axios.get(`${API}/subscription/status/${sessionId}`),
};

// Insights API
export const insightsApi = {
  getAll: () => axios.get(`${API}/insights`),
  getEducation: () => axios.get(`${API}/insights/education`),
};

export default {
  events: eventsApi,
  triggers: triggersApi,
  progress: progressApi,
  profile: profileApi,
  subscription: subscriptionApi,
  insights: insightsApi,
};
