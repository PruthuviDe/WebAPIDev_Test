# Sri Lanka Police Vehicle Tracking API

This is a RESTful API built with Node.js and Express, designed for tracking police vehicle positions in Sri Lanka. The project is developed as part of the coursework requirements for the NB6007CEM Web API Development module.

*   **Student Index:** COBSCCOMP251P-016
*   **Target Platform:** Render
*   **Production URL:** https://webapidev-test-8luf.onrender.com
*   **Postman Collection Link:** [Sri Lanka Police API Workspace Collection](https://www.postman.com/pruthuvidesilva/my-workspace/collection/56594354-7c9901c7-4d86-4f39-9092-220be766ac3a?action=share&source=copy-link&creator=56594354)

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [API Architecture & Directory Structure](#2-api-architecture--directory-structure)
3. [WSO2 REST API Design Standards Compliance](#3-wso2-rest-api-design-standards-compliance)
4. [Security Configuration](#4-security-configuration)
5. [Prerequisites & Installation](#5-prerequisites-&-installation)
6. [API Endpoints Reference](#6-api-endpoints-reference)
7. [Testing & Verification Guide](#7-testing-&-verification-guide)

---

## 1. Project Overview

This backend application tracks and manages geographical nodes (Provinces, Districts, Police Stations) and real-time GPS location telemetry from police vehicles. 

To satisfy coursework constraints while keeping the system lightweight, the project utilizes an in-memory data store. A pre-populated dataset (`seed.json`) is loaded into memory once at server startup. New GPS pings submitted to the API are added to the in-memory array and persist until the server process is restarted.

---

## 2. API Architecture & Directory Structure

The project has been refactored from a single-file application into a modular, layered architecture to support clean scaling, separation of concerns, and ease of testing.

### Directory Structure

```
WebAPIDev_Test/
├── server.js                      ← Server entry point (socket binding)
├── src/
│   ├── app.js                     ← Express configuration and middleware mounting
│   ├── data/
│   │   └── db.js                  ← Database layer (loads seed.json once)
│   ├── middleware/
│   │   └── basicAuth.js           ← HTTP Basic Auth security guard middleware
│   ├── helpers/
│   │   └── formatters.js          ← Representation formatters and query helpers
│   └── routes/
│       ├── geography.routes.js    ← Provinces, Districts, and Stations endpoints
│       ├── vehicle.routes.js      ← Vehicle CRUD and position endpoints
│       └── ping.routes.js         ← Ping ingestion and single ping retrieval
├── package.json                   ← Project dependencies and startup scripts
├── seed.json                      ← Static seed database
├── render.yaml                    ← Render blueprint configuration
└── .gitignore
```

### Architectural Layering
*   **Server Entry Point (`server.js`):** Focuses solely on port binding and listening. Decoupled from the Express application configuration.
*   **Orchestration Layer (`src/app.js`):** Wireframes Express, configures global parsing middleware, registers routes, and handles global application lifecycle.
*   **Routing Layer (`src/routes/`):** Contains endpoints grouped logically by business domains (Geographics, Vehicles, Ingestion).
*   **Middleware Layer (`src/middleware/`):** Houses interceptors (e.g. Basic Authentication) to enforce API boundaries before route execution.
*   **Formatting/Helper Layer (`src/helpers/`):** Defines database queries (e.g. looking up the latest ping) and transforms internal database records into the API contract payloads.
*   **Database Layer (`src/data/db.js`):** Imports the static database. Because Node.js caches `require()` calls, the database exists as a single in-memory state shared across all modules.

---

## 3. WSO2 REST API Design Standards Compliance

The API strictly adheres to WSO2 REST API design specifications:

*   **Uniform Resource Identifiers (URIs):** All path segments use lowercase letters and hyphens (kebab-case). For example, `/last-position` is used instead of camelCase or snake_case.
*   **Resource Orientation:** URIs represent nouns (collections or individual resources) rather than actions or verbs. Operations are defined by the standard HTTP methods (`GET`, `POST`, `PUT`, `DELETE`).
*   **Relationship Scoping:** Dependent collections are correctly scoped under parent resources (e.g., `/vehicles/:vehicleId/pings`). No bare `/pings` route exists.
*   **Flat Payloads:** Envelope wrappers (e.g., nesting arrays inside a `data` key) are avoided. Collections return flat JSON arrays; atomic members return flat JSON objects.
*   **Naming Conventions:** Response body fields are represented consistently in `snake_case` (e.g., `vehicle_id`, `reg_number`, `station_id`).
*   **Consistent Response Headers:** Successful resource creation (POST) returns the standard `Location`, `ETag`, and `Last-Modified` headers.

---

## 4. Security Configuration

The API implements a dual-security boundary based on the client persona:

### A. HTTP Basic Authentication (Admin & Police Users)
All read (GET) paths and all Admin write paths (`POST /vehicles`, `PUT /vehicles/:id`, `DELETE /vehicles/:id`) are protected by HTTP Basic Authentication.
*   **Credentials:** `police:nibm2024`
*   **Authorization Header:** `Authorization: Basic cG9saWNlOm5pYm0yMDI0`
*   **Bypassing health checks:** Accessing the base `/` endpoint requires authentication as well to ensure API privacy.
*   **Challenge Header:** Unauthenticated requests receive a `401 Unauthorized` status along with a `WWW-Authenticate: Basic realm="Police API"` header to trigger browser auth prompts.

### B. Device API Key Authentication (Vehicles/Ingestion Devices)
The ingestion endpoint (`POST /vehicles/:vehicleId/pings`) is accessed by automated IoT tracking hardware. It bypasses Basic Auth and is secured using a unique API Key.
*   **Header:** `X-API-Key`
*   **Format:** `key_v` + 3-digit zero-padded vehicle ID (e.g., `key_v001` for vehicle 1, `key_v012` for vehicle 12).
*   **Key Validation:** The key is compared against the specific vehicle ID in the path. Devices cannot spoof or submit telemetry for other vehicle IDs.

---

## 5. Prerequisites & Installation

### Prerequisites
*   Node.js (version 18 or higher recommended)
*   npm (Node Package Manager)

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

### Running Locally
To launch the server locally:
```bash
npm start
```
By default, the server listens on port `3000` (`http://localhost:3000`).

---

## 6. API Endpoints Reference

### Geographics (Read-Only)
*   `GET /provinces` - Retrieves all provinces.
*   `GET /provinces/:provinceId` - Retrieves a specific province by ID.
*   `GET /districts` - Retrieves all districts including their parent province IDs.
*   `GET /districts/:districtId` - Retrieves a specific district.
*   `GET /stations` - Retrieves all police stations with district relationships.
*   `GET /stations/:stationId` - Retrieves a specific station.

### Vehicles & Position
*   `GET /vehicles` - Retrieves a list of all tracked vehicles.
*   `GET /vehicles/:vehicleId` - Composite representation returning vehicle metadata and the single most recent location ping (sorted descending by timestamp).
*   `GET /vehicles/:vehicleId/last-position` - Specialized endpoint returning only the most recent coordinates, timestamp, and speed for a vehicle (excludes vehicle metadata).
*   `GET /vehicles/:vehicleId/pings` - Retrieves all location pings for a specific vehicle.
*   `GET /vehicles/:vehicleId/pings/:pingId` - Retrieves details of a specific location ping.

### Admin CRUD
*   `POST /vehicles` - Registers a new vehicle.
*   `PUT /vehicles/:vehicleId` - Replaces/updates all vehicle details (PUT replacement semantics).
*   `DELETE /vehicles/:vehicleId` - Deletes a vehicle (preserves historical pings).

### Ingestion
*   `POST /vehicles/:vehicleId/pings` - Submits a new location ping for a vehicle.

---

## 7. Testing & Verification Guide

### Postman Testing (Recommended)
A pre-configured Postman Collection is published in the Postman Workspace. You can access the collection directly to run, test, and audit endpoints:
*   [Sri Lanka Police API Workspace Collection Link](https://www.postman.com/pruthuvidesilva/my-workspace/collection/56594354-7c9901c7-4d86-4f39-9092-220be766ac3a?action=share&source=copy-link&creator=56594354)

Inside the workspace, you will find folder-based configurations mapping all use cases (Local and Live Render testing via variable toggles).

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