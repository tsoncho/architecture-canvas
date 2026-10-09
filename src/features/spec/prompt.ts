import { NODE_CATALOG } from '@/lib/node-types'
import type { ArchitectureSpec } from './types'
import { stringifyArchitectureSpec } from './format'

const TYPE_LIST = Object.values(NODE_CATALOG)
  .map((entry) => `- ${entry.type}: ${entry.label}`)
  .join('\n')

const EXAMPLE: ArchitectureSpec = {
  version: 1,
  name: 'Simple web app',
  description: 'Example only',
  nodes: [
    {
      id: 'user',
      type: 'user',
      name: 'User',
      x: 80,
      y: 200,
    },
    {
      id: 'frontend',
      type: 'application',
      name: 'Web App',
      technology: 'React',
      x: 320,
      y: 200,
    },
    {
      id: 'api',
      type: 'api',
      name: 'API',
      technology: 'Node.js',
      x: 560,
      y: 200,
    },
    {
      id: 'db',
      type: 'database',
      name: 'PostgreSQL',
      technology: 'Postgres',
      x: 800,
      y: 200,
    },
  ],
  edges: [
    { from: 'user', to: 'frontend', label: 'uses' },
    { from: 'frontend', to: 'api', label: 'HTTPS' },
    { from: 'api', to: 'db', label: 'SQL' },
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
6. Lay nodes out left-to-right / top-to-bottom with x/y spacing (~240–280 apart).
7. Prefer calm defaults; omit color unless meaningful.
8. Include users, apps, APIs, services, databases, queues, and external systems when relevant.

## Tiny example (shape only)
${stringifyArchitectureSpec(EXAMPLE).trim()}
`
}

export const SPEC_FORMAT_SUMMARY = `Architecture Spec is a small JSON format for Architecture Canvas.

Export your diagram → give it (or docs) to an AI → paste the JSON back via Import Spec.

Allowed types: ${Object.keys(NODE_CATALOG).join(', ')}.`
