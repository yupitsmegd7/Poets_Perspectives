# Poets & Perspectives
A private Renaissance garden scrapbook for daily emotional reflection.

## Features
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

### Important access boundary
The bridge stores ONE owner's scrapbook and authenticates the Site server with a bearer token. Keep the Site owner-private. Do not share it or enable public access while this storage mode is active. Multi-user deployment requires user authentication, server-verified identity, per-user MongoDB filters and authorization before sharing. Device storage is opt-in, unencrypted and scoped to the browser profile. Clear it on shared devices. Account deletion writes an empty state; MongoDB backup retention must be managed separately by the database operator.

## Reminders
Reminders run only while the page is open, following explicit browser permission. Closed-page web push, email/SMS, scheduled random poems and background delivery require a push subscription service and scheduler; these are not connected in this version. The app never claims to monitor safety.

## Development
Use the root package scripts for the React application. The backend is a separate Node deployment. Root `npm run build` creates the hosted frontend/server bundle. MongoDB cloud persistence cannot be integration-tested without the operator's database and deployed bridge.
