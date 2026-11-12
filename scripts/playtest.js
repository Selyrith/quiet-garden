/**
 * Headless playtest harness for Quiet Garden.
 *
 * Connects two fake players over Socket.IO to the running server and
 * measures the real feel of the core loop: action durations, growth times,
 * coin economy, and how long a full garden cycle takes.
 *
 * Usage: node scripts/playtest.js [serverUrl]
 */

import { io } from 'socket.io-client';

const SERVER = process.argv[2] || 'http://localhost:3002';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function connect(playerId, nickname) {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER, {
      auth: { playerId, nickname },
      transports: ['websocket'],
      forceNew: true,
    });
    const events = [];
    const record = (name) => (...args) => events.push({ name, args, at: Date.now() });
    const names = [
      'initial-state', 'room-code', 'tile-updated', 'coins-updated',
      'inventory-updated', 'activity-spawned', 'activity-result',
      'action-rejected', 'collection-updated', 'upgrades-updated',
      'goals-updated', 'team-updated', 'world-updated', 'room-error',
    ];
    for (const n of names) socket.on(n, record(n));
    socket.on('connect', () => resolve({ socket, events }));
    socket.on('connect_error', (e) => reject(e));
    setTimeout(() => reject(new Error('connect timeout')), 5000);
  });
}

const first = (events, name) => events.find((e) => e.name === name);
const all = (events, name) => events.filter((e) => e.name === name);

async function main() {
  console.log(`\n=== QUIET GARDEN PLAYTEST → ${SERVER} ===\n`);

  const A = await connect('pt_alice_' + Date.now(), 'Алиса');
  const B = await connect('pt_bob_' + Date.now(), 'Борис');
  const t0 = Date.now();

  // Both join the same room: A creates, B joins by code.
  A.socket.emit('join-room', {});
  await wait(400);
  const roomEvent = first(A.events, 'room-code');
  if (!roomEvent) { console.log('NO room-code:', A.events.map(e => e.name)); return; }
  const code = roomEvent.args[0].roomCode;
  B.socket.emit('join-room', { roomCode: code });
  await wait(600);

  const initA = first(A.events, 'initial-state');
  const initB = first(B.events, 'initial-state');
  console.log(`Room ${code} | A init=${!!initA} B init=${!!initB}`);

  const state = initA?.args[0] || {};
  console.log(`Initial: coins=${state.coins} inventory=${JSON.stringify(state.inventory)} collection=${state.collection?.length}/${state.totalPlants} activities=${state.activities?.length}`);
  console.log(`Team goal: ${JSON.stringify(state.team?.goal?.text)} progress=${state.team?.progress}`);

  // --- Measure a full plant -> water -> harvest cycle ---
  console.log('\n--- CORE LOOP (A plants, B waters, A harvests) ---');
  const seedId = Object.keys(state.inventory || {})[0];

  const plantAt = Date.now();
  A.socket.emit('tile-action', { tileX: 3, tileY: 3, action: 'plant', seedId: Number(seedId) });
  await wait(5200);
  const planted = all(A.events, 'tile-updated').find((e) => e.args[0].action === 'plant');
  console.log(`plant action: ${Date.now() - plantAt}ms (server reported ${planted ? 'ok' : 'NO tile-updated'})`);

  // B waters it
  const waterAt = Date.now();
  B.socket.emit('tile-action', { tileX: 3, tileY: 3, action: 'water' });
  await wait(3200);
  const watered = all(B.events, 'tile-updated').find((e) => e.args[0].action === 'water');
  console.log(`water action: ${Date.now() - waterAt}ms (${watered ? 'ok' : 'NO tile-updated'})`);

  // Growth stage progression
  console.log('\n--- GROWTH STAGES (poll every 3s for 150s) ---');
  const seen = new Set();
  const growthStart = Date.now();
  let ripe = false;
  while (Date.now() - growthStart < 150000) {
    await wait(3000);
    const up = all(A.events, 'stage-updates').flatMap((e) => e.args[0].updates || []);
    for (const u of up) {
      const label = `${u.key}:stage${u.stage}`;
      if (!seen.has(label)) {
        seen.add(label);
        console.log(`  t+${Math.round((Date.now() - growthStart) / 1000)}s  ${label}`);
      }
    }
    const tu = all(A.events, 'tile-updated').filter((e) => e.args[0].key === '3,3');
    const last = tu[tu.length - 1];
    if (last && last.args[0].stage === 3) { ripe = true; break; }
  }
  console.log(`ripe after ${Math.round((Date.now() - growthStart) / 1000)}s: ${ripe}`);

  // Harvest
  const harvestAt = Date.now();
  A.socket.emit('tile-action', { tileX: 3, tileY: 3, action: 'harvest' });
  await wait(3800);
  const harv = all(A.events, 'tile-updated').find((e) => e.args[0].action === 'harvest');
  console.log(`harvest action: ${Date.now() - harvestAt}ms`);
  console.log(`  result: ${JSON.stringify(harv?.args[0])}`);

  const coinsEv = all(A.events, 'coins-updated');
  console.log(`  coins now: ${coinsEv[coinsEv.length - 1]?.args[0].coins}`);

  // --- Activity timing ---
  console.log('\n--- ACTIVITY PACING (observe 150s) ---');
  const actStart = Date.now();
  await wait(150000);
  const acts = all(A.events, 'activity-spawned');
  console.log(`activities spawned in 150s: ${acts.length} → one every ~${acts.length ? Math.round(150 / acts.length) : '∞'}s`);
  if (acts.length) {
    const at = acts.map((a) => Math.round((a.at - actStart) / 1000));
    console.log(`  spawn times: ${at.join('s, ')}s`);
    console.log(`  types: ${acts.map((a) => a.args[0].activity.type).join(', ')}`);
  }

  // --- Economy: how many harvests for first pack / upgrade ---
  console.log('\n--- ECONOMY ---');
  const { getUpgradeCost } = await import('../shared/upgrades.js');
  const { PACKS } = await import('../shared/packs.js');
  for (const p of Object.values(PACKS)) {
    console.log(`pack ${p.id}: ${p.price} coins → ${p.count} seeds (${p.desc})`);
  }
  for (let lvl = 0; lvl < 5; lvl++) {
    console.log(`upgrade L${lvl}→${lvl + 1}: ${getUpgradeCost('growth', lvl)} coins`);
  }
  const avgCommonPrice = 5; // measured roughly from getPlant
  console.log(`~harvests for basic pack (50c): ${Math.ceil(50 / avgCommonPrice)}`);
  console.log(`~harvests for legendary pack (600c): ${Math.ceil(600 / avgCommonPrice)}`);

  console.log('\n=== END ===\n');
  A.socket.close();
  B.socket.close();
  process.exit(0);
}

main().catch((e) => { console.error('PLAYTEST FAILED:', e); process.exit(1); });
