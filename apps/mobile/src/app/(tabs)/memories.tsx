
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    getRecordings,
    downloadRecordingAudio,
    type Recording,
} from '../../services/api';

const colors = {
    background: '#F8F7F4',
    card: '#FFFFFF',
    text: '#242424',
    muted: '#77736D',
    accent: '#7257A5',
    border: '#E9E5DF',
    success: '#287A55',
    warning: '#A36A20',
    error: '#B33A32',
};

export default function MemoriesScreen() {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
    const [audioUris, setAudioUris] = useState<Record<string, string>>({});

    const player = useAudioPlayer(null);
    const playerStatus = useAudioPlayerStatus(player);

    const loadRecordings = useCallback(async (showLoader = false) => {
        try {
            if (showLoader) setLoading(true);

            const result = await getRecordings();
            setRecordings(result.recordings || []);
        } catch (error) {
            Alert.alert(
                'Unable to load recordings',
                error instanceof Error ? error.message : 'Please try again.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Refresh the recording list while this screen is open.
    // This allows background translations to appear automatically.
    useFocusEffect(
        useCallback(() => {
            loadRecordings(true);

            const interval = setInterval(() => {
                loadRecordings(false);
            }, 4000);

            return () => clearInterval(interval);
        }, [loadRecordings])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadRecordings(false);
    };

    const handleOpenRecording = async (recording: Recording) => {
        setSelectedId(recording.id);

        try {
            if (playingId === recording.id && playerStatus.playing) {
                player.pause();
                setPlayingId(null);
                return;
            }

            setLoadingAudioId(recording.id);

            let uri = audioUris[recording.id];

            if (!uri) {
                uri = await downloadRecordingAudio(recording.id);

                setAudioUris(current => ({
                    ...current,
                    [recording.id]: uri,
                }));
            }

            player.pause();
            player.replace({ uri });
            player.play();

            setPlayingId(recording.id);
        } catch (error) {
            console.error('Original voice playback error:', error);
            setPlayingId(null);

            Alert.alert(
                'Playback failed',
                error instanceof Error ? error.message : String(error)
            );
        } finally {
            setLoadingAudioId(null);
        }
    };

    const getStatus = (status: string) => {
        switch (status) {
            case 'UPLOADED':
                return {
                    label: 'Recording saved · Waiting for processing',
                    color: colors.warning,
                };

            case 'TRANSCRIBING':
                return {
                    label: 'Preparing your transcript...',
                    color: colors.warning,
                };

            case 'TRANSLATING':
                return {
                    label: 'Translating into English...',
                    color: colors.warning,
                };

            case 'REVIEW_PENDING':
            case 'SAVED':
                return {
                    label: 'English transcript ready',
                    color: colors.success,
                };

            case 'FAILED':
                return {
                    label: 'Transcript processing failed',
                    color: colors.error,
                };

            default:
                return {
                    label: status,
                    color: colors.muted,
                };
        }
    };

    const renderRecording = ({ item }: { item: Recording }) => {
        const question =
            item.session?.question?.text || 'Your voice recording';

        const isSelected = selectedId === item.id;
        const isPlaying = playingId === item.id && playerStatus.playing;
        const isLoadingAudio = loadingAudioId === item.id;
        const status = getStatus(item.status);

        return (
            <View style={styles.recordingCard}>
                <Pressable
                    style={styles.cardHeader}
                    onPress={() => handleOpenRecording(item)}
                >
                    <View style={styles.audioIcon}>
                        <Text style={styles.audioIconText}>♫</Text>
                    </View>

                    <View style={styles.cardInfo}>
                        <Text style={styles.question} numberOfLines={2}>
                            {question}
                        </Text>

                        <Text style={styles.date}>
                            {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>

                    <Text style={styles.openIcon}>
                        {isSelected ? '−' : '+'}
                    </Text>
                </Pressable>

                <Text style={[styles.status, { color: status.color }]}>
                    {status.label}
                </Text>

                {isSelected && (
                    <View style={styles.details}>
                        <View style={styles.playerBox}>
                            <Pressable
                                style={styles.playButton}
                                disabled={isLoadingAudio}
                                onPress={() => handleOpenRecording(item)}
                            >
                                {isLoadingAudio ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.playButtonText}>
                                        {isPlaying ? 'Pause recording' : 'Play original voice'}
                                    </Text>
                                )}
                            </Pressable>

                            <Text style={styles.playerCaption}>
                                Original voice recording
                            </Text>
                        </View>

                        <View style={styles.transcriptBox}>
                            <Text style={styles.transcriptHeading}>
                                English transcript
                            </Text>

                            {item.status === 'FAILED' ? (
                                <Text style={styles.processingText}>
                                    {item.processingError || 'We could not process this recording.'}
                                </Text>
                            ) : item.englishTranslation ? (
                                <Text style={styles.transcript}>
                                    {item.englishTranslation}
                                </Text>
                            ) : (
                                <View style={styles.processingRow}>
                                    <ActivityIndicator color={colors.accent} />
                                    <Text style={styles.processingText}>
                                        Your English transcript is being prepared. It will appear
                                        here automatically.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.heading}>My Memories</Text>
                <Text style={styles.subtitle}>
                    Your stories, preserved in your own voice.
                </Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={styles.loadingText}>
                        Loading your recordings...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={recordings}
                    keyExtractor={item => item.id}
                    renderItem={renderRecording}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>♫</Text>
                            <Text style={styles.emptyTitle}>No recordings yet</Text>
                            <Text style={styles.emptyText}>
                                Your saved voice recordings will appear here.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: 22,
        paddingTop: 16,
        paddingBottom: 20,
    },
    heading: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: colors.muted,
        marginTop: 6,
    },
    list: {
        paddingHorizontal: 18,
        paddingBottom: 35,
    },
    recordingCard: {
        backgroundColor: colors.card,
        borderRadius: 18,
        padding: 17,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    audioIcon: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: '#F0EBF8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    audioIconText: {
        fontSize: 25,
        color: colors.accent,
    },
    cardInfo: {
        flex: 1,
        marginLeft: 12,
    },
    question: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
    },
    date: {
        color: colors.muted,
        fontSize: 12,
        marginTop: 5,
    },
    openIcon: {
        fontSize: 25,
        color: colors.accent,
        paddingHorizontal: 8,
    },
    status: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 14,
    },
    details: {
        marginTop: 17,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    playerBox: {
        backgroundColor: '#F5F1FA',
        borderRadius: 14,
        padding: 15,
        alignItems: 'center',
    },
    playButton: {
        minHeight: 46,
        width: '100%',
        borderRadius: 12,
        backgroundColor: colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    playButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    playerCaption: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 9,
    },
    transcriptBox: {
        marginTop: 18,
    },
    transcriptHeading: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 10,
    },
    transcript: {
        color: colors.text,
        fontSize: 14,
        lineHeight: 23,
    },
    processingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    processingText: {
        color: colors.muted,
        fontSize: 13,
        lineHeight: 20,
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: colors.muted,
        marginTop: 12,
    },
    empty: {
        paddingVertical: 75,
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    emptyIcon: {
        fontSize: 48,
        color: colors.accent,
    },
    emptyTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginTop: 18,
    },
    emptyText: {
        color: colors.muted,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 21,
        marginTop: 8,
    },
});
