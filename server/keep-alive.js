/**
 * Keep-alive — самопинг собственного публичного адреса.
 *
 * Render усыпляет free-сервисы после 15 минут без входящего трафика.
 * Внутренний таймер не помогает: после засыпания он тоже спит.
 * Поэтому самопинг — только «подпорка», а основной способ — внешний
 * пингер (cron-job.org / UptimeRobot), который шлёт GET /health снаружи.
 *
 * Включается переменными окружения:
 *   KEEP_ALIVE_URL    — полный URL для пинга (например https://quiet-garden.onrender.com/health)
 *   KEEP_ALIVE_INTERVAL_MS — интервал между пингами (по умолчанию 10 минут)
 */

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

function isLocalAddress(appUrl) {
  try {
    const { hostname } = new URL(appUrl);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0';
  } catch {
    return true;
  }
}

/**
 * Строит URL самопина из публичного адреса приложения.
 * Возвращает null, если адрес не задан или это локальный хост.
 */
export function buildKeepAliveUrl({ appUrl, port, path = '/health' } = {}) {
  if (!appUrl || typeof appUrl !== 'string') return null;
  const trimmed = appUrl.trim();
  if (!trimmed) return null;
  if (isLocalAddress(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (!url.pathname || url.pathname === '/') url.pathname = path;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Проверяет, что пора выполнить пинг.
 */
export function shouldPing({ lastPingAt = 0, intervalMs = DEFAULT_INTERVAL_MS, now = Date.now() } = {}) {
  return now - lastPingAt >= intervalMs;
}

async function defaultPing(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return { ok: res.ok, status: res.status };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Запускает периодический пинг. Ошибки пинга только логируются —
 * сервер из-за них не должен падать.
 */
export function startKeepAlive({
  url,
  intervalMs = DEFAULT_INTERVAL_MS,
  ping = defaultPing,
  now = Date.now,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  log = console,
} = {}) {
  if (!url) return null;

  let lastPingAt = 0;
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    if (!shouldPing({ lastPingAt, intervalMs, now: now() })) return;
    lastPingAt = now();
    try {
      const result = await ping(url);
      if (result && result.ok === false) {
        log.warn?.(`[keep-alive] ${url} → ${result.status}`);
      }
    } catch (err) {
      log.warn?.(`[keep-alive] ${url} — ошибка: ${err?.message || err}`);
    }
  };

  tick();
  const timer = setIntervalFn(tick, intervalMs);
  timer?.unref?.();

  return {
    stop() {
      stopped = true;
      clearIntervalFn(timer);
    },
  };
}

/**
 * Запускает keep-alive по переменным окружения.
 * Если адрес не задан — ничего не делает (например локальная разработка).
 */
export function startKeepAliveFromEnv(env = process.env, deps = {}) {
  const intervalMs = Number(env.KEEP_ALIVE_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
  const explicit = (env.KEEP_ALIVE_URL || '').trim();
  const url = explicit
    ? explicit
    : buildKeepAliveUrl({ appUrl: env.RENDER_EXTERNAL_URL || env.APP_URL, port: env.PORT });
  if (!url) return null;
  return startKeepAlive({ url, intervalMs, ...deps });
}
