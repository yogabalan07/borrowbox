# BorrowBox — Campus Student Lending & Borrowing Network

BorrowBox is a clean, friendly, responsive web application for college students to list, borrow, and rent items, textbooks, lab equipment, cameras, and recreational gear from one another.

---

## 🛠 Tech Stack

- **Frontend Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4 (Emerald, Charcoal, and Soft Gray palette)
- **Routing**: React Router DOM v7
- **Icons**: Lucide React
- **Backend Architecture**: Typed REST API service ready for an asynchronous Python **FastAPI** backend

---

## ⚙️ Environment Variables

BorrowBox is configured to connect to your FastAPI backend via `VITE_API_BASE_URL`.

Create or edit your `.env` file based on `.env.example`:

```bash
# URL of your Python FastAPI backend (dev default: http://127.0.0.1:8000/api/v1)
VITE_API_BASE_URL="http://127.0.0.1:8000/api/v1"
```

Local development standardizes on the backend at `http://127.0.0.1:8000` and the
frontend at `http://localhost:3000`. These are different origins, so both must
be allowed by the backend CORS allowlist when needed.

- **Backend Connection**: BorrowBox routes all requests directly to your FastAPI backend using standard HTTP headers (`Authorization: Bearer <token>`, JSON payloads). Real error responses from FastAPI (such as 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error) are surfaced directly in the UI.
- **Strict Real Data**: All mock datasets, placeholder fallbacks, and dummy records have been removed. If the backend is unreachable or not configured, clear error indicators and retry triggers are presented.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
The app will run at `http://localhost:3000`.

### 3. Run the FastAPI Backend
From the `backend` directory, with the project's virtual environment activated:
```bash
uvicorn app.main:app --reload --port 8000
```
The API will be available at `http://127.0.0.1:8000/api/v1` (health check:
`http://127.0.0.1:8000/api/v1/health`). Backend configuration is read from
`backend/.env` (see `backend/.env.example`).

### 4. Build for Production
```bash
npm run build
```

---

## 🐍 Python FastAPI Integration Guide

To connect your own Python FastAPI backend, implement the following endpoints corresponding to `src/services/api.ts`:

### 1. Authentication (`/auth`)
- `POST /auth/register` — Accepts student registration payload (`name`, `email`, `password`, `college`, `department`, `yearOfStudy`, `phone`). Returns `{ "user": User, "access_token": "..." }`.
- `POST /auth/login` — Accepts `{ "email": "...", "password": "..." }`. Returns `{ "user": User, "access_token": "..." }`.
- `GET /auth/me` — Returns the authenticated `User` object.
- `PATCH /auth/me` — Updates student profile bio, phone, or department.
- `GET /auth/google/start` — Begins the Google OAuth 2.0 flow (full-page browser navigation).
- `GET /auth/google/callback` — Google redirect target; issues a short-lived handoff token.
- `POST /auth/google/exchange` — Exchanges `{ "handoff_token": "..." }` for `{ "user": User, "access_token": "..." }`.

### 2. Marketplace & Listings (`/items`)
- `GET /items?category={}&lending_mode={}&search={}&sort_by={}` — Returns `Item[]`.
- `GET /items/{id}` — Returns specific `Item`.
- `POST /items` — Creates a new item listing.
- `PATCH /items/{id}` — Updates existing listing.
- `DELETE /items/{id}` — Deletes listing.
- `GET /users/{userId}/items` — Returns items listed by a specific student.

### 3. Borrow Requests & Loans (`/requests`)
- `POST /requests` — Submits a new loan request: `{ "item_id": "...", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "message": "..." }`.
- `GET /requests/borrowing` — Returns requests made by the current user.
- `GET /requests/lending` — Returns incoming requests for the user's listed gear.
- `GET /requests/{id}` — Returns loan agreement detail and timeline steps.
- `PATCH /requests/{id}/status` — Updates status (`approved`, `rejected`, `active`, `returned`, `cancelled`).

### 4. Direct Messages (`/conversations` & `/messages`)
- `GET /conversations` — Returns student's active chats.
- `GET /conversations/{id}/messages` — Returns message history.
- `POST /messages` — Sends a message with item context.

### 5. Notifications (`/notifications`)
- `GET /notifications` — Returns student alerts (approvals, returns, reminders).
- `PATCH /notifications/{id}/read` — Marks notification as read.
- `POST /notifications/read-all` — Marks all as read.

### 6. Administration (`/admin`)
- `GET /admin/stats` — Platform metrics (verified students, active listings, active loans).
- `GET /admin/users` — Registered student directory.
- `PATCH /admin/users/{userId}/verify` — Toggles student verification status.
- `GET /admin/reports` — Moderation reports for flagged items.
- `POST /admin/reports/{reportId}/resolve` — Resolves or dismisses a report.
- `GET /admin/loans` — All platform loan records.

---

## 🎨 Visual System & Campus Design Principles

1. **Anti-Slop Restraint**: Zero generic purple gradients, zero fake status dots, zero pill badge sandwiches on cards.
2. **Top Bar Contract**: Brand Wordmark + 5 concise nav links + primary CTA.
3. **Campus Trust**: Verified `.edu` student indicators, condition inspection logs, and suggested meetup spots at campus landmarks.
4. **Accessible Contrast**: WCAG AA compliant typography on crisp white and soft stone surfaces with emerald green action accents.
