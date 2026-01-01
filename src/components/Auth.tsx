import React, { useState } from 'react';
import { Alert, StyleSheet, View, AppState, TextInput, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as QueryParams from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
// Helper to extract params from hash
const extractParamsFromHash = (url: string) => {
    const hash = url.split('#')[1];
    if (!hash) return {};
    return hash.split('&').reduce((acc, current) => {
        const [key, value] = current.split('=');
        acc[key] = value;
        return acc;
    }, {} as Record<string, string>);
};

AppState.addEventListener('change', (state) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh();
    } else {
        supabase.auth.stopAutoRefresh();
    }
});

export default function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'login' | 'signup'>('login');

    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) Alert.alert(error.message);
        setLoading(false);
    }

    async function signUpWithEmail() {
        setLoading(true);
        const {
            data: { session },
            error,
        } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) Alert.alert(error.message);
        else if (!session) Alert.alert('Please check your inbox for email verification!');
        setLoading(false);
    }

    async function signInWithGoogle() {
        setLoading(true);
        try {
            const redirectUrl = 'tiktokgames://google-auth';
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true
                },
            });

            if (error) throw error;

            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
                    showInRecents: true
                });

                if (result.type === 'success' && result.url) {
                    const params = extractParamsFromHash(result.url);
                    if (params.access_token && params.refresh_token) {
                        const { error } = await supabase.auth.setSession({
                            access_token: params.access_token,
                            refresh_token: params.refresh_token,
                        });
                        if (error) throw error;
                    }
                }
            }

        } catch (e: any) {
            Alert.alert(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="game-controller" size={60} color={Colors.tint} />
                <Text style={styles.title}>TikTok Games</Text>
                <Text style={styles.subtitle}>Play, Share, Upload</Text>
            </View>

            <View style={styles.form}>
                <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        onChangeText={(text) => setEmail(text)}
                        value={email}
                        placeholder="email@address.com"
                        placeholderTextColor={Colors.textSecondary}
                        autoCapitalize={'none'}
                        keyboardType="email-address"
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        onChangeText={(text) => setPassword(text)}
                        value={password}
                        secureTextEntry={true}
                        placeholder="Password"
                        placeholderTextColor={Colors.textSecondary}
                        autoCapitalize={'none'}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={mode === 'login' ? signInWithEmail : signUpWithEmail}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={Colors.text} />
                    ) : (
                        <Text style={styles.buttonText}>{mode === 'login' ? 'Sign in' : 'Sign up'}</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.googleButton, loading && styles.buttonDisabled]}
                    onPress={signInWithGoogle}
                    disabled={loading}
                >
                    <Ionicons name="logo-google" size={20} color="white" style={styles.icon} />
                    <Text style={styles.buttonText}>Sign in with Google</Text>
                </TouchableOpacity>

                <View style={styles.switchContainer}>
                    <Text style={styles.switchText}>
                        {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                    </Text>
                    <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                        <Text style={styles.switchAction}>{mode === 'login' ? 'Sign up' : 'Sign in'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: Colors.background,
    },
    header: {
        alignItems: 'center',
        marginBottom: 50,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 10,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginBottom: 20,
    },
    form: {
        gap: 15,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#333',
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 50,
        color: Colors.text,
        fontSize: 16,
    },
    button: {
        backgroundColor: Colors.tint,
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    switchText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    switchAction: {
        color: Colors.tint,
        fontSize: 14,
        fontWeight: 'bold',
    },
    googleButton: {
        backgroundColor: '#DB4437', // Google Red
        marginTop: 15,
        flexDirection: 'row',
    },
});
