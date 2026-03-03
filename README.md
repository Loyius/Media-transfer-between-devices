# SnapFiles 

> Transfer files between any device, in seconds, with nothing to install.

SnapFiles is a peer-to-peer (P2P) web application for media transfer that connects two devices through the browser, regardless of operating system. No accounts, no cloud, no third-party size limits — just a direct and secure connection between your devices.

---

##  Features

-  **Code-based pairing** — generate a room code and share it with the other device
-  **P2P transfer via WebRTC** — data goes directly from one device to the other
-  **Multiple files** — send several files at once
-  **Real-time progress** — track the transfer with a progress bar
-  **No intermediate server** — after pairing, the transfer is fully P2P
-  **No installation** — just open the browser

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| P2P Communication | WebRTC via `simple-peer` |
| Signaling | Node.js + Socket.IO |
| Backend | Express |

---

## 🚀 Getting Started

### Prerequisites

- Node.js `>= 18`
- npm or yarn

### 1. Clone the repository

```bash
git clone https://github.com/your-username/snapfiles.git
cd snapfiles
```

### 2. Install server dependencies

```bash
cd server
npm install
```

### 3. Install client dependencies

```bash
cd ../client
npm install
```

### 4. Run the signaling server

```bash
cd server
node index.js
# Server running at http://localhost:3000
```

### 5. Run the frontend

```bash
cd client
npm run dev
# Frontend running at http://localhost:5173
```

### 6. Access from your phone

Find your machine's local IP and open it on your phone over Wi-Fi:

```
http://YOUR_LOCAL_IP:5173
```

> 💡 **Tip:** To find your local IP, run `ipconfig` (Windows) or `ifconfig` / `ip a` (Linux/macOS).

---

## 🌐 How It Works

```
[Phone - Browser]  ←── WebRTC P2P ──→  [Laptop - Browser]
        │                                        │
        └────── Node.js Signaling Server ─────────┘
```

1. The **sender** creates a room and receives a code
2. The **receiver** types the code and joins the room
3. The server exchanges WebRTC connection info between both devices (signaling)
4. From that point on, the transfer happens **directly between devices via P2P**
5. The receiver gets the file and the download is triggered automatically
