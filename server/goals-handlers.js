import { claimDaily, ensureDaily, ensureQuests, serializeGoals, getPlayerGoals } from './goals.js';
import { getTreeNodeById } from '../shared/goals.js';
import { broadcastInventory, broadcastTeam } from './rooms.js';
import { rollPack } from '../shared/packs.js';

export function setupGoalsHandlers(io, socket, deps) {
  const { rooms, socketRoom } = deps;
  const pid = socket.handshake.auth.playerId || socket.id;

  socket.on('daily-claim', () => {
    const code = socketRoom.get(pid);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;

    ensureDaily(room, pid);
    const result = claimDaily(room, pid);
    if (!result.ok) {
      socket.emit('daily-result', { ok: false, message: result.reason });
      return;
    }
    
    room.coins += result.coins;
    
    const seeds = rollPack('basic');
    let seedsToGive = result.seedBonus > 0 ? result.seedBonus : 3; // 3 базовых или бонус сезона
    
    for (let i = 0; i < seedsToGive; i++) {
        const seed = seeds[i % seeds.length];
        room.inventory[seed] = (room.inventory[seed] || 0) + 1;
    }

    // Async team buff logic
    if (!room.team.dailyVisitors) room.team.dailyVisitors = [];
    if (!room.team.dailyVisitors.includes(pid)) {
        room.team.dailyVisitors.push(pid);
        if (room.team.dailyVisitors.length >= 2) {
            room.team.teamBuff = { growth: 0.1, expiresAt: Date.now() + 86400000 };
            io.to(code).emit('team-completed', { 
                goal: 'Синергия команды', 
                reward: '+10% к скорости роста на сутки' 
            });
        }
        broadcastTeam(io, code, room);
    }

    io.to(code).emit('coins-updated', { coins: room.coins });
    broadcastInventory(io, code, room);
    socket.emit('goals-updated', { goals: serializeGoals(room, pid) });
    socket.emit('daily-result', { ok: true, message: `+${result.coins} 🪙 (серия ${result.streak} дн.)` });
  });

  socket.on('quest-claim', (data) => {
    const code = socketRoom.get(pid);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    ensureQuests(room, pid);

    const { questId } = data || {};
    const goals = getPlayerGoals(room, pid);
    const q = (goals.quests || []).find((x) => x.id === questId);
    
    if (!q || q.claimed) {
      socket.emit('quest-result', { ok: false, message: 'Квест недоступен' });
      return;
    }
    if ((q.progress || 0) < q.target) {
      socket.emit('quest-result', { ok: false, message: 'Квест ещё не выполнен' });
      return;
    }
    
    q.claimed = true;
    room.coins += q.reward;
    io.to(code).emit('coins-updated', { coins: room.coins });
    socket.emit('goals-updated', { goals: serializeGoals(room, pid) });
    socket.emit('quest-result', { ok: true, message: `Квест: +${q.reward} 🪙` });
  });

  socket.on('tree-claim', (data) => {
    const code = socketRoom.get(pid);
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    ensureQuests(room, pid);

    const goals = getPlayerGoals(room, pid);
    const { nodeId } = data || {};
    const node = getTreeNodeById(nodeId);
    
    if (!node) return;
    if (!goals.treeClaimed) goals.treeClaimed = [];
    if (goals.treeClaimed.includes(nodeId)) {
      socket.emit('tree-result', { ok: false, message: 'Уже получено' });
      return;
    }

    // Единый источник истины по «открытым видам» — размер коллекции комнаты.
    // Раньше code читал goals.speciesCount, а UI/книга показывали
    // room.collection.size, и две цифры расходились: узел дерева «25 видов»
    // не открывался, хотя книга показывала 25.
    let checkValue;
    if (node.check === 'speciesCount') {
      const fromCollection = room.collection ? room.collection.size : 0;
      checkValue = Math.max(goals.speciesCount || 0, fromCollection);
    } else {
      checkValue = goals[node.check] != null ? goals[node.check] : 0;
    }

    if (checkValue < node.target) {
      socket.emit('tree-result', { ok: false, message: `Условие не выполнено (${checkValue}/${node.target})` });
      return;
    }

    goals.treeClaimed.push(nodeId);

    // Apply rewards
    if (nodeId === 'first') {
      room.coins += 50;
      io.to(code).emit('coins-updated', { coins: room.coins });
    }
    if (nodeId === 'ten') room.incomeBonusPermanent = (room.incomeBonusPermanent || 0) + 0.20;
    if (nodeId === 'twenty5') room.maxActivitiesBonus = (room.maxActivitiesBonus || 0) + 1;
    if (nodeId === 'fifty') room.upgradeDiscount = Math.max(room.upgradeDiscount || 0, 0.10);
    if (nodeId === 'activity15') room.gardenRowsBonus = (room.gardenRowsBonus || 0) + 1;

    socket.emit('goals-updated', { goals: serializeGoals(room, pid) });
    socket.emit('tree-result', { ok: true, message: `Получено: ${node.reward}` });
  });
}
