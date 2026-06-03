# Sergey Source Sync 2026-06-04

This branch brings Sergey-side Audio42 source files into the working repository.

## Included

- Frontend source from `C:\Codex\AudioGid\audio42-frontend-source`
  - `src`
  - package and Vite/TypeScript config files
  - safe public assets, including payment-system logos
- Backend source from `C:\Codex\AudioGid\audio42-live-source`
  - `app`
  - `routes`
  - `database/migrations`
  - `composer.json`, `composer.lock`, `artisan`

## Excluded

- `.env` and secrets
- `node_modules`
- `dist` / build output
- `vendor`
- runtime `storage`
- SQLite databases
- uploaded/private audio, tours, photos, and media

## Notes

This sync is intended to capture the source-level changes made during the last Audio42 iterations, including frontend UI/theme updates, payment-system logo changes, tour duration backend support, analytics, advertising banners, and related route/controller updates.
