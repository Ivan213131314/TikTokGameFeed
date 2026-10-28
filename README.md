# TikTokGameFeed

A mobile app that serves an endless, swipeable feed of casual HTML5 games, in the style of TikTok. Swipe up to jump to the next game, play instantly, like, comment, and upload your own.

## Features

- **Vertical game feed**: full-screen pager with instant play, randomized game order.
- **Social layer**: likes, comments, and user profiles you can open from the feed.
- **Authentication**: sign-in via Supabase Auth (including Google).
- **User-generated games**: upload your own HTML5 game; the code is stored in the database.
- **Game bridge**: games run in an isolated WebView and report score and game-over state back to the app.

## Included games

Arrow Reflex, Crossy Road, Doodle Jump, Falling Square, Flappy Bird, Math Reaction, Memory Matrix, Stacker, Fruit Ninja (see the `Games/` folder).

## Tech stack

- TypeScript, React Native 0.81, Expo SDK 54
- Expo Router for navigation
- `react-native-pager-view` for the feed, `react-native-webview` for game rendering
- Supabase (PostgreSQL + Auth) as the backend

## Project structure

```text
app/        Expo Router screens (tabs: feed, profile; user/[id])
src/        Components, services, constants, types, utils
lib/        Supabase client
Games/      Bundled HTML5 games
specs/      Project specifications (frontend, backend, modules)
scripts/    Helper scripts
```

## Getting started

```bash
npm install
npx expo start
```

Then open the app in Expo Go, an emulator, or the browser (`npm run web`).

Configure your Supabase URL and anon key in `lib/supabase.ts` (or via environment variables) before running.

## Documentation

Detailed specifications live in [`specs/`](specs/specification.md).
