import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GameStorageService } from '../services/GameStorageService';
import { CommentModel } from '../types/SocialModels';
import { Colors } from '../constants/Colors';

interface CommentsModalProps {
    gameId: string;
    visible: boolean;
    onClose: () => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({ gameId, visible, onClose }) => {
    const [comments, setComments] = useState<CommentModel[]>([]);
    const [loading, setLoading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (visible) {
            loadComments();
        }
    }, [visible, gameId]);

    const loadComments = async () => {
        setLoading(true);
        try {
            const data = await GameStorageService.getComments(gameId);
            setComments(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const comment = await GameStorageService.addComment(gameId, newComment.trim());
            setComments(prev => [comment, ...prev]);
            setNewComment('');
        } catch (e) {
            alert("Failed to post comment. Ensure you are logged in.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardView}
                >
                    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.container}>
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>{comments.length} comments</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color={Colors.tint} style={styles.loader} />
                        ) : (
                            <FlatList
                                data={comments}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <View style={styles.commentItem}>
                                        <Image
                                            source={{ uri: item.user?.avatar_url || 'https://placehold.co/40x40/png' }}
                                            style={styles.avatar}
                                        />
                                        <View style={styles.commentContent}>
                                            <Text style={styles.username}>{item.user?.username || 'User'}</Text>
                                            <Text style={styles.commentText}>{item.content}</Text>
                                            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
                                        </View>
                                    </View>
                                )}
                                contentContainerStyle={styles.listContent}
                                ListEmptyComponent={
                                    <View style={styles.emptyContainer}>
                                        <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
                                    </View>
                                }
                            />
                        )}

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Add comment..."
                                placeholderTextColor="#888"
                                value={newComment}
                                onChangeText={setNewComment}
                            />
                            <TouchableOpacity
                                onPress={handleSend}
                                disabled={submitting || !newComment.trim()}
                                style={[styles.sendButton, (!newComment.trim()) && styles.sendButtonDisabled]}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color={Colors.tint} />
                                ) : (
                                    <Ionicons name="arrow-up-circle" size={32} color={Colors.tint} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        height: '70%',
        backgroundColor: '#1e1e1e', // Dark theme background
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    headerTitle: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 5,
    },
    loader: {
        marginTop: 20,
    },
    listContent: {
        padding: 15,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
        backgroundColor: '#333',
    },
    commentContent: {
        flex: 1,
    },
    username: {
        color: '#aaa',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    commentText: {
        color: Colors.text,
        fontSize: 14,
        marginBottom: 5,
    },
    date: {
        color: '#666',
        fontSize: 10,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#666',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#333',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#333',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        color: 'white',
        marginRight: 10,
    },
    sendButton: {
        padding: 5,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
});
