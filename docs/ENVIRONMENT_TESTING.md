## Environment

* OS: Archcraft Linux (Arch Linux based)
* Window Manager: Hyprland
* CPU: Intel i5-12450H
* RAM: 16 GB
* Swap: 8 GB enabled
* Rust: 1.96.0
* Bun: 1.3.14
* Node: v26.2.0

## Problem

DreamCoder launches successfully, but the UI quickly becomes unresponsive and memory usage grows rapidly.

The issue appears to be specific to Tauri/WebKitGTK rather than the frontend itself.

## Observed Behavior

* `WebKitWebProcess` rapidly grows in memory usage, eventually reaching 6–12 GB RAM.
* `WebKitNetworkProcess` also grows to more than 1 GB.
* The application window becomes unclickable and cannot be interacted with.
* The desktop becomes sluggish and sometimes the process exits unexpectedly.
* No obvious repeating errors appear in the terminal logs.

Memory growth observed in `btop`:

* `WebKitWebProcess`: approximately +100 MB/s
* `WebKitNetworkProcess`: approximately +100–200 MB/s

## Investigation Performed

### Frontend-only test

Running:

```bash
cd desktop
bun run dev
```

and opening `http://localhost:1420` in Firefox does **not** reproduce the issue.

Firefox remains responsive and memory usage stays normal.

### Tauri test

Running:

```bash
WINIT_UNIX_BACKEND=x11 bun run tauri dev
```

reproduces the issue consistently.

### Mermaid test

I temporarily disabled Mermaid rendering inside `MermaidRenderer.tsx`.

Result:

* Memory leak still occurs.
* Therefore Mermaid does not appear to be the primary cause.

### Sidecar test

`dreamcoder-side` was not running during the memory growth.

The sidecar therefore does not appear to be responsible.

## Terminal Output

```text
[claude-server] [CronScheduler] Starting — checking every 60 s
[claude-server] [Server] Claude Code API server running at http://0.0.0.0:40779
[claude-adapters:*] adapter mode is not available in DreamCoder MVP (Phase 3)
```

No repeating log spam was observed.

## Conclusion

The evidence suggests the issue may be related to:

* Tauri + WebKitGTK
* Hyprland compatibility
* WebKitGTK memory management on Linux

Since the same frontend behaves normally in Firefox but not inside Tauri/WebKitGTK, the issue does not appear to originate from the React frontend itself.
