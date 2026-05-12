# GitHub Drive - Modern Cloud Storage

GitHub Drive is a premium, high-fidelity web application that transforms your GitHub account into a personal cloud storage system. Built with **React 19**, **Vite**, and **Framer Motion**, it offers a seamless, VS Code-inspired experience for managing your files and folders directly on GitHub.

![Dashboard Preview](https://via.placeholder.com/1200x600?text=GitHub+Drive+Premium+UI)

## 🚀 Key Features

### 📂 Advanced File Management
- **Directory Browsing**: Navigate through your GitHub repository with a folder-based explorer.
- **Breadcrumb Navigation**: Quickly jump between parent directories.
- **Smart Uploads**: Upload files directly into specific folders (automatically encoded to Base64).
- **Folder Support**: Create new directories with a single click.
- **Rename & Delete**: Manage your file names and cleanup unwanted items.
- **Batch Downloads**: Select multiple files and download them instantly.

### 🎨 Premium User Experience
- **Glassmorphism UI**: A sleek, modern design system with semi-transparent surfaces and vibrant accents.
- **VS Code Editor**: A built-in code editor for modifying text, markdown, and code files directly.
- **Storage Analytics**: Real-time breakdown of your storage usage by file type (Images, Docs, Videos, etc.).
- **Dynamic Animations**: Smooth transitions and micro-interactions powered by Framer Motion.

### 🔐 Secure Integration
- **GitHub OAuth Login**: Securely authenticate using your GitHub account.
- **Auto-Provisioning**: The app automatically detects or creates a private `github-drive` repository for your data.
- **Zero Configuration Backend**: Uses Vite's proxy system to handle secure token exchange.

---

## 🛠️ Getting Started

### 1. Prerequisites
Create a **GitHub OAuth App** in your GitHub settings:
1. Go to `Settings` > `Developer settings` > `OAuth Apps` > `New OAuth App`.
2. **Application Name**: `GitHub Drive`
3. **Homepage URL**: `http://localhost:5173`
4. **Authorization callback URL**: `http://localhost:5173/callback`
5. Click **Register application**.
6. Generate a **Client Secret** and copy both the **Client ID** and **Client Secret**.

### 2. Environment Setup
Create a `.env` file in the root directory (or copy from `.exmple.env`):

```env
VITE_GITHUB_CLIENT_ID=your_client_id_here
VITE_GITHUB_CLIENT_SECRET=your_client_secret_here
VITE_REDIRECT_URI=http://localhost:5173/callback
```

### 3. Installation & Run
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 💻 Tech Stack
- **Frontend**: React 19, Vite
- **Styling**: Vanilla CSS (Custom Design System)
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Routing**: React Router 7

## 🛡️ Security Note
This application currently handles the `CLIENT_SECRET` on the client-side for ease of setup. For a production-ready environment, it is recommended to move the token exchange logic to a secure backend server or serverless function to keep your secrets hidden.

---