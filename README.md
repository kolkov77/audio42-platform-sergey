# Audio42 Platform Sergey Handoff

This repository is a temporary Sergey-side handoff space for the Audio42 / AudioGuide42 project.

## Current Status

- GitHub account: `KOLKOV77`
- Temporary repository: `kolkov77/audio42-platform-sergey`
- Andrey original target repository: `otinoff/audio42-platform`
- Current issue: Sergey does not yet have access to `otinoff/audio42-platform`; it opens as 404 for `KOLKOV77`.
- Local full Audio42 source was not found on this machine at the expected path:
  `C:\SnowWhiteAI\cradle\01-Active-Projects\Webinar-Kolkov`

## Purpose Of This Repo

This repository is intended to:

- share Sergey-side synchronization notes with Andrey;
- preserve the current project operating rules;
- provide a place where source can be uploaded once found or exported;
- avoid changing live production directly while GitHub access is being resolved.

This repository is not yet the canonical source of truth for Audio42 source code. The desired canonical repository remains:

`https://github.com/otinoff/audio42-platform`

## Must Not Upload

Do not upload:

- `.env`
- tokens
- cookies
- magic-login links
- `node_modules`
- `vendor`
- `dist`
- private uploads, audio, photos, or media
- production database dumps

## Expected Source Layout

When the actual source is available, upload only source-level files such as:

- `frontend/src`
- `frontend/public`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vite.config.*`
- `backend-laravel`
- `VERSION_LOG.md`
- handoff or changelog markdown files

## Operating Rule

Before any Audio42 work:

1. Read `VERSION_LOG.md`.
2. Work in a branch.
3. Verify on preview before live.
4. Take a KeepLastify snapshot before deploy.
5. Record the verified iteration in `VERSION_LOG.md`.

No full live Vite deploy should be performed until the accepted public frontend behavior has been ported into source and verified.
