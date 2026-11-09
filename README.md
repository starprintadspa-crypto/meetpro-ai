# MEETPRO AI

**Connect. Communicate. Collaborate.**

Google Meet jaisa web video conferencing platform. React + TypeScript (frontend), Node.js + Express + Socket.IO (backend), Prisma + SQLite (database), Jitsi Meet (video/audio/screen share).

## 1. Project requirements

- Windows 10/11 (Command Prompt / PowerShell)
- Node.js **20.19+ ya 22 LTS** (https://nodejs.org)
- Git (https://git-scm.com)
- Internet connection (Jitsi aur npm packages ke liye)

Check karein:

```cmd
node -v
npm -v
```

## 2. Features

- Meeting create karna (unique ID) aur invitation link share karna
- Meeting join karna (ID ya link se), guest ya logged-in user ke roop mein
- Jitsi se live video aur audio, camera/mic on-off, screen sharing, participants, leave
- Real-time chat: meeting-specific rooms, typing indicator, online participants, emoji reactions, timestamps, join/leave notices
- Chat history (database mein save hoti hai)
- Auth: register, login, logout, protected routes (session cookie)
- Logged-in user ke liye meetings ki list (`GET /api/meetings/mine`)
- Reconnection: network drop ke baad automatic reconnect aur rejoin

## 3. Services aur APIs

| Service | Kis liye | API key chahiye? | Official link |
|---|---|---|---|
| Jitsi Meet (public, `meet.jit.si`) | Video, audio, screen share | Nahi (dev/testing) | https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/ |
| Socket.IO | Real-time chat aur events | Nahi | https://socket.io/docs/v4/ |
| WebRTC (browser native) | Jitsi ke andar use hota hai | Nahi | https://webrtc.org/ |
| Google STUN | NAT traversal (Jitsi handle karta hai) | Nahi | `stun:stun.l.google.com:19302` |
| Prisma ORM | Database access | Nahi | https://www.prisma.io/docs/ |
| SQLite | Local database | Nahi | https://www.sqlite.org/ |
| uuid | Unique meeting IDs | Nahi | https://www.npmjs.com/package/uuid |
| jsonwebtoken | Session tokens | Nahi | https://www.npmjs.com/package/jsonwebtoken |
| Node.js `crypto.scrypt` | Password hashing | Nahi (built-in) | https://nodejs.org/api/crypto.html |
| Render (backend hosting, optional) | Deployment | Account chahiye | https://render.com |
| Vercel (frontend hosting, optional) | Deployment | Account chahiye | https://vercel.com |

**Abhi integrate nahi hua (aapke action ki zaroorat hai):**
- **TURN server:** Jitsi public server ke saath zaroori nahi. Sirf apna WebRTC/Jitsi server host karte waqt chahiye. Options: Metered (https://www.metered.ca) ya Twilio (https://www.twilio.com/stun-turn). Credentials aap ko account se milenge, unhe `.env` mein daalein.
- **Email (verification, invitations):** Abhi nahi hai. Provider: Resend (https://resend.com) ya Brevo (https://www.brevo.com). Domain verification aur API key aap ko lene hongi.
- **Jitsi production server:** Public `meet.jit.si` par koi SLA nahi. Production ke liye apna Jitsi (Docker: https://github.com/jitsi/docker-jitsi-meet) ya JaaS (https://jaas.8x8.vc) use karein.

## 4. Environment variables

**`backend/.env`** (`backend/.env.example` se copy karein):

| Variable | Example | Kya hai |
|---|---|---|
| `PORT` | `5000` | Backend port |
| `NODE_ENV` | `development` | `production` par cookies secure hoti hain |
| `CLIENT_URL` | `http://localhost:5173` | Frontend URL (CORS aur invite links) |
| `DATABASE_URL` | `"file:./dev.db"` | SQLite file (`backend/prisma/dev.db`) |
| `JITSI_DOMAIN` | `meet.jit.si` | Jitsi server |
| `JWT_SECRET` | 64 hex characters | Session signing key. **Secret hai, kabhi commit na karein.** Server isse bina start nahi hota. |

JWT secret generate karne ka command:

```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**`frontend/.env`** (`frontend/.env.example` se copy karein):

| Variable | Example |
|---|---|
| `VITE_API_URL` | `http://localhost:5000` (ya khali chhod dein, Vite proxy use hoga) |
| `VITE_JITSI_DOMAIN` | `meet.jit.si` |

Frontend mein koi secret nahi hota. `.env` files `.gitignore` mein hain.

## 5. Installation (Windows CMD)

Project folder mein:

```cmd
cd meetpro-ai\backend
npm install
copy .env.example .env
```

`backend\.env` kholen aur `JWT_SECRET` ki jagah section 4 wala generated secret paste karein.

Database setup:

```cmd
npm run db:generate
npx prisma migrate dev
```

Frontend setup (naya CMD window):

```cmd
cd meetpro-ai\frontend
npm install
copy .env.example .env
```

## 6. Development commands

Backend (CMD window 1):

```cmd
cd meetpro-ai\backend
npm run dev
```

Frontend (CMD window 2):

```cmd
cd meetpro-ai\frontend
npm run dev
```

Browser: http://localhost:5173

Health check: http://localhost:5000/api/health

## 7. API routes

| Method | Route | Auth | Kaam |
|---|---|---|---|
| POST | `/api/auth/register` | Nahi | Account banana (name, email, password) |
| POST | `/api/auth/login` | Nahi | Login, session cookie set |
| POST | `/api/auth/logout` | Nahi | Session cookie clear |
| GET | `/api/auth/me` | Haan | Current user |
| POST | `/api/meetings` | Haan | Meeting banana (UUID roomId, optional title, scheduledAt) |
| GET | `/api/meetings/mine` | Haan | Apni meetings ki list |
| GET | `/api/meetings/:roomId` | Nahi | Invitation link ki meeting info |

Socket.IO events: `room:join`, `room:leave`, `chat:send`, `chat:typing`, `reaction:send`. Server events: `chat:message`, `chat:typing`, `reaction:received`, `room:user-joined`, `room:user-left`, `room:participants`, `server:shutting-down`.

## 8. Testing

Backend chal raha ho (CMD window 1 mein `npm run dev`), phir naye CMD window mein:

```cmd
cd meetpro-ai\backend
npm run test:api
npm run test:socket
```

Expected: `RESULT: 35 passed, 0 failed` aur `RESULT: 33 passed, 0 failed`.

Manual test:
1. Browser 1: Register karein, "New Meeting" dabayein, invite link copy karein.
2. Browser 2 (incognito): Link kholen, naam likh kar join karein.
3. Dono mein chat, typing, reactions, participants check karein.
4. Browser 2 ka Wi-Fi band karke wapas on karein. "Reconnecting" phir "Connected" aana chahiye.

## 9. Database

- Models: `User`, `Meeting`, `MeetingParticipant`, `MeetingMessage`
- Migrations: `backend/prisma/migrations/` (init + auth/participants)
- Schema change ke baad: `npx prisma migrate dev --name <naam>`
- Production (PostgreSQL) ke liye: `schema.prisma` mein provider badal kar `npx prisma migrate deploy` chalayein

Database browse karne ke liye: `npx prisma studio` (backend folder mein)

## 10. Deployment (outline)

1. GitHub par repository banayein. `.env` commit na karein (`.gitignore` already hai).
2. **Backend (Render):** Web Service banayein, root directory `backend`, build command `npm install && npm run build`, start command `npm run db:deploy && npm start`. Environment variables mein `JWT_SECRET`, `CLIENT_URL` (frontend URL), `NODE_ENV=production` set karein. SQLite Render par persistent disk ke bina reset ho sakta hai: production ke liye PostgreSQL (Render Postgres) recommended hai.
3. **Frontend (Vercel):** Root directory `frontend`, build command `npm run build`, output `dist`. Environment variables: `VITE_API_URL` (backend URL), `VITE_JITSI_DOMAIN`.
4. Production mein `VITE_JITSI_DOMAIN` ko apne Jitsi server par set karein.

Deployment abhi tak test nahi hua. Ye steps aap ke accounts se karne honge.

## 11. Known limitations

- **Logout:** Server-side session revoke nahi hota. Logout browser cookie hata deta hai, lekin copy kiya hua token 7 din tak valid rehta hai. Next step: session table ya token version.
- **Email verification aur password reset:** Nahi hain (email provider chahiye).
- **Roles aur permissions:** Abhi sirf meeting host (`hostId`) ka concept hai. Host controls (remove participant, lock meeting, end for everyone) Phase 8 mein hain.
- **Meeting settings aur waiting room:** Schema mein `isLocked` hai, lekin UI aur enforcement nahi hai.
- **Dashboard UI:** API (`/api/meetings/mine`) hai, lekin meeting history page abhi nahi bana.
- **Reconnect:** Reconnect par participant list mein purana entry hat kar naya add hota hai, aur chat mein "left/joined" notice aate hain.
- **Room IDs:** Home page par "New Meeting" random short ID (`abc-defg-hij`) banata hai (client-side). Logged-in meetings ke liye API UUID v4 banata hai. Dono formats validation mein allowed hain.
- **Jitsi public server:** Koi uptime guarantee nahi. Production ke liye apna server.
- **Database test:** Sandbox mein Prisma engine download nahi ho sakta, is liye API aur socket tests in-memory Prisma fake ke saath chale. Real SQLite par `prisma migrate dev` aur `npm run dev` aapke machine par pehli baar chalenge.
- **Mobile:** Layout responsive hai, lekin real device par testing abhi baaki hai.
- **Rate limiting:** Auth routes par 20 requests / 15 minute, baaki API par 300 / 15 minute, socket events par per-event limits.
