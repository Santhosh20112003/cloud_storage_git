# GitHub Drive - Phase 1

This is a modern React application that uses GitHub as a cloud storage backend.

## Phase 1: Auth & Repo Setup
- **GitHub OAuth Login**: Integrated with redirect flow.
- **Auto-Repo Creation**: Automatically checks for and creates a private `github-drive` repository.
- **Premium UI**: Dark mode, glassmorphism, and smooth animations.

## Prerequisites

1. Create a **GitHub OAuth App** in your GitHub settings:
   - Go to `Settings` > `Developer settings` > `OAuth Apps` > `New OAuth App`.
   - **Application Name**: GitHub Drive
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5173/callback`
2. Copy the **Client ID** and **Client Secret**.

## Environment Setup

Create a `.env` file in the root directory and add:

```env
VITE_GITHUB_CLIENT_ID=your_client_id
VITE_REDIRECT_URI=http://localhost:5173/callback
```

> [!TIP]
> **No Backend Required**: This app now uses **GitHub Device Flow**, which means you don't need a backend proxy or server to get started. You can run it entirely from your browser!

## Features (Phase 1)

- 🎨 **Premium UI**: Glassmorphism design system with Framer Motion animations.
- 🔐 **OAuth Device Flow**: Secure authentication without a backend server.
- 📦 **Auto-Repo Setup**: Automatically checks for and creates a private `github-drive` repository for file storage.
- 🚀 **Performance**: Built with Vite and React for lightning-fast experience.

## Next Steps (Phase 2)

- [ ] Implement File Explorer (Dashboard)
- [ ] File Upload (Base64 encoding via GitHub API)
- [ ] Folder Navigation
- [ ] File Download & Preview

## Start the Development Server
```bash
npm run dev
```

## Note on Token Exchange
GitHub OAuth requires a `client_secret` to exchange the temporary code for an access token. For security, this should be done on a backend/proxy server. 
- In this phase, the logic is implemented in `src/App.jsx` and `src/context/GithubContext.jsx`.
- You can use a simple Netlify function or a tool like `github-oauth-bridge` to handle the exchange.

## Tech Stack
- **React 19**
- **Vite**
- **Framer Motion** (Animations)
- **Lucide React** (Icons)
- **Axios** (API)
