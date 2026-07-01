# Установка расширения Brax Upload Method

## Для разработчиков и локального тестирования

### Шаг 1: Настройка конфигурации
Отредактируй `extension/src/config.js`:
- Измени `BACKEND_URL` на твой сервер (по умолчанию `http://localhost:4000`)
- Измени `FRONTEND_URL` на твой фронтенд (по умолчанию `http://localhost:5173`)

```javascript
const CONFIG = {
  BACKEND_URL: 'http://localhost:4000',
  FRONTEND_URL: 'http://localhost:5173',
};
```

### Шаг 2: Загрузка в браузер
1. Открой `chrome://extensions` (или `edge://extensions`)
2. Включи **"Режим разработчика"** (верхний правый угол)
3. Нажми **"Загрузить распакованное расширение"**
4. Выбери папку `BraxUploadMethod/extension`

### Шаг 3: Тестирование
1. Открой **TikTok** и перейди на страницу загрузки видео
2. Выбери видеофайл
3. В оверлее нажми **"Оптимизировать"**
4. Видео загрузится после обработки

---

## Для других пользователей (Публикация)

### Способ 1: Chrome Web Store (рекомендуется)
1. Создай аккаунт разработчика на [Chrome Web Store](https://chrome.google.com/webstore/devconsole)
2. Зайди в консоль разработчика
3. Нажми **"Новое приложение"**
4. Загрузи ZIP-файл из папки `extension/`
5. Заполни описание, скриншоты, иконки
6. Опубликуй (после проверки Google ~1-3 дня)

### Способ 2: Распространение как ZIP
1. Упакуй папку `extension/` в `brax-extension.zip`
2. Распространяй пользователям
3. Пользователи устанавливают так же, как в "Шаг 2"

### Способ 3: GitHub Releases
1. Создай репозиторий на GitHub
2. Добавь папку `extension/` в корень
3. Создай GitHub Actions для сборки ZIP
4. Опубликуй в GitHub Releases

---

## Настройка для конечных пользователей

Если пользователь хочет использовать свой сервер:

1. Открой DevTools на любой странице TikTok (F12)
2. Перейди на вкладку **Console**
3. Выполни:
```javascript
chrome.storage.local.set({
  braxBackendUrl: 'https://api.example.com',
  braxFrontendUrl: 'https://brax.example.com'
});
```
4. Обнови страницу TikTok

---

## Требования

- **Node.js** 16+ (для бэкенда)
- **ffmpeg** (Topaz Video AI или стандартный)
- **Chrome/Edge** 88+ (для MV3 расширений)

## Переменные окружения для бэкенда

Создай `.env` в папке `backend/`:
```
PORT=4000
NODE_ENV=production
```
