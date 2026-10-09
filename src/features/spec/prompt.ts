import { NODE_CATALOG } from '@/lib/node-types'
import type { ArchitectureSpec } from './types'
import { stringifyArchitectureSpec } from './format'

const TYPE_LIST = Object.values(NODE_CATALOG)
  .map((entry) => `- ${entry.type}: ${entry.label}`)
  .join('\n')

const EXAMPLE: ArchitectureSpec = {
  version: 1,
  name: 'Simple web app',
  description: 'Left-to-right layered layout',
  nodes: [
    { id: 'user', type: 'user', name: 'User', x: 80, y: 220 },
    {
      id: 'frontend',
      type: 'application',
      name: 'Web App',
      technology: 'React',
      x: 380,
      y: 220,
    },
    {
      id: 'api',
      type: 'api',
      name: 'API',
      technology: 'Node.js',
      x: 680,
      y: 140,
    },
    {
      id: 'worker',
      type: 'service',
      name: 'Worker',
      technology: 'Node.js',
      x: 680,
      y: 300,
    },
    {
      id: 'db',
      type: 'database',
      name: 'PostgreSQL',
      technology: 'Postgres',
      x: 980,
      y: 140,
    },
    {
      id: 'queue',
      type: 'queue',
      name: 'Jobs',
      technology: 'Redis',
      x: 980,
      y: 300,
    },
  ],
  edges: [
    { from: 'user', to: 'frontend', label: 'uses' },
    { from: 'frontend', to: 'api', label: 'HTTPS' },
    { from: 'api', to: 'db', label: 'SQL' },
    { from: 'api', to: 'queue', label: 'enqueue' },
    { from: 'queue', to: 'worker', label: 'consume' },
    { from: 'worker', to: 'db', label: 'SQL' },
  ],
}

/** Prompt you can paste into ChatGPT / Claude / Cursor with your docs. */
export function buildAiArchitecturePrompt(options?: {
  projectName?: string
  existingSpecJson?: string
  userBrief?: string
}): string {
  const projectName = options?.projectName?.trim() || 'Untitled system'
  const brief =
    options?.userBrief?.trim() ||
    '[Paste product docs, requirements, or a short description of the system here.]'

  const existing = options?.existingSpecJson?.trim()
    ? `\n## Current architecture (optional — improve or redesign this)\n\n\`\`\`json\n${options.existingSpecJson.trim()}\n\`\`\`\n`
    : ''

  return `You are helping design a software architecture diagram for **Architecture Canvas**.

## Goal
Read the product brief below and output ONE Architecture Spec JSON document that can be imported into the app.

## Product brief
Project: ${projectName}

${brief}
${existing}
## Output rules
1. Reply with ONLY valid JSON (no markdown fences, no commentary).
2. Use this schema exactly:
{
  "version": 1,
  "name": "string",
  "description": "string (optional)",
  "nodes": [
    {
      "id": "stable-kebab-id",
      "type": "one of the allowed types",
      "name": "Human label",
      "technology": "optional stack label",
      "description": "optional short note",
      "x": 0,
      "y": 0
    }
  ],
  "edges": [
    { "from": "node-id", "to": "node-id", "label": "optional" }
  ]
}
3. Allowed node types:
${TYPE_LIST}
4. Keep it readable: prefer 6–20 nodes unless the brief is large.
5. Use stable string ids (frontend, auth-service, postgres). Edges must reference those ids.
6. **Layout is mandatory — every node MUST have distinct x/y** so the diagram is not a pile:
   - Flow **left → right** in lanes spaced **300px** on X:
     - lane 0 (x≈80): users, external systems
     - lane 1 (x≈380): applications / clients
     - lane 2 (x≈680): apis, services, servers
     - lane 3 (x≈980): databases, queues
   - Space siblings **~140–180px** apart on Y (never stack on the same point).
   - Never put two nodes within ~80px of each other. Never leave all nodes at 0,0.
   - Put upstream callers left of dependencies; data stores farthest right.
7. Prefer calm defaults; omit color unless meaningful.
8. Include users, apps, APIs, services, databases, queues, and external systems when relevant.
9. Edge labels short (HTTPS, SQL, events). Only connect real dependencies.

## Tiny example (shape + layout)
${stringifyArchitectureSpec(EXAMPLE).trim()}
`
}

export const SPEC_FORMAT_SUMMARY =
  'Architecture Spec is JSON for Architecture Canvas. Ask AI → paste Import. Prefer left-to-right x/y layout (users → apps → APIs → data).'
