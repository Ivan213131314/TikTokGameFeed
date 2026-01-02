import { supabase } from '../../lib/supabase';
import { GameModel } from '../types/GameModel';

export const GameStorageService = {
    async initialize() {
        // No-op for Supabase
    },

    async getGames(): Promise<GameModel[]> {
        const { data, error } = await supabase
            .from('games')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Limit to 50 for now for the feed

        if (error) {
            console.error('Error fetching games:', error);
            return [];
        }

        return data.map((game: any) => ({
            id: game.id,
            name: game.title,
            html_content: game.html_content,
            dateAdded: new Date(game.created_at).getTime(),
            user_id: game.user_id,
        }));
    },

    async getUserGames(userId: string): Promise<GameModel[]> {
        const { data, error } = await supabase
            .from('games')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching user games:', error);
            return [];
        }

        return data.map((game: any) => ({
            id: game.id,
            name: game.title,
            html_content: game.html_content,
            dateAdded: new Date(game.created_at).getTime(),
            user_id: game.user_id,
        }));
    },

    async addGame(name: string, sourceUri: string): Promise<GameModel> {
        // Read file content first
        // Since we are in Expo, we might need to read the file string to upload.
        // However, for web compat or simplicity, if we have the content string, we upload it.
        // If we only have URI, we need to read it.
        // On native, use Expo FileSystem to read.

        // Dynamic import to avoid issues if used on Web without expo-file-system
        let htmlContent = '';
        try {
            const FileSystem = require('expo-file-system/legacy');
            htmlContent = await FileSystem.readAsStringAsync(sourceUri);
        } catch (e) {
            console.error("Could not read file for upload:", e);
            throw new Error("Failed to read game file");
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data, error } = await supabase
            .from('games')
            .insert({
                user_id: user.id,
                title: name,
                html_content: htmlContent,
                description: 'Uploaded via app',
            })
            .select()
            .single();

        if (error) {
            console.error("Error uploading game:", error);
            throw error;
        }

        return {
            id: data.id,
            name: data.title,
            html_content: data.html_content,
            dateAdded: new Date(data.created_at).getTime(),
            user_id: data.user_id,
        };
    },

    async deleteGame(id: string): Promise<void> {
        const { error } = await supabase
            .from('games')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting game:", error);
        }
    },

    async seedDefaultGames(): Promise<void> {
        // Check if default games exist (using a known title or ID preference) or just skip.
        // Ideally, we want some public games for everyone.
        // Since RLS allows reading all games, we just need to ensure *some* games exist.
        // We can check if the feed is empty.

        const games = await this.getGames();
        if (games.length > 0) return;

        // If no games, we can't easily "upload" one without a signed-in user.
        // So we might skip seeding or require the user to be signed in to seed.

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // Cannot seed if not logged in

        const defaultGameContent = `<!DOCTYPE html>
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

        await supabase
            .from('games')
            .insert({
                user_id: user.id,
                title: 'Falling Square',
                html_content: defaultGameContent,
                description: 'Classic falling blocks game',
            });
    },

    async toggleLike(gameId: string): Promise<boolean> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to like");

        // Check if already liked
        const { data: existingLike } = await supabase
            .from('likes')
            .select('id')
            .eq('game_id', gameId)
            .eq('user_id', user.id)
            .single();

        if (existingLike) {
            // Unlike
            await supabase.from('likes').delete().eq('id', existingLike.id);
            return false;
        } else {
            // Like
            await supabase.from('likes').insert({ game_id: gameId, user_id: user.id });
            return true;
        }
    },

    async getGameStats(gameId: string): Promise<import('../types/SocialModels').GameStats> {
        const { count: likesCount } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .eq('game_id', gameId);

        const { count: commentsCount } = await supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('game_id', gameId);

        let isLiked = false;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('likes')
                .select('id')
                .eq('game_id', gameId)
                .eq('user_id', user.id)
                .maybeSingle(); // Use maybeSingle to avoid 406 error if not found
            isLiked = !!data;
        }

        return {
            likesCount: likesCount || 0,
            commentsCount: commentsCount || 0,
            isLiked
        };
    },

    async getComments(gameId: string): Promise<import('../types/SocialModels').CommentModel[]> {
        const { data, error } = await supabase
            .from('comments')
            .select(`
                *,
                profiles:user_id (username, avatar_url)
            `)
            .eq('game_id', gameId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            return [];
        }

        return data.map((c: any) => ({
            id: c.id,
            game_id: c.game_id,
            user_id: c.user_id,
            content: c.content,
            created_at: new Date(c.created_at).getTime(),
            user: c.profiles ? {
                username: c.profiles.username || 'Unknown',
                avatar_url: c.profiles.avatar_url
            } : undefined
        }));
    },

    async addComment(gameId: string, content: string): Promise<import('../types/SocialModels').CommentModel> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Must be logged in to comment");

        const { data, error } = await supabase
            .from('comments')
            .insert({
                game_id: gameId,
                user_id: user.id,
                content: content
            })
            .select(`
                *,
                profiles:user_id (username, avatar_url)
            `) // Select with profile to return complete model
            .single();

        if (error) throw error;

        return {
            id: data.id,
            game_id: data.game_id,
            user_id: data.user_id,
            content: data.content,
            created_at: new Date(data.created_at).getTime(),
            user: data.profiles ? {
                username: data.profiles.username || 'Unknown',
                avatar_url: data.profiles.avatar_url
            } : undefined
        };
    },

    async getUserProfile(userId: string): Promise<import('../types/SocialModels').ProfileModel | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) return null;

        return {
            id: data.id,
            username: data.username,
            avatar_url: data.avatar_url,
            created_at: new Date(data.created_at).getTime()
        };
    },

    async uploadAvatar(userId: string, imageUri: string): Promise<string | null> {
        try {
            // Use expo-file-system to read as base64
            const FileSystem = require('expo-file-system');
            const { decode } = require('../utils/fileUtils');

            const base64 = await FileSystem.readAsStringAsync(imageUri, {
                encoding: 'base64',
            });
            const arrayBuffer = decode(base64);

            // Determine file extension
            const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${userId}_${Date.now()}.${ext}`;
            const filePath = `${fileName}`;
            const contentType = `image/${ext === 'png' ? 'png' : 'jpeg'}`;

            // Upload blob/buffer
            const { data, error } = await supabase.storage
                .from('avatars')
                .upload(filePath, arrayBuffer, {
                    contentType,
                    upsert: true
                });

            if (error) {
                console.error("Error uploading avatar:", error);
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (e) {
            console.error("Avatar upload failed:", e);
            return null;
        }
    },

    async updateUserProfile(userId: string, updates: { avatar_url?: string }): Promise<void> {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    }
};
