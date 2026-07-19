# Proposal & Architecture Plan: Upgrading to JWT Authentication & Role-Based Access Control (RBAC)

> **Project:** Police Vehicle Tracking REST API (`WebAPIDev_Test`)  
> **Prepared for:** Stakeholder Demonstration & Presentation  
> **Status:** Proposal & Plan (Awaiting Confirmation)

---

## 1. Demonstration Prompt (Shareable Overview)

Below is a concise presentation prompt you can present to evaluators or team members:

> *"Currently, our Police Vehicle Tracking REST API uses legacy HTTP Basic Authentication with shared credentials (`police:nibm2024`) for all read requests, and static API keys for IoT vehicle pings. While functional for a baseline MVP, this model lacks individual accountability, session expiration, and granular authorization.*  
>  
> *We propose upgrading the API to enterprise-grade **JSON Web Token (JWT) Authentication** combined with **Role-Based Access Control (RBAC)**. Under this architecture, human users (Administrators, Dispatchers, and Patrol Officers) log in securely to receive cryptographically signed tokens containing their identity and permissions, while automated vehicle GPS hardware continues using lightweight `X-API-Key` ingestion. This dual-boundary model enforces modern security standards without disrupting hardware tracking."*

---

## 2. Technical Motivation: Why Upgrade from Basic Auth to JWT?

| Feature | Legacy Basic Auth (Current) | Modern JWT + RBAC (Proposed) |
| :--- | :--- | :--- |
| **User Identity** | Generic single login (`police`) | Individual accounts (`admin_user`, `officer_colombo`, etc.) |
| **Password Transmission** | Plaintext base64 sent on *every single request* | Password sent *once* at `/auth/login`; subsequent requests use signed JWT |
| **Password Storage** | Hardcoded string in source code | Hashed securely in MongoDB using `bcryptjs` (salt factor 10) |
| **Token Lifetime** | Infinite (no expiration) | Time-bounded expiration (e.g., 1 hour `exp` claim) |
| **Access Control** | All-or-nothing access | Granular RBAC (`ADMIN`, `DISPATCHER`, `OFFICER`) |
| **Auditability** | Cannot identify which officer performed an action | Full traceability per request using JWT payload claims |

---

## 3. System Architecture & Dual Security Boundary

```
                           ┌──────────────────────────────────────────────────────────┐
                           │                      CLIENT TYPES                        │
                           └────────────────────────────┬─────────────────────────────┘
                                                        │
                      ┌─────────────────────────────────┴─────────────────────────────────┐
                      │                                                                   │
       [ Human Users: Admin / Dispatcher / Officer ]                    [ Automated Vehicle Hardware ]
                      │                                                                   │
          POST /auth/login (credentials)                                            POST /vehicles/:id/pings
                      │                                                                   │
           Returns Signed JWT Token                                                    X-API-Key Header
                      │                                                                   │
   Header: Authorization: Bearer <jwt_token>                                              │
                      │                                                                   │
                      ▼                                                                   ▼
       ┌─────────────────────────────┐                                     ┌─────────────────────────────┐
       │     JWT Auth Middleware     │                                     │    Device Auth Middleware   │
       │    (Verifies Token & RBAC)  │                                     │     (Validates key_vXXX)    │
       └──────────────┬──────────────┘                                     └──────────────┬──────────────┘
                      │                                                                   │
                      └─────────────────────────────────┬─────────────────────────────────┘
                                                        │
                                                        ▼
                                          ┌──────────────────────────┐
                                          │ MongoDB Database         │
                                          │ (users, vehicles, pings) │
                                          └──────────────────────────┘
```

---

## 4. User Roles & Permission Matrix (RBAC)

We define three distinct user roles:

1. **`ADMIN`**: System administrators. Full CRUD capabilities on vehicles, users, and geography.
2. **`DISPATCHER`**: Command center operators. Read access to all vehicles/pings and full access to tracking views.
3. **`OFFICER`**: Field officers. Read access to vehicle registry and latest positions.

### Endpoint Permissions

| Route | Method | Authentication Required | Authorized Roles / Hardware |
| :--- | :--- | :--- | :--- |
| `GET /` | GET | None | Public Health Check |
| `POST /auth/login` | POST | None | Public Credential Exchange |
| `GET /auth/me` | GET | JWT Bearer Token | `ADMIN`, `DISPATCHER`, `OFFICER` |
| `GET /provinces`, `/districts`, `/stations` | GET | JWT Bearer Token | `ADMIN`, `DISPATCHER`, `OFFICER` |
| `GET /vehicles`, `/vehicles/:id` | GET | JWT Bearer Token | `ADMIN`, `DISPATCHER`, `OFFICER` |
| `GET /vehicles/:id/last-position` | GET | JWT Bearer Token | `ADMIN`, `DISPATCHER`, `OFFICER` |
| `GET /vehicles/:id/pings` | GET | JWT Bearer Token | `ADMIN`, `DISPATCHER` |
| `POST /vehicles` | POST | JWT Bearer Token | `ADMIN` only |
| `PUT /vehicles/:id` | PUT | JWT Bearer Token | `ADMIN` only |
| `DELETE /vehicles/:id` | DELETE | JWT Bearer Token | `ADMIN` only |
| `POST /vehicles/:id/pings` | POST | Device `X-API-Key` | GPS Hardware (`key_vXXX`) |

---

## 5. API Specification & Payload Formats

### A. Authentication Endpoint (`POST /auth/login`)

**Request:** `POST /auth/login`  
**Header:** `Content-Type: application.json`  
**Body:**
```json
{
  "username": "admin_user",
  "password": "AdminPassword123"
}
```

**Response (200 OK):**
```json
{
  "token_type": "Bearer",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "username": "admin_user",
    "role": "ADMIN"
  }
}
```

### B. Authenticated Request Format
All protected HTTP routes must include the token in the standard HTTP header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 6. Implementation Plan & File Changes

When you confirm to proceed, the implementation will follow these exact steps:

1. **Install Dependencies**:
   - `jsonwebtoken`: Signing & verifying JWT tokens.
   - `bcryptjs`: Secure password hashing.
2. **Seed Initial Users (`src/data/db.js`)**:
   - Auto-seed a `users` collection in MongoDB with pre-hashed passwords:
     - `admin_user` / `Admin@123` (`ADMIN`)
     - `dispatcher_colombo` / `Dispatch@123` (`DISPATCHER`)
     - `officer_patrol` / `Officer@123` (`OFFICER`)
3. **JWT Helper (`src/helpers/jwt.js`)**:
   - `generateToken(user)`: Signs JWT payload (`{ user_id, username, role }`) using `JWT_SECRET`.
   - `verifyToken(token)`: Validates signature and expiration.
4. **Auth Middleware (`src/middleware/jwtAuth.js`)**:
   - Extracts Bearer token from `Authorization` header.
   - Attaches `req.user` to request object.
   - Provides role-checking helper: `requireRole(['ADMIN'])`.
5. **Auth Routes (`src/routes/auth.routes.js`)**:
   - Implements `POST /auth/login` and `GET /auth/me`.
6. **Update Express Pipeline (`src/app.js`)**:
   - Replace legacy `applyBasicAuth` with `jwtAuth` and mount `/auth` routes.
7. **Documentation**:
   - Update `README.md` and `PROJECT_MEMORY.md` with JWT setup, secret key env vars, and Postman token guide.

---

## 7. Next Steps

**Do not proceed to execution until you confirm.**  
Once you review this proposal and confirm, I will begin implementing the changes step-by-step.
