import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, View, FlatList, useWindowDimensions, ViewToken } from 'react-native';
import { GameModel } from '../types/GameModel';
import { GameContainer } from './GameContainer';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';

interface GameFeedListProps {
    games: GameModel[];
    initialIndex?: number;
    onEndReached?: () => void;
    onSwipeHorizontal?: (item: GameModel, direction: 'left' | 'right') => void;
    style?: any;
}

export function GameFeedList({ games, initialIndex = 0, onEndReached, onSwipeHorizontal, style }: GameFeedListProps) {
    const { height } = useWindowDimensions();
    const [activePage, setActivePage] = useState(initialIndex);
    const flatListRef = useRef<FlatList>(null);

    // We need to handle the initial Scroll Index carefully. 
    // If games are empty, we can't scroll.
    const [hasScrolledToInitial, setHasScrolledToInitial] = useState(initialIndex === 0);

    // Layout for FlatList to know exact dimensions for scrolling
    const getItemLayout = useCallback((data: any, index: number) => ({
        length: height,
        offset: height * index,
        index,
    }), [height]);

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            const newIndex = viewableItems[0].index;
            if (newIndex !== null && newIndex !== undefined) {
                setActivePage(newIndex);
            }
        }
    }, []);

    const handleSwipe = useCallback((currentIndex: number, direction: 'up' | 'down') => {
        const nextIndex = direction === 'up' ? currentIndex + 1 : currentIndex - 1;

        // Bounds check
        if (nextIndex >= 0 && nextIndex < games.length) {
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        }
    }, [games.length]);

    const viewabilityConfig = useMemo(() => ({
        itemVisiblePercentThreshold: 50
    }), []);

    // Effect to scroll to initial index once games are loaded
    useEffect(() => {
        if (games.length > 0 && initialIndex > 0 && !hasScrolledToInitial && flatListRef.current) {
            // Use a small timeout to ensure FlatList is ready
            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
                setHasScrolledToInitial(true);
            }, 100);
        }
    }, [games, initialIndex, hasScrolledToInitial]);


    if (games.length === 0) {
        // Allow parent to handle empty state if desired, or render default here? 
        // For reusable component, ideally it just renders list. 
        // But looking at index.tsx, it handled empty state. 
        // Let's render null here and let parent handle it or render a simple placeholder if required.
        // Actually, let's keep the empty state separate in parent for better control.
        return null;
    }

    return (
        <View style={[styles.container, style]}>
            <FlatList
                ref={flatListRef}
                data={games}
                renderItem={({ item, index }) => (
                    <View style={[styles.page, { height }]}>
                        <GameContainer
                            game={item}
                            isActive={activePage === index}
                            onSwipe={(dir) => handleSwipe(index, dir)}
                            onSwipeHorizontal={(dir) => onSwipeHorizontal?.(item, dir)}
                        />
                    </View>
                )}
                keyExtractor={(item, index) => `${item.id}_${index}`}
                snapToInterval={height}
                snapToAlignment="start"
                decelerationRate="fast"
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={getItemLayout}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={5}
                scrollEnabled={false} // Custom swipe handling
                onEndReached={onEndReached}
                onEndReachedThreshold={0.5}
            // initialScrollIndex={initialIndex} // Using manual scroll in useEffect usually more reliable for complex layouts
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    page: {
        flex: 1,
    },
});
