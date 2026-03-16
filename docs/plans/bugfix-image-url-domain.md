# Bugfix: Image URL domain rewrite (zap2it.tms → zpmc.tmsimg.com)

## Summary

Rewrite all TMS image URLs to use the new server domain **zpmc.tmsimg.com** instead of **zap2it.tmsimg.com** so EPG icons load correctly.

## Scope

| Item | Detail |
|------|--------|
| **Bug** | Channel and programme icon URLs use or may reference `zap2it.tmsimg.com`, which is deprecated or unreachable. |
| **Fix** | Use `zpmc.tmsimg.com` as the image base domain everywhere we build or normalize image URLs. |
| **Files** | `src/xmltv.ts` (channel thumbnails, event/programme thumbnails). |

## Spec

1. **Single source of truth:** Define the canonical image base URL as `https://zpmc.tmsimg.com` (e.g. constant `TMS_IMAGE_BASE`).
2. **Event thumbnails (programme icons):** When building the icon URL from a relative thumbnail id (e.g. `p12345_b_v13_aa`), use `TMS_IMAGE_BASE + "/assets/" + id + ".jpg"` instead of `zap2it.tmsimg.com`.
3. **Channel thumbnails:** When the API returns a URL containing `zap2it.tmsimg.com` (or `zap2it.tms*`), rewrite it to `zpmc.tmsimg.com` before emitting. When we prepend `https:` to a protocol-relative URL (e.g. `//zap2it.tmsimg.com/...`), use the new domain.
4. **Normalization:** Add a small helper `normalizeImageUrl(url: string): string` that replaces any occurrence of `zap2it.tmsimg.com` (and optionally `zap2it.tms*`) with `zpmc.tmsimg.com`, so existing full URLs from the API are also fixed.

## Tests

- **Unit test:** `normalizeImageUrl` rewrites `https://zap2it.tmsimg.com/assets/p123.jpg` → `https://zpmc.tmsimg.com/assets/p123.jpg`.
- **Unit test:** `normalizeImageUrl` rewrites `//zap2it.tmsimg.com/h3/...` → `https://zpmc.tmsimg.com/h3/...` (or equivalent).
- **Unit test:** Built event icon URL for a relative thumbnail uses `zpmc.tmsimg.com`.
- **Unit test:** buildXmltv output contains no `zap2it.tmsimg.com` for mock data that uses relative thumbnails.

## Implementation checklist

- [x] Add `TMS_IMAGE_BASE = "https://zpmc.tmsimg.com"` and `normalizeImageUrl(url: string)` in `src/xmltv.ts`.
- [x] Use `normalizeImageUrl` for channel thumbnail when emitting (and when prepending `https:` use `TMS_IMAGE_BASE` if host is zap2it.tms*).
- [x] Use `TMS_IMAGE_BASE + "/assets/" + event.thumbnail + ".jpg"` for relative event thumbnails; for full URLs pass through `normalizeImageUrl`.
- [x] Add unit tests in `src/xmltv.test.ts` for `normalizeImageUrl` and for built XML containing zpmc.tmsimg.com and no zap2it.tmsimg.com.
- [x] Git commit: `fix: rewrite image URLs to zpmc.tmsimg.com`
