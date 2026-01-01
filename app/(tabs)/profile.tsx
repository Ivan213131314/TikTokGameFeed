import { StyleSheet, Text, View, TouchableOpacity, FlatList, SafeAreaView, RefreshControl } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../../src/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { GameModel } from '../../src/types/GameModel';
import { GameStorageService } from '../../src/services/GameStorageService';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

export default function ProfileScreen() {
    const [games, setGames] = useState<GameModel[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadGames = async () => {
        const loadedGames = await GameStorageService.getGames();
        setGames(loadedGames);
    };

    useFocusEffect(
        useCallback(() => {
            loadGames();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadGames();
        setRefreshing(false);
    }, []);

    const uploadGame = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'text/html',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            if (result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                await GameStorageService.addGame(file.name, file.uri);
                await loadGames();
            }
        } catch (err) {
            console.error("Error picking file:", err);
        }
    };

    const deleteGame = async (id: string) => {
        await GameStorageService.deleteGame(id);
        await loadGames();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="person-circle-outline" size={80} color={Colors.text} />
                <Text style={styles.username}>@User</Text>
                <Text style={styles.stats}>{games.length} Games • 0 Likes</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.tabs}>
                    <View style={styles.activeTabContainer}>
                        <Text style={styles.activeTabText}>My Games</Text>
                    </View>
                    <TouchableOpacity style={styles.uploadBtnSmall} onPress={uploadGame}>
                        <Ionicons name="add" size={24} color={Colors.background} />
                    </TouchableOpacity>
                </View>

                {games.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="game-controller-outline" size={60} color={Colors.textSecondary} />
                        <Text style={styles.emptyText}>No games uploaded yet</Text>
                        <TouchableOpacity style={styles.uploadBtn} onPress={uploadGame}>
                            <Ionicons name="add" size={24} color={Colors.text} />
                            <Text style={styles.uploadBtnText}>Upload HTML5 Game</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={games}
                        keyExtractor={(item) => item.id}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.tint} />}
                        renderItem={({ item }) => (
                            <View style={styles.gameItem}>
                                <View style={styles.gameIcon}>
                                    <Ionicons name="code-slash" size={24} color={Colors.text} />
                                </View>
                                <View style={styles.gameInfo}>
                                    <Text style={styles.gameName}>{item.name}</Text>
                                    <Text style={styles.gameDate}>{new Date(item.dateAdded).toLocaleDateString()}</Text>
                                </View>
                                <TouchableOpacity onPress={() => deleteGame(item.id)}>
                                    <Ionicons name="trash-outline" size={20} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: 40,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    username: {
        color: Colors.text,
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 10,
    },
    stats: {
        color: Colors.textSecondary,
        fontSize: 14,
        marginTop: 5,
    },
    content: {
        flex: 1,
    },
    tabs: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    activeTabContainer: {
        borderBottomWidth: 2,
        borderBottomColor: Colors.tint,
        paddingBottom: 5,
    },
    activeTabText: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    uploadBtnSmall: {
        backgroundColor: Colors.tint,
        borderRadius: 20,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: Colors.textSecondary,
        marginTop: 10,
        marginBottom: 20,
    },
    uploadBtn: {
        flexDirection: 'row',
        backgroundColor: Colors.tint,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    uploadBtnText: {
        color: Colors.text,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    gameItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    gameIcon: {
        width: 40,
        height: 40,
        backgroundColor: '#333',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    gameInfo: {
        flex: 1,
    },
    gameName: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '500',
    },
    gameDate: {
        color: Colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
});
