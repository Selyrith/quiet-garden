import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildKeepAliveUrl,
  shouldPing,
  startKeepAlive,
} from '../server/keep-alive.js';

test('URL самопина строится из публичного адреса сервиса', () => {
  const url = buildKeepAliveUrl({
    appUrl: 'https://quiet-garden.onrender.com/',
    port: 3002,
  });
  assert.equal(url, 'https://quiet-garden.onrender.com/health');
});

test('без публичного адреса самопинг отключается', () => {
  const url = buildKeepAliveUrl({ appUrl: '', port: 3002 });
  assert.equal(url, null);
});

test('локальный адрес не используется как цель самопина', () => {
  const url = buildKeepAliveUrl({
    appUrl: 'http://localhost:3002',
    port: 3002,
  });
  assert.equal(url, null);
});

test('пинг не выполняется раньше интервала', () => {
  const last = Date.now();
  assert.equal(shouldPing({ lastPingAt: last, intervalMs: 10 * 60 * 1000, now: last }), false);
});

test('пинг выполняется после истечения интервала', () => {
  const last = Date.now() - 11 * 60 * 1000;
  assert.equal(shouldPing({ lastPingAt: last, intervalMs: 10 * 60 * 1000, now: Date.now() }), true);
});

test('первый пинг выполняется сразу', () => {
  assert.equal(shouldPing({ lastPingAt: 0, intervalMs: 10 * 60 * 1000, now: Date.now() }), true);
});

test('таймер keep-alive снимается при остановке', async () => {
  let calls = 0;
  const timer = startKeepAlive({
    url: 'http://127.0.0.1:1/health',
    intervalMs: 1000,
    ping: async () => { calls++; },
    now: () => Date.now(),
    setIntervalFn: () => ({ unref: () => {} }),
    clearIntervalFn: () => {},
  });
  assert.ok(timer);
  timer.stop();
});

test('ошибка пинга не роняет сервер', async () => {
  const timer = startKeepAlive({
    url: 'http://127.0.0.1:1/health',
    intervalMs: 1000,
    ping: async () => { throw new Error('network down'); },
    now: () => Date.now(),
    setIntervalFn: () => ({ unref: () => {} }),
    clearIntervalFn: () => {},
    log: { warn: () => {} },
  });
  assert.ok(timer);
  timer.stop();
});
