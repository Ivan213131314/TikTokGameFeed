import { StyleSheet, View, Text, useWindowDimensions, SafeAreaView } from 'react-native';
import { Colors } from '../../src/constants/Colors';
import { useState, useCallback, useMemo } from 'react';
import { GameModel } from '../../src/types/GameModel';
import { GameStorageService } from '../../src/services/GameStorageService';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GameFeedList } from '../../src/components/GameFeedList';

export default function GameFeedScreen() {
  const [games, setGames] = useState<GameModel[]>([]);

  // Create an "infinite" list by repeating the games multiple times
  const infiniteGames = useMemo(() => {
    if (games.length === 0) return [];
    // Repeat the games list 100 times to simulate infinity
    return Array(100).fill(games).flat();
  }, [games]);

  const loadGames = async () => {
    await GameStorageService.seedDefaultGames();
    const loadedGames = await GameStorageService.getGames();
    setGames(loadedGames);
  };

  useFocusEffect(
    useCallback(() => {
      loadGames();
    }, [])
  );

  if (games.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Ionicons name="game-controller" size={80} color={Colors.textSecondary} />
        <Text style={styles.emptyText}>Feed is empty</Text>
        <Text style={styles.subText}>Upload a game in your profile to start playing!</Text>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.container}>
      <GameFeedList games={infiniteGames} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  subText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
  }
});

