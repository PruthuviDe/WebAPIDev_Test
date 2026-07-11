# Sri Lanka Police Vehicle Tracking API 🚓📍

This is my REST API project built using **Node.js** and **Express**. It was created as part of the coursework for the **NB6007CEM** module.

*   **Student Index:** COBSCCOMP251P-016
*   **Deployment platform:** Render (hosted at [https://webapidev-test-8luf.onrender.com](https://webapidev-test-8luf.onrender.com))

---

## 📖 Project Overview

The project acts as a backend tracking system for Sri Lankan police vehicles. It serves geographic data (Provinces, Districts, Police Stations) and real-time/historical vehicle location pings. 

To keep things lightweight for the submission, **there is no database**. Instead, the application loads a pre-populated static dataset (`seed.json`) directly into memory once at startup. Any new location pings submitted by devices are saved in-memory (they reset when the server restarts).

---

## 🛠️ Tech Stack

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** None (In-memory array via `seed.json`)

---

## 📏 WSO2 REST API Guidelines Applied

I carefully followed the WSO2 REST API design specifications:
1.  **Strictly Lowercase & Hyphenated Paths:** We use `/last-position` instead of `/lastPosition` or `/getLastPosition`.
2.  **No Verbs in URIs:** All paths represent resources (nouns). We use HTTP methods (`GET`, `POST`) to define the action.
3.  **Flat JSON Structure:** No redundant envelope wrappers. Collection routes return a flat JSON array `[...]` and resource routes return a flat JSON object `{...}`.
4.  **Field Naming:** All field names in responses are strictly `snake_case` (e.g. `vehicle_id`, `reg_number`, `station_id`).

---

## 🗺️ API Routes

### Geographics (Read-Only)
*   `GET /provinces` — Get all 9 provinces.
*   `GET /provinces/:provinceId` — Get a specific province by ID.
*   `GET /districts` — Get all 25 districts (includes `province_id`).
*   `GET /districts/:districtId` — Get a specific district.
*   `GET /stations` — Get all police stations (includes `district_id`).
*   `GET /stations/:stationId` — Get a specific police station.

### Vehicles & Position (Read-Only)
*   `GET /vehicles` — Get all vehicles.
*   `GET /vehicles/:vehicleId` — **Composite view**: Returns vehicle metadata along with a nested `last_ping` object (the most recent GPS ping sorted descending by timestamp).
*   `GET /vehicles/:vehicleId/last-position` — Returns **only** the latest location details (coordinates, speed, and timestamp) without vehicle metadata.
*   `GET /vehicles/:vehicleId/pings` — Get all historical pings for a specific vehicle.
*   `GET /vehicles/:vehicleId/pings/:pingId` — Get a single location ping by its unique ID.

### Ingestion (Write)
*   `POST /vehicles/:vehicleId/pings` — Allows GPS tracking devices to send real-time pings.
    *   **Authentication:** Requires an `X-API-Key` header matching the device's designated key (formatted as `key_v` + 3-digit padded vehicle ID, e.g. `key_v001` for vehicle 1).
    *   **Headers Returned (201 Created):** 
        *   `Location`: path to retrieve the new ping.
        *   `ETag`: quoted ping ID.
        *   `Last-Modified`: UTC timestamp of when it was saved.

---

## 🚀 How to Run Locally

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/PruthuviDe/WebAPIDev_Test.git
    cd WebAPIDev_Test
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the server:**
    ```bash
    npm start
    ```
    The server will run on `http://localhost:3000`.

---

## 🧪 Testing the Ingestion Endpoint (POST)

To test the secure ping submission endpoint using a tool like Postman:

1.  Set method to **`POST`** and URL to `http://localhost:3000/vehicles/1/pings`.
2.  Go to the **Headers** tab and add a custom header:
    *   **Key:** `X-API-Key`
    *   **Value:** `key_v001`
3.  Go to the **Body** tab, select **raw** and set the type to **JSON**. Paste the payload:
    ```json
    {
      "latitude": 6.9271,
      "longitude": 79.8612,
      "speed": 45.5
    }
    ```
4.  Click **Send**. You should receive a `201 Created` status code and the created ping details in the response.