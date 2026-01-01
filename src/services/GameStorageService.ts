import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameModel } from '../types/GameModel';

const GAMES_STORAGE_KEY = 'games_list';
const GAMES_DIR = (FileSystem.documentDirectory || '') + 'games/';

export const GameStorageService = {
    async initialize() {
        const dirInfo = await FileSystem.getInfoAsync(GAMES_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(GAMES_DIR, { intermediates: true });
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
        const destUri = GAMES_DIR + fileName;

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
    }
};
