# B11 Hub read-only, manual Library metadata refresh

Pinned independent original Hub main `29537702c4e3698cb780bcc3c479e385d29bd3c8`. This source-only Hub draft augments the existing `HubLibrarySession` iframe messaging boundaries: the existing owner Library grant is still required; each session is limited to eight owner-approved, manual metadata reads per minute. The user sees the cap. No automatic reconnect, interval polling, background reading, new cross-account identity authority, raw EPUB/PDF access or Core Knowledge write was introduced. Session invalidation clears stale previews but deliberately retains the rolling per-tab rate limit, preventing reconnect from bypassing it. The original two-second, nonce/channel/request/origin validations remain mandatory.

Hub remains an optional read-only consumer, never source of truth. No deployment, live Account grant or production data.
