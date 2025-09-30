# Nginx: Security Headers и базовая конфигурация для SPA (Vite)

Ниже — рекомендуемая конфигурация для продакшен‑раздачи собранного приложения (`dist/`) через Nginx c безопасными заголовками и корректным кешированием.

## Быстрый пример server блока

```
server {
    listen 80;
    server_name your-domain.example; # замените на ваш домен

    root /var/www/prorab360/dist;    # путь к собранному приложению
    index index.html;

    # --- Базовые security headers ---
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    # HSTS только если у вас строго HTTPS (включайте на 443):
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # CSP: разрешаем собственные ресурсы + Telegram WebApp + Supabase + (опционально) Google GenAI
    # Уточняйте под свои интеграции. Если AI выключен — уберите generativelanguage.googleapis.com.
    add_header Content-Security-Policy "\
        default-src 'self'; \
        script-src 'self' https://telegram.org; \
        style-src 'self' 'unsafe-inline'; \
        img-src 'self' data: blob: https:; \
        font-src 'self' data: https:; \
        connect-src 'self' https://*.supabase.co https://*.supabase.in https://generativelanguage.googleapis.com wss:; \
        worker-src 'self' blob:; \
        frame-ancestors 'self'; \
    " always;

    # Грамотное кеширование:
    # 1) Для HTML — без кеша (чтобы получать свежие версии)
    location = /index.html { 
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        try_files $uri =404;
    }

    # 2) Для ассетов с хешами — агрессивное кеширование
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        try_files $uri =404;
    }

    # 3) Для service worker — короткое кеширование, чтобы обновлялся
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        try_files $uri =404;
    }

    # SPA fallback на index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip (по желанию)
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}
```

## Примечания

- Если приложение будет на HTTPS, переносите сервер на 443 и включайте HSTS.
- CSP подправляйте под реальные домены интеграций. В конфиг включены:
  - `https://telegram.org` (скрипт Telegram WebApp в `index.html`)
  - `*.supabase.co|*.supabase.in` (API + Storage)
  - `generativelanguage.googleapis.com` (опционально, для Gemini — можно убрать)
- Для стабильных обновлений PWA/SPA:
  - HTML (`/` и `/index.html`) — без кеша
  - Asset‑файлы с хешами — `immutable` на год
  - `sw.js` — без кеша

## Размещение сборки

- Соберите проект: `npm run build` — артефакты в `dist/`
- Скопируйте `dist/` на сервер, путь укажите в `root`.

## Тестирование

- `curl -I https://your-domain.example/` — проверьте наличие заголовков
- Откройте DevTools → Network → выберите документ и ассеты — убедитесь в корректных Cache-Control и CSP

