# Swapnik99 - BUET '99 Alumni Network

## Overview
Swapnik99 is a private social network exclusively for BUET Batch 1999 graduates. The platform enables alumni to stay connected through various features including a news feed, real-time chat, discussions with AI summaries, events management, business networking, and financial transparency.

## Tech Stack
- **Frontend**: React with TypeScript, Wouter routing, TanStack Query, Shadcn/UI components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth (OIDC)
- **AI Integration**: OpenAI via Replit AI Integrations for discussion summaries

## Project Structure
```
client/
  src/
    components/      # Reusable UI components
    pages/          # Page components (feed, chat, discussions, events, etc.)
    hooks/          # Custom React hooks
    lib/            # Utility functions
server/
  routes.ts         # API endpoints
  storage.ts        # Database operations
  replit_integrations/  # Auth and AI integrations
shared/
  schema.ts         # Database schema and types
```

## Key Features
1. **Authentication**: Admin-approved membership via Replit Auth
2. **News Feed**: Posts with likes and comments
3. **Real-time Chat**: Messaging between members (polling-based)
4. **Discussions**: Threaded discussions with AI-powered summaries
5. **Events**: Event creation with RSVP functionality
6. **Business Connect**: Marketplace for needs and offers
7. **Members Directory**: Searchable alumni directory
8. **Accounting**: Financial transparency documents
9. **Admin Dashboard**: Member approval and document uploads

## Design System
- **Primary Color**: Deep royal blue (HSL: 220 50% 35%) - matches #2B4F81 from logo
- **Accent Color**: Light sky blue (HSL: 200 85% 55%) - matches #67C5E5 from logo
- **Dark Mode**: Fully supported with CSS custom properties

## API Endpoints
- `GET/POST /api/posts` - News feed posts
- `POST /api/posts/:id/like` - Toggle post like
- `GET/POST /api/discussions` - Discussions with AI summaries
- `GET/POST /api/events` - Events management
- `POST /api/events/:id/rsvp` - Event RSVP
- `GET/POST /api/business` - Business listings
- `GET /api/members` - Members directory
- `GET /api/chat/rooms` - Chat conversations
- `GET/POST /api/chat/rooms/:id/messages` - Chat messages
- `GET /api/accounting` - Financial documents
- `GET/POST /api/admin/*` - Admin operations

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (auto-configured)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL (auto-configured)

## Recent Changes
- January 2026: Initial MVP implementation with all core features
