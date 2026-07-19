# Sri Lanka Police Vehicle Tracking API

This is a RESTful API built with Node.js, Express, and MongoDB, designed for tracking police vehicle positions in Sri Lanka. The project is developed as part of the coursework requirements for the NB6007CEM Web API Development module.

*   **Student Index:** COBSCCOMP251P-016
*   **Target Platform:** Render
*   **Production URL:** https://webapidev-test-8luf.onrender.com
*   **Postman Workspace Link:** [Sri Lanka Police API Workspace](https://www.postman.com/warped-firefly-225285/workspace/my-workspace)

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [API Architecture & Directory Structure](#2-api-architecture--directory-structure)
3. [Database Architecture & Auto-Seeding](#3-database-architecture--auto-seeding)
4. [WSO2 REST API Design Standards Compliance](#4-wso2-rest-api-design-standards-compliance)
5. [Security Configuration](#5-security-configuration)
6. [Prerequisites & Installation](#6-prerequisites--installation)
7. [API Endpoints Reference](#7-api-endpoints-reference)
8. [Testing & Verification Guide](#8-testing--verification-guide)

---

## 1. Project Overview

This backend application tracks and manages geographical nodes (Provinces, Districts, Police Stations) and real-time GPS location telemetry from police vehicles. 

The API uses a persistent **MongoDB** database (via the official `mongodb` native driver) to store and query resources. On initial database setup or empty collection states, an automatic seeding mechanism populates the collections from `seed.json`.

---

## 2. API Architecture & Directory Structure

The project follows a modular, layered architecture supporting separation of concerns, scalability, and ease of testing.

### Directory Structure

```
WebAPIDev_Test/
├── server.js                      ← Server entry point (binds port & starts DB connection)
├── src/
│   ├── app.js                     ← Express configuration and middleware mounting
│   ├── data/
│   │   └── db.js                  ← MongoDB connection management & auto-seeding logic
│   ├── middleware/
│   │   └── basicAuth.js           ← HTTP Basic Auth security guard middleware
│   ├── helpers/
│   │   └── formatters.js          ← Payload formatters and async query helpers
│   └── routes/
│       ├── geography.routes.js    ← Provinces, Districts, and Stations endpoints
│       ├── vehicle.routes.js      ← Vehicle CRUD and position endpoints
│       └── ping.routes.js         ← Ping ingestion and single ping retrieval
├── package.json                   ← Project dependencies and startup scripts
├── seed.json                      ← Static seed dataset for initial database seeding
├── render.yaml                    ← Render blueprint configuration
└── .gitignore
```

### Architectural Layering
*   **Server Entry Point (`server.js`):** Handles HTTP port binding immediately for cloud health checks, initiating asynchronous database connection in parallel.
*   **Orchestration Layer (`src/app.js`):** Configures Express, global body parsers, route handlers, and middleware interceptors.
*   **Routing Layer (`src/routes/`):** Groups asynchronous endpoints logically by domain (Geographics, Vehicles, Ping Ingestion).
*   **Middleware Layer (`src/middleware/`):** Enforces security access control (HTTP Basic Auth guard).
*   **Formatting/Helper Layer (`src/helpers/`):** Contains data query helpers (e.g. `getLatestPing`, `nextId`) and transforms database records into WSO2-compliant payload contracts.
*   **Database Layer (`src/data/db.js`):** Manages `MongoClient` lifecycle, handles fallback connection strings, and executes auto-seeding when collections are empty.

---

## 3. Database Architecture & Auto-Seeding

The application connects to a MongoDB database configured via the `MONGODB_URI` environment variable.

*   **Driver:** Official `mongodb` Native Driver (lightweight, performance-optimized).
*   **Default Connection:** `mongodb://localhost:27017/police_db` (local fallback).
*   **Cloud Hosting:** MongoDB Atlas Cluster (`police_db`).
*   **Auto-Seeding:** On startup, the database module checks if `provinces`, `districts`, `stations`, `vehicles`, or `pings` collections are empty. If empty, documents are imported automatically from `seed.json`.

---

## 4. WSO2 REST API Design Standards Compliance

The API strictly adheres to WSO2 REST API design specifications:

*   **Uniform Resource Identifiers (URIs):** All path segments use lowercase letters and hyphens (kebab-case). For example, `/last-position` is used instead of camelCase or snake_case.
*   **Resource Orientation:** URIs represent nouns (collections or individual resources) rather than actions or verbs. Operations are defined by standard HTTP methods (`GET`, `POST`, `PUT`, `DELETE`).
*   **Relationship Scoping:** Dependent collections are correctly scoped under parent resources (e.g., `/vehicles/:vehicleId/pings`). No bare `/pings` route exists.
*   **Flat Payloads:** Envelope wrappers (e.g., nesting arrays inside a `data` key) are avoided. Collections return flat JSON arrays; atomic members return flat JSON objects.
*   **Naming Conventions:** Response body fields are represented consistently in `snake_case` (e.g., `vehicle_id`, `reg_number`, `station_id`).
*   **Consistent Response Headers:** Successful resource creation (POST) returns the standard `Location`, `ETag`, and `Last-Modified` headers.

---

## 5. Security Configuration

The API implements a dual-security boundary based on client persona:

### A. JWT Authentication & Role-Based Access Control (Users & Administrators)
Protected HTTP routes require a JSON Web Token (JWT) provided in the HTTP `Authorization` header.

*   **Header Format:** `Authorization: Bearer <jwt_token>`
*   **Obtaining a Token:** Exchange credentials via `POST /auth/login`.
*   **Pre-Seeded Test Accounts:**
    *   **Administrator Account:** `admin_user` / `Admin@123` (Role: `ADMIN` — full access to read, create, update, and delete vehicle resources).
    *   **Dispatcher Account:** `dispatcher_colombo` / `Dispatch@123` (Role: `DISPATCHER` — full read access to vehicles, positions, and pings).
    *   **Patrol Officer Account:** `officer_patrol` / `Officer@123` (Role: `OFFICER` — read access to vehicle registry and positions).

### B. Device API Key Authentication (Vehicles/Ingestion Devices)
The GPS ingestion endpoint (`POST /vehicles/:vehicleId/pings`) is accessed by automated tracking hardware mounted on police vehicles. It bypasses JWT user authentication and is secured using a unique API Key.
*   **Header:** `X-API-Key`
*   **Format:** `key_v` + 3-digit zero-padded vehicle ID (e.g., `key_v001` for vehicle 1, `key_v012` for vehicle 12).
*   **Key Validation:** The key is compared deterministically against the specific vehicle ID in the request path.

---

## 6. Prerequisites & Installation

### Prerequisites
*   Node.js (version 18 or higher recommended)
*   npm (Node Package Manager)
*   MongoDB instance (local or MongoDB Atlas connection URI)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/PruthuviDe/WebAPIDev_Test.git
   cd WebAPIDev_Test
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```

### Environment Setup
Create a `.env` file or export `MONGODB_URI` in your shell:
```bash
export MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.q8herfx.mongodb.net/police_db?retryWrites=true&w=majority"
```

### Running Locally
To launch the server locally:
```bash
npm start
```
By default, the server listens on port `3000` (`http://localhost:3000`).

---

## 7. API Endpoints Reference

### Geographics (Read-Only)
*   `GET /provinces` - Retrieves all provinces.
*   `GET /provinces/:provinceId` - Retrieves a specific province by ID.
*   `GET /districts` - Retrieves all districts including parent province IDs.
*   `GET /districts/:districtId` - Retrieves a specific district.
*   `GET /stations` - Retrieves all police stations with district relationships.
*   `GET /stations/:stationId` - Retrieves a specific station.

### Vehicles & Position
*   `GET /vehicles` - Retrieves a list of all tracked vehicles.
*   `GET /vehicles/:vehicleId` - Composite representation returning vehicle metadata and the single most recent location ping (sorted descending by timestamp).
*   `GET /vehicles/:vehicleId/last-position` - Specialized endpoint returning only the most recent coordinates, timestamp, and speed for a vehicle.
*   `GET /vehicles/:vehicleId/pings` - Retrieves all location pings for a specific vehicle.
*   `GET /vehicles/:vehicleId/pings/:pingId` - Retrieves details of a specific location ping.

### Admin CRUD
*   `POST /vehicles` - Registers a new vehicle.
*   `PUT /vehicles/:vehicleId` - Replaces/updates all vehicle details (PUT replacement semantics).
*   `DELETE /vehicles/:vehicleId` - Deletes a vehicle (preserves historical pings).

### Ingestion
*   `POST /vehicles/:vehicleId/pings` - Submits a new location ping for a vehicle.

---

## 8. Testing & Verification Guide

### Postman Testing (Recommended)
A pre-configured Postman Collection is published in the Postman Workspace:
*   [Sri Lanka Police API Workspace Link](https://www.postman.com/warped-firefly-225285/workspace/my-workspace)

### Manual cURL Commands

**1. GET Provinces (Basic Auth)**
```bash
curl -X GET "https://webapidev-test-8luf.onrender.com/provinces" \
     -H "Authorization: Basic cG9saWNlOm5pYm0yMDI0"
```

**2. GET Vehicle Composite (Basic Auth)**
```bash
curl -X GET "https://webapidev-test-8luf.onrender.com/vehicles/1" \
     -H "Authorization: Basic cG9saWNlOm5pYm0yMDI0"
```

**3. Ingest Vehicle Ping (X-API-Key Auth)**
```bash
curl -X POST "https://webapidev-test-8luf.onrender.com/vehicles/1/pings" \
     -H "X-API-Key: key_v001" \
     -H "Content-Type: application/json" \
     -d '{"latitude": 6.9271, "longitude": 79.8612, "speed": 45}'
```