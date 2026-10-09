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

## Example prompt fragment

> Based on the attached PRD, design a pragmatic architecture for MVP. Output Architecture Spec JSON only (version 1) using types application, service, database, api, queue, external, user.

Full prompt text is generated inside the app so it stays in sync with the format.
