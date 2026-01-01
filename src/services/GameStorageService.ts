import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameModel } from '../types/GameModel';

const GAMES_STORAGE_KEY = 'games_list';

const getGamesDir = () => {
    // Defines a safe path even if documentDirectory is supposedly missing in types
    return (FileSystem.documentDirectory ?? '') + 'games/';
};

export const GameStorageService = {
    async initialize() {
        const dir = getGamesDir();
        if (!dir) return; // Cannot initialize without directory

        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }
    },

    async getGames(): Promise<GameModel[]> {
        try {
            const jsonValue = await AsyncStorage.getItem(GAMES_STORAGE_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (e) {
            console.error('Failed to load games', e);
            return [];
        }
    },

    async addGame(name: string, sourceUri: string): Promise<GameModel> {
        await this.initialize();

        const id = Date.now().toString();
        // Clean filename to be safe
        const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${id}_${safeName}.html`;
        const dir = getGamesDir();
        if (!dir) throw new Error('Cannot add game: Storage directory unavailable');

        const destUri = dir + fileName;

        // Copy file to our private games directory
        await FileSystem.copyAsync({
            from: sourceUri,
            to: destUri,
        });

        const newGame: GameModel = {
            id,
            name,
            uri: destUri,
            dateAdded: Date.now(),
        };

        const games = await this.getGames();
        const updatedGames = [newGame, ...games]; // Add to top
        await AsyncStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(updatedGames));

        return newGame;
    },

    async deleteGame(id: string): Promise<void> {
        const games = await this.getGames();
        const gameToDelete = games.find(g => g.id === id);

        if (gameToDelete) {
            await FileSystem.deleteAsync(gameToDelete.uri, { idempotent: true });
            const updatedGames = games.filter(g => g.id !== id);
            await AsyncStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(updatedGames));
        }
    },

    async seedDefaultGames(): Promise<void> {
        const games = await this.getGames();
        const defaultGameName = 'Falling Square';

        // Check if already seeded
        if (games.some(g => g.name === defaultGameName)) {
            return;
        }

        await this.initialize();

        // We can't easily access assets in Expo without a config plugin or just using Asset.fromModule
        // But since we are in a bare/managed workflow, let's try a different approach.
        // We will manually load the file content if possible, OR just copy it if it's a known asset.
        // For simplicity in this environment, let's assume we can require the file and write it.
        // NOTE: React Native's require returns a number (ID). We need Asset.fromModule.

        // However, require('./path/to/file.html') might not work out of the box with the metro bundler for HTML files 
        // unless configured. 
        // A safer bet without messing with metro.config.js is to write the string content directly 
        // OR rely on the user to bundle it. 

        // Let's try the Asset module approach which is standard in Expo.
        try {
            const { Asset } = require('expo-asset');
            // We need to ensure the HTML file is treated as an asset. 
            // If the metro config doesn't support HTML, this might fail at build time.
            // As a fallback for this specific task, I will WRITE the content directly here 
            // to ensure it works without complex config changes.

            const gameContent = `<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        body { margin: 0; padding: 0; background-color: #000; overflow: hidden; color: white; font-family: Arial, sans-serif; touch-action: none; }
        #gameCanvas { display: block; width: 100vw; height: 100vh; }
        #ui { position: absolute; top: 20px; left: 20px; right: 20px; pointer-events: none; display: flex; justify-content: space-between; }
        #score { font-size: 24px; font-weight: bold; }
        #gameOver { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; display: none; }
        button { background: white; color: black; border: none; padding: 10px 20px; font-size: 18px; font-weight: bold; cursor: pointer; margin-top: 20px; border-radius: 5px; pointer-events: auto; }
    </style>
</head>
<body>
    <div id="ui"><div id="score">Score: 0</div></div>
    <div id="gameOver"><h1>GAME OVER</h1><p>Score: <span id="finalScore">0</span></p><button onclick="startGame()">RESTART</button></div>
    <canvas id="gameCanvas"></canvas>
    <script>
        const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d');
        const scoreEl = document.getElementById('score'); const gameOverEl = document.getElementById('gameOver'); const finalScoreEl = document.getElementById('finalScore');
        let width, height, player, blocks = [], score = 0, gameRunning = false, speedMultiplier = 1, animationId, lastTime = 0, spawnTimer = 0;
        function resize() { width = window.innerWidth; height = window.innerHeight; canvas.width = width; canvas.height = height; if(player) player.y = height - 100; }
        window.addEventListener('resize', resize); resize();
        class Player { constructor() { this.size = 50; this.x = width / 2 - this.size / 2; this.y = height - 100; this.color = '#00ffcc'; } draw() { ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.size, this.size); } update(inputX) { if (inputX !== null) { this.x = inputX - this.size / 2; } if (this.x < 0) this.x = 0; if (this.x + this.size > width) this.x = width - this.size; } }
        class Block { constructor() { this.size = Math.random() * 40 + 30; this.x = Math.random() * (width - this.size); this.y = -this.size; this.speed = (Math.random() * 2 + 3) * speedMultiplier; this.color = 'hsl(' + (Math.random() * 360) + ', 70%, 50%)'; } draw() { ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, this.size, this.size); } update() { this.y += this.speed; } }
        function startGame() { player = new Player(); blocks = []; score = 0; speedMultiplier = 1; scoreEl.innerText = 'Score: 0'; gameOverEl.style.display = 'none'; gameRunning = true; lastTime = performance.now(); if (animationId) cancelAnimationFrame(animationId); loop(lastTime); }
        function loop(timestamp) { if (!gameRunning) return; const dt = timestamp - lastTime; lastTime = timestamp; ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; ctx.fillRect(0, 0, width, height); spawnTimer += dt; if (spawnTimer > 1000 / speedMultiplier) { blocks.push(new Block()); spawnTimer = 0; } speedMultiplier += 0.0001 * dt; for (let i = blocks.length - 1; i >= 0; i--) { let b = blocks[i]; b.update(); b.draw(); if (player.x < b.x + b.size && player.x + player.size > b.x && player.y < b.y + b.size && player.y + player.size > b.y) { gameOver(); } if (b.y > height) { blocks.splice(i, 1); score++; scoreEl.innerText = 'Score: ' + score; } } player.draw(); animationId = requestAnimationFrame(loop); }
        function gameOver() { gameRunning = false; gameOverEl.style.display = 'block'; finalScoreEl.innerText = score; }
        let inputX = null; function handleInput(e) { e.preventDefault(); let clientX; if (e.touches) { clientX = e.touches[0].clientX; } else { clientX = e.clientX; } if(player) player.update(clientX); }
        canvas.addEventListener('touchstart', handleInput, {passive: false}); canvas.addEventListener('touchmove', handleInput, {passive: false}); canvas.addEventListener('mousemove', (e) => { if (e.buttons === 1) handleInput(e); });
        startGame();
    </script>
</body>
</html>`;

            const id = 'default_falling_square';
            const fileName = `${id}.html`;
            const dir = getGamesDir();
            if (!dir) return;
            const destUri = dir + fileName;

            await FileSystem.writeAsStringAsync(destUri, gameContent);

            const newGame: GameModel = {
                id,
                name: defaultGameName,
                uri: destUri,
                dateAdded: Date.now(),
            };

            const updatedGames = [...games, newGame];
            await AsyncStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(updatedGames));

        } catch (e) {
            console.error('Failed to seed default games', e);
        }

        // Seed Memory Matrix
        const memoryMatrixName = 'Memory Matrix';
        if (games.some(g => g.name === memoryMatrixName)) {
            return;
        }

        try {
            const gameContent = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Memory Matrix</title>
    <style>
        :root {
            --bg-color: #1a1a1a;
            --tile-color: #333;
            --tile-active: #0ff;
            /* Cyan neon */
            --tile-error: #f00;
            --text-color: #eee;
            --gap: 10px;
        }

        * {
            box-sizing: border-box;
            user-select: none;
            -webkit-user-select: none;
            touch-action: manipulation;
        }

        body {
            margin: 0;
            padding: 0;
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            overflow: hidden;
        }

        h1 {
            font-size: 2rem;
            margin-bottom: 20px;
            font-weight: 300;
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        #level-indicator {
            font-size: 1.2rem;
            margin-bottom: 20px;
            color: #888;
        }

        .game-container {
            position: relative;
            width: 90vmin;
            height: 90vmin;
            max-width: 400px;
            max-height: 400px;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(3, 1fr);
            gap: var(--gap);
            width: 100%;
            height: 100%;
        }

        .tile {
            background-color: var(--tile-color);
            border-radius: 8px;
            cursor: pointer;
            transition: transform 0.1s ease, background-color 0.2s;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }

        .tile:active {
            transform: scale(0.95);
        }

        .tile.active {
            background-color: var(--tile-active);
            box-shadow: 0 0 15px var(--tile-active);
            transform: scale(1.05);
        }

        .tile.error {
            background-color: var(--tile-error);
            box-shadow: 0 0 15px var(--tile-error);
            animation: shake 0.4s cubic-bezier(.36, .07, .19, .97) both;
        }

        .overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            border-radius: 12px;
            visibility: hidden;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 10;
        }

        .overlay.visible {
            visibility: visible;
            opacity: 1;
        }

        .overlay h2 {
            font-size: 2.5rem;
            margin: 0 0 20px;
            color: var(--tile-active);
        }

        .btn {
            background: var(--tile-active);
            color: #000;
            border: none;
            padding: 12px 30px;
            font-size: 1.2rem;
            border-radius: 25px;
            cursor: pointer;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .btn:hover {
            transform: scale(1.05);
            box-shadow: 0 0 10px var(--tile-active);
        }

        @keyframes shake {

            10%,
            90% {
                transform: translate3d(-1px, 0, 0);
            }

            20%,
            80% {
                transform: translate3d(2px, 0, 0);
            }

            30%,
            50%,
            70% {
                transform: translate3d(-4px, 0, 0);
            }

            40%,
            60% {
                transform: translate3d(4px, 0, 0);
            }
        }
    </style>
</head>

<body>

    <div id="level-indicator">Level 1</div>

    <div class="game-container">
        <div class="grid" id="grid">
            <!-- Tiles generated by JS -->
        </div>

        <div class="overlay" id="start-overlay">
            <h2>Memory Matrix</h2>
            <button class="btn" onclick="startGame()">Start</button>
        </div>

        <div class="overlay" id="game-over-overlay">
            <h2 style="color: var(--tile-error)">Game Over</h2>
            <p id="final-score" style="margin-bottom: 20px; font-size: 1.2rem;">Level: 1</p>
            <button class="btn" onclick="restartGame()">Try Again</button>
        </div>
    </div>

    <script>
        const grid = document.getElementById('grid');
        const levelDisplay = document.getElementById('level-indicator');
        const startOverlay = document.getElementById('start-overlay');
        const gameOverOverlay = document.getElementById('game-over-overlay');
        const finalScoreDisplay = document.getElementById('final-score');

        let sequence = [];
        let playerSequence = [];
        let level = 1;
        let isInputEnabled = false;

        // Initialize Grid
        for (let i = 0; i < 9; i++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.dataset.index = i;
            tile.addEventListener('pointerdown', (e) => handleInput(i, tile)); // Use pointerdown for instant reaction
            grid.appendChild(tile);
        }

        const tiles = document.querySelectorAll('.tile');

        // Show start screen initially
        startOverlay.classList.add('visible');

        function startGame() {
            startOverlay.classList.remove('visible');
            gameOverOverlay.classList.remove('visible');
            resetGameParams();
            setTimeout(playRound, 500);
        }

        function restartGame() {
            gameOverOverlay.classList.remove('visible');
            resetGameParams();
            setTimeout(playRound, 500);
        }

        function resetGameParams() {
            sequence = [];
            playerSequence = [];
            level = 1;
            updateLevelDisplay();
        }

        function updateLevelDisplay() {
            levelDisplay.textContent = \`Level \${level}\`;
        }

        function playRound() {
            isInputEnabled = false;
            playerSequence = [];

            // Add new random step
            const nextStep = Math.floor(Math.random() * 9);
            sequence.push(nextStep);

            playSequence();
        }

        async function playSequence() {
            // Wait a bit before starting sequence
            await delay(300);

            for (const index of sequence) {
                await flashTile(index);
                await delay(200); // Inter-flash gap
            }

            isInputEnabled = true;
        }

        function flashTile(index) {
            return new Promise(resolve => {
                const tile = tiles[index];
                tile.classList.add('active');
                setTimeout(() => {
                    tile.classList.remove('active');
                    resolve();
                }, 400); // Flash duration
            });
        }

        function handleInput(index, tile) {
            if (!isInputEnabled) return;

            // Visual feedback for tap
            tile.classList.add('active');
            setTimeout(() => tile.classList.remove('active'), 200);

            // Logic check
            const currentStep = playerSequence.length;
            if (sequence[currentStep] === index) {
                playerSequence.push(index);

                // Round complete?
                if (playerSequence.length === sequence.length) {
                    isInputEnabled = false;
                    level++;
                    updateLevelDisplay();
                    setTimeout(playRound, 1000);
                }
            } else {
                // Mistake!
                isInputEnabled = false;
                tile.classList.add('error');
                setTimeout(() => tile.classList.remove('error'), 500);
                triggerGameOver();
            }
        }

        function triggerGameOver() {
            setTimeout(() => {
                finalScoreDisplay.textContent = \`You reached Level \${level}\`;
                gameOverOverlay.classList.add('visible');
            }, 800);
        }

        function delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    </script>
</body>

</html>`;

            const id = 'default_memory_matrix';
            const fileName = `${id}.html`;
            const dir = getGamesDir();
            if (!dir) return;
            const destUri = dir + fileName;

            await FileSystem.writeAsStringAsync(destUri, gameContent);

            // Fetch latest games again to append safely
            const currentGames = await this.getGames();

            const newGame: GameModel = {
                id,
                name: memoryMatrixName,
                uri: destUri,
                dateAdded: Date.now(),
            };

            const updatedGames = [...currentGames, newGame];
            await AsyncStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(updatedGames));

        } catch (e) {
            console.error('Failed to seed default games (Memory Matrix)', e);
        }

        // Seed Arrow Reflex
        const arrowReflexName = 'Arrow Reflex';
        if (!games.some(g => g.name === arrowReflexName)) {
            try {
                const gameContent = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Arrow Reflex</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0c0c10;
            --primary-color: #00f3ff;
            --secondary-color: #bc13fe;
            --success-color: #00ff9d;
            --error-color: #ff0055;
            --text-color: #ffffff;
            --glass-bg: rgba(255, 255, 255, 0.05);
            --glass-border: rgba(255, 255, 255, 0.1);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: 'Outfit', sans-serif;
            height: 100vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        #game-container {
            width: 100%;
            height: 100%;
            max-width: 600px;
            display: flex;
            flex-direction: column;
            position: relative;
        }

        /* Header / Score */
        header {
            padding: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 24px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 2px;
            z-index: 10;
        }

        .score-container {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            padding: 8px 16px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 243, 255, 0.1);
            transition: transform 0.1s ease;
        }

        .score-change {
            transform: scale(1.1);
            box-shadow: 0 4px 30px rgba(0, 243, 255, 0.4);
        }

        /* Main Game Area */
        #game-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
        }

        /* Timer Bar */
        #timer-bar-container {
            position: absolute;
            top: 10px;
            left: 20%;
            right: 20%;
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            overflow: hidden;
        }

        #timer-bar {
            height: 100%;
            background: var(--primary-color);
            width: 100%;
            transform-origin: left;
            transition: background 0.2s;
            box-shadow: 0 0 10px var(--primary-color);
        }

        /* Arrow Display */
        #target-arrow {
            font-size: 120px;
            color: var(--text-color);
            filter: drop-shadow(0 0 20px var(--primary-color));
            transition: transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease;
        }

        .arrow-up {
            transform: rotate(0deg);
        }

        .arrow-right {
            transform: rotate(90deg);
        }

        .arrow-down {
            transform: rotate(180deg);
        }

        .arrow-left {
            transform: rotate(270deg);
        }

        .correct-anim {
            color: var(--success-color) !important;
            filter: drop-shadow(0 0 30px var(--success-color)) !important;
            animation: popCheck 0.3s ease forwards;
        }

        .wrong-anim {
            color: var(--error-color) !important;
            filter: drop-shadow(0 0 30px var(--error-color)) !important;
            animation: shake 0.4s ease forwards;
        }

        @keyframes popCheck {
            0% {
                transform: scale(1) rotate(var(--rot));
            }

            50% {
                transform: scale(1.4) rotate(var(--rot));
            }

            100% {
                transform: scale(0) rotate(var(--rot));
                opacity: 0;
            }
        }

        @keyframes shake {
            0% {
                transform: translateX(0) rotate(var(--rot));
            }

            25% {
                transform: translateX(-10px) rotate(var(--rot));
            }

            50% {
                transform: translateX(10px) rotate(var(--rot));
            }

            75% {
                transform: translateX(-10px) rotate(var(--rot));
            }

            100% {
                transform: translateX(0) rotate(var(--rot));
            }
        }

        /* Controls */
        #controls {
            padding: 40px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            grid-template-rows: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 20px;
            max-width: 400px;
            width: 100%;
            align-self: center;
        }

        .control-btn {
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 16px;
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            cursor: pointer;
            transition: all 0.1s ease;
            backdrop-filter: blur(5px);
            color: rgba(255, 255, 255, 0.8);
        }

        .control-btn:active {
            background: rgba(255, 255, 255, 0.15);
            transform: scale(0.95);
        }

        .btn-up {
            grid-column: 2;
            grid-row: 1;
        }

        .btn-left {
            grid-column: 1;
            grid-row: 2;
        }

        .btn-down {
            grid-column: 2;
            grid-row: 2;
        }

        .btn-right {
            grid-column: 3;
            grid-row: 2;
        }

        /* Game Over Overlay */
        #game-over-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(12, 12, 16, 0.9);
            backdrop-filter: blur(20px);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 100;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }

        #game-over-screen.visible {
            opacity: 1;
            pointer-events: all;
        }

        .game-over-title {
            font-size: 3rem;
            font-weight: 900;
            background: linear-gradient(to bottom, #fff, #888);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }

        .final-score-label {
            font-size: 1.2rem;
            color: #888;
            margin-bottom: 5px;
        }

        .final-score-value {
            font-size: 4rem;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 40px;
            text-shadow: 0 0 30px rgba(0, 243, 255, 0.3);
        }

        .restart-btn {
            background: linear-gradient(135deg, var(--secondary-color), var(--primary-color));
            border: none;
            padding: 16px 48px;
            font-size: 1.2rem;
            font-weight: 700;
            color: #fff;
            border-radius: 30px;
            cursor: pointer;
            box-shadow: 0 10px 40px rgba(188, 19, 254, 0.4);
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            font-family: 'Outfit', sans-serif;
            text-transform: uppercase;
        }

        .restart-btn:active {
            transform: scale(0.9);
        }

        /* Utility */
        .hidden {
            display: none !important;
        }

        .material-icons {
            font-family: 'Material Icons';
            /* Fallback if icon font load fails, but using direct SVG or unicode is safer */
            font-style: normal;
        }
    </style>
</head>

<body>

    <div id="game-container">
        <header>
            <div class="score-container">
                <span id="score">0</span>
            </div>
            <!-- High score could go here -->
        </header>

        <div id="game-area">
            <div id="timer-bar-container">
                <div id="timer-bar"></div>
            </div>
            <!-- Using SVG for arrows to ensure consistent look -->
            <div id="target-arrow" class="arrow-up">
                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4l-8 8h6v8h4v-8h6L12 4z" />
                </svg>
            </div>
        </div>

        <div id="controls">
            <div class="control-btn btn-up" data-dir="up">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4l-8 8h6v8h4v-8h6z" />
                </svg>
            </div>
            <div class="control-btn btn-left" data-dir="left">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 12l-8-8v6H4v4h8v6z" transform="rotate(180 12 12)" />
                </svg>
            </div>
            <div class="control-btn btn-down" data-dir="down">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 20l-8-8h6V4h4v8h6z" />
                </svg>
            </div>
            <div class="control-btn btn-right" data-dir="right">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 12l8-8v6h8v4h-8v6z" transform="rotate(180 12 12) scale(-1, 1)" />
                </svg>
            </div>
        </div>

        <div id="game-over-screen">
            <h1 class="game-over-title">GAME OVER</h1>
            <span class="final-score-label">SCORE</span>
            <span class="final-score-value" id="final-score">0</span>
            <button class="restart-btn" id="restart-btn">Try Again</button>
        </div>
    </div>

    <script>
        class ArrowGame {
            constructor() {
                this.score = 0;
                this.isPlaying = false;
                this.timeLimit = 2000; // 2 seconds
                this.currentTimer = this.timeLimit;
                this.lastFrameTime = 0;
                this.targetDirection = ''; // 'up', 'down', 'left', 'right'
                this.directions = ['up', 'down', 'left', 'right'];
                this.timerId = null;

                // DOM Elements
                this.scoreEl = document.getElementById('score');
                this.finalScoreEl = document.getElementById('final-score');
                this.targetArrowEl = document.getElementById('target-arrow');
                this.timerBarEl = document.getElementById('timer-bar');
                this.gameOverScreen = document.getElementById('game-over-screen');
                this.restartBtn = document.getElementById('restart-btn');
                this.controlBtns = document.querySelectorAll('.control-btn');

                this.init();
            }

            init() {
                // Event Listeners
                this.controlBtns.forEach(btn => {
                    btn.addEventListener('touchstart', (e) => {
                        e.preventDefault(); // Prevent double firing on some devices
                        this.handleInput(btn.dataset.dir);
                    });
                    btn.addEventListener('mousedown', (e) => {
                        this.handleInput(btn.dataset.dir);
                    });
                });

                // Keyboard support
                document.addEventListener('keydown', (e) => {
                    if (!this.isPlaying && this.gameOverScreen.classList.contains('visible')) return;

                    switch (e.key) {
                        case 'ArrowUp': this.handleInput('up'); break;
                        case 'ArrowDown': this.handleInput('down'); break;
                        case 'ArrowLeft': this.handleInput('left'); break;
                        case 'ArrowRight': this.handleInput('right'); break;
                    }
                });

                this.restartBtn.addEventListener('click', () => this.startGame());

                // Initial Start
                this.startGame();
            }

            startGame() {
                this.score = 0;
                this.isPlaying = true;
                this.updateScore();
                this.gameOverScreen.classList.remove('visible');
                this.timerBarEl.style.width = '100%';
                this.timerBarEl.style.background = 'var(--primary-color)';
                this.timerBarEl.style.boxShadow = '0 0 10px var(--primary-color)';

                this.nextRound();

                // Start Loop
                this.lastFrameTime = performance.now();
                requestAnimationFrame((t) => this.gameLoop(t));
            }

            nextRound() {
                // Pick random direction
                const nextDir = this.directions[Math.floor(Math.random() * this.directions.length)];
                this.targetDirection = nextDir;
                this.currentTimer = this.timeLimit;

                // Reset Animation
                this.targetArrowEl.className = '';
                // Force reflow
                void this.targetArrowEl.offsetWidth;

                // Set rotation class
                this.targetArrowEl.classList.add(\`arrow-\${nextDir}\`);

                // Set rotation variable for CSS animations
                let rot = 0;
                if (nextDir === 'right') rot = 90;
                if (nextDir === 'down') rot = 180;
                if (nextDir === 'left') rot = 270;
                this.targetArrowEl.style.setProperty('--rot', \`\${rot}deg\`);
            }

            handleInput(dir) {
                if (!this.isPlaying) return;

                if (dir === this.targetDirection) {
                    // Correct
                    this.score++;
                    this.updateScore();
                    // Play pop animation
                    this.animateFeedback('correct');
                    // Slightly decrease time limit as score goes up to increase difficulty? (Optional, kept constant for now per specs)

                    // Reset timer fully for next round
                    this.nextRound();
                } else {
                    // Wrong
                    this.animateFeedback('wrong');
                    this.gameOver();
                }
            }

            animateFeedback(type) {
                const el = this.targetArrowEl;
                if (type === 'correct') {
                    // We can clone the node to leave a "ghost" fading out if we want, 
                    // or just flash the current one. 
                    // Let's just flash the current one for simplicity and speed.

                    // Note: Since we switch to next round immediately, we need a way to show the success of the PREVIOUS one.
                    // Implementation: Create a ghost element at the same position.
                    const ghost = el.cloneNode(true);
                    ghost.id = '';
                    ghost.style.position = 'absolute';
                    ghost.classList.add('correct-anim');
                    // Sync rotation
                    // el has class arrow-X which sets rotation. ghost has same class.
                    this.targetArrowEl.parentElement.appendChild(ghost);

                    setTimeout(() => ghost.remove(), 500);
                } else {
                    el.classList.add('wrong-anim');
                }
            }

            gameLoop(timestamp) {
                if (!this.isPlaying) return;

                const dt = timestamp - this.lastFrameTime;
                this.lastFrameTime = timestamp;

                this.currentTimer -= dt;

                // Update Timer UI
                const pct = Math.max(0, (this.currentTimer / this.timeLimit) * 100);
                this.timerBarEl.style.width = \`\${pct}%\`;

                // Color shift based on urgency
                if (pct < 30) {
                    this.timerBarEl.style.background = 'var(--error-color)';
                    this.timerBarEl.style.boxShadow = '0 0 10px var(--error-color)';
                } else if (pct < 60) {
                    this.timerBarEl.style.background = '#ffd000'; // Yellowish
                    this.timerBarEl.style.boxShadow = '0 0 10px #ffd000';
                } else {
                    this.timerBarEl.style.background = 'var(--primary-color)';
                    this.timerBarEl.style.boxShadow = '0 0 10px var(--primary-color)';
                }

                if (this.currentTimer <= 0) {
                    this.gameOver();
                } else {
                    requestAnimationFrame((t) => this.gameLoop(t));
                }
            }

            updateScore() {
                this.scoreEl.textContent = this.score;
                const container = document.querySelector('.score-container');
                container.classList.remove('score-change');
                void container.offsetWidth; // trigger reflow
                container.classList.add('score-change');
            }

            gameOver() {
                this.isPlaying = false;
                this.finalScoreEl.textContent = this.score;
                this.gameOverScreen.classList.add('visible');
            }
        }

        // Init Game when DOM Ready
        window.addEventListener('DOMContentLoaded', () => {
            new ArrowGame();
        });

    </script>
</body>

</html>`;

                const id = 'default_arrow_reflex';
                const fileName = `${id}.html`;
                const dir = getGamesDir();
                if (dir) {
                    const destUri = dir + fileName;
                    await FileSystem.writeAsStringAsync(destUri, gameContent);

                    // Fetch latest games
                    const currentGames = await this.getGames();
                    const newGame: GameModel = {
                        id,
                        name: arrowReflexName,
                        uri: destUri,
                        dateAdded: Date.now(),
                    };
                    const updatedGames = [...currentGames, newGame];
                    await AsyncStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(updatedGames));
                }
            } catch (e) {
                console.error('Failed to seed default games (Arrow Reflex)', e);
            }
        }

        // Seed Math Reaction
        const mathReactionName = 'Math Reaction';
        if (!games.some(g => g.name === mathReactionName)) {
            try {
                const gameContent = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Math Reaction</title>
    <style>
        :root {
            --primary: #6366f1;
            --accent: #ec4899;
            --bg-start: #0f172a;
            --bg-end: #1e293b;
            --text: #f8fafc;
            --success: #22c55e;
            --error: #ef4444;
        }

        * {
            box-sizing: border-box;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            margin: 0;
            padding: 0;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, var(--bg-start), var(--bg-end));
            color: var(--text);
            display: flex;
            flex-direction: column;
        }

        /* HUD */
        .hud {
            padding: 20px;
            display: flex;
            justify-content: space-between;
            font-size: 1.2rem;
            font-weight: 600;
            position: relative;
            z-index: 10;
        }

        .score-box {
            background: rgba(255, 255, 255, 0.1);
            padding: 8px 16px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            margin-top: 40px;
            /* Safe area */
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        /* Timer Bar */
        .timer-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
        }

        .timer-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--primary), var(--accent));
            width: 100%;
            transform-origin: left;
            transition: width 0.1s linear;
        }

        /* Main Game Area */
        .game-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
        }

        .equation {
            font-size: 5rem;
            font-weight: 800;
            text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            margin-bottom: 2rem;
            opacity: 0;
            transform: scale(0.8);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .equation.active {
            opacity: 1;
            transform: scale(1);
        }

        /* Buttons Container */
        .options-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            padding: 20px;
            width: 100%;
            height: 250px;
            /* Fixed height for consistent tap area */
            margin-bottom: 40px;
            /* Bottom safe area */
        }

        .btn-option {
            background: rgba(255, 255, 255, 0.08);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            color: white;
            font-size: 2.5rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.1s ease;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            overflow: hidden;
        }

        .btn-option:active {
            transform: scale(0.95);
            background: rgba(255, 255, 255, 0.15);
        }

        /* Feedback Effects */
        .btn-option.correct {
            background: var(--success);
            border-color: var(--success);
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.4);
        }

        .btn-option.wrong {
            background: var(--error);
            border-color: var(--error);
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);
            animation: shake 0.4s cubic-bezier(.36, .07, .19, .97) both;
        }

        @keyframes shake {

            10%,
            90% {
                transform: translate3d(-1px, 0, 0);
            }

            20%,
            80% {
                transform: translate3d(2px, 0, 0);
            }

            30%,
            50%,
            70% {
                transform: translate3d(-4px, 0, 0);
            }

            40%,
            60% {
                transform: translate3d(4px, 0, 0);
            }
        }

        /* Start / Game Over Screen */
        .overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(20px);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 50;
            text-align: center;
            transition: opacity 0.3s ease;
        }

        .overlay.hidden {
            opacity: 0;
            pointer-events: none;
        }

        .title {
            font-size: 3rem;
            font-weight: 900;
            margin-bottom: 0.5rem;
            background: linear-gradient(to right, #6366f1, #ec4899);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            font-size: 1.1rem;
            color: #94a3b8;
            margin-bottom: 3rem;
            max-width: 80%;
            line-height: 1.5;
        }

        .stat-result {
            margin-bottom: 2rem;
            display: flex;
            gap: 2rem;
        }

        .stat-item {
            display: flex;
            flex-direction: column;
        }

        .stat-label {
            font-size: 0.8rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .stat-value {
            font-size: 2rem;
            font-weight: 700;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            color: white;
            border: none;
            padding: 16px 48px;
            font-size: 1.25rem;
            font-weight: 700;
            border-radius: 50px;
            cursor: pointer;
            box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .btn-primary:active {
            transform: scale(0.95);
        }

        /* Particle Effects */
        .particle {
            position: absolute;
            pointer-events: none;
            animation: pop 0.6s ease-out forwards;
        }

        @keyframes pop {
            0% {
                transform: scale(0) translate(0, 0);
                opacity: 1;
            }

            100% {
                transform: scale(1.5) translate(var(--dx), var(--dy));
                opacity: 0;
            }
        }
    </style>
</head>

<body>

    <div class="timer-container">
        <div class="timer-bar" id="timerBar"></div>
    </div>

    <div class="hud">
        <div class="score-box">Score: <span id="score">0</span></div>
        <div class="score-box" style="display: none;" id="avgTimeBox">0ms</div>
    </div>

    <div class="game-area">
        <div class="equation" id="equation">2 + 2</div>
    </div>

    <div class="options-grid">
        <div class="btn-option" id="btnLeft" onclick="handleInput(0)">4</div>
        <div class="btn-option" id="btnRight" onclick="handleInput(1)">5</div>
    </div>

    <!-- Start / End Screen -->
    <div class="overlay" id="overlay">
        <h1 class="title" id="overlayTitle">Math Reaction</h1>
        <p class="subtitle" id="overlaySubtitle">Tap the correct answer as fast as you can!<br>Don't run out of time.
        </p>

        <div class="stat-result" id="results" style="display: none;">
            <div class="stat-item">
                <span class="stat-label">Score</span>
                <span class="stat-value" id="finalScore">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Avg Time</span>
                <span class="stat-value" id="finalTime">0ms</span>
            </div>
        </div>

        <button class="btn-primary" onclick="startGame()" id="actionBtn">PLAY NOW</button>
    </div>

    <script>
        const state = {
            isPlaying: false,
            score: 0,
            questionStartTime: 0,
            totalResponseTime: 0,
            correctCount: 0,
            timer: null,
            maxTime: 3000, // Starting MS per question
            currentTime: 3000,
            currentCorrectIndex: 0 // 0 for Left, 1 for Right
        };

        const els = {
            score: document.getElementById('score'),
            equation: document.getElementById('equation'),
            btnLeft: document.getElementById('btnLeft'),
            btnRight: document.getElementById('btnRight'),
            timerBar: document.getElementById('timerBar'),
            overlay: document.getElementById('overlay'),
            overlayTitle: document.getElementById('overlayTitle'),
            overlaySubtitle: document.getElementById('overlaySubtitle'),
            results: document.getElementById('results'),
            finalScore: document.getElementById('finalScore'),
            finalTime: document.getElementById('finalTime'),
            actionBtn: document.getElementById('actionBtn'),
            avgTimeBox: document.getElementById('avgTimeBox')
        };

        // Core Game Logic
        function startGame() {
            state.isPlaying = true;
            state.score = 0;
            state.totalResponseTime = 0;
            state.correctCount = 0;
            state.maxTime = 3000;

            els.score.textContent = '0';
            els.overlay.classList.add('hidden');
            els.results.style.display = 'none';
            els.avgTimeBox.style.display = 'none';

            nextLevel();
        }

        function nextLevel() {
            if (!state.isPlaying) return;

            // Generate numbers based on difficulty (score)
            // Difficulty curve: 
            // 0-10: Add/Sub, single/double digits
            // 10-20: Add/Sub/Mul, simple
            // 20+: Faster

            const diff = Math.min(Math.floor(state.score / 5), 5); // 0 to 5
            generateEquation(diff);

            // Render UI
            els.equation.classList.remove('active');

            // Micro delay for animation
            setTimeout(() => {
                els.equation.classList.add('active');
            }, 50);

            // Reset Timer
            state.maxTime = Math.max(1000, 3000 - (state.score * 50)); // Speed up
            state.currentTime = state.maxTime;
            state.questionStartTime = Date.now();

            if (state.timer) cancelAnimationFrame(state.timer);
            gameLoop();
        }

        function generateEquation(difficulty) {
            let a, b, op, ans;
            const ops = ['+', '-'];
            if (difficulty > 1) ops.push('×');

            op = ops[Math.floor(Math.random() * ops.length)];

            if (op === '×') {
                a = Math.floor(Math.random() * (4 + difficulty)) + 2;
                b = Math.floor(Math.random() * (4 + difficulty)) + 2;
                ans = a * b;
            } else {
                a = Math.floor(Math.random() * (10 + difficulty * 5)) + 1;
                b = Math.floor(Math.random() * (10 + difficulty * 5)) + 1;

                if (op === '-') {
                    // Ensure positive result for simplicity or allow negative? Let's keep it simple -> positive only for speed
                    if (a < b) [a, b] = [b, a];
                    ans = a - b;
                } else {
                    ans = a + b;
                }
            }

            els.equation.textContent = \`\${a} \${op} \${b}\`;

            // Answers
            state.currentCorrectIndex = Math.random() < 0.5 ? 0 : 1;

            // Generate wrong answer close to real one
            let fake;
            do {
                const offset = Math.floor(Math.random() * 5) + 1;
                fake = Math.random() < 0.5 ? ans + offset : ans - offset;
            } while (fake === ans || fake < 0);

            if (state.currentCorrectIndex === 0) {
                els.btnLeft.textContent = ans;
                els.btnRight.textContent = fake;
            } else {
                els.btnLeft.textContent = fake;
                els.btnRight.textContent = ans;
            }
        }

        function gameLoop() {
            if (!state.isPlaying) return;

            const now = Date.now();
            const elapsed = now - state.questionStartTime;
            state.currentTime = state.maxTime - elapsed;

            const pct = Math.max(0, (state.currentTime / state.maxTime) * 100);
            els.timerBar.style.width = \`\${pct}%\`;

            if (state.currentTime <= 0) {
                gameOver("Time's Up!");
            } else {
                state.timer = requestAnimationFrame(gameLoop);
            }
        }

        function handleInput(index) {
            if (!state.isPlaying) return;

            const isCorrect = index === state.currentCorrectIndex;
            const btn = index === 0 ? els.btnLeft : els.btnRight;

            if (isCorrect) {
                // Feedback
                btn.classList.add('correct');
                setTimeout(() => btn.classList.remove('correct'), 150);

                // Stats
                const reaction = Date.now() - state.questionStartTime;
                state.totalResponseTime += reaction;
                state.correctCount++;
                state.score++;
                els.score.textContent = state.score;

                // Update Avg Score display occasionally? No, keep HUD clean.

                // Effect
                createParticles(btn);

                nextLevel();
            } else {
                btn.classList.add('wrong');
                setTimeout(() => btn.classList.remove('wrong'), 300);
                gameOver("Wrong Answer!");
            }
        }

        function gameOver(reason) {
            state.isPlaying = false;
            cancelAnimationFrame(state.timer);

            const avg = state.correctCount > 0
                ? Math.round(state.totalResponseTime / state.correctCount)
                : 0;

            els.overlayTitle.textContent = "GAME OVER";
            els.overlaySubtitle.textContent = reason;
            els.finalScore.textContent = state.score;
            els.finalTime.textContent = \`\${avg}ms\`;

            els.results.style.display = 'flex';
            els.actionBtn.textContent = "TRY AGAIN";
            els.overlay.classList.remove('hidden');
        }

        // Particle System
        function createParticles(element) {
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            for (let i = 0; i < 8; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.left = centerX + 'px';
                p.style.top = centerY + 'px';
                p.style.width = Math.random() * 8 + 4 + 'px';
                p.style.height = p.style.width;
                p.style.background = \`hsl(\${Math.random() * 50 + 120}, 100%, 50%)\`; // Greens
                p.style.borderRadius = '50%';

                const angle = Math.random() * Math.PI * 2;
                const vel = Math.random() * 100 + 50;

                p.style.setProperty('--dx', Math.cos(angle) * vel + 'px');
                p.style.setProperty('--dy', Math.sin(angle) * vel + 'px');

                document.body.appendChild(p);
                setTimeout(() => p.remove(), 600);
            }
        }

    </script>
</body>

</html>`;

                const id = 'default_math_reaction';
                const fileName = `${id}.html`;
                const dir = getGamesDir();
                if (dir) {
                    const destUri = dir + fileName;
                    await FileSystem.writeAsStringAsync(destUri, gameContent);

                    const currentGames = await this.getGames();
                    const newGame: GameModel = {
                        id,
                        name: mathReactionName,
                        uri: destUri,
                        dateAdded: Date.now(),
                    };
                    const updatedGames = [...currentGames, newGame];
                    await AsyncStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(updatedGames));
                }
            } catch (e) {
                console.error('Failed to seed default games (Math Reaction)', e);
            }
        }

        // Seed Stacker
        const stackerName = 'Stacker';
        if (!games.some(g => g.name === stackerName)) {
            try {
                const gameContent = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Stacker</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;700&display=swap');

        body {
            margin: 0;
            overflow: hidden;
            background-color: #050510;
            font-family: 'Outfit', sans-serif;
            touch-action: none;
            /* Prevent swipe/drag */
        }

        canvas {
            display: block;
        }

        #ui {
            position: absolute;
            top: 10%;
            width: 100%;
            text-align: center;
            pointer-events: none;
            color: white;
            transition: opacity 0.3s;
        }

        #score {
            font-size: 4rem;
            font-weight: 700;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
        }

        #message {
            font-size: 1.5rem;
            opacity: 0.8;
            margin-top: 10px;
        }

        #start-screen,
        #game-over-screen {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: rgba(5, 5, 16, 0.8);
            backdrop-filter: blur(5px);
            z-index: 10;
            transition: opacity 0.5s;
        }

        .hidden {
            opacity: 0;
            pointer-events: none;
        }

        h1 {
            font-size: 3rem;
            color: #fff;
            margin-bottom: 0.5rem;
            text-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
        }

        p {
            color: #ccc;
            margin-bottom: 2rem;
        }

        button {
            padding: 15px 40px;
            font-size: 1.2rem;
            border: none;
            border-radius: 30px;
            background: linear-gradient(45deg, #00f260, #0575e6);
            color: white;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 5px 20px rgba(0, 242, 96, 0.4);
            transition: transform 0.1s;
        }

        button:active {
            transform: scale(0.95);
        }
    </style>
</head>

<body>

    <div id="ui">
        <div id="score">0</div>
    </div>

    <div id="start-screen">
        <h1>STACKER</h1>
        <p>Tap to stack. Align perfectly.</p>
        <button id="start-btn">PLAY</button>
    </div>

    <div id="game-over-screen" class="hidden">
        <h1>GAME OVER</h1>
        <p id="final-score">Score: 0</p>
        <button id="restart-btn">RETRY</button>
    </div>

    <canvas id="gameCanvas"></canvas>

    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreEl = document.getElementById('score');
        const startScreen = document.getElementById('start-screen');
        const gameOverScreen = document.getElementById('game-over-screen');
        const finalScoreEl = document.getElementById('final-score');
        const startBtn = document.getElementById('start-btn');
        const restartBtn = document.getElementById('restart-btn');

        let width, height;
        let animationId;
        let lastTime = 0;

        // Game Configuration
        const INITIAL_BAR_WIDTH = 250;
        const BAR_HEIGHT = 40;
        const INITIAL_SPEED = 5; // Pixels per frame roughly, but will be time-based
        const SPEED_INCREMENT = 0.2;

        // Game State
        let state = 'MENU'; // MENU, PLAYING, GAMEOVER
        let score = 0;
        let stack = [];
        let currentBar = null;
        let cameraY = 0;
        let targetCameraY = 0;
        let hue = 0;

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;

            // Re-render if paused/menu
            if (state !== 'PLAYING') {
                draw();
            }
        }
        window.addEventListener('resize', resize);
        resize();

        class Bar {
            constructor(x, y, w, h, colorHue, moving = false, speed = 0) {
                this.x = x;
                this.y = y;
                this.w = w;
                this.h = h;
                this.colorHue = colorHue;
                this.moving = moving;
                this.speed = speed;
                this.direction = 1; // 1 for right, -1 for left
            }

            update(dt) {
                if (!this.moving) return;

                // Simple harmonic motion or bouncing logic? 
                // Let's use bouncing for classic stacker feel.
                this.x += this.speed * this.direction * (dt / 16); // Normalize to ~60fps

                if (this.x + this.w > width) {
                    this.x = width - this.w;
                    this.direction = -1;
                } else if (this.x < 0) {
                    this.x = 0;
                    this.direction = 1;
                }
            }

            draw(ctx) {
                ctx.fillStyle = \`hsl(\${this.colorHue}, 80%, 60%)\`;
                ctx.shadowColor = \`hsl(\${this.colorHue}, 80%, 60%)\`;
                ctx.shadowBlur = 20;
                ctx.fillRect(this.x, this.y, this.w, this.h);

                // Reset shadow for performance if needed, but looks cool
                ctx.shadowBlur = 0;

                // Top highlight for 3D-ish effect
                ctx.fillStyle = \`rgba(255, 255, 255, 0.2)\`;
                ctx.fillRect(this.x, this.y, this.w, this.h * 0.2);
            }
        }

        function initGame() {
            score = 0;
            stack = [];
            scoreEl.innerText = score;
            hue = Math.random() * 360;

            // Initial base
            const baseBar = new Bar(
                width / 2 - INITIAL_BAR_WIDTH / 2,
                height - 100,
                INITIAL_BAR_WIDTH,
                BAR_HEIGHT,
                hue,
                false
            );
            stack.push(baseBar);

            spawnNextBar();

            cameraY = 0;
            targetCameraY = 0;
            state = 'PLAYING';

            startScreen.classList.add('hidden');
            gameOverScreen.classList.add('hidden');

            if (animationId) cancelAnimationFrame(animationId);
            lastTime = performance.now();
            loop(lastTime);
        }

        function spawnNextBar() {
            const prevBar = stack[stack.length - 1];
            const y = prevBar.y - BAR_HEIGHT;
            hue = (hue + 15) % 360;

            // New bar starts from random side
            let startX = -prevBar.w;
            let dir = 1;
            if (Math.random() > 0.5) {
                startX = width;
                dir = -1;
            }

            const speed = INITIAL_SPEED + (score * SPEED_INCREMENT);

            currentBar = new Bar(
                startX,
                y,
                prevBar.w, // Inherit width
                BAR_HEIGHT,
                hue,
                true,
                speed
            );

            // Override calculated startX with actual bounds for bouncing logic init
            if (dir === 1) currentBar.x = 0;
            else currentBar.x = width - currentBar.w;

            currentBar.direction = dir;
        }

        function placeBar() {
            if (state !== 'PLAYING') return;

            const prevBar = stack[stack.length - 1];

            // Calculate overlap
            const dist = currentBar.x - prevBar.x;
            const overlap = prevBar.w - Math.abs(dist);

            if (overlap > 0) {
                // Success
                score++;
                scoreEl.innerText = score;

                // Crop
                let newX = currentBar.x;
                let newW = overlap;

                if (dist > 0) {
                    // Current is to the right of prev
                    // x is as is, width reduced
                } else {
                    // Current is to the left
                    newX = prevBar.x;
                }

                // Create debris (optional visual polish)
                // createDebris(currentBar.x, currentBar.y, currentBar.w, dist);

                // Update current bar to be static and stacked
                const landedBar = new Bar(
                    newX,
                    currentBar.y,
                    newW,
                    BAR_HEIGHT,
                    currentBar.colorHue,
                    false
                );

                stack.push(landedBar);

                // Move Camera
                if (score > 3) {
                    targetCameraY += BAR_HEIGHT;
                }

                spawnNextBar();

            } else {
                gameOver();
            }
        }

        function gameOver() {
            state = 'GAMEOVER';
            finalScoreEl.innerText = \`Score: \${score}\`;
            gameOverScreen.classList.remove('hidden');
        }

        function update(dt) {
            if (state !== 'PLAYING') return;

            currentBar.update(dt);

            // Camera smoothing
            cameraY += (targetCameraY - cameraY) * 0.1;
        }

        function draw() {
            // Background
            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, width, height);

            ctx.save();
            // Apply camera transform
            ctx.translate(0, cameraY);

            // Draw stack
            stack.forEach(bar => bar.draw(ctx));

            // Draw current
            if (currentBar && state === 'PLAYING') {
                currentBar.draw(ctx);
            }

            ctx.restore();
        }

        function loop(timestamp) {
            if (state !== 'PLAYING' && state !== 'MENU') return; // Allow menu to run if we want animations there

            const dt = timestamp - lastTime;
            lastTime = timestamp;

            update(dt);
            draw();

            animationId = requestAnimationFrame(loop);
        }

        // Input Handling
        function handleInput(e) {
            if (e.target.tagName === 'BUTTON') return; // Let buttons work
            e.preventDefault(); // Stop double firing on some devices

            if (state === 'PLAYING') {
                placeBar();
            }
        }

        window.addEventListener('mousedown', handleInput);
        window.addEventListener('touchstart', handleInput, { passive: false });
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && state === 'PLAYING') {
                placeBar();
            }
        });

        startBtn.addEventListener('click', () => {
            initGame();
        });

        restartBtn.addEventListener('click', () => {
            initGame();
        });

        // Initial Draw
        draw();

    </script>
</body>

</html>`;

                const id = 'default_stacker';
                const fileName = `${id}.html`;
                const dir = getGamesDir();
                if (dir) {
                    const destUri = dir + fileName;
                    await FileSystem.writeAsStringAsync(destUri, gameContent);

                    const currentGames = await this.getGames();
                    const newGame: GameModel = {
                        id,
                        name: stackerName,
                        uri: destUri,
                        dateAdded: Date.now(),
                    };
                    const updatedGames = [...currentGames, newGame];
                    await AsyncStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(updatedGames));
                }
            } catch (e) {
                console.error('Failed to seed default games (Stacker)', e);
            }
        }
    }
};
