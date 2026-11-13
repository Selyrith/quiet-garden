import Phaser from 'phaser';
import { io } from 'socket.io-client';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import { sound } from './audio/SoundManager.js';
import { shouldAutoJoin, needsNickname, normalizeRoomCode, isValidRoomCode } from './join-flow.js';
import { escapeHtml } from './ui/escapeHtml.js';

// В проде подключаемся к тому же хосту, что и страница (Socket.IO идёт по /socket.io).
// VITE_SERVER_URL можно задать явно, если сервер вынесен на отдельный домен.
const SERVER_URL = (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SERVER_URL) || undefined;

/**
 * Личный id игрока.
 *
 * БЫЛО: только sessionStorage — он живёт до закрытия вкладки. На телефоне
 * браузер убивает вкладку сам, поэтому после «свернул и вернулся» игрок
 * получал НОВЫЙ id: сервер создавал новый профиль, и личная коллекция
 * растений (то, что игрок открывал неделями) обнулялась.
 *
 * СТАЛО: localStorage — профиль переживает перезапуск браузера. Старый id
 * из sessionStorage подхватываем как запасной, чтобы не терять прогресс
 * у тех, кто уже играл.
 */
function getPlayerId() {
  const read = (store) => { try { return store.getItem('playerId'); } catch { return null; } };
  const write = (store, value) => { try { store.setItem('playerId', value); } catch {} };

  let id = read(localStorage) || read(sessionStorage);
  if (!id) id = 'p_' + Math.random().toString(36).slice(2, 10);
  write(localStorage, id);
  write(sessionStorage, id);
  return id;
}

// --- память о садах -------------------------------------------------------
// Комната живёт на сервере (7 дней), но клиент о ней забывал: код хранился
// только в переменной currentRoom. Обновил страницу — сад «пропал», игрок
// жал «Новый сад» и создавал второй, а партнёр ждал его в пустом первом.
const GARDENS_KEY = 'qg_gardens';
const GARDENS_MAX = 3;

function loadGardens() {
  try {
    const raw = JSON.parse(localStorage.getItem(GARDENS_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((g) => g && typeof g.code === 'string' && isValidRoomCode(g.code))
      .sort((a, b) => (b.at || 0) - (a.at || 0))
      .slice(0, GARDENS_MAX);
  } catch {
    return [];
  }
}

/** Запомнить сад (или обновить время последнего входа). */
function rememberGarden(code, patch = {}) {
  const normalized = normalizeRoomCode(code);
  if (!isValidRoomCode(normalized)) return;
  const gardens = loadGardens().filter((g) => g.code !== normalized);
  const prev = loadGardens().find((g) => g.code === normalized) || {};
  gardens.unshift({ ...prev, ...patch, code: normalized, at: Date.now() });
  try { localStorage.setItem(GARDENS_KEY, JSON.stringify(gardens.slice(0, GARDENS_MAX))); } catch {}
}

function forgetGarden(code) {
  try {
    localStorage.setItem(
      GARDENS_KEY,
      JSON.stringify(loadGardens().filter((g) => g.code !== code)),
    );
  } catch {}
}

/** «5 минут назад» / «вчера» / «3 дня назад» — без библиотек. */
function humanAge(ts) {
  if (!ts) return 'недавно';
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'вчера';
  return `${d} дн назад`;
}

function getNickname() {
  const el = document.getElementById('nickInput');
  return el ? el.value.trim() : '';
}

const playerId = getPlayerId();
// Ник, введённый игроком. Отправляется серверу сразу после подключения.
let pendingNickname = '';
const socket = io(SERVER_URL, {
  auth: { playerId, nickname: getNickname() },
  autoConnect: false,
  transports: ['websocket', 'polling']
});

/**
 * Передаёт ник серверу.
 *
 * socket.auth читается только при handshake, поэтому смену ника после
 * подключения сервер не увидит. Нужен отдельный profile-set — именно он
 * обновляет профиль и ник в комнате.
 */
function applyNickname(nickname) {
  const nick = (nickname || '').trim();
  if (!nick) return;
  pendingNickname = nick;
  socket.auth = { playerId, nickname: nick };
  if (socket.connected) {
    socket.emit('profile-set', { nickname: nick });
  }
}

socket.on('connect_error', (err) => {
  console.error('[main] Socket connect_error:', err.message);
  showMenuError('Ошибка подключения к серверу: ' + err.message);
  hasJoinedThisSession = false;
});

let currentRoom = null;
let hasJoinedThisSession = false;
let game = null;

function showMenuError(message) {
  const el = document.getElementById('joinError');
  if (el) el.textContent = message || '';
}

function showMenu() {
  document.getElementById('menuScreen')?.classList.remove('hidden');
}

function hideMenu() {
  document.getElementById('menuScreen')?.classList.add('hidden');
}

function startGame() {
  hideMenu();
  if (game) return;

  try {
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game-container',
      backgroundColor: '#f8f4ee',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight
      },
      // pointerEvents: 'auto' — контейнер DOM-слоя по умолчанию получает
      // 'none', и тогда поля ввода (ответ питомцу, записка у указателя)
      // не реагируют на тап: слой «есть», но ввода нет.
      dom: { createContainer: true, pointerEvents: 'auto' },
      scene: [GameScene, PauseScene],
      callbacks: {
        preBoot: (g) => {
          g.registry.set('socket', socket);
          g.registry.set('playerId', playerId);
          g.registry.set('roomCode', currentRoom);
        }
      }
    });
  } catch (err) {
    console.error('[main] Phaser.Game creation failed:', err);
    showMenu();
    showMenuError('Ошибка запуска игры: ' + (err && err.message ? err.message : String(err)));
    game = null;
  }
}

/**
 * Идёт создание нового сада: join-room отправлен, но room-code ещё не пришёл.
 * Если в этот момент сокет переподключится и мы снова пошлём join-room без
 * кода, сервер создаст ВТОРОЙ сад — партнёр останется ждать в пустом первом.
 */
let joinInFlight = false;

function enterGame(roomCode) {
  currentRoom = roomCode || null;
  joinInFlight = !roomCode;
  hasJoinedThisSession = true;
  showMenuError('');

  console.log('[main] enterGame called with roomCode:', roomCode, 'currentRoom:', currentRoom, 'socket.connected:', socket.connected);

  if (socket.connected) {
    startGame();
  } else {
    socket.connect();
  }
}

socket.on('connect', () => {
  console.log('[main] socket connected, hasJoinedThisSession:', hasJoinedThisSession, 'game:', !!game);

  // Ник отправляем сразу после подключения и до входа в комнату —
  // тогда сервер знает, как подписать игрока в списке комнаты.
  if (pendingNickname) {
    socket.emit('profile-set', { nickname: pendingNickname });
  }

  if (!hasJoinedThisSession) return;
  if (!game) {
    // Первый вход: GameScene сам отправит join-room в create()
    console.log('[main] Starting game for first time');
    startGame();
  } else if (!currentRoom && joinInFlight) {
    // Создание сада ещё в полёте — ждём room-code, а не плодим вторую комнату.
    console.log('[main] Ожидаем room-code, повторный join-room пропущен');
  } else {
    // Реконнект: повторяем вход в ту же комнату. Пол тоже повторяем —
    // иначе партнёр увидит «переодетого» игрока (сервер при join ставит male).
    console.log('[main] Reconnecting to room:', currentRoom);
    socket.emit('join-room', { roomCode: currentRoom || undefined });
    const gender = (game && game.registry && game.registry.get('playerGender'))
      || localStorage.getItem('qg_player_gender');
    if (gender) socket.emit('gender-set', { gender });
  }
});

socket.on('room-code', ({ roomCode }) => {
  console.log('[main] room-code received:', roomCode);
  currentRoom = roomCode;
  joinInFlight = false;
  // Сад запоминаем сразу: именно отсюда игрок потом жмёт «Продолжить».
  rememberGarden(roomCode, { nick: pendingNickname || sessionStorage.getItem('playerNick') || '' });
  if (game) game.registry.set('roomCode', roomCode);
});

socket.on('room-error', ({ message }) => {
  console.log('[main] room-error:', message);
  hasJoinedThisSession = false;
  currentRoom = null;
  showMenuError(message || 'Не удалось войти в сад');
  showMenu();
  if (game) {
    try { game.destroy(true); } catch {}
    game = null;
  }
});

/**
 * Глубокие ссылки: ?gender=male|female.
 *
 * Зачем: (1) приглашение можно отправить сразу с выбранным аватаром,
 * (2) повторный вход не показывает окно выбора пола, (3) так удобно
 * проверять игру в двух окнах. Значение попадает в то же хранилище,
 * что и обычный выбор, поэтому дальше всё работает как раньше.
 */
function applyDeepLinkParams() {
  const params = new URLSearchParams(window.location.search);
  const gender = params.get('gender');
  if (gender === 'male' || gender === 'female') {
    try { localStorage.setItem('qg_player_gender', gender); } catch {}
  }
}

function initMenu() {
  applyDeepLinkParams();
  const slots = document.getElementById('slotsContainer');
  const codeInput = document.getElementById('codeInput');
  const joinBtn = document.getElementById('joinBtn');
  const nickInput = document.getElementById('nickInput');
  if (!slots || !codeInput || !joinBtn || !nickInput) return;

  // Восстанавливаем сохранённый ник
  const savedNick = sessionStorage.getItem('playerNick');
  if (savedNick) nickInput.value = savedNick;

  function renderSlots() {
      slots.innerHTML = '';

    // --- Сады, в которых игрок уже был: «Продолжить» ---
    for (const garden of loadGardens()) {
      const slot = document.createElement('div');
      slot.className = 'slot garden';
      slot.setAttribute('role', 'button');
      slot.tabIndex = 0;
      slot.innerHTML = `
        <div class="slot-icon">🌿</div>
        <div class="slot-info">
          <div class="slot-title">Сад ${escapeHtml(garden.code)}</div>
          <div class="slot-sub">${escapeHtml(garden.nick ? garden.nick + ' · ' : '')}${escapeHtml(humanAge(garden.at))}</div>
        </div>
        <div class="slot-cta">▶</div>
        <button class="slot-delete" type="button" title="Убрать сад из списка" aria-label="Убрать сад из списка">✕</button>
      `;

      const enter = () => {
        const nick = nickInput.value.trim();
        if (nick.length < 2) {
          showMenuError('Введите имя (минимум 2 символа)');
          nickInput.focus();
          return;
        }
        sessionStorage.setItem('playerNick', nick);
        applyNickname(nick);
        rememberGarden(garden.code, { nick });
        codeInput.value = '';
        enterGame(garden.code);
      };

      slot.addEventListener('click', (e) => { if (!e.target.closest('.slot-delete')) enter(); });
      slot.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); enter(); } });

      slot.querySelector('.slot-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        forgetGarden(garden.code);
        renderSlots();
      });

      slots.appendChild(slot);
    }

    // --- Новый сад ---
    const newSlot = document.createElement('div');
    newSlot.className = 'slot empty';
    newSlot.setAttribute('role', 'button');
    newSlot.tabIndex = 0;
    newSlot.innerHTML = `
      <div class="slot-icon">＋</div>
      <div class="slot-info">
        <div class="slot-title">Новый сад</div>
        <div class="slot-sub">Создать свой и позвать близкого</div>
      </div>
      <div class="slot-cta">🌱</div>
    `;
    newSlot.addEventListener('click', () => {
      // Новый сад тоже требует ник — иначе игрока не узнать.
      const nick = nickInput.value.trim();
      if (needsNickname(nick)) {
        showMenuError('Введите имя (минимум 2 символа)');
        nickInput.focus();
        return;
      }
      sessionStorage.setItem('playerNick', nick);
      applyNickname(nick);
      enterGame(null);
    });
    slots.appendChild(newSlot);
  }

  renderSlots();

  const doJoin = () => {
    const nick = nickInput.value.trim();
    if (needsNickname(nick)) {
      showMenuError('Введите имя (минимум 2 символа)');
      nickInput.focus();
      return;
    }
    const code = normalizeRoomCode(codeInput.value);
    if (code.length > 0 && !isValidRoomCode(code)) {
      showMenuError('Код комнаты должен быть 4–6 символов');
      return;
    }
    sessionStorage.setItem('playerNick', nick);
    applyNickname(nick);
    enterGame(code);
  };

  joinBtn.addEventListener('click', doJoin);
  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase();
    showMenuError('');
  });
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doJoin();
  });

  // Код комнаты из ссылки подставляем в поле, но НЕ входим автоматически:
  // сначала игрок должен ввести ник, иначе он будет анонимным.
  const params = new URLSearchParams(window.location.search);
  const roomFromUrl = normalizeRoomCode(params.get('room'));
  if (roomFromUrl) {
    codeInput.value = roomFromUrl;
    showMenuError('Введите имя и нажмите «Войти»');
    nickInput.focus();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMenu);
} else {
  initMenu();
}

// PWA Service Worker registration (prod only, so Vite HMR isn't cached in dev)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[PWA] SW registration failed:', err);
    });
  });
}
