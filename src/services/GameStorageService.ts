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
    }
};
