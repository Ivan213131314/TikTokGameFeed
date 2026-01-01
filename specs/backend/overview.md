# Спецификация Backend (Supabase)

Этот документ описывает структуру данных и взаимодействие с облачным бэкендом Supabase.

## 1. Обзор

В качестве Backend-as-a-Service (BaaS) используется **Supabase**. Приложение взаимодействует с ним напрямую через клиентскую библиотеку `@supabase/supabase-js`.

- **База данных**: PostgreSQL.
- **Аутентификация**: Supabase Auth (Email/Password, OAuth).
- **Хранилище файлов**: Supabase Storage (используется для аватаров, код игр хранится в БД как текст).

## 2. Схема Базы Данных (Tables)

На основе кода `GameStorageService.ts`, в системе используются следующие таблицы:

### `games`
Хранит информацию о загруженных играх.
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key -> `auth.users`) - Автор игры.
- `title` (Text) - Название игры.
- `html_content` (Text) - Полный исходный код HTML5 игры.
- `created_at` (Timestamp) - Дата создания.
- `description` (Text, Optional) - Описание.

### `likes`
Таблица связки для лайков.
- `id` (UUID, Primary Key)
- `game_id` (UUID, Foreign Key -> `games`)
- `user_id` (UUID, Foreign Key -> `auth.users`)

### `comments`
Комментарии пользователей к играм.
- `id` (UUID, Primary Key)
- `game_id` (UUID, Foreign Key -> `games`)
- `user_id` (UUID, Foreign Key -> `auth.users`)
- `content` (Text) - Текст комментария.
- `created_at` (Timestamp).

### `profiles`
Публичные данные пользователей.
- `id` (UUID, Primary Key, совпадает с `auth.users.id`).
- `username` (Text).
- `avatar_url` (Text).
- `created_at` (Timestamp).

## 3. Политики Безопасности (RLS)

*Предполагаемые политики на основе поведения клиента:*

- **Games**:
  - `SELECT`: Публичный доступ (все пользователи могут видеть игры).
  - `INSERT`: Только аутентифицированные пользователи.
  - `DELETE`: Только автор игры (`user_id = auth.uid()`).

- **Likes/Comments**:
  - `SELECT`: Публичный доступ.
  - `INSERT`: Только аутентифицированные пользователи.
  - `DELETE`: Только автор лайка/комментария.

## 4. Клиентская Интеграция

Инициализация клиента происходит в `src/lib/supabase.ts` (подразумевается импорт).
Все запросы инкапсулированы в сервисный слой, прямые вызовы из UI компонентов не рекомендуются (хотя архитектурно не запрещены жестко).
