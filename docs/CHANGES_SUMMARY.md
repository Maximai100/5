# Работы по PDF и dev-серверу

## Поддержка кириллицы и оформление PDF
- `public/fonts/Roboto-Regular.ttf`, `public/fonts/Roboto-Bold.ttf`: заменены на полные TTF со всеми кириллическими глифами.
- `src/services/PdfService.ts`: шрифты теперь подгружаются из `public/fonts` в рантайме (fetch -> base64 -> addFileToVFS); регистрируется `Roboto` в стилях `normal` и `bold` без `Identity-H`. Все заголовки/таблицы/итоги используют этот шрифт.
- Методы генерации PDF стали `async` и вызываются с `await`.

## Гибкий dev-порт Vite
- `vite.config.ts`: порт и HMR читаем из `VITE_DEV_PORT` или `PORT` (fallback 5173), чтобы WS подключался к фактическому порту.

## Дополнительно
- `src/App.tsx`: вызовы `generateEstimatePDF` и `generateWorkSchedulePDF` переведены на `await`.
- `src/supabaseClient.ts`: по решению команды URL и anon ключ Supabase заданы жёстко в коде (HTTPS), env не используются. Это устраняет mixed content и рассинхрон переменных между локально и Vercel.
- Проверка: `npm run build`, ручной экспорт смет/актов/графика — кириллица отображается корректно.

## Изменение формы PDF «График работ»
- В таблице убран столбец «Описание», вместо него добавлен «Прогресс» (в %).
- Колонки теперь: №, Наименование этапа, Дата начала, Дата завершения, Статус, Прогресс.
