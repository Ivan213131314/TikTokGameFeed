import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../src/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: Colors.text,
                tabBarInactiveTintColor: Colors.textSecondary,
                tabBarShowLabel: true,
            }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Feed',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="game-controller" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: Colors.tabBar,
        borderTopWidth: 0,
        elevation: 0,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        paddingBottom: 5,
    },
});
