# Audio42 Platform Version Log

This file is the shared version and change log for the Audio42 / AudioGuide42 platform.

It must be checked before any public frontend, backoffice, backend, database, deployment, or recovery work. It is intended for both Andrey's Codex and Sergey Kolkov's Codex.

## Current Accepted State

- Date accepted: 2026-05-21
- Current public baseline version: `public-reserve-2026.05.21-r1`
- Current public URL: `https://audiogid42.ru`
- Current accepted public root on host: `/var/www/audio42-golden-preview-20260518`
- Current accepted public JS: `assets/index-CodexMapShowAllPointsDemoTrack-20260521.js`
- Previous live comparison URL: `http://5.35.88.251:8089`
- Meaning of comparison URL: previous live state fixed on 2026-05-21 around 10:30 Kemerovo time.
- Known absent from current public accepted baseline: SMS login / phone account-linking.
- Known restored on top of accepted reserve: catalog demo-track audio players.

## Operating Rule

Do not replace the accepted public frontend with a normal full Vite deploy until the accepted visual behavior has been ported into `frontend/src` and verified on preview.

For every verified change, add a new entry to this log before closing the iteration.

Minimum entry fields:

- version
- date and timezone
- author / agent
- surface: public frontend, backoffice, backend, database, deploy, recovery, docs
- change summary
- live or preview URL
- active bundle / migration / commit / artifact
- verification performed
- rollback or snapshot reference
- known risks / next step

## Versioning Convention

Use human-readable platform versions, not only Git hashes:

- `public-reserve-YYYY.MM.DD-rN` for accepted restored public frontend baselines.
- `public-delta-YYYY.MM.DD-N` for surgical frontend deltas on the accepted reserve.
- `source-port-YYYY.MM.DD-N` for work that ports accepted live behavior into source.
- `backend-YYYY.MM.DD-N` for backend/API/database changes.
- `backoffice-YYYY.MM.DD-N` for admin/cabinet changes.
- `deploy-safety-YYYY.MM.DD-N` for deployment, snapshot, or recovery tooling.

## Change Log

### public-reserve-2026.05.21-r1

- Date: 2026-05-21, Kemerovo time
- Author / agent: Andrey Codex with Sergey confirmation
- Surface: public frontend / recovery
- Change summary: Public site restored from a protected reserve state and accepted by Sergey as preserving the important visual work.
- Live URL: `https://audiogid42.ru`
- Accepted root: `/var/www/audio42-golden-preview-20260518`
- Main JS before catalog-audio delta: `assets/index-CodexMapShowAllPoints-20260517.js`
- Main CSS: `assets/index-CodexTrackMapJump-20260517.css`
- Protected source: `/root/audio42-protected-recovery/20260518-184020-msk-before-share-cachebust`
- Protected archive: `/root/audio42-protected-recovery/20260518-184020-msk-before-share-cachebust.tar.gz`
- Archive SHA256: `68c37a6feb376cf6e4064c696b876d15fd4aaef06b9506c5aca0d1c7045ce9b6`
- Verification: live/golden pages opened; route track formatting, show-all-points behavior, AIK narrator block, public tour surfaces checked with Playwright.
- Known risks: SMS login absent; not all later source-build changes included; any full deploy may erase accepted visual behavior unless parity is proven.

### public-delta-2026.05.21-1

- Date: 2026-05-21
- Author / agent: Andrey Codex
- Surface: public frontend / surgical delta
- Change summary: Restored catalog demo-track audio players on top of the accepted reserve frontend.
- Live URL: `https://audiogid42.ru/excursions`
- Active JS after delta: `assets/index-CodexMapShowAllPointsDemoTrack-20260521.js`
- Previous JS preserved: `assets/index-CodexMapShowAllPoints-20260517.js`
- Snapshot before change: `/root/audio42-frontend-releases/20260521-062154-before-demo-track-catalog-restore-20260521`
- Verification:
  - desktop catalog cards: `4`
  - desktop catalog audio players: `4`
  - mobile catalog audio players: `4`
  - audio sources point to `/api/public/tracks/*/stream`
  - `demoSoon` fallback text no longer visible in catalog cards.
- Evidence:
  - `output/audio42-history-audit/CATALOG_DEMO_TRACK_RESTORE_2026-05-21.md`
  - `output/audio42-history-audit/catalog-demo-track-restored-20260521.png`
  - `output/audio42-history-audit/catalog-demo-track-restored-mobile-20260521.png`
- Known risks: this is still a live-bundle delta, not a source-port. It must be ported into `frontend/src` before a full frontend rebuild becomes safe.

### deploy-safety-2026.05.21-1

- Date: 2026-05-21
- Author / agent: Andrey Codex
- Surface: process / skill / recovery protocol
- Change summary: Added accepted reserve frontend operating mode to the Audio42 Codex skill after Sergey confirmed the restored state.
- Files:
  - `C:/codex-home/skills/audio42-portal-maintainer/SKILL.md`
  - `C:/codex-home/skills/audio42-portal-maintainer/references/frontend-recovery-forensics.md`
- Rule added: new public frontend changes must protect the accepted reserve baseline, prefer surgical deltas, and avoid full deploys until source parity is proven.
- Verification: skill-improver structural audit passed with no findings.
- Known risks: Sergey Codex must also follow this protocol; the protocol is only effective if every agent reads this log first.

### backend-2026.05.20-sms-layer

- Date: 2026-05-20
- Author / agent: Andrey Codex
- Surface: backend / auth / public login
- Change summary: SMS login and phone account-linking layer was implemented and tested, but it is not currently part of the accepted public reserve frontend baseline.
- Known status: present in later source/live comparison layer, visible on `http://5.35.88.251:8089`; absent on current public `https://audiogid42.ru`.
- Next step: re-apply only after the accepted visual baseline is preserved and source parity is proven.

### public-share-2026.05.17-layer

- Date: 2026-05-17 to 2026-05-18
- Author / agent: Andrey Codex
- Surface: public frontend / share block
- Change summary: Share block was iterated with VK, Telegram, WhatsApp, Odnoklassniki, and common share. Facebook was removed from the accepted variant.
- Current status: share block is visible on current public via preserved overlay assets.
- Known risk: later share-button source changes and overlay behavior must be documented before any full rebuild.

### backoffice-guide-studio-2026.05

- Date: 2026-05
- Author / agent: Andrey Codex and Sergey-side work
- Surface: backoffice / guide studio
- Change summary: Guide studio, route editing, route points, gallery/photo editing, audio file upload UX, point map picker, and guide profile editing were iterated heavily.
- Current status: backoffice is served separately at `https://back.audio42.onff.ru` and uses the later `index-BRv-sfw9.js` layer.
- Known risk: public accepted reserve and backoffice current layer are not the same frontend state. Do not assume public frontend decisions automatically apply to backoffice.

## Open Synchronization Tasks

- Port accepted reserve frontend behavior into `frontend/src`.
- Re-apply SMS login/account-linking after source parity is proven.
- Decide whether the current share overlay should become source code or stay as a protected overlay.
- Keep this log updated after every verified change by either Codex.
