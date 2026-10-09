# Allow cargo on Windows 11 (Smart App Control)

Tauri builds need `cargo`. If you see:

```text
An Application Control policy has blocked this file. (os error 4551)
```

Smart App Control is blocking the Rust toolchain.

## Fix

1. Open **Windows Security** → **App & browser control** → **Smart App Control settings**
2. Set Smart App Control to **Off** (or Evaluation), **or** approve `cargo.exe` when Windows prompts
3. Confirm in a new terminal:

```powershell
cargo --version
```

4. Build the installer:

```powershell
npm run tauri:build
# or
.\scripts\build-installer.ps1
```

The NSIS setup lands in `src-tauri\target\release\bundle\nsis\`.
