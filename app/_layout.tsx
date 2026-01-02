import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useState } from 'react';
import { SplashScreen } from '../src/components/SplashScreen';

export default function RootLayout() {
    const [isSplashVisible, setSplashVisible] = useState(true);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>

            {isSplashVisible && (
                <SplashScreen onFinish={() => setSplashVisible(false)} />
            )}
        </GestureHandlerRootView>
    );
}
