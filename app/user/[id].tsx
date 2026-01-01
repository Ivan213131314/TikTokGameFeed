import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { GameStorageService } from '../../src/services/GameStorageService';
import { ProfileModel } from '../../src/types/SocialModels';
import { GameModel } from '../../src/types/GameModel';
import { Colors } from '../../src/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_WIDTH = width / COLUMN_COUNT;

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

    const renderGameItem = ({ item }: { item: GameModel }) => (
        <TouchableOpacity style={styles.gameItem} onPress={() => { /* Navigate to feed starting at this game? For now just alert */ alert('Opening game not implemented yet from grid'); }}>
            <View style={styles.gamePreview}>
                {/* Expensive to render many WebViews, but for now we use a placeholder or simplified view */}
                <View style={styles.placeholderPreview}>
                    <Ionicons name="game-controller" size={30} color="#555" />
                </View>
            </View>
            <Text style={styles.gameTitle} numberOfLines={1}>{item.name}</Text>
        </TouchableOpacity>
    );

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
                headerBackTitleVisible: false,
            }} />

            <View style={styles.header}>
                <Image
                    source={{ uri: profile.avatar_url || 'https://placehold.co/100x100/png' }}
                    style={styles.avatar}
                />
                <Text style={styles.username}>@{profile.username}</Text>
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
    gamePreview: {
        flex: 1,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderPreview: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    gameTitle: {
        position: 'absolute',
        bottom: 5,
        left: 5,
        color: 'white',
        fontSize: 10,
        textShadowColor: 'black',
        textShadowRadius: 2,
    }
});
