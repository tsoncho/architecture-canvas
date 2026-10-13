# Troubleshooting

## Install / update

**Installer won’t start**  
- Use the official NSIS build from [GitHub Releases](https://github.com/tsoncho/architecture-canvas/releases/latest).  
- Ensure WebView2 Runtime is available (Windows 10/11 usually includes it).

**App doesn’t auto-update**  
- Updates require a signed release and network access to GitHub Releases.  
- Check **Settings → Check for updates**.  
- Corporate proxies may block the updater endpoint.

## Auth / identity

**“Session expired” / sync blocked**  
- Reopen the project.  
- If you cleared app data, this install may have a new device identity and must **rejoin with the share code**.

**Cannot recover projects after reinstall**  
- Anonymous/device identity is local. Without the previous local credentials, rejoin via code if another member still has the project.

## Joining projects

**Invalid join code**  
- Format is `ABC-234` (no ambiguous O/0/I/1/S/5).  
- Codes are case-insensitive; spaces are ignored.

**Project is full**  
- Maximum **3** members. Someone must leave before a new person can join.

## Synchronization

**Edits don’t appear for teammates**  
- Confirm everyone’s status shows Live / synced (not Offline).  
- Wait a few seconds (Realtime + 2s poll fallback).  
- Check that all users joined the **same** code.

**Offline editing**  
- Local changes queue in an outbox and flush when connectivity returns.  
- Cloud create/join still requires network.

**Conflict / overwritten node**  
- Concurrent edits use last-write-wins on timestamps. Prefer not editing the same node properties simultaneously.

## Architecture Spec

**Import rejected**  
- Must be JSON object with `version: 1`, `nodes` array, optional `edges`.  
- Node types must be supported; edge endpoints must match node ids.  
- Oversized files are rejected (see Spec docs limits).

**Import replaced my diagram**  
- Import replaces the canvas. Use **Ctrl+Z** immediately if unintended. Confirm dialog appears when the canvas is non-empty.

## Export

**PNG looks empty**  
- Fit the view (`F`) so nodes are visible, then export again.

## Support

Maintainer contact placeholder: replace with a real address before public launch.
