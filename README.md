# Sri Lanka Police Vehicle Tracking API

This is a RESTful API built with Node.js and Express, designed for tracking police vehicle positions in Sri Lanka. The project is developed as part of the coursework requirements for the NB6007CEM Web API Development module.

*   **Student Index:** COBSCCOMP251P-016
*   **Target Platform:** Render
*   **Production URL:** https://webapidev-test-8luf.onrender.com

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [API Architecture & Standards](#api-architecture--standards)
3. [Prerequisites & Installation](#prerequisites--installation)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Testing Ingestion (POST)](#testing-ingestion-post)

---

## 1. Project Overview

This backend application tracks and manages geographical nodes (Provinces, Districts, Police Stations) and real-time GPS location telemetry from police vehicles. 

To satisfy coursework constraints while keeping the system lightweight, the project utilizes an in-memory data store. A pre-populated dataset (`seed.json`) is loaded into memory once at server startup. New GPS pings submitted to the API are added to the in-memory array and persist until the server process is restarted.

---

## 2. API Architecture & Standards

The API strictly adheres to the WSO2 REST API Design Guidelines:

*   **Uniform Resource Identifiers (URIs):** All path segments are lowercase and hyphen-separated (kebab-case). For example, `/last-position` is used instead of camelCase or snake_case.
*   **Resource Orientation:** URIs represent nouns (collections or individual resources) rather than actions or verbs. Operations are defined by the standard HTTP methods (`GET`, `POST`).
*   **Standardized Payload Shapes:** Envelope wrappers (e.g., nesting arrays inside a `data` key) are avoided. Collections return flat JSON arrays; atomic members return flat JSON objects.
*   **Naming Conventions:** Response body fields are represented consistently in `snake_case` (e.g., `vehicle_id`, `reg_number`, `station_id`).
*   **Consistent Response Headers:** Successful resource creation returns the standard `Location`, `ETag`, and `Last-Modified` headers.

---

## 3. Prerequisites & Installation

### Prerequisites
*   Node.js (version 18 or higher recommended)
*   npm (Node Package Manager)

### Installation
1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/PruthuviDe/WebAPIDev_Test.git
   cd WebAPIDev_Test
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```

### Running Locally
To launch the server on your local environment:
```bash
npm start
```
By default, the server listens on port `3000` (`http://localhost:3000`).

---

## 4. API Endpoints Reference

### Geographics (Read-Only)
*   `GET /provinces` - Retrieves all provinces.
*   `GET /provinces/:provinceId` - Retrieves a specific province by ID.
*   `GET /districts` - Retrieves all districts including their parent province IDs.
*   `GET /districts/:districtId` - Retrieves a specific district.
*   `GET /stations` - Retrieves all police stations (depots) with district relationships.
*   `GET /stations/:stationId` - Retrieves a specific station.

### Vehicles & Position (Read-Only)
*   `GET /vehicles` - Retrieves a list of all tracked vehicles.
*   `GET /vehicles/:vehicleId` - Composite representation returning vehicle metadata and the single most recent location ping (sorted descending by timestamp).
*   `GET /vehicles/:vehicleId/last-position` - Specialized endpoint returning only the most recent coordinates, timestamp, and speed for a vehicle (excludes vehicle metadata).
*   `GET /vehicles/:vehicleId/pings` - Retrieves all location pings for a specific vehicle.
*   `GET /vehicles/:vehicleId/pings/:pingId` - Retrieves details of a specific location ping.

### Ingestion (Write)
*   `POST /vehicles/:vehicleId/pings` - Submits a new location ping for a vehicle.

---

## 5. Testing Ingestion (POST)

The ingestion endpoint requires custom header authentication to simulate a device checking in.

### Request Specification
*   **Method:** `POST`
*   **Path:** `/vehicles/:vehicleId/pings`
*   **Headers:**
    *   `X-API-Key`: A unique per-vehicle key. The key follows the format `key_v` + 3-digit padded vehicle ID (e.g., `key_v001` for vehicle `1`, `key_v012` for vehicle `12`).
    *   `Content-Type`: `application/json`
*   **Payload (JSON):**
    ```json
    {
      "latitude": 6.9271,
      "longitude": 79.8612,
      "speed": 45.5
    }
    ```

### Expected Response (201 Created)
*   **Headers:**
    *   `Location`: `/vehicles/:vehicleId/pings/:pingId`
    *   `ETag`: `":pingId"` (double-quoted ID of the created ping)
    *   `Last-Modified`: A standard UTC date string representing when the ping was saved.
*   **Body (JSON):**
    ```json
    {
      "ping_id": 4153,
      "vehicle_id": 1,
      "timestamp": "2026-07-11T02:13:47.356Z",
      "lat": 6.9271,
      "lng": 79.8612,
      "speed": 45.5
    }
    ```