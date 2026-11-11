import { getWorldState, serializeWorld } from '../shared/world.js';
import { waterTile } from './garden.js';
import { computeState } from './garden.js';
import { broadcastProgress } from './rooms.js';

/**
 * Применяет эффекты мира к комнате.
 * Главное: при смене погоды на дождь — все растущие грядки автоматически политы.
 * Возвращает true, если было изменение.
 */
export function tickWorld(io, code, room) {
  const world = getWorldState();
  const prevWeather = room.lastWeather;
  room.lastWeather = world.weather.id;
  room.world = world;

  let changed = prevWeather !== world.weather.id;

  if (changed && world.weather.id === 'rain') {
    room.garden.forEach((tile, key) => {
      if (!tile) return;
      const { stage } = computeState(tile);
      if (stage >= 0 && stage < 3) {
        waterTile(room.garden, key, 60000);
      }
    });
    broadcastProgress(io, code, room);
  }

  if (changed) {
    io.to(code).emit('world-updated', { world: serializeWorld(world) });
  }
  return changed;
}

export function getCurrentWorld() {
  return getWorldState();
}
