# YanaRPG — PRD

## Original problem statement
1) GTA RP-style landing page for YanaRPG (dark premium cinematic, Russian, orange accent).
2) Full platform: registration/login, player dashboard, profile, settings, password change, logout, admin panel (users, news CRUD + publishing, roles & permissions), secure server-side auth, scalable architecture.
3) Leaderboard with public player profiles, password reset by email, much stronger admin panel.
4) "Переработать проект вместо ГТА РП на Майнкрафт проект, с крутыми системами, с донатом, системой автодоната, магазина с кучами системами оплаты, в админке выдача вручную, проверка выдачи, доступ на сервер и тд."
   User answers: keep YanaRPG brand, Minecraft style; prices in USD, switchable to RUB/UAH/EUR; payment methods per currency (USD → own system/Stripe, RUB → YooKassa/FreeKassa, UAH → monopay/PrivatPay); delivery via RCON AND plugin API; sell privileges, cases, currency, kits, console access + privileges; one BungeeCord IP with unlimited servers reached via portals; RCON console with per-command access via tags.

## Architecture
- FastAPI modular: core/ (db, models, security, storage, email, rcon, payments, seed), routers/ (auth, users, news, admin, files, players, servers, shop, donate).
- MongoDB: users, roles, news, activities, files, login_attempts, password_reset_tokens, audit_logs, servers, settings, products, orders, deliveries, rcon_tags, console_logs.
- Payments: Stripe claimable sandbox (USD/EUR, real test checkout). YooKassa/FreeKassa/monopay/PrivatPay are MOCKED (demo-pay page) until keys are supplied; toggle "demo_payments" in admin settings.
- Delivery: on payment → deliveries per product command × target servers; RCON mode executes immediately; plugin mode = GET /api/plugin/deliveries + POST /api/plugin/deliveries/{id}/ack + /api/plugin/heartbeat with X-Server-Token.
- RCON console: tags with command patterns; tags assigned to roles, users, or granted by "console" products; logs.
- Email: Emergent-managed Resend for password reset.

## Implemented (2026-10-07)
- Landing (Minecraft rebrand), news, leaderboard, public profiles, password reset email.
- Account: dashboard, profile, settings (mc nick), purchases, console.
- Admin: home with charts, users (+CSV), orders & delivery queue (retry / confirm / manual grant), shop products CRUD, RCON console + tags + role tags + logs, servers (Bungee modes, RCON/plugin config, token), settings (network IP, rates, providers, demo toggle), news, audit log, roles, Ctrl+K palette.

## Backlog
- P0: Real YooKassa / FreeKassa / monopay / PrivatPay integrations (need merchant keys), disable demo payments before launch.
- P1: Java plugin for Bungee/Spigot using the plugin API; promo codes; cart with several items.
- P2: Achievements, refunds, server status pinging.
