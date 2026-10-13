# Privacy policy draft (Architecture Canvas)

**Status:** Draft for maintainer / legal review. Not legal advice.  
**Describes:** Behaviour of the Architecture Canvas desktop app as implemented around v0.1.12+.

## Who we are

Architecture Canvas is an open-source / commercially distributed Windows desktop application that stores architecture diagrams locally and synchronizes them through a backend hosted on Supabase.

Replace this section with the real operator name, contact email, and jurisdiction before publishing.

**Contact (placeholder):** `privacy@example.com` — maintainer must replace.

## What the app stores on your device

Typically under the OS user profile / WebView storage for the app:

- Installation id and local device credentials used to sign in to the backend
- Display name preference
- UI settings (grid, reduced motion, last project id)
- Recent project list
- Cached project snapshots (nodes, edges, members metadata)
- Offline sync outbox (pending creates/updates/deletes)

Clearing app data or uninstalling may remove some or all of this. Do not assume cloud recovery of anonymous device accounts after local data loss.

## What is sent to the cloud (Supabase)

When you create, join, or edit a project while online:

- Account identifiers created for this installation (auth user id; device-scoped email in a private namespace)
- Project metadata (name, join code, timestamps)
- Membership (display name, last seen)
- Diagram content: nodes and edges (names, types, technologies, descriptions, colors, positions, labels)
- Realtime presence signals (display name, selected element ids) while the editor is open

The desktop app uses a **public/anon Supabase key** suitable for client apps. Authorization is enforced with Row Level Security and membership checks. The app does **not** embed a Supabase service-role key.

## What we do not intentionally collect

As implemented today, Architecture Canvas does **not** ship:

- Advertising trackers
- Analytics SDKs
- Crash-reporting SaaS (unless added later and disclosed)
- Access to your AI chat accounts (Spec workflow is copy/paste only)

## Join codes

Projects use short shareable codes. Anyone who can guess or obtain a code may join until the member limit (3) is reached. Treat codes like shared links.

## Data retention and deletion

- Leaving a project removes your membership for that account; other members’ content remains
- Project deletion semantics depend on operator policy and database cascade rules (nodes/edges/members cascade when a project row is deleted)
- Cached local snapshots may remain on disk until cleared by the OS / uninstall / manual data wipe

Operators should define backups and hard-deletion SLAs separately.

## Third parties

- **Supabase** — database, auth, realtime hosting (see Supabase’s privacy policy)
- **GitHub Releases** — installer / update artifacts when you download or auto-update
- Optional: your chosen AI provider when you paste Spec prompts outside the app

## Your choices

- Do not put secrets (API keys, passwords) into diagram text if you are collaborating
- Leave projects you no longer need
- Uninstall and clear app data to remove local caches
- Contact the operator for account / deletion requests (process TBD)

## Changes

This draft must be updated whenever data flows change (telemetry, accounts, billing, etc.).
