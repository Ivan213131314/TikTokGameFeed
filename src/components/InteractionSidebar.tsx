import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameModel } from '../types/GameModel';
import { GameStorageService } from '../services/GameStorageService';
import { GameStats } from '../types/SocialModels';
import { router } from 'expo-router';
import { getAvatarSource } from '../constants/Avatars';

// Simple global cache for avatars to avoid refetching too much (could be improved with TanStack Query)
const avatarCache: Record<string, string> = {};

interface InteractionSidebarProps {
    game: GameModel;
    onCommentPress: () => void;
}

export const InteractionSidebar: React.FC<InteractionSidebarProps> = ({ game, onCommentPress }) => {
    const [stats, setStats] = useState<GameStats>({ likesCount: 0, commentsCount: 0, isLiked: false });
    const [usersAvatar, setUsersAvatar] = useState<Record<string, string>>(avatarCache);

    useEffect(() => {
        loadStats();
        loadAvatar();
    }, [game.id]);

    const loadAvatar = async () => {
        if (!game.user_id) return;
        if (avatarCache[game.user_id]) {
            setUsersAvatar(prev => ({ ...prev, [game.user_id!]: avatarCache[game.user_id!] }));
            return;
        }

        const profile = await GameStorageService.getUserProfile(game.user_id);
        if (profile?.avatar_url) {
            avatarCache[game.user_id] = profile.avatar_url;
            setUsersAvatar(prev => ({ ...prev, [game.user_id!]: profile.avatar_url }));
        }
    };

    const loadStats = async () => {
        try {
            const data = await GameStorageService.getGameStats(game.id);
            setStats(data);
        } catch (e) {
            console.error("Failed to load stats", e);
        }
    };

    const handleLike = async () => {
        try {
            // Optimistic update
            const newIsLiked = !stats.isLiked;
            setStats(prev => ({
                ...prev,
                isLiked: newIsLiked,
                likesCount: newIsLiked ? prev.likesCount + 1 : prev.likesCount - 1
            }));

            const result = await GameStorageService.toggleLike(game.id);

            // Revert if result doesn't match (though toggleLike returns the new state, so we could just set it)
            if (result !== newIsLiked) {
                setStats(prev => ({
                    ...prev,
                    isLiked: result,
                    likesCount: result ? prev.likesCount + 1 : prev.likesCount - 1 // Logic might be slightly off if count drifted, but ok for now
                }));
                loadStats(); // Reload to be sure
            }
        } catch (e) {
            console.error("Like failed", e);
            loadStats(); // Revert on error
            alert("Please login to like games");
        }
    };

    const handleProfilePress = () => {
        router.push(`/user/${game.user_id}`);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.actionButton} onPress={handleProfilePress}>
                <View style={styles.avatarContainer}>
                    <Image
                        source={getAvatarSource(game.user_id && usersAvatar[game.user_id] ? usersAvatar[game.user_id] : 'https://placehold.co/100x100/png')}
                        style={styles.avatar}
                    />
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                <Ionicons
                    name={stats.isLiked ? "heart" : "heart-outline"}
                    size={28}
                    color={stats.isLiked ? "#FE2C55" : "rgba(255, 255, 255, 0.6)"}
                />
                <Text style={styles.actionText}>{stats.likesCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onCommentPress}>
                <Ionicons name="chatbubble-ellipses-outline" size={28} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.actionText}>{stats.commentsCount}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    actionButton: {
        alignItems: 'center',
        marginBottom: 15,
    },
    actionText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 5,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    avatarContainer: {
        marginBottom: 10,
        position: 'relative',
    },
    avatar: {
        width: 45,
        height: 45,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'white',
    },
});
