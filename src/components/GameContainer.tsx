import React, { useRef, useState } from 'react';
import { StyleSheet, View, Text, PanResponder } from 'react-native';
import { WebView } from 'react-native-webview';
import { GameModel } from '../types/GameModel';
import { InteractionSidebar } from './InteractionSidebar';
import { CommentsModal } from './CommentsModal';

interface GameContainerProps {
    game: GameModel;
    isActive: boolean;
    onSwipe: (direction: 'up' | 'down') => void;
    onSwipeHorizontal?: (direction: 'left' | 'right') => void;
}

export const GameContainer: React.FC<GameContainerProps> = ({ game, isActive, onSwipe, onSwipeHorizontal }) => {
    const [commentsVisible, setCommentsVisible] = useState(false);

    // 1. Configure PanResponder to intercept swipes
    const panResponder = useRef(
        PanResponder.create({
            // Don't claim capture on start - let clicks go to WebView
            onStartShouldSetPanResponderCapture: () => false,
            // Capture on move if it looks like a swipe
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                const { dx, dy } = gestureState;
                const isVerticalSwipe = Math.abs(dy) > 20 && Math.abs(dy) > Math.abs(dx);
                const isHorizontalSwipe = Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy);

                if (isVerticalSwipe || isHorizontalSwipe) {
                    return true; // Steal the touch from WebView!
                }
                return false;
            },
            onPanResponderGrant: () => {
                // Touch stolen.
            },
            onPanResponderRelease: (_, gestureState) => {
                const { dx, dy } = gestureState;
                if (Math.abs(dy) > Math.abs(dx)) {
                    if (dy < -50) {
                        onSwipe('up'); // Swipe Up -> Next
                    } else if (dy > 50) {
                        onSwipe('down'); // Swipe Down -> Prev
                    }
                } else if (onSwipeHorizontal) {
                    if (dx < -50) {
                        onSwipeHorizontal('left'); // Swipe Left -> Profile (TikTok)
                    } else if (dx > 50) {
                        onSwipeHorizontal('right'); // Swipe Right
                    }
                }
            },
            onPanResponderTerminationRequest: () => false, // Don't let others steal back
        })
    ).current;

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
            {isActive ? (
                <WebView
                    source={game.html_content ? { html: game.html_content } : { uri: game.uri }}
                    style={styles.webview}
                    scrollEnabled={false}
                    originWhitelist={['*']}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                    androidHardwareAccelerationDisabled={false}
                    // Cleanup injection as we use native handling now
                    renderError={(e) => (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>Failed to load game</Text>
                            <Text style={styles.errorText}>{e}</Text>
                        </View>
                    )}
                />
            ) : (
                <View style={[styles.webview, { backgroundColor: 'black' }]} />
            )}

            <View style={styles.sidebar} pointerEvents="box-none">
                <InteractionSidebar
                    game={game}
                    onCommentPress={() => setCommentsVisible(true)}
                />
            </View>

            <CommentsModal
                gameId={game.id}
                visible={commentsVisible}
                onClose={() => setCommentsVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    sidebar: {
        position: 'absolute',
        right: 10,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
    }
});
