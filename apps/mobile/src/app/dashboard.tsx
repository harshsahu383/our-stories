
import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    StatusBar,
    Alert,
    ActivityIndicator,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState,
    useAudioPlayer,
    useAudioPlayerStatus,
} from "expo-audio";
import * as Speech from "expo-speech";
import { colors } from "../theme/colors";
import {
    startDemoSession,
    getQuestions,
    createStorySession,
    uploadRecording,
    saveMemory,
    getMemories,
    type StoryQuestion,
} from "../services/api";

const prompts = [
    { id: "love", title: "Love", symbol: "♡", color: "#D9A5A0" },
    { id: "fears", title: "Fears", symbol: "✦", color: "#D7B95F" },
    { id: "little", title: "Little things", symbol: "✧", color: "#8EABB4" },
];

const localizedCopy = {
    en: {
        eyebrow: "NO STORY GOES UNTOLD", heading: "Your stories.", headingAccent: "In your voice.", description: "No right place to begin. Just you.",
        questionEyebrow: "A QUESTION TO BEGIN", loading: "Loading questions…", preparing: "Getting ready…", listening: "Listening to you", letsTalk: "Let's talk",
        recordingReady: "Your voice recording is ready", recordingStatus: "RECORDING", pausedStatus: "PAUSED", tapMic: "Tap the microphone to begin", playback: "Your recording", localSaved: "Saved on this device",
        nudge: "A little nudge, if you'd like", memories: "My memories", keepMoment: "Keep this moment", yourStory: "YOUR STORY", translation: "ENGLISH TRANSLATION",
        continue: "A QUESTION TO CONTINUE", keep: "Keep my memory", saved: "Memory saved ✓", footer: "PRIVATE · YOUR VOICE · YOUR MEMORIES",
        love: "Love", fears: "Fears", little: "Little things", pause: "Pause", resume: "Resume", stop: "Finish recording", restart: "Record again", preview: "Preview", done: "Done · Next question", cancel: "Cancel", saving: "Saving memory…", listenQuestion: "Listen to question", stopQuestion: "Stop question"
    },
    hi: {
        eyebrow: "हर कहानी अनमोल है", heading: "आपकी कहानियाँ।", headingAccent: "आपकी आवाज़ में।", description: "शुरुआत करने का कोई सही तरीका नहीं। बस आप।",
        questionEyebrow: "शुरुआत के लिए एक सवाल", loading: "सवाल लोड हो रहे हैं…", preparing: "तैयारी हो रही है…", listening: "हम सुन रहे हैं", letsTalk: "बात शुरू करें",
        recordingReady: "आपकी आवाज़ की रिकॉर्डिंग तैयार है", recordingStatus: "रिकॉर्डिंग", pausedStatus: "रुकी हुई", tapMic: "शुरू करने के लिए माइक्रोफ़ोन दबाएँ", playback: "आपकी रिकॉर्डिंग", localSaved: "इस डिवाइस में सुरक्षित",
        nudge: "अगर चाहें तो एक छोटा सुझाव", memories: "मेरी यादें", keepMoment: "इस पल को सहेजें", yourStory: "आपकी कहानी", translation: "अंग्रेज़ी अनुवाद",
        continue: "आगे बढ़ने के लिए एक सवाल", keep: "मेरी याद सहेजें", saved: "याद सहेज ली ✓", footer: "निजी · आपकी आवाज़ · आपकी यादें",
        love: "प्यार", fears: "डर", little: "छोटी बातें", pause: "रोकें", resume: "फिर शुरू करें", stop: "रिकॉर्डिंग पूरी करें", restart: "दोबारा रिकॉर्ड करें", preview: "सुनें", done: "हो गया · अगला सवाल", cancel: "रद्द करें", saving: "याद सहेजी जा रही है…", listenQuestion: "सवाल सुनें", stopQuestion: "सवाल रोकें"
    },
    gu: {
        eyebrow: "દરેક વાર્તા અનમોલ છે", heading: "તમારી વાર્તાઓ.", headingAccent: "તમારા અવાજમાં.", description: "શરૂઆત કરવાની કોઈ સાચી રીત નથી. બસ તમે.",
        questionEyebrow: "શરૂઆત માટે એક પ્રશ્ન", loading: "પ્રશ્નો લોડ થઈ રહ્યા છે…", preparing: "તૈયારી થઈ રહી છે…", listening: "અમે સાંભળી રહ્યા છીએ", letsTalk: "ચાલો વાત કરીએ",
        recordingReady: "તમારું વૉઇસ રેકોર્ડિંગ તૈયાર છે", recordingStatus: "રેકોર્ડિંગ", pausedStatus: "થોભેલું", tapMic: "શરૂ કરવા માઇક્રોફોન દબાવો", playback: "તમારું રેકોર્ડિંગ", localSaved: "આ ડિવાઇસમાં સાચવ્યું",
        nudge: "ઇચ્છા હોય તો એક નાનો સંકેત", memories: "મારી યાદો", keepMoment: "આ ક્ષણ સાચવો", yourStory: "તમારી વાર્તા", translation: "અંગ્રેજી અનુવાદ",
        continue: "આગળ વધવા માટે એક પ્રશ્ન", keep: "મારી યાદ સાચવો", saved: "યાદ સાચવી ✓", footer: "ખાનગી · તમારો અવાજ · તમારી યાદો",
        love: "પ્રેમ", fears: "ડર", little: "નાની વાતો", pause: "થોભો", resume: "ફરી શરૂ કરો", stop: "રેકોર્ડિંગ પૂર્ણ કરો", restart: "ફરી રેકોર્ડ કરો", preview: "સાંભળો", done: "થઈ ગયું · આગળનો પ્રશ્ન", cancel: "રદ કરો", saving: "યાદ સાચવી રહ્યા છીએ…", listenQuestion: "પ્રશ્ન સાંભળો", stopQuestion: "પ્રશ્ન બંધ કરો"
    }
} as const;

export default function DashboardScreen() {
    const [language, setLanguage] = useState<"English" | "ગુજરાતી" | "हिन्दी">("English");
    const [selectedPrompt, setSelectedPrompt] = useState("love");
    const [recordingUri, setRecordingUri] = useState<string | null>(null);
    const [isPreparing, setIsPreparing] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isSavingMemory, setIsSavingMemory] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [questions, setQuestions] = useState<StoryQuestion[]>([]);
    const [activeQuestion, setActiveQuestion] = useState<StoryQuestion | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [recordingId, setRecordingId] = useState<string | null>(null);
    const [transcript, setTranscript] = useState("");
    const [translation, setTranslation] = useState("");
    const [followUpQuestion, setFollowUpQuestion] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isMemorySaved, setIsMemorySaved] = useState(false);
    const [apiReady, setApiReady] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [permissionMessage, setPermissionMessage] = useState<string | null>(null);
    // Keep the session promise outside render state so recording never waits on the API.
    const sessionIdRef = useRef<string | null>(null);
    const sessionPromiseRef = useRef<Promise<string> | null>(null);

    const languageCode = language === "ગુજરાતી" ? "gu" : language === "हिन्दी" ? "hi" : "en";
    const copy = localizedCopy[languageCode];
    const speechLocale = languageCode === "hi" ? "hi-IN" : languageCode === "gu" ? "gu-IN" : "en-IN";
    const [isQuestionSpeaking, setIsQuestionSpeaking] = useState(false);

    const speakQuestion = () => {
        if (!activeQuestion?.text) return;
        void Speech.stop();
        Speech.speak(activeQuestion.text, {
            language: speechLocale,
            rate: 0.88,
            pitch: 1.0,
            onStart: () => setIsQuestionSpeaking(true),
            onDone: () => setIsQuestionSpeaking(false),
            onStopped: () => setIsQuestionSpeaking(false),
            onError: () => {
                setIsQuestionSpeaking(false);
                Alert.alert(
                    "Question audio unavailable",
                    "Please check that your phone has a text-to-speech voice installed for this language."
                );
            },
        });
    };

    const stopQuestionSpeech = () => {
        void Speech.stop();
        setIsQuestionSpeaking(false);
    };
    const categoryId = selectedPrompt === "love" ? "love" : selectedPrompt === "fears" ? "life-lessons" : "little-things";

    useEffect(() => {
        let active = true;
        (async () => {
            setIsLoadingQuestions(true);
            setApiError(null);
            setActiveQuestion(null);
            try {
                // Refresh the development session whenever the selected language changes,
                // then load questions in that language from the backend.
                await startDemoSession(languageCode);
                const result = await getQuestions(languageCode);
                if (!active) return;
                setQuestions(result.questions);
                const matchingQuestion = result.questions.find((question) => question.categoryId === categoryId);
                setActiveQuestion(matchingQuestion || result.questions[0] || null);
                setApiReady(result.questions.length > 0);
                if (!result.questions.length) {
                    setApiError(`No ${language} questions were found. In the API terminal, run: npm run prisma:seed`);
                }
            } catch (error) {
                if (active) {
                    setApiReady(false);
                    setApiError(error instanceof Error ? error.message : "Could not connect to the server.");
                }
            } finally {
                if (active) setIsLoadingQuestions(false);
            }
        })();
        return () => { active = false; };
    }, [languageCode, categoryId]);

    useEffect(() => {
        const question = questions.find((item) => item.categoryId === categoryId);
        if (question) setActiveQuestion(question);
    }, [categoryId, questions]);

    useEffect(() => {
        if (!activeQuestion?.text) return;
        void Speech.stop();
        setIsQuestionSpeaking(false);
        const timer = setTimeout(() => {
            Speech.speak(activeQuestion.text, {
                language: speechLocale,
                rate: 0.88,
                pitch: 1.0,
                onStart: () => setIsQuestionSpeaking(true),
                onDone: () => setIsQuestionSpeaking(false),
                onStopped: () => setIsQuestionSpeaking(false),
                onError: () => setIsQuestionSpeaking(false),
            });
        }, 350);
        return () => {
            clearTimeout(timer);
            void Speech.stop();
        };
    }, [activeQuestion?.id, languageCode]);

    const recorder = useAudioRecorder({
        ...RecordingPresets.HIGH_QUALITY,
        directory: "document",
    });

    const recorderState = useAudioRecorderState(recorder, 250);

    const player = useAudioPlayer(null);
    const playerStatus = useAudioPlayerStatus(player);

    const isCapturing = recorderState.isRecording || isPaused;
    const duration = Math.floor(recorderState.durationMillis / 1000);

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        return `${String(minutes).padStart(2, "0")}:${String(
            seconds
        ).padStart(2, "0")}`;
    };

    const ensureStorySession = async (): Promise<string> => {
        if (sessionIdRef.current) return sessionIdRef.current;
        if (sessionPromiseRef.current) return sessionPromiseRef.current;

        const pending = (async () => {
            // Refresh the short-lived development token before creating the session.
            await startDemoSession(languageCode);
            const availableQuestions = questions.length
                ? questions
                : (await getQuestions(languageCode)).questions;
            const selectedQuestion =
                (activeQuestion && availableQuestions.find((question) => question.id === activeQuestion.id)) ||
                availableQuestions.find((question) => question.categoryId === categoryId) ||
                availableQuestions[0];
            if (selectedQuestion) setActiveQuestion(selectedQuestion);

            const session = await createStorySession(selectedQuestion?.id, languageCode);
            const id = session.session.id;
            sessionIdRef.current = id;
            setSessionId(id);
            return id;
        })();

        sessionPromiseRef.current = pending;
        try {
            return await pending;
        } finally {
            if (sessionPromiseRef.current === pending) sessionPromiseRef.current = null;
        }
    };

    const startRecording = async () => {
        stopQuestionSpeech();
        try {
            setIsPreparing(true);
            setPermissionMessage(null);

            // Ask Android/Expo Go for microphone permission directly from the button tap.
            const permission = await requestRecordingPermissionsAsync();
            if (!permission.granted) {
                const message = permission.canAskAgain
                    ? "Microphone access was not granted. Allow microphone access for Expo Go in Android Settings, then try again."
                    : "Microphone access is blocked for Expo Go. Open Android Settings → Apps → Expo Go → Permissions → Microphone and choose Allow. Then reopen the app.";
                setPermissionMessage(message);
                Alert.alert("Microphone permission required", `${message} (Status: ${permission.status})`);
                return;
            }

            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            setRecordingUri(null);
            setIsSaved(false);
            setRecordingId(null);
            setTranscript("");
            setTranslation("");
            setFollowUpQuestion("");
            setIsMemorySaved(false);
            setSessionId(null);
            sessionIdRef.current = null;
            sessionPromiseRef.current = null;

            // Start the local recorder BEFORE making any network/API requests.
            // A backend/session error must never prevent a parent from recording locally.
            await recorder.prepareToRecordAsync();
            recorder.record();

            // Create the server session in the background. If the network is unavailable,
            // the audio still records and we can retry session creation when Stop is pressed.
            void ensureStorySession().catch((error) => {
                console.error("Story session creation failed while recording:", error);
                setApiError(error instanceof Error ? error.message : "Could not prepare the story session. The audio is still recording on this device.");
            });
        } catch (error) {
            console.error("Recording start error:", error);
            const message = error instanceof Error ? error.message : String(error);
            setPermissionMessage(message);
            Alert.alert("Couldn't start recording", message);
        } finally {
            setIsPreparing(false);
        }
    };

    const stopRecording = async () => {
        try {
            await recorder.stop();

            const uri = recorder.uri;

            if (!uri) {
                Alert.alert(
                    "Recording unavailable",
                    "We couldn't find the saved audio file. Please try again."
                );
                return;
            }

            setRecordingUri(uri);

            await setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
            });

            player.replace(uri);

            setIsProcessing(true);

            // Create or retrieve the session.
            const activeSessionId =
                sessionIdRef.current || await ensureStorySession();

            // Upload original audio only. No AI processing.
            const recording = await uploadRecording(activeSessionId, uri);

            setRecordingId(recording.id);
            setIsSaved(true);

            Alert.alert(
                "Recording saved",
                "Your original voice recording has been saved. You can preview it or continue to the next question."
            );
        } catch (error) {
            console.error("Recording upload error:", error);

            Alert.alert(
                "Couldn't save your recording",
                error instanceof Error
                    ? error.message
                    : "Please check your internet connection and try again."
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePauseResume = () => {
        try {
            if (isPaused) {
                recorder.record(); // record() resumes a paused expo-audio recorder.
                setIsPaused(false);
            } else if (recorderState.isRecording) {
                recorder.pause();
                setIsPaused(true);
            }
        } catch (error) {
            Alert.alert("Recording control", error instanceof Error ? error.message : "Couldn't change the recording state.");
        }
    };

    const handleRetake = () => {
        Alert.alert(copy.restart, "The current unsaved take will be replaced. Would you like to record again?", [
            { text: copy.cancel, style: "cancel" },
            {
                text: copy.restart,
                style: "destructive",
                onPress: () => {
                    player.pause();
                    setRecordingUri(null);
                    setIsSaved(false);
                    setRecordingId(null);
                    setTranscript("");
                    setTranslation("");
                    setFollowUpQuestion("");
                    setIsMemorySaved(false);
                    setIsPaused(false);
                    setApiError(null);
                    sessionIdRef.current = null;
                    sessionPromiseRef.current = null;
                    setSessionId(null);
                    void startRecording();
                }
            }
        ]);
    };

    const handleDone = () => {
        if (!recordingId || isSavingMemory) {
            Alert.alert(
                "Recording not saved",
                "Please finish recording and wait until the audio has uploaded."
            );
            return;
        }

        const currentIndex = questions.findIndex(
            (question) => question.id === activeQuestion?.id
        );

        const nextQuestion = questions[currentIndex + 1] || null;

        player.pause();

        setRecordingUri(null);
        setRecordingId(null);
        setIsSaved(false);
        setIsPaused(false);
        setTranscript("");
        setTranslation("");
        setFollowUpQuestion("");
        setIsMemorySaved(false);

        // Each question gets its own session.
        setSessionId(null);
        sessionIdRef.current = null;
        sessionPromiseRef.current = null;

        if (nextQuestion) {
            setActiveQuestion(nextQuestion);
            setApiError(null);
        } else {
            Alert.alert(
                "All questions completed",
                "You've completed all the available questions in this category. You can choose another category to continue."
            );
        }
    };
    const handleMicrophone = async () => {
        if (isPreparing) return;

        if (isCapturing) {
            await stopRecording();
        } else {
            await startRecording();
        }
    };

    const handlePlayback = async () => {
        if (!recordingUri) return;

        try {
            if (playerStatus.playing) {
                player.pause();
            } else {
                if (
                    playerStatus.currentTime >= playerStatus.duration &&
                    playerStatus.duration > 0
                ) {
                    player.seekTo(0);
                }

                player.play();
            }
        } catch (error) {
            console.error("Playback error:", error);
            Alert.alert("Playback error", "Couldn't play this recording.");
        }
    };

    const handleMemories = () => {
        router.push('/(tabs)/memories');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor={colors.background}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.brandRow}>
                        <Text style={styles.brand}>our stories</Text>
                        <View style={styles.brandDot} />
                    </View>

                    <Pressable
                        style={styles.settingsButton}
                        onPress={() =>
                            Alert.alert("Settings", "Settings will be available soon.")
                        }
                    >
                        <Text style={styles.settingsIcon}>☷</Text>
                    </Pressable>
                </View>

                {/* Main story card */}
                <View style={styles.mainCard}>
                    <Text style={styles.eyebrow}>{copy.eyebrow}</Text>

                    <Text style={styles.heading}>
                        {copy.heading}{"\n"}
                        <Text style={styles.headingAccent}>{copy.headingAccent}</Text>
                    </Text>

                    <Text style={styles.description}>
                        {copy.description}
                    </Text>

                    {isLoadingQuestions && !activeQuestion && (
                        <View style={styles.questionBox}><ActivityIndicator color={colors.primary} /><Text style={styles.questionText}>{copy.loading}</Text></View>
                    )}
                    {!!activeQuestion && (
                        <View style={styles.questionBox}>
                            <Text style={styles.questionEyebrow}>{copy.questionEyebrow}</Text>
                            <Text style={styles.questionText}>{activeQuestion.text}</Text>
                            <Pressable
                                style={styles.listenQuestionButton}
                                onPress={isQuestionSpeaking ? stopQuestionSpeech : speakQuestion}
                                accessibilityRole="button"
                                accessibilityLabel={isQuestionSpeaking ? copy.stopQuestion : copy.listenQuestion}
                            >
                                <Text style={styles.listenQuestionButtonText}>
                                    {isQuestionSpeaking ? "■  " + copy.stopQuestion : "🔊  " + copy.listenQuestion}
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Microphone */}
                    <View style={styles.micSection}>
                        <Pressable
                            onPress={handleMicrophone}
                            disabled={isPreparing}
                            style={({ pressed }) => [
                                styles.micButton,
                                isCapturing && styles.micButtonRecording,
                                pressed && styles.micPressed,
                            ]}
                        >
                            {isPreparing ? (
                                <ActivityIndicator color="#FFFFFF" size="large" />
                            ) : (
                                <Text style={styles.micIcon}>
                                    {isCapturing ? "■" : "▥"}
                                </Text>
                            )}
                        </Pressable>

                        <Text style={styles.micTitle}>
                            {isPreparing
                                ? copy.preparing
                                : isCapturing
                                    ? (isPaused ? copy.resume : copy.listening)
                                    : copy.letsTalk}
                        </Text>

                        {isCapturing ? (
                            <View style={styles.recordingStatus}>
                                <View style={styles.recordingDot} />
                                <Text style={styles.recordingTimer}>
                                    {isPaused ? copy.pausedStatus : copy.recordingStatus} · {formatTime(duration)}
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.micSubtitle}>
                                {isSaved
                                    ? copy.recordingReady
                                    : copy.tapMic}
                            </Text>
                        )}
                        {isCapturing && (
                            <View style={styles.recordingControls}>
                                <Pressable style={styles.secondaryControl} onPress={handlePauseResume} accessibilityRole="button">
                                    <Text style={styles.secondaryControlText}>{isPaused ? copy.resume : copy.pause}</Text>
                                </Pressable>
                                <Pressable style={styles.primaryControl} onPress={stopRecording} accessibilityRole="button">
                                    <Text style={styles.primaryControlText}>{copy.stop}</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>

                    {/* Playback after recording */}
                    {isSaved && recordingUri && (
                        <View style={styles.playbackCard}>
                            <View style={styles.playbackInfo}>
                                <View style={styles.playbackIcon}>
                                    <Text style={styles.playbackMusic}>♫</Text>
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={styles.playbackTitle}>{copy.playback}</Text>
                                    <Text style={styles.playbackSubtitle}>{copy.preview}</Text>
                                </View>

                                <Pressable
                                    style={styles.playButton}
                                    onPress={handlePlayback}
                                    accessibilityLabel={copy.preview}
                                >
                                    <Text style={styles.playButtonText}>
                                        {playerStatus.playing ? "Ⅱ" : "▶"}
                                    </Text>
                                </Pressable>
                                <Pressable style={styles.retakeButton} onPress={handleRetake}>
                                    <Text style={styles.retakeButtonText}>↻</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}

                    {isSaved && recordingId && (
                        <Pressable
                            style={styles.saveMemoryButton}
                            onPress={handleDone}
                        >
                            <Text style={styles.saveMemoryButtonText}>
                                {copy.done}
                            </Text>
                        </Pressable>
                    )}

                    <View style={styles.cardDivider} />

                    {/* Suggested prompts */}
                    <Text style={styles.promptHeading}>
                        {copy.nudge}
                    </Text>

                    <View style={styles.promptRow}>
                        {prompts.map((prompt) => (
                            <Pressable
                                key={prompt.id}
                                style={styles.promptItem}
                                onPress={() => setSelectedPrompt(prompt.id)}
                            >
                                <View
                                    style={[
                                        styles.promptCircle,
                                        { backgroundColor: prompt.color },
                                        selectedPrompt === prompt.id &&
                                        styles.promptSelected,
                                    ]}
                                >
                                    <Text style={styles.promptSymbol}>
                                        {prompt.symbol}
                                    </Text>
                                </View>

                                <Text
                                    style={[
                                        styles.promptTitle,
                                        selectedPrompt === prompt.id &&
                                        styles.promptTitleSelected,
                                    ]}
                                >
                                    {languageCode === "en" ? prompt.title : prompt.id === "love" ? copy.love : prompt.id === "fears" ? copy.fears : copy.little}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <View style={styles.cardDivider} />

                    {/* Memories */}
                    <Pressable
                        style={styles.memoriesRow}
                        onPress={handleMemories}
                    >
                        <Text style={styles.memoriesTitle}>{copy.memories}</Text>
                        <Text style={styles.memoriesArrow}>→</Text>
                    </Pressable>
                </View>

                {isProcessing && (
                    <View style={styles.processingCard}>
                        <ActivityIndicator color={colors.primary} />
                        <Text style={styles.processingText}>
                            Saving your original voice recording…
                        </Text>
                    </View>
                )}

                {!!apiError && (
                    <Text style={styles.apiError}>Questions: {apiError}</Text>
                )}
                {!!permissionMessage && (
                    <View style={styles.permissionNotice}>
                        <Text style={styles.permissionNoticeTitle}>Microphone access needed</Text>
                        <Text style={styles.permissionNoticeText}>{permissionMessage}</Text>
                    </View>
                )}

                

                {/* Language selector */}
                <View style={styles.languageRow}>
                    <Pressable
                        onPress={() => setLanguage("English")}
                        style={[
                            styles.languageOption,
                            language === "English" && styles.languageSelected,
                        ]}
                    >
                        <Text
                            style={[
                                styles.languageText,
                                language === "English" && styles.languageTextSelected,
                            ]}
                        >
                            English
                        </Text>
                    </Pressable>

                    <Text style={styles.languageSeparator}>+</Text>

                    <Pressable
                        onPress={() => setLanguage("ગુજરાતી")}
                        style={[styles.languageOption, language === "ગુજરાતી" && styles.languageSelected]}
                    >
                        <Text style={[styles.languageText, language === "ગુજરાતી" && styles.languageTextSelected]}>ગુજરાતી</Text>
                    </Pressable>
                    <Text style={styles.languageSeparator}>+</Text>
                    <Pressable
                        onPress={() => setLanguage("हिन्दी")}
                        style={[styles.languageOption, language === "हिन्दी" && styles.languageSelected]}
                    >
                        <Text style={[styles.languageText, language === "हिन्दी" && styles.languageTextSelected]}>हिन्दी</Text>
                    </Pressable>
                </View>

                {/* Preview status */}
                <View style={styles.footer}>
                    <View style={styles.footerDot} />
                    <Text style={styles.footerText}>
                        {copy.footer}
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    questionBox: { backgroundColor: "#E9EFDF", borderRadius: 16, padding: 14, marginTop: 22 },
    questionEyebrow: { color: colors.secondaryText, fontSize: 9, fontWeight: "800", letterSpacing: 1.2, marginBottom: 7 },
    questionText: { color: colors.primaryDark, fontSize: 16, lineHeight: 23, fontWeight: "600" },
    processingCard: { backgroundColor: "#F8F8F0", borderRadius: 16, padding: 16, marginTop: 14, flexDirection: "row", alignItems: "center", gap: 12 },
    processingText: { color: colors.text, fontSize: 13, flex: 1 },
    apiError: { color: "#A64E43", fontSize: 12, marginTop: 12, textAlign: "center" },
    permissionNotice: { backgroundColor: "#FFF3E8", borderColor: "#E8C6A8", borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 12 },
    permissionNoticeTitle: { color: "#8C4C25", fontSize: 13, fontWeight: "700", marginBottom: 5 },
    permissionNoticeText: { color: "#704D37", fontSize: 12, lineHeight: 18 },
    reviewCard: { backgroundColor: "#F8F8F0", borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 18, marginTop: 16 },
    reviewHeading: { color: colors.text, fontSize: 23, fontWeight: "700", marginBottom: 16 },
    reviewLabel: { color: colors.secondaryText, fontSize: 9, fontWeight: "800", letterSpacing: 1.2, marginTop: 12, marginBottom: 7 },
    reviewText: { color: colors.text, fontSize: 15, lineHeight: 23 },
    followUpBox: { backgroundColor: "#E9EFDF", borderRadius: 12, padding: 12, marginTop: 12 },
    followUpText: { color: colors.primaryDark, fontSize: 14, lineHeight: 21, fontWeight: "600" },
    saveMemoryButton: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 18 },
    savedMemoryButton: { backgroundColor: "#718174" },
    saveMemoryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 22,
        paddingTop: 10,
        paddingBottom: 28,
    },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 19,
        paddingHorizontal: 5,
    },
    brandRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
    },
    brand: {
        color: colors.text,
        fontSize: 21,
        fontWeight: "700",
        letterSpacing: -0.8,
    },
    brandDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#C88E80",
    },
    settingsButton: {
        width: 39,
        height: 39,
        borderRadius: 20,
        backgroundColor: "#F7F7EF",
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
    },
    settingsIcon: {
        color: colors.primary,
        fontSize: 22,
    },

    // Main card
    mainCard: {
        backgroundColor: "#F8F8F0",
        borderRadius: 27,
        borderWidth: 1,
        borderColor: "#E2E6DA",
        paddingHorizontal: 21,
        paddingTop: 23,
        paddingBottom: 19,
        shadowColor: "#314B38",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 5 },
        elevation: 2,
    },
    eyebrow: {
        color: colors.secondaryText,
        fontSize: 8,
        fontWeight: "800",
        letterSpacing: 1.7,
        marginBottom: 15,
    },
    heading: {
        color: colors.text,
        fontSize: 32,
        lineHeight: 39,
        fontWeight: "600",
        letterSpacing: -1,
        fontFamily: "Georgia",
    },
    headingAccent: {
        color: colors.primary,
        fontStyle: "italic",
    },
    description: {
        color: colors.secondaryText,
        fontSize: 12,
        marginTop: 9,
    },

    // Microphone
    micSection: {
        alignItems: "center",
        marginTop: 31,
        marginBottom: 23,
    },
    micButton: {
        width: 116,
        height: 116,
        borderRadius: 58,
        backgroundColor: colors.primary,
        borderWidth: 5,
        borderColor: "#E5EBDF",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: colors.primary,
        shadowOpacity: 0.18,
        shadowRadius: 13,
        shadowOffset: { width: 0, height: 6 },
        elevation: 5,
    },
    micButtonRecording: {
        backgroundColor: "#A64E43",
        borderColor: "#F0DCD5",
    },
    micPressed: {
        transform: [{ scale: 0.96 }],
    },
    micIcon: {
        color: "#FFFFFF",
        fontSize: 37,
        fontWeight: "600",
    },
    micTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: "700",
        marginTop: 14,
    },
    micSubtitle: {
        color: colors.secondaryText,
        fontSize: 10,
        marginTop: 8,
    },
    recordingStatus: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        marginTop: 8,
    },
    recordingDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: "#B84C42",
    },
    recordingTimer: {
        color: "#A64E43",
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 1,
    },

    // Playback
    playbackCard: {
        backgroundColor: "#EDF1E7",
        borderRadius: 14,
        padding: 11,
        marginBottom: 17,
    },
    playbackInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    playbackIcon: {
        width: 37,
        height: 37,
        borderRadius: 12,
        backgroundColor: "#D9E4D3",
        justifyContent: "center",
        alignItems: "center",
    },
    playbackMusic: {
        color: colors.primary,
        fontSize: 22,
    },
    playbackTitle: {
        color: colors.text,
        fontSize: 12,
        fontWeight: "700",
    },
    playbackSubtitle: {
        color: colors.secondaryText,
        fontSize: 9,
        marginTop: 3,
    },
    playButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    playButtonText: {
        color: "#FFFFFF",
        fontSize: 13,
    },

    // Prompts
    cardDivider: {
        height: 1,
        backgroundColor: "#E6E8DE",
        marginVertical: 17,
    },
    promptHeading: {
        color: colors.secondaryText,
        fontSize: 10,
        marginBottom: 15,
    },
    promptRow: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    promptItem: {
        alignItems: "center",
        gap: 7,
    },
    promptCircle: {
        width: 43,
        height: 43,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "transparent",
    },
    promptSelected: {
        borderColor: colors.primary,
    },
    promptSymbol: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "600",
    },
    promptTitle: {
        color: colors.secondaryText,
        fontSize: 10,
    },
    promptTitleSelected: {
        color: colors.primary,
        fontWeight: "700",
    },

    // Memories
    memoriesRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    memoriesTitle: {
        color: colors.text,
        fontSize: 12,
        fontWeight: "700",
    },
    memoriesArrow: {
        color: colors.primary,
        fontSize: 20,
    },

    // Language
    languageRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 17,
    },
    languageOption: {
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 15,
    },
    languageSelected: {
        backgroundColor: "#DCE6D6",
    },
    languageText: {
        color: colors.secondaryText,
        fontSize: 11,
    },
    languageTextSelected: {
        color: colors.primary,
        fontWeight: "700",
    },
    languageSeparator: {
        color: colors.secondaryText,
        fontSize: 11,
    },

    // Footer
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 7,
        marginTop: 19,
    },
    footerDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: colors.primary,
    },
    footerText: {
        color: colors.secondaryText,
        fontSize: 8,
        fontWeight: "700",
        letterSpacing: 1.1,
    },

    recordingControls: { flexDirection: "row", gap: 10, width: "100%", marginTop: 16 },
    secondaryControl: { flex: 1, minHeight: 46, borderRadius: 24, borderWidth: 1, borderColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    secondaryControlText: { color: colors.primary, fontSize: 14, fontWeight: "700" },
    primaryControl: { flex: 1, minHeight: 46, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    primaryControlText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
    retakeButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#F1E9DB", marginLeft: 8 },
    retakeButtonText: { color: colors.primary, fontSize: 25, fontWeight: "600" },

    listenQuestionButton: { alignSelf: "flex-start", marginTop: 12, borderRadius: 22, backgroundColor: "#E7EFDF", paddingVertical: 9, paddingHorizontal: 15 },
    listenQuestionButtonText: { color: colors.primary, fontSize: 13, fontWeight: "700" },
});
