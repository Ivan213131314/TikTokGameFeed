import { StyleSheet, Text, View, TouchableOpacity, FlatList, SafeAreaView, RefreshControl, Alert, Image, Modal, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../../src/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { GameModel } from '../../src/types/GameModel';
import { GameStorageService } from '../../src/services/GameStorageService';
import { AVATAR_ASSETS, getAvatarSource } from '../../src/constants/Avatars';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import Auth from '../../src/components/Auth';

import { GAME_ICONS } from '../../assets/game-icons';

const getIconIndex = (id: string, count: number) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash) % count;
};

export default function ProfileScreen() {
    const [session, setSession] = useState<Session | null>(null);
    const [games, setGames] = useState<GameModel[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadGames = async () => {
        if (!session?.user) return;
        const loadedGames = await GameStorageService.getUserGames(session.user.id);
        setGames(loadedGames);

        const profile = await GameStorageService.getUserProfile(session.user.id);
        if (profile?.avatar_url) {
            setAvatarUrl(profile.avatar_url);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (session) {
                loadGames();
            }
        }, [session])
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

    const handleAvatarPress = () => {
        setModalVisible(true);
    };

    const selectAvatar = async (key: string) => {
        if (!session?.user) return;

        const newAvatarUrl = `asset:${key}`;
        setAvatarUrl(newAvatarUrl); // Optimistic update
        setModalVisible(false);

        try {
            await GameStorageService.updateUserProfile(session.user.id, { avatar_url: newAvatarUrl });
        } catch (e) {
            console.error("Failed to update profile", e);
            Alert.alert("Error", "Failed to save avatar");
        }
    };

    const deleteGame = async (id: string) => {
        Alert.alert(
            "Delete Game",
            "Are you sure you want to delete this game? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await GameStorageService.deleteGame(id);
                        await loadGames();
                    }
                }
            ]
        );
    };

    if (!session) {
        return <Auth />;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleAvatarPress} style={styles.avatarWrapper}>
                    {avatarUrl ? (
                        <Image source={getAvatarSource(avatarUrl)} style={styles.avatarImage} />
                    ) : (
                        <Ionicons name="person-circle-outline" size={80} color={Colors.text} />
                    )}
                    <View style={styles.redKeyContainer}>
                        <Ionicons name="key" size={12} color="white" />
                    </View>
                </TouchableOpacity>
                <Text style={styles.username}>{session.user.email?.split('@')[0]}</Text>
                <Text style={styles.stats}>{games.length} Games • 0 Likes</Text>
                <TouchableOpacity style={styles.signOutBtn} onPress={() => supabase.auth.signOut()}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
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
                                    <Image
                                        source={GAME_ICONS[getIconIndex(item.id, GAME_ICONS.length)]}
                                        style={styles.gameIconImage}
                                    />
                                </View>
                                <View style={styles.gameInfo}>
                                    <Text style={styles.gameName}>{item.name.replace(/\.html$/i, '')}</Text>
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

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Choose Avatar</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.avatarGrid} showsVerticalScrollIndicator={false}>
                            {Object.keys(AVATAR_ASSETS).map((key) => (
                                <TouchableOpacity key={key} onPress={() => selectAvatar(key)} style={styles.avatarGridItem}>
                                    <Image source={AVATAR_ASSETS[key]} style={styles.gridAvatarImage} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    signOutBtn: {
        marginTop: 15,
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: Colors.textSecondary,
    },
    signOutText: {
        color: Colors.textSecondary,
        fontSize: 12,
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
        backgroundColor: 'transparent',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    gameIconImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
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
    avatarWrapper: {
        position: 'relative',
        width: 80,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    redKeyContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FE2C55', // TikTok Red
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.background,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1E1E1E',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '60%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    avatarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    avatarGridItem: {
        width: '23%',
        aspectRatio: 1,
        marginBottom: 15,
    },
    gridAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    }
});
