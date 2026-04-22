# 7Coder Desktop

Welcome to 7Coder Desktop! I've successfully built an agentic, AI-first alternative to VSCode running as a Progressive Web App.

## Features Implemented

### 1. Unified Backend / Combo Server

I structured the application as a single Node.js Express server. It natively serves the built Vite React Frontend (`client/dist/`) while also exposing REST API endpoints (`/api/sync`) for the database operations.

- Uses `concurrently` during development so both server and client start with `npm run dev`.

### 2. Editor & File System

- **Monaco Editor**: Integrated `@monaco-editor/react` to provide industry-standard code highlighting, editing, and minimaps.
- **Browser File System API**: The built-in `Explorer` uses the native `window.showDirectoryPicker()` to let you open local folders and seamlessly edit your local device files entirely from the browser!

### 3. Open VSX Extensions

- Built a Marketplace sidebar panel.
- Queries the **Open VSX API** to search for extensions natively.

### 4. AI Agentic Harness

- Implemented the AI Agent side-panel, keeping the AI persistent alongside your file explorer.
- Features dynamic inputs, loading states, and chat bubbles matching the premium dark theme.
- _Note: To use true vibe coding, you'll simply plug in your Ollama or OpenRouter endpoints in the actual request logic!_

### 5. Secure Quick.DB Sync & E2E Encryption
- **Auth Modal**: Replaced unreliable prompts with a custom secure authentication dialog.
- **E2E Encryption**: Implemented **PBKDF2 + AES-GCM** encryption. All your synced settings and data are encrypted locally using your master password before being sent to the server. The server only sees encrypted blobs!
- **Node.js Quick.DB**: Syncs encrypted data to the backend database.

### 6. UI, Safari Compatibility & Licensing
- **Safari Fallback**: Added a `webkitdirectory` fallback for opening folders in browsers that don't support the Native File System API (like Safari and Firefox).
- **Rich Aesthetics**: Vibrant, Tailwind-powered dark theme with gradient branding.
- **License**: MIT License included in the root.

## How to Test

1. Navigate to your workspace directory:
   ```bash
   cd "/Users/sparky/Code/7Coder Desktop"
   ```
2. Run the application:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.
4. Try out the UI:
   - Click the User icon to sign in and hit the Quick.DB database.
   - Click the Extensions icon to search the live Open VSX API.
   - Use the Explorer to open a local directory and edit a file!
