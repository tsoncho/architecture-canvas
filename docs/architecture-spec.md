# Architecture Spec — AI ↔ Canvas bridge

Architecture Canvas can exchange diagrams as a small JSON document called an **Architecture Spec**.

That lets you:

1. Describe a system in docs (or chat with an AI)
2. Get back structured JSON
3. Import it into the canvas
4. Export the current look again as JSON for the next iteration

No AI runs inside the app. You use ChatGPT, Claude, Cursor, etc. The app only speaks Spec JSON.

## The idea

```text
Product docs / brief
        │
        ▼
   AI (any model)
        │  Architecture Spec JSON
        ▼
 Architecture Canvas  ←→  teammates (realtime)
        │
        ▼
 Export Spec / PNG / share code
```

Think of Spec as a tiny “architecture source file”:

- Humans and AIs can read/write it
- The canvas is the visual editor
- Supabase keeps collaborators in sync after import

## Format (version 1)

```json
{
  "version": 1,
  "name": "Payment Platform",
  "description": "Optional summary",
  "nodes": [
    {
      "id": "frontend",
      "type": "application",
      "name": "Web App",
      "technology": "React",
      "description": "Customer UI",
      "x": 320,
      "y": 200
    },
    {
      "id": "api",
      "type": "api",
      "name": "Payments API",
      "technology": "Node.js",
      "x": 560,
      "y": 200
    },
    {
      "id": "db",
      "type": "database",
      "name": "PostgreSQL",
      "x": 800,
      "y": 200
    }
  ],
  "edges": [
    { "from": "frontend", "to": "api", "label": "REST" },
    { "from": "api", "to": "db", "label": "SQL" }
  ]
}
```

### Allowed `type` values

| type | meaning |
|------|---------|
| `application` | Apps / frontends / mobile clients |
| `service` | Backend services |
| `database` | Data stores |
| `api` | Gateways / HTTP APIs |
| `server` | Infra / hosts |
| `queue` | Queues / streams / events |
| `external` | Third-party systems |
| `user` | People / actors |
| `group` | Visual boundary |
| `text` | Notes on the canvas |

### Rules

- `nodes[].id` must be unique stable strings (`auth-service`, not UUIDs)
- `edges[].from` / `to` must match node ids
- `x` / `y` optional — import auto-layouts if missing
- Colors optional — defaults come from the app palette

## In the app

Open a project → **Spec** in the top bar:

- **Ask AI** — builds a copy-paste prompt (includes your brief + optional current Spec)
- **Export** — current diagram as JSON
- **Import** — paste AI JSON → replaces canvas (undo available)

## Suggested AI workflow

1. Write or paste requirements into **Ask AI**
2. Copy the prompt into your AI tool
3. Ask: “Return only the JSON”
4. Paste into **Import**
5. Nudge layout / rename nodes visually
6. **Export** again when you want another AI pass (“simplify this”, “add observability”, …)

## Exact AI paste (copy this)

Use this in ChatGPT / Claude / Cursor **before** (or around) your product docs.

**1. Paste this system/format block:**

```text
You are designing a software architecture diagram for Architecture Canvas.

Reply with ONLY valid JSON (no markdown, no commentary). Use this schema:

{
  "version": 1,
  "name": "string",
  "description": "optional",
  "nodes": [
    {
      "id": "stable-kebab-id",
      "type": "application|service|database|api|server|queue|external|user|group|text",
      "name": "Human label",
      "technology": "optional",
      "description": "optional",
      "x": 0,
      "y": 0
    }
  ],
  "edges": [
    { "from": "node-id", "to": "node-id", "label": "optional" }
  ]
}

Rules:
- Unique string ids (frontend, auth-service) — not UUIDs
- edges.from / edges.to must match node ids
- Prefer 6–20 nodes unless the brief is large
- **Every node needs distinct x/y** (never pile at 0,0):
  - Left→right lanes ~300px apart: users/external (x≈80) → apps (x≈380) → APIs/services (x≈680) → databases/queues (x≈980)
  - Stack siblings ~140–180px apart on Y
- Prefer calm defaults; omit color unless meaningful
- Include users, apps, APIs, services, databases, queues, and external systems when relevant
```

The app also auto-layouts on import if coordinates are missing, overlapping, or piled up.

**2. Paste your product docs / PRD / brief.**

**3. Paste this closing ask:**

```text
Design a pragmatic MVP architecture from the docs above. Output Architecture Spec JSON only.
```

**4.** Copy the JSON reply → Architecture Canvas → **Spec** → **Import**.

---

### Optional: improve an existing diagram

Export Spec from the app, then paste that JSON after your docs and say:

```text
Improve or redesign this Architecture Spec based on the docs. Output Architecture Spec JSON only (version 1).
```

---

In the app, **Spec → Ask AI** builds the same kind of prompt automatically (brief + optional current Spec).
