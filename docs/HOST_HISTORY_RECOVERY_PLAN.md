# Audio42 Host History Recovery Plan

## Goal

Recover the history of Sergey-side frontend/source changes that may exist only on the production host as live bundles, backup `index.html` files, protected overlays, and release snapshots.

This is the real purpose of the GitHub synchronization step:

- stop guessing from live bundles;
- identify which visual/function changes exist only on the server;
- port accepted behavior back into source code;
- then push source to GitHub as the source of truth.

## What To Download From The Host

Read-only target host:

`root@5.35.88.251`

Important server paths from Andrey's emails and VERSION_LOG:

- `/root/audio42-frontend-releases`
- `/root/audio42-protected-recovery`
- `/root/audio42-ops/VERSION_LOG.md`
- `/var/www/audio42.onff.ru/index.html`
- `/var/www/audio42.onff.ru/index.html.bak-*`
- `/var/www/audio42.onff.ru/assets/index-Codex*`
- `/var/www/audio42.onff.ru/assets/audio42-*`
- `/var/www/audio42-golden-preview-20260518`

## What Not To Download

Avoid private/runtime data unless explicitly needed:

- `.env`
- cookies
- tokens
- magic-login links
- database dumps
- private uploads
- private audio/media/photo folders

## Analysis After Download

After downloading the archive, compare:

- backup `index.html` files by timestamp;
- active Vite bundles referenced from each `index.html`;
- `index-Codex*` bundle names and embedded markers;
- `audio42-*` overlay CSS/JS files;
- `release.json` files inside snapshots;
- current accepted `VERSION_LOG.md`.

The output should be a manifest:

- page/screen;
- visual or functional behavior;
- evidence file or bundle;
- whether it exists in source;
- whether to port to `frontend/src` or preserve as protected overlay;
- verification path.

## Current Blocker

SSH client exists locally, but automatic SSH authentication is not configured.

The first test returned:

`Permission denied (publickey,password).`

Run `scripts/download_audio42_host_history.ps1` manually in PowerShell if the root password is available, or install/configure an SSH key for `root@5.35.88.251`.
