import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, Image, Text, Easing } from 'react-native';
import { Colors } from '../constants/Colors';

interface SplashScreenProps {
    onFinish: () => void;
    onReady?: () => void;
}

const { width, height } = Dimensions.get('window');

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, onReady }) => {
    // Animation Values
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current; // For initial entry and pulse

    // We need a separate value for the exit zoom to avoid conflict with the pulse loop,
    // OR we can just drive scaleAnim to a huge number after stopping the loop.
    // Using a separate container scale is cleaner for the exit zoom.
    const exitScaleAnim = useRef(new Animated.Value(1)).current;

    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;

        // 1. Fade In & Initial Scale
        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (onReady) onReady();
        });

        // 2. Heartbeat Pulse Loop
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.15,
                    duration: 400,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1.0,
                    duration: 400,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        // Start pulsing shortly after entry
        const startPulseTimer = setTimeout(() => {
            if (isMounted.current) pulse.start();
        }, 800);

        // 3. Exit Animation (Zoom In / Expand)
        const exitTimer = setTimeout(() => {
            pulse.stop();
            // Reset scale to 1 just in case it stopped mid-pulse, 
            // but actually we want to zoom FROM wherever it is.

            Animated.parallel([
                // Expand container massively
                Animated.timing(exitScaleAnim, {
                    toValue: 20, // Huge scale to fill screen
                    duration: 500,
                    easing: Easing.in(Easing.exp),
                    useNativeDriver: true,
                }),
                // Fade out slightly at the very end to smooth transition
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 400,
                    delay: 100, // wait a bit so screen fills first
                    useNativeDriver: true,
                })
            ]).start(() => {
                if (isMounted.current) onFinish();
            });

        }, 3000); // 3 seconds total

        return () => {
            isMounted.current = false;
            clearTimeout(startPulseTimer);
            clearTimeout(exitTimer);
            pulse.stop();
        };
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: opacityAnim, transform: [{ scale: exitScaleAnim }] }]}>
            <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleAnim }] }}>
                {/* Logo containing text */}
                <Image
                    source={require('../../assets/logo-glitch.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                />
            </Animated.View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    logoImage: {
        width: width * 0.8,
        height: 150, // Fixed height to accommodate the wide logo
    },
});
