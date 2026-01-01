import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { GameModel } from '../types/GameModel';
import { Colors } from '../constants/Colors';

interface GameContainerProps {
    game: GameModel;
    isActive: boolean;
}

export const GameContainer: React.FC<GameContainerProps> = ({ game, isActive }) => {
    // If not active, we could render a simplified view or pause the WebView.
    // For now, let's keep it simple. Optimization can come later.

    return (
        <View style={styles.container}>
            <WebView
                source={{ uri: game.uri }}
                style={styles.webview}
                scrollEnabled={false} // Disable scrolling inside the game to avoid conflicts
                originWhitelist={['*']}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                // Improve performance
                androidHardwareAccelerationDisabled={false}
                renderError={(e) => (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>Failed to load game</Text>
                        <Text style={styles.errorText}>{e}</Text>
                    </View>
                )}
            />
            {/* Overlay UI can go here */}
            <View style={styles.overlay}>
                <Text style={styles.gameTitle}>{game.name}</Text>
            </View>
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
    overlay: {
        position: 'absolute',
        bottom: 80, // Above tab bar
        left: 10,
        padding: 10,
    },
    gameTitle: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10
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
