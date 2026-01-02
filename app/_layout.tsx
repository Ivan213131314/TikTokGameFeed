import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useState, useEffect } from 'react';
import * as SplashScreenNative from 'expo-splash-screen';
import { SplashScreen } from '../src/components/SplashScreen';

// Keep the splash screen visible while we fetch resources
SplashScreenNative.preventAutoHideAsync().catch(() => {
    /* reloading the app might cause this error. */
});

export default function RootLayout() {
    const [isSplashVisible, setSplashVisible] = useState(true);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>

            {isSplashVisible && (
                <SplashScreen
                    onFinish={() => setSplashVisible(false)}
                    onReady={() => SplashScreenNative.hideAsync().catch(() => { })}
                />
            )}
        </GestureHandlerRootView>
    );
}
