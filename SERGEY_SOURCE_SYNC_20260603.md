# Sergey Source Sync 2026-06-03

## Summary

This handoff was prepared after Sergey confirmed that the GitHub account currently available is `KOLKOV77`, while the original invitation mentioned by Andrey appears to have been sent to `kolkov7`.

The original repository currently opens as 404 for Sergey:

`https://github.com/otinoff/audio42-platform`

Sergey created a temporary repository:

`https://github.com/kolkov77/audio42-platform-sergey`

## What Is Included Here

- Project operating rules from Andrey's email.
- `VERSION_LOG.md` content from Andrey's attachment.
- Safe `.gitignore` to prevent accidental upload of secrets, media, build output, or dependency folders.
- Empty placeholder directories:
  - `frontend`
  - `backend-laravel`
  - `docs`

## What Is Not Included Yet

The actual Audio42 source code is not included yet.

Expected local path was checked but not found:

`C:\SnowWhiteAI\cradle\01-Active-Projects\Webinar-Kolkov`

Current local working folder contains only an audio/Whisper check package:

`C:\Users\Sergey\Documents\Аудио\audio_check_suz1`

That folder is not Audio42 platform source and should not be uploaded as platform source.

## Requested Next Step For Andrey

Please either:

1. add GitHub account `KOLKOV77` to `otinoff/audio42-platform`, or
2. accept the invitation to `kolkov77/audio42-platform-sergey` and push/export the current canonical source there temporarily.

The preferred long-term source of truth should remain one repository, ideally:

`https://github.com/otinoff/audio42-platform`

## Safety Notes

No production deploy should be made from this temporary repository until source parity is proven and the accepted public frontend behavior is present in source.

Before any deploy:

- read `VERSION_LOG.md`;
- verify on preview;
- take KeepLastify snapshot;
- run desktop/mobile browser checks;
- update `VERSION_LOG.md`.
