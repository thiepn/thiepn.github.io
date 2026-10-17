# Local-first Hub and first-time visitors

Hub's tasks, calendar, notes, trackers, shortcuts and layouts work without a THIEPN Account. Device workspaces persist in browser IndexedDB. Account adds cloud backup, cross-device synchronization and separately authorized app data; it is not a prerequisite for using Hub.

The first-visit Home introduces Hub, links to Apps and the local planning tools, and explains browser storage and optional cloud sync. The introduction is server-rendered, so visitors can understand the site and open apps before JavaScript runs. It stays within the shared Hub shell. It is hidden for signed-in workspaces, existing meaningful local work, layout editing and private-content mode. Choosing “Use this workspace” dismisses it using a browser-only UI preference, with a session fallback and an in-memory fallback if preference storage is restricted. No workspace schema or cloud record changes are needed.

Cloud initialization failures publish a usable local identity instead of locking an anonymous visitor's workspace. A failed connection attempt from local mode returns to local mode. Unverifiable cloud credentials cannot reveal account-owned records: failed verification preserves the old owner's pending work before switching to the separate device namespace. Verified account sessions still connect automatically through the existing SSO flow.

The Account panel describes cloud sync as optional and distinguishes local core tools from authorized app connections. Independently launched apps can have their own account requirements; Hub does not promise anonymous access to another app's private cloud data.

Browser coverage includes first-visit explanation and app discovery, persistent welcome dismissal, local task creation/reload with Account session storage denied, no cloud writes from that local workspace, automatic SSO and account isolation. Existing workspace tests cover local notes, calendar, trackers, customization, backup and cross-tab changes. Responsive and accessibility checks exercise the welcome state in light/dark themes from 320px to 1920px.
