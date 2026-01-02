import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { GameStorageService } from '../../src/services/GameStorageService';
import { ProfileModel } from '../../src/types/SocialModels';
import { GameModel } from '../../src/types/GameModel';
import { Colors } from '../../src/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

import { getAvatarSource } from '../../src/constants/Avatars';
import { GAME_ICONS } from '../../assets/game-icons';

import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_WIDTH = width / COLUMN_COUNT;

const getIconIndex = (id: string, count: number) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash) % count;
};

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [profile, setProfile] = useState<ProfileModel | null>(null);
    const [games, setGames] = useState<GameModel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            loadProfile();
        }
    }, [id]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const [profileData, gamesData] = await Promise.all([
                GameStorageService.getUserProfile(id!),
                GameStorageService.getUserGames(id!)
            ]);
            setProfile(profileData);
            setGames(gamesData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const renderGameItem = ({ item }: { item: GameModel }) => {
        const iconKey = item.icon_asset_key;
        let iconSource;
        if (iconKey && iconKey.startsWith('game_icon_')) {
            const index = parseInt(iconKey.replace('game_icon_', ''), 10);
            if (!isNaN(index) && index >= 0 && index < GAME_ICONS.length) {
                iconSource = GAME_ICONS[index];
            }
        }

        if (!iconSource) {
            iconSource = GAME_ICONS[getIconIndex(item.id, GAME_ICONS.length)];
        }

        return (
            <TouchableOpacity
                style={styles.gameItem}
                onPress={() => {
                    router.push({
                        pathname: '/game-feed',
                        params: { userId: id, initialGameId: item.id }
                    });
                }}
            >
                <View style={styles.gridIconContainer}>
                    <Image
                        source={iconSource}
                        style={styles.gridIconImage}
                        contentFit="contain"
                    />
                    <View style={styles.gridOverlay} />
                    <Ionicons name="play" size={20} color="white" style={styles.playIcon} />
                </View>
                <Text style={styles.gameTitle} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: 'white' }}>Loading...</Text>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: 'white' }}>User not found</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: profile.username || 'Profile',
                headerStyle: { backgroundColor: 'black' },
                headerTintColor: 'white',
            }} />

            <View style={styles.header}>
                <Image
                    source={getAvatarSource(profile.avatar_url)}
                    style={styles.avatar}
                />
                <Text style={styles.username}>@{profile.username || 'User'}</Text>
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{games.length}</Text>
                        <Text style={styles.statLabel}>Games</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Likes</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            <FlatList
                data={games}
                keyExtractor={item => item.id}
                renderItem={renderGameItem}
                numColumns={COLUMN_COUNT}
                contentContainerStyle={styles.grid}
            />
        </SafeAreaView>
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
    header: {
        alignItems: 'center',
        padding: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#333',
    },
    username: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
    },
    stat: {
        alignItems: 'center',
    },
    statValue: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#888',
        fontSize: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginVertical: 10,
    },
    grid: {
        // padding: 2,
    },
    gameItem: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH * 1.3,
        padding: 1,
        // borderWidth: 1,
        // borderColor: 'black',
    },
    gameTitle: {
        position: 'absolute',
        bottom: 5,
        left: 5,
        color: 'white',
        fontSize: 10,
        textShadowColor: 'black',
        textShadowRadius: 2,
    },
    gridIconContainer: {
        flex: 1,
        backgroundColor: '#2A2A2A',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridIconImage: {
        width: '70%',
        height: '70%',
        resizeMode: 'contain',
    },
    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    playIcon: {
        position: 'absolute',
        opacity: 0.8,
    },
});
