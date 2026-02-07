
# RemoteConnect - Web-based Remote Desktop (Visual Support)

**RemoteConnect** (RRG SOFT) is a peer-to-peer remote desktop tool that runs entirely in the browser. 
It allows one user ("Host") to share their screen and another user ("Client") to view it and provide visual guidance using a simulated cursor.

**⚠️ Limitation**: Due to browser security sandboxing, this application **cannot** take control of the operating system's mouse or keyboard. It provides a visual pointer (red cursor) for the remote user to indicate where to click.

## Features
- **No Installation**: Works directly in Chrome, Edge, Safari.
- **P2P Connection**: Uses WebRTC for low-latency streaming.
- **Visual Control**: Remote user controls a virtual red cursor on the host screen.
- **Mobile Support**: Control from a mobile phone using touch.
- **Localization**: Supports Uzbek (Default), Russian, and English.
- **Secure**: End-to-end encrypted video stream.

## Tech Stack
- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Node.js, Express, Socket.io (Signaling)
- **Transport**: WebRTC (Native API)

## Installation

### Prerequisites
- Node.js (v16+)
- npm

### 1. clone & Install
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

### 2. Run Locally
**Terminal 1 (Backend):**
```bash
cd backend
node server.js
```
Runs on `http://localhost:5000`

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev -- --host
```
Runs on `http://localhost:5173` (and your local Network IP).

## Usage
1. **Open Host** (Computer): Go to `http://localhost:5173`. Click **"ID Yaratish"**.
2. **Open Client** (Phone/PC): Go to the Host's URL (e.g. `http://192.168.1.X:5173`).
3. **Connect**: Enter the Host's 6-digit ID and click **"Ulanish"**.
4. **Interact**: Client moves mouse/finger to point on the Host screen.

## Deployment (VPS/Server)
To deploy on a public server (Ubuntu/CentOS):

1. **Upload Code**: Copy all files to the server.
2. **Install Deps**: Run `npm install` in both folders.
3. **Setup Nginx**: Reverse proxy to port 3000 (Frontend) and 5000 (Backend).
4. **HTTPS Required**: WebRTC requires HTTPS (except on localhost). Use Certbot + Let's Encrypt.
   
   **Frontend Build:**
   ```bash
   cd frontend
   npm run build
   # Serve 'dist' folder via Nginx
   ```

   **Backend (PM2):**
   ```bash
   cd backend
   npm install -g pm2
   pm2 start server.js --name "remote-signaling"
   ```

## License
Produces by **RRG SOFT** (https://t.me/rrgfcoder)
