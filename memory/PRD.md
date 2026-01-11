# NoSmoke - Product Requirements Document

## Original Problem Statement
Build a full-featured product-level application that can be used as a Telegram Mini App and a standalone web app to help users quit smoking through awareness, progress tracking, motivation, and structured feedback.

## Target Users
- Individuals trying to reduce or quit smoking
- Health-conscious users seeking accountability tools

## Core Requirements (Static)
1. **Multi-Platform Support**: Telegram Mini App + Web (mobile-first, iPhone priority)
2. **5-Tab Navigation**: Today, Progress, Triggers, Insights, Profile
3. **User Authentication**: Email + Telegram WebApp SDK
4. **Subscription Model**: Free tier + Premium tier with Stripe

## What's Been Implemented (January 11, 2026)

### Backend (FastAPI + MongoDB)
- [x] User authentication (email registration/login + Telegram auth)
- [x] JWT-based session management
- [x] Events API (urge logging, cigarette tracking, resistance)
- [x] Triggers API with pattern analysis
- [x] Progress API (daily, weekly, monthly stats)
- [x] Profile API with settings management
- [x] Subscription API with Stripe checkout integration
- [x] Insights API (mocked AI responses)
- [x] Payment transaction tracking

### Frontend (React + Tailwind)
- [x] Dark theme with calming emerald accents
- [x] Mobile-first responsive design
- [x] Bottom navigation with 5 tabs
- [x] Today page: Timer, panic button, daily stats
- [x] Progress page: Summary cards, Recharts visualizations
- [x] Triggers page: Add/view triggers, pattern analysis
- [x] Insights page: Daily tips, personalized insights, health milestones
- [x] Profile page: User info, settings, subscription management
- [x] Auth page: Login/Register with Telegram support

### Integrations
- [x] Stripe (test mode) for premium subscriptions
- [x] Telegram WebApp SDK ready
- [x] MongoDB for data persistence

## User Personas

### Primary: "The Determined Quitter"
- 25-45 years old
- Smoked 10-20 cigarettes/day for years
- Motivated by health and cost savings
- Needs accountability and tracking

### Secondary: "The Social Quitter"  
- Uses Telegram actively
- Wants quick access via Mini App
- Motivated by streaks and achievements

## Prioritized Backlog

### P0 (Critical) - ✅ Completed
- User authentication
- Core tracking functionality
- Progress visualization
- Basic insights

### P1 (High Priority) - Next Phase
- Real AI integration for personalized insights
- Push notifications for craving support
- Social features (quit buddies, leaderboards)
- Apple/Google Health integration

### P2 (Medium Priority)
- Meditation/breathing exercises integration
- Achievement badges and rewards
- Export data functionality
- Multi-language support

## Technical Architecture
```
Frontend (React) → API Gateway → Backend (FastAPI) → MongoDB
                                      ↓
                              Stripe (Payments)
                              Telegram SDK (Auth)
```

## Next Tasks
1. Add real AI insights using GPT for personalized analysis
2. Implement push notifications
3. Add breathing exercises feature
4. Create Telegram Bot for Mini App listing
5. Add social sharing capabilities
