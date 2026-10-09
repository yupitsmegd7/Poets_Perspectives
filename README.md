# Poets & Perspectives
A Renaissance garden scrapbook for daily emotional reflection, with a shared community common room.

## Features
- Community common room: four topic rooms, member-created pen-name profiles, a searchable member directory, shared messages, replies, older-message pagination, and updates every eight seconds while visible. Own-message deletion, mutual blocking, reports, and a moderator review desk are included. No simulated members or conversations.
- Day planner: a first-person, lamplit writing room with a free-form dated desk page and three editable sticky notes. Six individual books open different dated pages with a smooth pull-out animation; the complete archive remains searchable through All your pages. Books show page titles, support keyboard/touch access, and respect reduced-motion preferences. Blank books only enter the archive after writing. No checklist or completion score. Planner pages follow the existing session/device/MongoDB saving preference and are included in export and erasure. Older scrapbooks open with an empty planner.
- Daily check-in opens first after sign-in: five optional steps covering mood, multiple feelings, energy, sleep, body, stress, focus, self-talk, motivation, connection, care priorities, safety and a personal reflection.
- Transparent rules-based suggestions use the expanded answers; past check-ins can be reopened from the scrapbook.
- Inspiria: 1,000 distinct poems and quotes, 50 per page with Go Deeper and Previous 50 navigation, combined theme filters, poem/quote filters, full-text/title/author search, source attribution, a random discovery button, and saving to the scrapbook.
- Persistent scrapbook, personal story, mood history and trusted-person call links.
- Fifteen reading-room chapters with fuller explanations, practical steps, reflection prompts, source articles and YouTube links. New chapters cover burnout, grief and loss, guilt and regret, boundaries and people-pleasing, and anger and frustration.
- A height-aware sidebar with aligned navigation titles, compact layouts on short screens and a visible navigation grid on mobile.
- Public-domain literary quotations and optional spiritual reflections.
- Grounding timer, external Spotify searches, optional 30-minute notifications while open.
- Export and erase controls; no automatic messages to loved ones.

This is a wellbeing aid, not a diagnostic, treatment, crisis-monitoring or emergency-dispatch service. There is no AI diagnostic model. Personal history is not interpreted as clinical evidence. Sources are linked inside the reading room and help panel.

## MongoDB deployment
The published private Site runs in an HTTP-only runtime, so the official MongoDB Node driver runs in the included standalone `backend/` service. No D1 replacement is used. Until connected, cloud writes return 503 and the app labels session-only/device storage clearly.

1. Create a MongoDB Atlas database and least-privilege database user. Allow only the backend's outbound IPs.
2. Deploy `backend/` on a Node 22 host with HTTPS. Install its dependencies (`npm install`) and create `.env` using `backend/.env.example`. Set a secure random bridge token (at least 32 characters), and your MongoDB URI. Run `npm start`.
3. Configure the private Site's runtime secrets `MONGODB_BRIDGE_URL` and `MONGODB_BRIDGE_TOKEN` using the same token. No secrets belong in browser code.
4. Reopen the Site, verify the profile footer says private cloud saving, add an entry and refresh to verify persistence.

### Community setup and access
The community frontend is published, but the current Site has **no MongoDB bridge configured and remains owner-private**. Other people cannot chat until both shared storage and visitor access are configured. The UI shows a clear opening-soon state rather than pretending that local messages are shared.

1. Deploy the updated `backend/` service with `MONGODB_URI` and `MONGODB_BRIDGE_TOKEN`. It creates indexes for messages, members, reports, blocking, and rate limits on startup. Keep its URL HTTPS and its bearer token server-only.
2. Configure `MONGODB_BRIDGE_URL` and `MONGODB_BRIDGE_TOKEN` on the Site. Update the bridge and frontend together: the frontend requires `/capabilities` to report storage version 2 before forwarding any storage operation.
3. Open Community while signed in and create your separate community profile. Choose a pen name and only the interests you want to share. The application never copies your journal, history, check-ins, contacts, or email into a community profile.
4. In MongoDB, find the trusted moderator's `_id` in `community_members`, add it to the backend's comma-separated `COMMUNITY_MODERATOR_IDS`, and restart the backend. Only these server-configured members can open the moderation desk. Reports are stored for review, not monitored live. Operators must provide moderation for a public community.
5. Enable the intended visitor access in Site sharing, then test with two different signed-in accounts: send and reply in one room, refresh both browsers, check another room, block/unblock, remove an own message, and confirm that private journals remain separate. The app does not invite or contact people automatically.

### Private data and sign-in
- Hosted Sites supplies signed-in identity through its trusted dispatch. Every API request derives a stable opaque member key server-side; browser-supplied author IDs and moderator flags are ignored. The bridge requires its bearer token plus this server-supplied identity.
- Private cloud scrapbooks are now keyed as `user:<member key>`. Community profiles/messages use separate MongoDB collections. The former `private-owner` record is never returned automatically to a community visitor. If a legacy record exists, back it up and have its verified owner export/import it before assigning it to that owner's new record; do not assign it to the first visitor.
- Device copies are now scoped to the signed-in identity. Earlier `pp-device` copies remain untouched until the owner explicitly uses **Preferences & privacy → Import my earlier device pages**. Import replaces the current journal, so export first if keeping both. Browser storage remains unencrypted; avoid shared browser profiles.
- Erasing private pages clears the signed-in person's journal only. Community messages are removed using each message's Remove control. Reports may retain a copy for moderation, and database backups follow the operator's retention policy.
- Messages are plain text, validated and bounded. Sending uses a client nonce for safe retries, and the backend enforces a shared 30-write-per-minute limit per member. Blocks are checked server-side for message feeds, reply excerpts, and member discovery.

### Vercel deployment boundary
This checkout still uses the existing Sites/Vinext deployment. Sites sign-in headers are trusted only behind Sites dispatch. Community and cloud APIs intentionally fail closed when deployed on Vercel until a verified Vercel-compatible session provider is integrated. Do not copy or fake `oai-authenticated-*` headers to bypass that requirement. The MongoDB service is reusable; a future Vercel migration needs an authenticated server session mapped to the member key, same-origin checks, and the existing ownership filters.

## Reminders
Reminders run only while the page is open, following explicit browser permission. Closed-page web push, email/SMS, scheduled random poems and background delivery require a push subscription service and scheduler; these are not connected in this version. The app never claims to monitor safety.

## Development
Use the root package scripts for the React application. The backend is a separate Node deployment. Root `npm run build` creates the hosted frontend/server bundle. Run `node --test backend/tests/community.test.mjs` for the two-user HTTP/authorization flow. The tests use a MongoDB contract fixture; live MongoDB durability and multi-browser interaction still require the configured database and deployed bridge. Type checking and the production build are also run for this change.
