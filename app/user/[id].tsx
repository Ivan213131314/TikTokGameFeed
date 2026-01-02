import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Dimensions, PanResponder } from 'react-native';
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
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [totalLikes, setTotalLikes] = useState(0);

    // Add PanResponder for back gesture
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => {
                const { dx, dy } = gestureState;
                // Capture if horizontal swipe is dominant and significant
                return Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy);
            },
            onPanResponderRelease: (_, gestureState) => {
                const { dx } = gestureState;
                if (dx < -50) { // Swipe Left (Finger moves right to left)
                    router.back();
                } else if (dx > 50) { // Standard iOS Back (Swipe Right)
                    router.back();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (id) {
            loadProfile();
        }
    }, [id]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const [profileData, gamesData, followingStatus, followers, following, likes] = await Promise.all([
                GameStorageService.getUserProfile(id!),
                GameStorageService.getUserGames(id!),
                GameStorageService.isFollowing(id!),
                GameStorageService.getFollowersCount(id!),
                GameStorageService.getFollowingCount(id!),
                GameStorageService.getUserTotalLikes(id!)
            ]);
            setProfile(profileData);
            setGames(gamesData);
            setIsFollowing(followingStatus);
            setFollowersCount(followers);
            setFollowingCount(following);
            setTotalLikes(likes);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async () => {
        try {
            const newStatus = await GameStorageService.toggleFollow(id!);
            setIsFollowing(newStatus);
            // Refresh counts
            const followers = await GameStorageService.getFollowersCount(id!);
            setFollowersCount(followers);
        } catch (e: any) {
            console.error(e);
            if (e.message?.includes("logged in")) {
                alert("Please log in to follow users");
            } else {
                alert(e.message || "Failed to follow");
            }
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
        <SafeAreaView style={styles.container} {...panResponder.panHandlers}>
            <Stack.Screen options={{
                headerShown: true,
                headerTitle: profile.username || 'Profile',
                headerStyle: { backgroundColor: 'black' },
                headerTintColor: 'white',
                headerLeft: () => (
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={{ marginLeft: 10 }}
                    >
                        <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                ),
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
                        <Text style={styles.statValue}>{totalLikes}</Text>
                        <Text style={styles.statLabel}>Likes</Text>
                    </View>
                    <View style={styles.stat}>
                        <Text style={styles.statValue}>{followersCount}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.followButton, isFollowing && styles.followingButton]}
                    onPress={handleFollow}
                >
                    <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                        {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                </TouchableOpacity>
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
        marginBottom: 15,
    },
    followButton: {
        backgroundColor: '#FE2C55', // TikTok Red
        paddingHorizontal: 40,
        paddingVertical: 10,
        borderRadius: 4,
        marginTop: 15,
    },
    followingButton: {
        backgroundColor: '#333',
    },
    followButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    followingButtonText: {
        color: '#eee',
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
