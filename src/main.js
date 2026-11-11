import Phaser from 'phaser';
import { io } from 'socket.io-client';
import GameScene from './scenes/GameScene.js';
import PauseScene from './scenes/PauseScene.js';
import { sound } from './audio/SoundManager.js';
import { shouldAutoJoin, needsNickname, normalizeRoomCode, isValidRoomCode } from './join-flow.js';

// В проде подключаемся к тому же хосту, что и страница (Socket.IO идёт по /socket.io).
// VITE_SERVER_URL можно задать явно, если сервер вынесен на отдельный домен.
const SERVER_URL = (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_SERVER_URL) || undefined;

function getPlayerId() {
  let id = sessionStorage.getItem('playerId');
  if (!id) {
    id = 'p_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('playerId', id);
  }
  return id;
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
      dom: { createContainer: true },
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

function enterGame(roomCode) {
  currentRoom = roomCode || null;
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
  } else {
    // Реконнект: повторяем вход в ту же комнату
    console.log('[main] Reconnecting to room:', currentRoom);
    socket.emit('join-room', { roomCode: currentRoom || undefined });
  }
});

socket.on('room-code', ({ roomCode }) => {
  console.log('[main] room-code received:', roomCode);
  currentRoom = roomCode;
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

function initMenu() {
  const slots = document.getElementById('slotsContainer');
  const codeInput = document.getElementById('codeInput');
  const joinBtn = document.getElementById('joinBtn');
  const nickInput = document.getElementById('nickInput');
  if (!slots || !codeInput || !joinBtn || !nickInput) return;

  // Восстанавливаем сохранённый ник
  const savedNick = sessionStorage.getItem('playerNick');
  if (savedNick) nickInput.value = savedNick;

  slots.innerHTML = '';

  const newSlot = document.createElement('div');
  newSlot.className = 'slot empty';
  newSlot.innerHTML = '<div class="slot-title">+ Новый сад</div>';
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
