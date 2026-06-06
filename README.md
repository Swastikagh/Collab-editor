# CollabCode — Real-Time Collaborative Editor

A full-stack real-time collaborative code editor with live sync, chat, and code execution.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + Vite | Fast, component-based UI |
| Editor | Monaco Editor | Same editor as VS Code |
| Real-time | Socket.io | WebSocket abstraction |
| Backend | Node.js + Express | JavaScript on the server |
| Database | PostgreSQL (Supabase) | Relational, ACID-compliant |
| ORM | Prisma | Type-safe DB queries |
| Auth | JWT + bcrypt | Stateless, secure |
| Execution | Docker containers | OS-level isolation |

---

## How Technologies Are Linked

```
USER BROWSER
    │
    ├── HTTP requests (REST API)
    │   └── React → axios → Express routes → Controllers → Prisma → PostgreSQL
    │
    └── WebSocket (real-time)
        └── React → Socket.io client → Socket.io server → broadcast to room
                                                        └── Prisma → PostgreSQL
```

---

## Setup Instructions

### 1. Clone / extract project
```bash
cd collab-editor
```

### 2. Setup Backend
```bash
cd backend
npm install
```

Create `.env` file (copy from `.env.example`):
```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres"
JWT_SECRET="any-long-random-string"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```

Push database schema:
```bash
npx prisma db push
npx prisma generate
```

Start backend:
```bash
npm run dev
```

### 3. Setup Frontend
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app
Go to: http://localhost:5173

---

## Project Structure

```
collab-editor/
├── backend/
│   ├── src/
│   │   ├── index.js              ← Entry point, HTTP + WebSocket server
│   │   ├── prismaClient.js       ← Database connection singleton
│   │   ├── controllers/
│   │   │   ├── authController.js    ← Register, login, JWT
│   │   │   ├── roomController.js    ← Rooms, files, versions
│   │   │   └── executeController.js ← Docker code execution
│   │   ├── middleware/
│   │   │   └── authMiddleware.js    ← JWT verification
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── roomRoutes.js
│   │   │   └── executeRoutes.js
│   │   └── socket/
│   │       └── socketHandler.js  ← All real-time WebSocket logic
│   └── prisma/
│       └── schema.prisma         ← Database schema
│
└── frontend/
    └── src/
        ├── App.jsx               ← Router + protected routes
        ├── api.js                ← Axios instance with auth interceptor
        ├── context/
        │   └── AuthContext.jsx   ← Global auth state
        ├── hooks/
        │   └── useSocket.js      ← WebSocket connection hook
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx     ← Room list + create/join
            └── Room.jsx          ← Editor + chat + code runner
```

---

## CS Concepts Used

### Networks (Socket.io + WebSockets)
- `socketHandler.js` — full-duplex real-time communication
- HTTP vs WebSocket — REST for data, WS for live sync
- Socket.io rooms — namespace connections per editor room
- Event-driven architecture — `code_change`, `cursor_move`, `new_message`

### DBMS (PostgreSQL + Prisma)
- Relational schema with foreign keys (User → Room → File → FileVersion)
- Transactions — Prisma handles atomic operations
- Indexing — Supabase auto-indexes primary keys and unique fields
- File versioning — every save creates a FileVersion snapshot

### OS (Docker)
- `executeController.js` — process isolation using containers
- Linux cgroups — `--memory=100m --cpus=0.5` limits per container
- Namespaces — `--network none` isolates network
- Process timeout — SIGTERM after 5 seconds
- Temp file lifecycle — created, used, deleted per execution
