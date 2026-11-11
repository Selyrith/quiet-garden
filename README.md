# Quiet Garden — Кооперативный антистресс-сад

Phaser 3 + Socket.IO клиент-серверная игра для 2–4 игроков. Выращивайте растения, открывайте виды, собирайте урожай вместе.

## Требования

- **Node.js >= 22.13** (обязательно: pnpm 11 требует эту версию)

## Локальный запуск

```bash
pnpm install
pnpm run dev      # клиент (Vite) на http://localhost:5174
pnpm run server   # сервер на http://localhost:3002
```

Или всё сразу:

```bash
pnpm start
```

## Production-сборка и запуск (как на сервере)

```bash
pnpm install
pnpm run build    # клиент -> dist/
pnpm run server   # сервер сам отдаёт dist/ на http://localhost:3002
```

Собранный клиент лежит в `dist/`, сервер отдаёт его как корень сайта.
Клиент подключается к **тому же хосту** через `/socket.io` — отдельный
`VITE_SERVER_URL` не нужен, если фронт и бэк на одном домене.

Проверить, что всё живо:

```bash
curl http://localhost:3002/health
# {"ok":true,"uptime":12,"rooms":3}
```

## Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `PORT` | `3002` | Порт HTTP/WebSocket сервера |
| `VITE_SERVER_URL` | — (same-origin) | URL сервера; задавайте только если сервер на отдельном домене |
| `KEEP_ALIVE_URL` | — (авто) | URL для самопина; по умолчанию берётся из `RENDER_EXTERNAL_URL` |
| `KEEP_ALIVE_INTERVAL_MS` | `600000` (10 мин) | Интервал между пингами |

`.env` не попадает в git. Скопируйте `.env.example` в `.env` при необходимости.

## Keep-alive (чтобы Render не усыплял игру)

Render усыпляет free-сервисы после 15 минут без входящего трафика.
Сервер сам пингует свой публичный адрес (`GET /health`) каждые 10 минут —
этого хватает, чтобы сервис не засыпал, пока он запущен.

На Render `RENDER_EXTERNAL_URL` подставляется автоматически, поэтому
ничего настраивать не нужно — достаточно задеплоить.

**Ограничение:** если сервис уже уснул, внутренний таймер спит вместе с
ним и разбудить себя не может. Чтобы сервис поднимался после перезапуска
или долгого простоя, нужен **внешний** пингер:

1. Зарегистрируйтесь на [cron-job.org](https://cron-job.org) (бесплатно, без карты)
2. Создайте задачу: URL `https://<твой-домен>/health`, интервал 10 минут
3. Либо используйте [UptimeRobot](https://uptimerobot.com) — монитор типа HTTP(s)

Внешний пингер не только будит сервис, но и присылает уведомление,
если игра упала.

Локально keep-alive не включается: адрес `localhost` игнорируется.

## Деплой (Docker)

В репозитории есть готовый `Dockerfile` (multi-stage: сборка клиента → запуск сервера).

```bash
docker build -t quiet-garden .
docker run -p 3002:3002 -v qg-data:/app/data quiet-garden
```

Готовые конфиги:
- `render.yaml` — Render.com (free-план)
- `northflank.yml` — Northflank (Developer Sandbox, без засыпания)
- `koyeb.yaml` — Koyeb (free, засыпает после 1 ч простоя)

Health-check для всех платформ: `GET /health`

## Где разместить (бесплатно)

| Вариант | Плюсы | Минусы |
|---|---|---|
| **Render.com** | Без карты вообще, самый простой | Засыпает через 15 мин, диск эфемерный — сохранения сбрасываются |
| **Northflank** | Не засыпает, можно примонтировать volume на `/app/data` | Нужна карта при регистрации |
| **Koyeb** | Бесплатно, регион Frankfurt близко к РФ | Засыпает через 1 ч, volume недоступен на free |
| **Oracle Cloud Always Free** | До 4 ядра ARM / 24 ГБ RAM навсегда, постоянный диск | Регистрация со списыванием ~$1 (возвращают), нужна рабочая карта |

На Render: **New → Web Service** → Runtime **Docker** → Health Check Path `/health` → Plan **Free**.
На Northflank: **Create → Service → Add from Dockerfile** → Health check `/health` → volume на `/app/data`.

Для VPS: `docker run -p 3002:3002 -v qg-data:/app/data quiet-garden`, затем откройте порт 3002.

Проверка после деплоя:

```bash
curl https://<ваш-домен>/health
# {"ok":true,"uptime":42,"rooms":0}
```

## Структура проекта

```
quiet-garden/
├── server/            # Серверная часть (Node.js + Socket.IO)
│   ├── index.js       # Точка входа: статика, health-check, обработчики сокетов
│   ├── handlers.js    # tile-action, activity-action, upgrade-buy, buy-pack
│   ├── rooms.js       # Комнаты, тики, спавн активностей
│   ├── garden.js      # Логика грядок, рост, сбор урожая
│   ├── goals.js       # Ежедневные награды, квесты
│   ├── save.js        # Сохранение/загрузка комнат (data/rooms.json)
│   ├── player-profiles.js # Профили игроков (data/player-profiles.json)
│   └── ...
├── shared/            # Общий код клиента и сервера
├── src/               # Клиентская часть (Phaser 3)
├── public/            # Статика: аудио, иконки, PWA-манифест
├── dist/              # Production-сборка клиента (создаётся pnpm run build)
├── data/              # Сохранения (gitignored, создаётся автоматически)
├── Dockerfile
└── render.yaml / northflank.yml / koyeb.yaml
```

## Хранилище

Игра пишет два файла в `data/`:
- `rooms.json` — состояние комнат (7 дней жизни)
- `player-profiles.json` — профили игроков, никнаймы, коллекции

**Важно:** на бесплатных платформах с эфемерным диском (Render free,
Koyeb free) эти файлы **сбрасываются при каждом рестарте/деплое**.
Чтобы сохранения жили, нужен либо persistent disk (платно на Render, Volumes
в preview на Koyeb), либо VPS с постоянным диском.

## Скрипты

| Скрипт | Описание |
|---|---|
| `pnpm run dev` | Vite dev-сервер (клиент) |
| `pnpm run build` | Production-сборка клиента в `dist/` |
| `pnpm run preview` | Предпросмотр собранной версии |
| `pnpm run server` | Только сервер |
| `pnpm start` | Сервер + клиент одновременно |
| `pnpm run check` | Синтаксис server/*.js + vite build |
| `pnpm test` | Тесты (`node --test`) |

## PWA

Приложение устанавливается на главный экран через меню браузера
(Chrome: ⋮ → «Установить приложение»). Иконка — SVG (совместимо с Android/Chrome).
Для iOS в проде сгенерируйте PNG 180×180 и замените `apple-touch-icon`.
