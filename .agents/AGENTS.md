# Agent Rules — WebAPIDev_Test

> Read PROJECT_MEMORY.md first before making any changes to this project.

## Mandatory behaviour for all agents

1. **Read PROJECT_MEMORY.md before any task.** It contains the authoritative route table, shape definitions, design rules, and deployment info. Do not guess — check it.

2. **Update PROJECT_MEMORY.md after every task** that changes routes, shapes, commits, or deployment state. Always update the `Last updated` date, Commit History, and Route Table sections.

3. **No database.** Data comes exclusively from `seed.json` loaded at startup via `require()`. Never add mongoose, knex, pg, Sequelize, or any ORM.

4. **No authentication or middleware** unless explicitly instructed.

5. **Single entry point.** All code lives in `index.js`. Do not split into routers or sub-files unless the user explicitly asks.

6. **WSO2 §5.1 path naming — enforced:**
   - Lowercase only (`/vehicles` not `/Vehicles`)
   - Hyphens not underscores or camelCase (`/last-position` not `/lastPosition`)
   - Plural nouns for collections, singular params for members
   - Nouns not verbs (no `/getVehicles`)

7. **Response rules — enforced:**
   - Always `res.json()`, never `res.send()` for JSON
   - No envelope wrappers — flat `[...]` or `{...}` only
   - All field names in `snake_case`
   - FK fields must be present (`province_id` on district, `district_id` on station, `station_id` on vehicle)

8. **ID comparison:** Seed IDs are integers. Always coerce URL params: `Number(req.params.id)`.

9. **`speed` is always `null`** — seed.json pings have no speed field. Do not fabricate.

10. **Deploy branch is `main`.** Push with `git push origin main`. Render auto-deploys.

11. **Commit message format:** `Layer N - <description>` or `S<num>: <description>`.

12. **Do not add a bare `GET /pings` route.** Pings are always scoped: `GET /vehicles/:vehicleId/pings`.

13. **Use `getLatestPing(vehicleId)` helper** for any route needing the most recent ping. Never duplicate the filter+sort+[0] logic inline.
