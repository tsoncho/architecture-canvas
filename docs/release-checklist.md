# Release checklist

Use before every public `v*` tag.

## Version

- [ ] Bump `package.json` version  
- [ ] Bump `src-tauri/tauri.conf.json` version  
- [ ] Bump `src-tauri/Cargo.toml` (+ `Cargo.lock` package version)  
- [ ] Changelog / release notes drafted (factual only)

## Quality

- [ ] `npm run lint`  
- [ ] `npm test`  
- [ ] `npm run build`  
- [ ] Manual smoke: create project, add nodes/edges, undo, Spec export/import, PNG, share code  
- [ ] Two-client sync smoke (if possible)  
- [ ] Join full project (3/3) rejected  
- [ ] Invalid Spec import rejected without wiping canvas  

## Database

- [ ] Pending `supabase/migrations/*` applied to production Supabase  
- [ ] RLS smoke: non-member cannot read another project  

## Windows packaging

- [ ] `npm run tauri:build` succeeds  
- [ ] NSIS installer installs cleanly on a test machine  
- [ ] App launches; WebView2 OK  
- [ ] Upgrade from previous version keeps local data  
- [ ] Uninstall behaviour documented  
- [ ] Signing secrets present in GitHub Actions (`TAURI_SIGNING_*`)  
- [ ] Tag push publishes Release + `latest.json`  
- [ ] Installed app detects update (or document updater disabled)

## Docs & trust

- [ ] README matches shipped features  
- [ ] `docs/architecture-spec.md` current  
- [ ] Privacy draft reviewed / published URL if required  
- [ ] Third-party notices reviewed  

## Publish

- [ ] Commit on `master`  
- [ ] `git tag vX.Y.Z && git push origin vX.Y.Z`  
- [ ] Verify Actions green  
- [ ] Spot-check download assets  
