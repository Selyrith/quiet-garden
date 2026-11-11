# Аудио-реализация — Quiet Garden

## 1. Требования (что нужно озвучить)

| Событие | Описание | Формат | Пример триггера |
|---------|----------|--------|-----------------|
| UI click | Нажатие кнопки меню | WAV/OGG, коротко | `sound.click()` |
| Посадка растения | Игрок сажает цветок/дерево | WAV, мягкий удар | `sound.plant()` |
| Полив | Полив грядки | WAV, вода | `sound.water()` |
| Урожай | Сбор урожая | WAV, приятный чим | `sound.harvest()` |
| Покупка | Покупка пака/улучшения | WAV, позитивный аккорд | `sound.buy()` |
| Ошибка | Недостаточно монет / отказ | WAV, низкий звук | `sound.error()` |
| Музыка фон | Безループ генеративная | OGG, цикл | `MusicManager` |
| Атмосфера | Ветер, птицы, сверчки | OGG, цикл, 4 слоя | `AmbienceManager` |
| Пространственный звук | Звук от конкретного тайла | WAV, PannerNode | `sound.playAt()` |

## 2. Источники и лицензии (скачать вручную)

| Категория | Источник | Поисковый запрос | Лицензия | Формат |
|-----------|----------|------------------|----------|--------|
| UI click | freesound.org | "ui click soft", "button press" | CC0 / CC-BY | WAV |
| Посадка | freesound.org | "plant seed", "dig soft dirt" | CC0 / CC-BY | WAV |
| Полив | freesound.org | "watering can", "pour water" | CC0 / CC-BY | WAV |
| Урожай | freesound.org | "harvest", "fruit pick", "chime" | CC0 / CC-BY | WAV |
| Покупка | opengameart.org | "coin pickup", "shop buy" | CC0 / CC-BY | WAV |
| Ошибка | freesound.org | "error buzzer", "denied" | CC0 / CC-BY | WAV |
| Музыка фон | opengameart.org | "relaxing garden", "ambient pentatonic" | CC0 / CC-BY | OGG |
| Атмосфера ветер | freesound.org | "wind light", "breeze" | CC0 / CC-BY | OGG |
| Атмосфера птицы | freesound.org | "birds morning", "sparrows" | CC0 / CC-BY | OGG |
| Атмосфера сверчки | freesound.org | "crickets night", "insects" | CC0 / CC-BY | OGG |
| Атмосфера погода | freesound.org | "light rain", "thunder distant" | CC0 / CC-BY | OGG |

**Важно:** перед использованием проверьте лицензию на странице каждого файла. CC0 — без авторства, CC-BY — требует указания автора в кредитах игры.

## 3. Структура папок

```
/root/projects/Work/Game/quiet-garden/public/assets/audio/
├── ui/
│   ├── click.wav
│   └── error.wav
├── actions/
│   ├── plant.wav
│   ├── water.wav
│   ├── harvest.wav
│   └── buy.wav
├── music/
│   └── garden_loop.ogg
├── ambience/
│   ├── wind.ogg
│   ├── birds.ogg
│   ├── crickets.ogg
│   └── weather.ogg
└── .audio.meta.json
```

## 4. Манифест (.audio.meta.json)

```json
{
  "version": "audio/v1.0",
  "updated": "2026-11-10",
  "assets": [
    {"file": "ui/click.wav", "license": "CC0", "source": "freesound.org", "trigger": "sound.click()", "volume": 0.12},
    {"file": "ui/error.wav", "license": "CC-BY", "source": "freesound.org", "trigger": "sound.error()", "volume": 0.25},
    {"file": "actions/plant.wav", "license": "CC0", "source": "freesound.org", "trigger": "sound.plant()", "volume": 0.35},
    {"file": "actions/water.wav", "license": "CC0", "source": "freesound.org", "trigger": "sound.water()", "volume": 0.30},
    {"file": "actions/harvest.wav", "license": "CC0", "source": "freesound.org", "trigger": "sound.harvest()", "volume": 0.40},
    {"file": "actions/buy.wav", "license": "CC-BY", "source": "opengameart.org", "trigger": "sound.buy()", "volume": 0.35},
    {"file": "music/garden_loop.ogg", "license": "CC-BY", "source": "opengameart.org", "trigger": "MusicManager", "loop": true, "volume": 0.15},
    {"file": "ambience/wind.ogg", "license": "CC0", "source": "freesound.org", "trigger": "AmbienceManager", "loop": true, "volume": 0.20},
    {"file": "ambience/birds.ogg", "license": "CC0", "source": "freesound.org", "trigger": "AmbienceManager", "loop": true, "volume": 0.18},
    {"file": "ambience/crickets.ogg", "license": "CC0", "source": "freesound.org", "trigger": "AmbienceManager", "loop": true, "volume": 0.15},
    {"file": "ambience/weather.ogg", "license": "CC0", "source": "freesound.org", "trigger": "AmbienceManager", "loop": true, "volume": 0.12}
  ]
}
```

## 5. Интеграция в код

Файлы уже созданы:
- `src/audio/SoundManager.js` — поддерживает загрузку реальных файлов через `AssetManager`, процедурный фолбэк если файл отсутствует, `playAt()` для пространственного звука, `setReverbZone()`.
- `src/audio/AssetManager.js` — кэширует `decodeAudioData` из `/assets/audio/{name}.{wav|ogg}`.
- `src/main.js` — Singleton `sound` импортируется в `GameScene` через `this.sound = sound`.

**Что сделать после скачивания файлов:**
1. Положить аудио в `public/assets/audio/` по структуре выше.
2. Создать `public/assets/audio/.audio.meta.json` с манифестом.
3. Перезапустить Vite (`npx vite --port 5177`).
4. Звуки подхватятся автоматически через `AssetManager.load(name)`.

## 6. Чек-лист QA

- [ ] Все WAV/OGG файлы лежат в `public/assets/audio/`
- [ ] `.audio.meta.json` совпадает с реальными именами файлов
- [ ] Vite стартует без ошибок (HTTP 200 на 5177)
- [ ] `sound.click()` играет при нажатии кнопок меню
- [ ] `sound.plant()` / `sound.water()` / `sound.harvest()` играют на действиях с тайлами
- [ ] Музыка зациклена и не обрезается
- [ ] Атмосферные слои миксуются без щелчков на переключении
- [ ] Пространственный звук (`playAt`) меняет громкость по дистанции
- [ ] Нет клиппинга (пик ≤ -1 dBFS)
- [ ] Процедурный фолбэк работает, если файл отсутствует (игра не ломается)

## 7. Микширование (целевые уровни)

| Шина | Уровень |
|------|---------|
| Мастер | -16 LUFS |
| Музыка | -24 LUFS |
| Атмосфера | -26 LUFS |
| SFX (действия) | -20 LUFS |
| UI | -30 LUFS |
| Дакинг музыки под SFX | -9 dB |