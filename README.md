# Archon Frontend

A modern, feature-rich frontend for **Archon** — an autonomous AI coding agent designed to assist developers over extended periods with persistent memory, intelligent planning, and repository-level understanding.

## 🚀 Overview

Archon Frontend is a Next.js-based web application that provides an intuitive interface for:
- **Authentication & Profile Management** — Secure user authentication with JWT tokens
- **Project Management** — Create, manage, and organize coding projects
- **AI-Powered Chat** — Real-time conversations with the AI agent
- **Agent Management** — Configure and monitor autonomous agents working on your projects
- **Context & Memory** — Upload project files and maintain persistent context
- **Planning & Tasks** — AI-assisted feature planning and autonomous task execution

This frontend connects to the Archon backend API (Django/DRF) to provide a seamless development experience.

---

## ✨ Features

- 🔐 **Secure Authentication** — JWT-based authentication with refresh token support
- 💬 **Real-time Chat** — WebSocket-powered messaging with the AI agent
- 🤖 **Agent Management** — Create, configure, and monitor autonomous AI agents
- 📁 **Project Context** — Upload and manage project files for contextual AI assistance
- 📝 **Planning Tools** — Break down features into tasks with autonomous execution
- 💾 **Memory System** — Persistent memory and context across sessions
- 🎨 **Dark/Light Mode** — Theme switching with system preference detection
- 📱 **Responsive Design** — Fully responsive UI using TailwindCSS
- ✅ **Type-Safe** — Built with TypeScript for enhanced development experience

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** — Version 18.x or higher
- **npm** or **yarn** — Package manager
- **Git** — Version control
- **Backend API** — The Archon backend must be running

Optional:
- **Docker** — For containerized deployment

---

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/IamSadik/Archon-Frontend.git
cd Archon-Frontend
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Backend API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:8000

# Optional: Add other environment variables as needed
```

**Important:** 
- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Keep sensitive tokens in server-only environment variables
- Never commit `.env.local` to version control

### 4. Run Development Server

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

---

## 📦 Building & Deployment

### Local Build

```bash
npm run build
npm start
```

### Deployment on Render

1. **Connect Repository** — Link your GitHub repository to Render
2. **Configure Build Command** — Use `npm run build`
3. **Configure Start Command** — Use `npm start`
4. **Set Environment Variables** — Add `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_WS_BASE_URL` in Render dashboard
5. **Deploy** — Render will automatically build and deploy

**Key Notes:**
- `.next` and `node_modules` are automatically excluded (in `.gitignore`)
- Render will install dependencies and build the project on every deploy
- Ensure the backend API endpoint is accessible from Render

### Docker Deployment

```dockerfile
# Build image
docker build -t archon-frontend .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
  archon-frontend
```

---

## 📁 Project Structure

```
src/
├── app/                          # Next.js 14 app directory
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── (auth)/                  # Authentication routes (nested layout)
│   │   ├── login/               # Login page
│   │   ├── register/            # Registration page
│   │   └── forgot-password/     # Password recovery
│   ├── (dashboard)/             # Dashboard routes (protected)
│   │   ├── chat/                # Chat interface
│   │   ├── dashboard/           # Main dashboard
│   │   ├── projects/            # Project management
│   │   ├── agents/              # Agent management
│   │   ├── planning/            # Planning & tasks
│   │   ├── memory/              # Memory management
│   │   ├── context/             # Context management
│   │   ├── profile/             # User profile
│   │   └── settings/            # User settings
│   └── api/                     # API route handlers (if needed)
├── components/
│   ├── ui/                      # Reusable UI components
│   ├── chat/                    # Chat-specific components
│   ├── projects/                # Project management components
│   ├── context/                 # Context management components
│   ├── planning/                # Planning UI components
│   └── [feature]/               # Feature-specific components
├── hooks/                       # Custom React hooks
│   ├── useAuth.ts              # Authentication logic
│   ├── useChat.ts              # Chat functionality
│   ├── useProjects.ts          # Project management
│   ├── useAgents.ts            # Agent management
│   ├── usePlanning.ts          # Planning functionality
│   └── ...
├── services/                    # API service layer
│   ├── auth.service.ts         # Authentication API
│   ├── chat.service.ts         # Chat API
│   ├── project.service.ts      # Project API
│   ├── agent.service.ts        # Agent API
│   └── ...
├── lib/                        # Utility functions
│   ├── api.ts                  # API client setup
│   ├── utils.ts                # Helper functions
│   ├── websocket.ts            # WebSocket management
│   └── ...
├── store/                      # Zustand state management
│   └── useAuthStore.ts         # Auth state
├── types/                      # TypeScript type definitions
│   └── index.ts
└── styles/                     # Global styles

```

---

## 🔌 API Integration

The frontend communicates with the Archon backend via:

1. **REST API** — Standard HTTP endpoints for CRUD operations
2. **WebSocket** — Real-time communication for chat and live updates

### Example: Authentication Flow

```typescript
// Login
const response = await authService.login(email, password);
// Response: { access: "token", refresh: "token", user: {...} }

// Store tokens
localStorage.setItem("access_token", response.access);
localStorage.setItem("refresh_token", response.refresh);

// Use in subsequent requests
// Authorization header: "Bearer {access_token}"
```

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

---

## 🎨 Technologies & Libraries

### Core Framework
- **Next.js 14** — React framework with App Router
- **React 18** — UI library
- **TypeScript** — Type-safe JavaScript

### Styling & UI
- **TailwindCSS** — Utility-first CSS
- **Radix UI** — Headless UI components
- **Lucide React** — Icon library
- **Framer Motion** — Animation library

### State Management & Data Fetching
- **React Query (TanStack Query)** — Server state management
- **Zustand** — Client state management
- **React Hook Form** — Form state management

### API & Communication
- **Axios** — HTTP client
- **Socket.io** — Real-time communication

### Utilities
- **date-fns** — Date manipulation
- **zod** — Schema validation
- **clsx** — Conditional className utility
- **react-markdown** — Markdown rendering

### Development Tools
- **Jest** — Testing framework
- **ESLint** — Code linting
- **Prettier** — Code formatting

---

## 🔐 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://localhost:8000` |
| `NEXT_PUBLIC_WS_BASE_URL` | WebSocket server URL | `ws://localhost:8000` |

---

## 🧪 Testing

Run tests with:

```bash
npm run test              # Run tests once
npm run test:watch       # Run tests in watch mode
```

Tests are located in the `__tests__/` directory.

---

## 📝 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests (single run) |
| `npm run test:watch` | Run tests in watch mode |

---

## 🔄 Development Workflow

### 1. Creating a New Feature

```bash
# Create feature branch
git checkout -b feature/feature-name

# Make changes, test locally
npm run dev

# Run linter
npm run lint

# Commit changes
git add .
git commit -m "feat: description of changes"

# Push to branch
git push origin feature/feature-name
```

### 2. Debugging

- Use React DevTools browser extension
- Check console for API errors
- Use Network tab to inspect API calls
- Enable debug logging in services

### 3. Performance Optimization

- Use dynamic imports for large components
- Optimize images with Next.js `Image` component
- Monitor bundle size with `next/bundle-analyzer`

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] Backend API endpoint is correct
- [ ] Build completes without errors (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] No console errors in development
- [ ] Responsive design tested on mobile
- [ ] Authentication flow tested end-to-end

---

## 🐛 Troubleshooting

### Build Fails with Module Not Found

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### API Connection Issues

- Verify `NEXT_PUBLIC_API_BASE_URL` is correct
- Check backend API is running
- Verify CORS configuration on backend
- Check network tab in browser DevTools

### WebSocket Connection Issues

- Verify `NEXT_PUBLIC_WS_BASE_URL` is correct
- Ensure backend supports WebSocket
- Check firewall/proxy settings
- Look for connection error logs in console

### Authentication Issues

- Verify JWT tokens are in localStorage
- Check token expiration
- Try logging out and back in
- Clear browser cache and localStorage

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [API Documentation](./API_DOCUMENTATION.md)
- [Database Schema](./database_schema.sql)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is part of the Archon ecosystem. See LICENSE file for details.

---

## 👤 Author

**IamSadik** — [GitHub Profile](https://github.com/IamSadik)

---

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on [GitHub Issues](https://github.com/IamSadik/Archon-Frontend/issues)
- Check existing documentation in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- Review the [project structure](#-project-structure) for guidance

---

**Last Updated:** May 6, 2026
