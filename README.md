# Donate Mine

Донат-платформа для Minecraft-сети: магазин с автовыдачей товаров через RCON/плагин, веб-консоль сервера, админ-панель.

**Стек:** FastAPI · MongoDB (Motor) · React (CRA) · Docker · nginx

## Быстрый старт

```bash
cp backend/.env.example backend/.env    # заполните JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up -d --build
```

После сборки:

- Сайт: <http://localhost:3000>
- API: <http://localhost:8000/api>
- Первичный админ создаётся из `ADMIN_EMAIL` / `ADMIN_PASSWORD` при первом старте

## Возможности

- **Магазин** — категории (привилегии, кейсы, валюта, наборы, консоли), валюты USD/EUR/RUB/UAH, курсы, корзина-чекаут
- **Оплата** — Stripe (живой) + ЮKassa/FreeKassa/Monobank/Privat24; без ключей работает демо-режим (включается в админке)
- **Автовыдача** — команды товаров уходят на сервера через RCON или плагин (`GET /api/plugin/deliveries`), статусы выдач, повтор при ошибке
- **Веб-консоль** — группы доступа, белые списки команд, дневные лимиты, журнал
- **Личный кабинет** — профиль, покупки, статусы заказов, публичные профили игроков
- **Админка** — заказы и выдачи, товары, сервера, пользователи и роли, новости, настройки, аудит-лог, графики, экспорт CSV
- **Плагин-API** — heartbeat серверов, выдача заказов, подтверждение доставки

## Структура

```
backend/           FastAPI-приложение (routers/, core/)
frontend/          React-приложение (src/pages/, src/components/)
docker-compose.yml mongo + backend + frontend (nginx)
IDEAS.md           бэклог идей
```

## Окружение

Все секреты — в `.env` (см. `backend/.env.example`). Основные:

| Переменная | Назначение |
|---|---|
| `JWT_SECRET` | подпись токенов |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | первый администратор |
| `MONGO_URL`, `DB_NAME` | подключение к MongoDB |
| `FRONTEND_URL` | адреса сайта (CORS и ссылки в письмах) |
| `STRIPE_*`, `YOOKASSA_*`, … | платёжные системы (опционально) |

## Развитие

Список идей и планов — в [IDEAS.md](IDEAS.md).
