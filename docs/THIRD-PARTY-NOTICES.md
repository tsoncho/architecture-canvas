# Third-party notices

Architecture Canvas bundles or depends on open-source components. License texts remain with their upstream packages. This file is a **summary for distribution review**, not a substitute for full license files in `node_modules` / Cargo crates.

## Primary JavaScript dependencies (npm)

| Package | Typical license (verify in package) | Role |
|---------|--------------------------------------|------|
| react / react-dom | MIT | UI |
| @xyflow/react | MIT | Canvas |
| @supabase/supabase-js | MIT | Backend client |
| zustand | MIT | State |
| idb | ISC | IndexedDB |
| html-to-image | MIT | PNG export |
| lucide-react | ISC | Icons |
| radix-ui packages | MIT | Dialogs / controls |
| react-router-dom | MIT | Routing |
| tailwind-merge / clsx / cva | MIT | Styling helpers |
| vite / typescript / oxlint / vitest | MIT | Tooling |

## Primary Rust / Tauri dependencies

| Crate / component | Role |
|-------------------|------|
| tauri 2 | Desktop shell |
| tauri-plugin-updater | Auto-update |
| tauri-plugin-process | Process helpers |
| serde / serde_json | Serialization |

Run `npm ls` and inspect `src-tauri/Cargo.lock` before a commercial distribution to confirm licenses for the exact locked versions.

## Copyleft / special attention

As of the dependency set used for v0.1.12 tooling, the primary runtime UI stack is MIT/ISC oriented. Re-check after every dependency upgrade. If a copyleft dependency is introduced, add full notice text and comply with distribution obligations.

## Fonts

The app may load Google Fonts (Plus Jakarta Sans, IBM Plex Mono) in development/web builds. Desktop WebView behaviour depends on network and OS font availability — document any bundled fonts separately if added later.
