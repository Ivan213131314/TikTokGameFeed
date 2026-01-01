import { StyleSheet, View, Text, useWindowDimensions, SafeAreaView, FlatList } from 'react-native';
import { Colors } from '../../src/constants/Colors';
import { useState, useCallback } from 'react';
import { GameModel } from '../../src/types/GameModel';
import { GameStorageService } from '../../src/services/GameStorageService';
import { useFocusEffect } from 'expo-router';
import { GameContainer } from '../../src/components/GameContainer';
import { Ionicons } from '@expo/vector-icons';

export default function GameFeedScreen() {
  const { height } = useWindowDimensions();
  const [games, setGames] = useState<GameModel[]>([]);
  const [activePage, setActivePage] = useState(0);

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

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0) {
      setActivePage(viewableItems[0].index ?? 0);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50
  };

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
      <FlatList
        data={games}
        renderItem={({ item, index }) => (
          <View style={[styles.page, { height }]}>
            <GameContainer game={item} isActive={activePage === index} />
          </View>
        )}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        decelerationRate="fast"
        disableIntervalMomentum
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
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
