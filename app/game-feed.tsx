import { View, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { GameModel } from '../src/types/GameModel';
import { GameStorageService } from '../src/services/GameStorageService';
import { GameFeedList } from '../src/components/GameFeedList';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/constants/Colors';

export default function UserGameFeedScreen() {
    const { userId, initialGameId } = useLocalSearchParams<{ userId: string, initialGameId: string }>();
    const router = useRouter();
    const [games, setGames] = useState<GameModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [initialIndex, setInitialIndex] = useState(0);

    const handleSwipeHorizontal = () => {
        router.back();
    };

    useEffect(() => {
        const loadUserGames = async () => {
            if (!userId) return;
            try {
                // Fetch games for the specific user
                const userGames = await GameStorageService.getUserGames(userId);

                let startIndex = 0;
                if (initialGameId) {
                    const index = userGames.findIndex(g => g.id === initialGameId);
                    if (index !== -1) {
                        startIndex = index;
                    }
                }

                // Set state in one go if possible, or order doesn't matter too much if we handle loading
                setGames(userGames);
                setInitialIndex(startIndex);
            } catch (error) {
                console.error("Failed to load user games", error);
            } finally {
                setLoading(false);
            }
        };
        loadUserGames();
    }, [userId, initialGameId]);

    const handleBack = () => {
        router.back();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.tint} />
            </View>
        );
    }

    if (games.length === 0) {
        return (
            <SafeAreaView style={styles.emptyContainer}>
                <Ionicons name="game-controller-outline" size={80} color={Colors.textSecondary} />
                <Text style={styles.emptyText}>No games found</Text>
                <TouchableOpacity style={styles.backButtonCenter} onPress={handleBack}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        )
    }

    return (
        <View style={styles.container}>
            {/* 
                Key fix: We pass the filtered user games list here. 
                GameFeedList will handle rendering them.
                We must ensure initialIndex is passed correctly.
            */}
            <GameFeedList
                games={games}
                initialIndex={initialIndex}
                onSwipeHorizontal={handleSwipeHorizontal}
            />

            <SafeAreaView style={styles.overlay}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        pointerEvents: 'box-none', // Allow touches to pass through except for button
    },
    backButton: {
        marginLeft: 16,
        marginTop: 10,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    emptyContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: 'white',
        fontSize: 18,
        marginVertical: 20,
    },
    backButtonCenter: {
        padding: 10,
        backgroundColor: Colors.tint,
        borderRadius: 8,
    },
    backButtonText: {
        color: 'black',
        fontWeight: 'bold',
    }
});
