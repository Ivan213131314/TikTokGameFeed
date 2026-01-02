import { StyleSheet, Text, View, TouchableOpacity, FlatList, SafeAreaView, RefreshControl, Alert, Modal, ScrollView, TextInput } from 'react-native';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../../src/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { GameModel } from '../../src/types/GameModel';
import { GameStorageService } from '../../src/services/GameStorageService';
import { AVATAR_ASSETS, getAvatarSource } from '../../src/constants/Avatars';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
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
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [games, setGames] = useState<GameModel[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // New Stats State
    const [totalLikes, setTotalLikes] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    // Game Interactions
    const [selectedGame, setSelectedGame] = useState<GameModel | null>(null);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);
    const [iconPickerVisible, setIconPickerVisible] = useState(false);

    // Following List State
    const [followingListVisible, setFollowingListVisible] = useState(false);
    const [followingList, setFollowingList] = useState<import('../../src/types/SocialModels').ProfileModel[]>([]);
    const [loadingFollowing, setLoadingFollowing] = useState(false);

    // Add Game Flow
    const [addGameModeVisible, setAddGameModeVisible] = useState(false);
    const [urlInputVisible, setUrlInputVisible] = useState(false);
    const [gameName, setGameName] = useState('');
    const [gameUrl, setGameUrl] = useState('');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadGames = async (forceRefresh = false) => {
        if (!session?.user) return;
        const loadedGames = await GameStorageService.getUserGames(session.user.id, forceRefresh);
        setGames(loadedGames);

        const profile = await GameStorageService.getUserProfile(session.user.id);
        if (profile?.avatar_url) {
            setAvatarUrl(profile.avatar_url);
        }

        // Load Stats (add basic caching or let them load fast from DB)
        // Since we added caching to them in service, they should be fast now.
        const likes = await GameStorageService.getUserTotalLikes(session.user.id);
        const followers = await GameStorageService.getFollowersCount(session.user.id);
        const following = await GameStorageService.getFollowingCount(session.user.id);

        setTotalLikes(likes);
        setFollowersCount(followers);
        setFollowingCount(following);
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
        await loadGames(true);
        setRefreshing(false);
    }, []);

    const handleAddPress = () => {
        setAddGameModeVisible(true);
    };

    const uploadGameFile = async () => {
        setAddGameModeVisible(false);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'text/html',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            if (result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                await GameStorageService.addGame(file.name, file.uri);
                await loadGames(true);
            }
        } catch (err) {
            console.error("Error picking file:", err);
        }
    };

    const handleAddExternalGame = async () => {
        if (!gameName || !gameUrl) {
            Alert.alert("Error", "Please fill name and URL");
            return;
        }

        try {
            await GameStorageService.addExternalGame(gameName, gameUrl);
            setUrlInputVisible(false);
            setGameName('');
            setGameUrl('');
            await loadGames(true);
        } catch (err) {
            console.error("Error adding external game:", err);
            Alert.alert("Error", "Failed to add game");
        }
    };

    const loadFollowingList = async () => {
        if (!session?.user) return;
        setLoadingFollowing(true);
        setFollowingListVisible(true);
        try {
            const list = await GameStorageService.getFollowing(session.user.id);
            setFollowingList(list);
        } catch (e) {
            console.error("Failed to load following list", e);
        } finally {
            setLoadingFollowing(false);
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

    const handleLongPress = (game: GameModel) => {
        setSelectedGame(game);
        setOptionsModalVisible(true);
    };

    const handleChangeIconRequest = () => {
        setOptionsModalVisible(false);
        setTimeout(() => setIconPickerVisible(true), 300); // Wait for close animation
    };

    const handleIconSelect = async (iconIndex: number) => {
        if (!selectedGame) return;

        // Optimistic update
        const updatedGames = games.map(g =>
            g.id === selectedGame.id ? { ...g, icon_asset_key: `game_icon_${iconIndex}` } : g
        );
        setGames(updatedGames);
        setIconPickerVisible(false);

        try {
            await GameStorageService.updateGame(selectedGame.id, { icon_asset_key: `game_icon_${iconIndex}` });
        } catch (e) {
            console.error("Failed to update game icon", e);
            Alert.alert("Error", "Failed to update icon");
            loadGames(); // Revert on error
        }
    };

    const handleDeleteRequest = () => {
        setOptionsModalVisible(false);
        if (!selectedGame) return;

        Alert.alert(
            "Delete Game",
            "Are you sure you want to delete this game? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await GameStorageService.deleteGame(selectedGame.id);
                        await loadGames(true);
                    }
                }
            ]
        );
    };

    const deleteGame = async (id: string) => {
        // Legacy direct delete, keeping just in case or redirect to new flow
        const game = games.find(g => g.id === id);
        if (game) handleLongPress(game);
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
                <Text style={styles.username}>@{session.user.email?.split('@')[0]}</Text>

                <View style={styles.headerButtons}>
                    <TouchableOpacity style={styles.addGameBtn} onPress={handleAddPress}>
                        <Ionicons name="add" size={20} color="white" />
                        <Text style={styles.addGameText}>Add Game</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.signOutBtnHeader} onPress={() => supabase.auth.signOut()}>
                        <Text style={styles.signOutText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{games.length}</Text>
                        <Text style={styles.statLabel}>Games</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{totalLikes}</Text>
                        <Text style={styles.statLabel}>Likes</Text>
                    </View>
                    <TouchableOpacity style={styles.statItem} onPress={loadFollowingList}>
                        <Text style={styles.statNumber}>{followingCount}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.statItem} onPress={loadFollowingList}>
                        <Text style={styles.statNumber}>{followersCount}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.tabs}>
                    <View style={styles.activeTabContainer}>
                        <Text style={styles.activeTabText}>My Games</Text>
                    </View>
                </View>

                {games.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="game-controller-outline" size={60} color={Colors.textSecondary} />
                        <Text style={styles.emptyText}>No games uploaded yet</Text>
                        <TouchableOpacity style={styles.uploadBtn} onPress={handleAddPress}>
                            <Ionicons name="add" size={24} color={Colors.text} />
                            <Text style={styles.uploadBtnText}>Add Game</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={games}
                        keyExtractor={(item) => item.id}
                        numColumns={3}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.tint} />}
                        columnWrapperStyle={styles.row}
                        renderItem={({ item }) => {
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
                                    style={styles.gridItem}
                                    onPress={() => {
                                        if (session?.user) {
                                            router.push({
                                                pathname: '/game-feed',
                                                params: { userId: session.user.id, initialGameId: item.id }
                                            });
                                        }
                                    }}
                                    onLongPress={() => handleLongPress(item)}
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
                                    <Text style={styles.gridItemText} numberOfLines={1}>{item.name.replace(/\.html$/i, '')}</Text>
                                </TouchableOpacity>
                            );
                        }}
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

            {/* Game Options Modal */}
            <Modal
                visible={optionsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setOptionsModalVisible(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
                    <View style={styles.optionModalContent}>
                        <Text style={styles.optionTitle}>{selectedGame?.name.replace(/\.html$/i, '')}</Text>

                        <TouchableOpacity style={styles.optionButton} onPress={handleChangeIconRequest}>
                            <Ionicons name="image-outline" size={24} color={Colors.text} />
                            <Text style={styles.optionText}>Change Icon</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.optionButtonDestructive} onPress={handleDeleteRequest}>
                            <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                            <Text style={styles.optionTextDestructive}>Delete Game</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelButton} onPress={() => setOptionsModalVisible(false)}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Icon Picker Modal */}
            <Modal
                visible={iconPickerVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIconPickerVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Choose Game Icon</Text>
                            <TouchableOpacity onPress={() => setIconPickerVisible(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.avatarGrid} showsVerticalScrollIndicator={false}>
                            {GAME_ICONS.map((icon, index) => (
                                <TouchableOpacity key={index} onPress={() => handleIconSelect(index)} style={styles.avatarGridItem}>
                                    <Image source={icon} style={styles.gridAvatarImage} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Add Game Choice Modal */}
            <Modal
                visible={addGameModeVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setAddGameModeVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setAddGameModeVisible(false)}
                >
                    <View style={styles.optionModalContent}>
                        <Text style={styles.modalTitle}>Add New Game</Text>

                        <TouchableOpacity style={styles.optionButton} onPress={uploadGameFile}>
                            <Ionicons name="document-outline" size={24} color={Colors.text} />
                            <Text style={styles.optionText}>Upload HTML File</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.optionButton} onPress={() => {
                            setAddGameModeVisible(false);
                            setUrlInputVisible(true);
                        }}>
                            <Ionicons name="link-outline" size={24} color={Colors.text} />
                            <Text style={styles.optionText}>Add Game URL (GameSnacks)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelButton} onPress={() => setAddGameModeVisible(false)}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* URL Input Modal */}
            <Modal
                visible={urlInputVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setUrlInputVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add External Game</Text>
                            <TouchableOpacity onPress={() => setUrlInputVisible(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Game Name</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g. Cube Tower"
                            placeholderTextColor={Colors.textSecondary}
                            value={gameName}
                            onChangeText={setGameName}
                        />

                        <Text style={styles.inputLabel}>Game URL</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="https://gamesnacks.com/games/..."
                            placeholderTextColor={Colors.textSecondary}
                            value={gameUrl}
                            onChangeText={setGameUrl}
                            autoCapitalize="none"
                            keyboardType="url"
                        />

                        <TouchableOpacity style={styles.submitBtn} onPress={handleAddExternalGame}>
                            <Text style={styles.submitBtnText}>Add Game</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Following List Modal */}
            <Modal
                visible={followingListVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setFollowingListVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setFollowingListVisible(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={styles.modalContent}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Following</Text>
                            <TouchableOpacity onPress={() => setFollowingListVisible(false)}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        {loadingFollowing ? (
                            <Text style={styles.loadingText}>Loading...</Text>
                        ) : followingList.length === 0 ? (
                            <Text style={styles.emptyListText}>You are not following anyone yet</Text>
                        ) : (
                            <FlatList
                                data={followingList}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.followerItem}
                                        onPress={() => {
                                            setFollowingListVisible(false);
                                            router.push(`/user/${item.id}`);
                                        }}
                                    >
                                        {item.avatar_url ? (
                                            <Image
                                                source={getAvatarSource(item.avatar_url)}
                                                style={styles.followerAvatar}
                                            />
                                        ) : (
                                            <View style={[styles.followerAvatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                                                <Ionicons name="person" size={24} color={Colors.textSecondary} />
                                            </View>
                                        )}
                                        <Text style={styles.followerName}>@{item.username || 'user'}</Text>
                                        <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView >
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
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 15,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 10,
    },
    statItem: {
        alignItems: 'center',
        marginHorizontal: 20,
    },
    statNumber: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        color: Colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
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
    row: {
        justifyContent: 'flex-start',
    },
    gridItem: {
        width: '33.33%',
        aspectRatio: 0.8, // Taller than wide
        padding: 1,
        marginBottom: 1,
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
    gridItemText: {
        position: 'absolute',
        bottom: 5,
        left: 5,
        right: 5,
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
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
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        maxHeight: '90%',
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
    },
    optionModalContent: {
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    addGameBtn: {
        flexDirection: 'row',
        backgroundColor: Colors.tint,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        marginRight: 10,
    },
    addGameText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 5,
    },
    signOutBtnHeader: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.textSecondary,
    },
    optionTitle: {
        color: Colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.separator,
    },
    optionButtonDestructive: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        marginTop: 5,
    },
    optionText: {
        color: Colors.text,
        fontSize: 16,
        marginLeft: 15,
        fontWeight: '500',
    },
    optionTextDestructive: {
        color: '#FF3B30',
        fontSize: 16,
        marginLeft: 15,
        fontWeight: '500',
    },
    cancelButton: {
        marginTop: 10,
        alignItems: 'center',
        paddingVertical: 15,
        backgroundColor: '#2C2C2C',
        borderRadius: 10,
    },
    cancelButtonText: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingText: {
        color: Colors.textSecondary,
        textAlign: 'center',
        marginVertical: 20,
    },
    emptyListText: {
        color: Colors.textSecondary,
        textAlign: 'center',
        marginVertical: 20,
    },
    followerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: Colors.separator,
    },
    followerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
    },
    followerName: {
        flex: 1,
        color: Colors.text,
        fontSize: 16,
        fontWeight: '500',
    },
    inputLabel: {
        color: Colors.textSecondary,
        fontSize: 14,
        marginBottom: 8,
        marginTop: 15,
    },
    textInput: {
        backgroundColor: '#2C2C2C',
        color: Colors.text,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    submitBtn: {
        backgroundColor: Colors.tint,
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        marginTop: 30,
    },
    submitBtnText: {
        color: Colors.background,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
