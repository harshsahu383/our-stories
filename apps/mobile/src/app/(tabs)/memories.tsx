
import React, { useCallback, useMemo, useState } from 'react';
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

type MemoryRecording = Recording & {
    storyPromptId?: string | null;
    answerType?: 'MAIN' | 'PERMANENT_FOLLOW_UP' | 'AI_FOLLOW_UP';
    storyPrompt?: {
        id: string;
        question?: {
            text?: string;
        };
        permanentFollowUpText?: string;
        aiFollowUpText?: string | null;
    } | null;
    session?: {
        question?: {
            text?: string;
        } | null;
    } | null;
};

type RecordingGroup = {
    id: string;
    question: string;
    permanentFollowUpText: string;
    aiFollowUpText: string;
    recordings: MemoryRecording[];
};

const answerLabels: Record<string, string> = {
    MAIN: 'Main answer',
    PERMANENT_FOLLOW_UP: 'Follow-up answer',
    AI_FOLLOW_UP: 'AI follow-up answer',
};

export default function MemoriesScreen() {
    const [recordings, setRecordings] = useState<MemoryRecording[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
    const [audioUris, setAudioUris] = useState<Record<string, string>>({});

    const player = useAudioPlayer(null);
    const playerStatus = useAudioPlayerStatus(player);

    const loadRecordings = useCallback(async (showLoader = false) => {
        try {
            if (showLoader) setLoading(true);

            const result = await getRecordings();
            setRecordings((result.recordings || []) as MemoryRecording[]);
        } catch (error) {
            Alert.alert(
                'Unable to load memories',
                error instanceof Error ? error.message : 'Please try again.'
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            void loadRecordings(true);

            const interval = setInterval(() => {
                void loadRecordings(false);
            }, 4000);

            return () => clearInterval(interval);
        }, [loadRecordings])
    );

    const groups = useMemo<RecordingGroup[]>(() => {
        const grouped = new Map<string, RecordingGroup>();

        for (const recording of recordings) {
            const prompt = recording.storyPrompt;
            const groupId =
                recording.storyPromptId ||
                prompt?.id ||
                `legacy-${recording.id}`;

            if (!grouped.has(groupId)) {
                grouped.set(groupId, {
                    id: groupId,
                    question:
                        prompt?.question?.text ||
                        recording.session?.question?.text ||
                        'Your story',
                    permanentFollowUpText:
                        prompt?.permanentFollowUpText || '',
                    aiFollowUpText: prompt?.aiFollowUpText || '',
                    recordings: [],
                });
            }

            const group = grouped.get(groupId)!;

            if (prompt?.question?.text) {
                group.question = prompt.question.text;
            }

            if (prompt?.permanentFollowUpText) {
                group.permanentFollowUpText =
                    prompt.permanentFollowUpText;
            }

            if (prompt?.aiFollowUpText) {
                group.aiFollowUpText = prompt.aiFollowUpText;
            }

            group.recordings.push(recording);
        }

        return Array.from(grouped.values()).map(group => ({
            ...group,
            recordings: [...group.recordings].sort((a, b) => {
                const order = {
                    MAIN: 0,
                    PERMANENT_FOLLOW_UP: 1,
                    AI_FOLLOW_UP: 2,
                };

                return (
                    (order[a.answerType || 'MAIN'] ?? 0) -
                    (order[b.answerType || 'MAIN'] ?? 0)
                );
            }),
        }));
    }, [recordings]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadRecordings(false);
    };

    const handlePlayback = async (recording: MemoryRecording) => {
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
            console.error('Recording playback error:', error);
            setPlayingId(null);

            Alert.alert(
                'Playback failed',
                error instanceof Error
                    ? error.message
                    : 'Could not play this recording.'
            );
        } finally {
            setLoadingAudioId(null);
        }
    };

    const getStatus = (status: string) => {
        switch (status) {
            case 'UPLOADED':
                return {
                    label: 'Audio saved · Processing',
                    color: colors.warning,
                };
            case 'TRANSCRIBING':
                return {
                    label: 'Preparing English translation',
                    color: colors.warning,
                };
            case 'TRANSLATING':
                return {
                    label: 'Translating into English',
                    color: colors.warning,
                };
            case 'SAVED':
            case 'REVIEW_PENDING':
                return {
                    label: 'English translation ready',
                    color: colors.success,
                };
            case 'FAILED':
                return {
                    label: 'Processing failed',
                    color: colors.error,
                };
            default:
                return {
                    label: status,
                    color: colors.muted,
                };
        }
    };

    const renderAnswer = (
        recording: MemoryRecording,
        group: RecordingGroup
    ) => {
        const answerType = recording.answerType || 'MAIN';

        const answerQuestion =
            answerType === 'MAIN'
                ? group.question
                : answerType === 'PERMANENT_FOLLOW_UP'
                    ? group.permanentFollowUpText
                    : group.aiFollowUpText;

        const status = getStatus(recording.status);
        const isPlaying =
            playingId === recording.id && playerStatus.playing;
        const isLoadingAudio = loadingAudioId === recording.id;

        return (
            <View key={recording.id} style={styles.answerCard}>
                <View style={styles.answerHeader}>
                    <View style={styles.answerNumber}>
                        <Text style={styles.answerNumberText}>
                            {answerType === 'MAIN'
                                ? '1'
                                : answerType === 'PERMANENT_FOLLOW_UP'
                                    ? '2'
                                    : '3'}
                        </Text>
                    </View>

                    <View style={styles.answerInfo}>
                        <Text style={styles.answerLabel}>
                            {answerLabels[answerType]}
                        </Text>

                        <Text style={styles.answerQuestion}>
                            {answerQuestion || 'Question text unavailable'}
                        </Text>
                    </View>
                </View>

                <View style={styles.translationBox}>
                    <Text style={styles.translationHeading}>
                        English translation
                    </Text>

                    {recording.status === 'FAILED' ? (
                        <Text style={styles.processingText}>
                            {recording.processingError ||
                                'We could not process this recording.'}
                        </Text>
                    ) : recording.englishTranslation ? (
                        <Text style={styles.translation}>
                            {recording.englishTranslation}
                        </Text>
                    ) : (
                        <Text style={styles.processingText}>
                            Your English translation is being prepared.
                        </Text>
                    )}
                </View>

                <View style={styles.answerFooter}>
                    <Text style={[styles.status, { color: status.color }]}>
                        {status.label}
                    </Text>

                    <Pressable
                        style={[
                            styles.playButton,
                            isLoadingAudio && styles.disabledButton,
                        ]}
                        disabled={isLoadingAudio}
                        onPress={() => handlePlayback(recording)}
                    >
                        {isLoadingAudio ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.playButtonText}>
                                {isPlaying ? 'Pause' : '▶ Listen'}
                            </Text>
                        )}
                    </Pressable>
                </View>
            </View>
        );
    };

    const renderGroup = ({ item }: { item: RecordingGroup }) => (
        <View style={styles.groupCard}>
            <View style={styles.groupHeader}>
                <View style={styles.groupIcon}>
                    <Text style={styles.groupIconText}>♫</Text>
                </View>

                <View style={styles.groupInfo}>
                    <Text style={styles.groupEyebrow}>YOUR STORY</Text>

                    <Text style={styles.groupQuestion}>
                        {item.question}
                    </Text>

                    <Text style={styles.groupCount}>
                        {item.recordings.length} of 3 answers recorded
                    </Text>
                </View>
            </View>

            <View style={styles.answers}>
                {item.recordings.map(recording =>
                    renderAnswer(recording, item)
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.heading}>My Memories</Text>

                <Text style={styles.subtitle}>
                    Every question, every answer, preserved in your voice.
                </Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator
                        size="large"
                        color={colors.accent}
                    />

                    <Text style={styles.loadingText}>
                        Loading your memories...
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={groups}
                    keyExtractor={item => item.id}
                    renderItem={renderGroup}
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

                            <Text style={styles.emptyTitle}>
                                No memories yet
                            </Text>

                            <Text style={styles.emptyText}>
                                Your recorded answers will appear here,
                                organised by question.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
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
        lineHeight: 21,
    },
    list: {
        paddingHorizontal: 18,
        paddingBottom: 35,
    },
    groupCard: {
        backgroundColor: colors.card,
        borderRadius: 18,
        padding: 17,
        marginBottom: 17,
        borderWidth: 1,
        borderColor: colors.border,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 17,
    },
    groupIcon: {
        width: 48,
        height: 48,
        borderRadius: 15,
        backgroundColor: '#F0EBF8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupIconText: {
        fontSize: 26,
        color: colors.accent,
    },
    groupInfo: {
        flex: 1,
        marginLeft: 12,
    },
    groupEyebrow: {
        fontSize: 10,
        letterSpacing: 1.2,
        fontWeight: '700',
        color: colors.accent,
        marginBottom: 4,
    },
    groupQuestion: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 22,
    },
    groupCount: {
        fontSize: 12,
        color: colors.muted,
        marginTop: 5,
    },
    answers: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 5,
    },
    answerCard: {
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    answerHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    answerNumber: {
        width: 28,
        height: 28,
        borderRadius: 9,
        backgroundColor: '#F0EBF8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    answerNumberText: {
        color: colors.accent,
        fontSize: 13,
        fontWeight: '700',
    },
    answerInfo: {
        flex: 1,
        marginLeft: 10,
    },
    answerLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
    },
    answerQuestion: {
        fontSize: 13,
        color: colors.muted,
        lineHeight: 19,
        marginTop: 4,
    },
    translationBox: {
        backgroundColor: '#F8F7F4',
        borderRadius: 12,
        padding: 12,
        marginTop: 12,
    },
    translationHeading: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.muted,
        marginBottom: 6,
    },
    translation: {
        fontSize: 14,
        lineHeight: 21,
        color: colors.text,
    },
    processingText: {
        fontSize: 13,
        color: colors.muted,
        lineHeight: 20,
    },
    answerFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        gap: 10,
    },
    status: {
        fontSize: 11,
        fontWeight: '600',
        flex: 1,
    },
    playButton: {
        minWidth: 105,
        minHeight: 40,
        borderRadius: 11,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 13,
    },
    playButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    disabledButton: {
        opacity: 0.6,
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
