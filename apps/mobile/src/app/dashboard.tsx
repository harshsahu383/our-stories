
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
    createStoryPrompt,
    getStoryPrompt,
    uploadRecording,
    type StoryQuestion,
    type AnswerType,
    type StoryPrompt,
} from "../services/api";

const prompts = [
    { id: "love", title: "Love", symbol: "♡", color: "#D9A5A0" },
    { id: "fears", title: "Fears", symbol: "✦", color: "#D7B95F" },
    { id: "little", title: "Little things", symbol: "✧", color: "#8EABB4" },
];

const localizedCopy = {
    en: {
        eyebrow: "NO STORY GOES UNTOLD",
        heading: "Your stories.",
        headingAccent: "In your voice.",
        description: "No right place to begin. Just you.",
        questionEyebrow: "A QUESTION TO BEGIN",
        loading: "Loading questions…",
        preparing: "Getting ready…",
        listening: "Listening to you",
        letsTalk: "Let's talk",
        recordingReady: "Your voice recording is ready",
        recordingStatus: "RECORDING",
        pausedStatus: "PAUSED",
        tapMic: "Tap the microphone to begin",
        playback: "Your recording",
        nudge: "A little nudge, if you'd like",
        memories: "My memories",
        footer: "PRIVATE · YOUR VOICE · YOUR MEMORIES",
        love: "Love",
        fears: "Fears",
        little: "Little things",
        pause: "Pause",
        resume: "Resume",
        stop: "Finish recording",
        restart: "Record again",
        preview: "Preview",
        done: "Done · Continue",
        cancel: "Cancel",
        listenQuestion: "Listen to question",
        stopQuestion: "Stop question",
        main: "MAIN QUESTION",
        permanent: "FOLLOW-UP QUESTION",
        ai: "A PERSONAL FOLLOW-UP",
        waiting: "Preparing your next question…",
        upload: "Uploading your recording…",
    },
    hi: {
        eyebrow: "हर कहानी अनमोल है",
        heading: "आपकी कहानियाँ।",
        headingAccent: "आपकी आवाज़ में।",
        description: "शुरुआत करने का कोई सही तरीका नहीं। बस आप।",
        questionEyebrow: "शुरुआत के लिए एक सवाल",
        loading: "सवाल लोड हो रहे हैं…",
        preparing: "तैयारी हो रही है…",
        listening: "हम सुन रहे हैं",
        letsTalk: "बात शुरू करें",
        recordingReady: "आपकी रिकॉर्डिंग तैयार है",
        recordingStatus: "रिकॉर्डिंग",
        pausedStatus: "रुकी हुई",
        tapMic: "शुरू करने के लिए माइक्रोफ़ोन दबाएँ",
        playback: "आपकी रिकॉर्डिंग",
        nudge: "अगर चाहें तो एक छोटा सुझाव",
        memories: "मेरी यादें",
        footer: "निजी · आपकी आवाज़ · आपकी यादें",
        love: "प्यार",
        fears: "डर",
        little: "छोटी बातें",
        pause: "रोकें",
        resume: "फिर शुरू करें",
        stop: "रिकॉर्डिंग पूरी करें",
        restart: "दोबारा रिकॉर्ड करें",
        preview: "सुनें",
        done: "हो गया · आगे बढ़ें",
        cancel: "रद्द करें",
        listenQuestion: "सवाल सुनें",
        stopQuestion: "सवाल रोकें",
        main: "मुख्य सवाल",
        permanent: "आगे का सवाल",
        ai: "आपके लिए एक खास सवाल",
        waiting: "अगला सवाल तैयार हो रहा है…",
        upload: "रिकॉर्डिंग अपलोड हो रही है…",
    },
    gu: {
        eyebrow: "દરેક વાર્તા અનમોલ છે",
        heading: "તમારી વાર્તાઓ.",
        headingAccent: "તમારા અવાજમાં.",
        description: "શરૂઆત કરવાની કોઈ સાચી રીત નથી. બસ તમે.",
        questionEyebrow: "શરૂઆત માટે એક પ્રશ્ન",
        loading: "પ્રશ્નો લોડ થઈ રહ્યા છે…",
        preparing: "તૈયારી થઈ રહી છે…",
        listening: "અમે સાંભળી રહ્યા છીએ",
        letsTalk: "ચાલો વાત કરીએ",
        recordingReady: "તમારું રેકોર્ડિંગ તૈયાર છે",
        recordingStatus: "રેકોર્ડિંગ",
        pausedStatus: "થોભેલું",
        tapMic: "શરૂ કરવા માઇક્રોફોન દબાવો",
        playback: "તમારું રેકોર્ડિંગ",
        nudge: "ઇચ્છા હોય તો એક નાનો સંકેત",
        memories: "મારી યાદો",
        footer: "ખાનગી · તમારો અવાજ · તમારી યાદો",
        love: "પ્રેમ",
        fears: "ડર",
        little: "નાની વાતો",
        pause: "થોભો",
        resume: "ફરી શરૂ કરો",
        stop: "રેકોર્ડિંગ પૂર્ણ કરો",
        restart: "ફરી રેકોર્ડ કરો",
        preview: "સાંભળો",
        done: "થઈ ગયું · આગળ વધો",
        cancel: "રદ કરો",
        listenQuestion: "પ્રશ્ન સાંભળો",
        stopQuestion: "પ્રશ્ન બંધ કરો",
        main: "મુખ્ય પ્રશ્ન",
        permanent: "આગળનો પ્રશ્ન",
        ai: "તમારા માટે ખાસ પ્રશ્ન",
        waiting: "આગળનો પ્રશ્ન તૈયાર થઈ રહ્યો છે…",
        upload: "રેકોર્ડિંગ અપલોડ થઈ રહ્યું છે…",
    },
} as const;

export default function DashboardScreen() {
    const [language, setLanguage] = useState<"English" | "ગુજરાતી" | "हिन्दी">("English");
    const [selectedPrompt, setSelectedPrompt] = useState("love");

    const [questions, setQuestions] = useState<StoryQuestion[]>([]);
    const [activeQuestion, setActiveQuestion] = useState<StoryQuestion | null>(null);

    const [answerType, setAnswerType] = useState<AnswerType>("MAIN");
    const [permanentFollowUpText, setPermanentFollowUpText] = useState("");
    const [aiFollowUpText, setAiFollowUpText] = useState("");
    const [isWaitingForAI, setIsWaitingForAI] = useState(false);

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [storyPromptId, setStoryPromptId] = useState<string | null>(null);

    const [recordingUri, setRecordingUri] = useState<string | null>(null);
    const [recordingId, setRecordingId] = useState<string | null>(null);
    const [isPreparing, setIsPreparing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [isQuestionSpeaking, setIsQuestionSpeaking] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

    const sessionIdRef = useRef<string | null>(null);
    const sessionPromiseRef = useRef<Promise<string> | null>(null);

    const storyPromptIdRef = useRef<string | null>(null);
    const promptQuestionIdRef = useRef<string | null>(null);
    const promptPromiseRef = useRef<Promise<StoryPrompt> | null>(null);

    const languageCode =
        language === "ગુજરાતી" ? "gu" :
            language === "हिन्दी" ? "hi" : "en";

    const speechLocale =
        languageCode === "hi" ? "hi-IN" :
            languageCode === "gu" ? "gu-IN" : "en-IN";

    const copy = localizedCopy[languageCode];

    const categoryId =
        selectedPrompt === "love" ? "love" :
            selectedPrompt === "fears" ? "life-lessons" :
                "little-things";

    const displayedQuestion =
        answerType === "MAIN"
            ? activeQuestion?.text || ""
            : answerType === "PERMANENT_FOLLOW_UP"
                ? permanentFollowUpText
                : aiFollowUpText;

    const stepLabel =
        answerType === "MAIN" ? copy.main :
            answerType === "PERMANENT_FOLLOW_UP" ? copy.permanent :
                copy.ai;

    // --------------------------------------------------
    // SESSION AND PROMPT MANAGEMENT
    // --------------------------------------------------

    const ensureStorySession = async (): Promise<string> => {
        if (sessionIdRef.current) {
            return sessionIdRef.current;
        }

        if (sessionPromiseRef.current) {
            return sessionPromiseRef.current;
        }

        const pending = (async () => {
            await startDemoSession(languageCode);

            const result = await createStorySession(undefined, languageCode);
            const id = result.session.id;

            sessionIdRef.current = id;
            setSessionId(id);

            return id;
        })();

        sessionPromiseRef.current = pending;

        try {
            return await pending;
        } finally {
            if (sessionPromiseRef.current === pending) {
                sessionPromiseRef.current = null;
            }
        }
    };

    const ensureStoryPrompt = async (
        question: StoryQuestion
    ): Promise<StoryPrompt> => {
        if (
            storyPromptIdRef.current &&
            promptQuestionIdRef.current === question.id
        ) {
            const existing = await getStoryPrompt(
                sessionIdRef.current!,
                storyPromptIdRef.current
            );

            return existing.storyPrompt;
        }

        if (
            promptPromiseRef.current &&
            promptQuestionIdRef.current === question.id
        ) {
            return promptPromiseRef.current;
        }

        const pending = (async () => {
            const activeSessionId = await ensureStorySession();

            const result = await createStoryPrompt(
                activeSessionId,
                question.id
            );

            const prompt = result.storyPrompt;

            storyPromptIdRef.current = prompt.id;
            promptQuestionIdRef.current = question.id;

            setStoryPromptId(prompt.id);
            setPermanentFollowUpText(prompt.permanentFollowUpText || "");
            setAiFollowUpText("");

            return prompt;
        })();

        promptQuestionIdRef.current = question.id;
        promptPromiseRef.current = pending;

        try {
            return await pending;
        } finally {
            if (promptPromiseRef.current === pending) {
                promptPromiseRef.current = null;
            }
        }
    };

    // --------------------------------------------------
    // LOAD QUESTIONS
    // --------------------------------------------------

    useEffect(() => {
        let active = true;

        const load = async () => {
            setIsLoadingQuestions(true);
            setApiError(null);

            try {
                await startDemoSession(languageCode);

                const result = await getQuestions(languageCode);

                if (!active) return;

                setQuestions(result.questions);

                const firstQuestion = result.questions.find(
                    question => question.categoryId === categoryId
                );

                setActiveQuestion(firstQuestion || result.questions[0] || null);

                // A language change starts a new session.
                sessionIdRef.current = null;
                sessionPromiseRef.current = null;
                storyPromptIdRef.current = null;
                promptQuestionIdRef.current = null;
                promptPromiseRef.current = null;

                setSessionId(null);
                setStoryPromptId(null);
                setAnswerType("MAIN");
                setPermanentFollowUpText("");
                setAiFollowUpText("");
                setRecordingUri(null);
                setRecordingId(null);
                setIsSaved(false);
            } catch (error) {
                if (active) {
                    setApiError(
                        error instanceof Error
                            ? error.message
                            : "Could not load questions."
                    );
                }
            } finally {
                if (active) setIsLoadingQuestions(false);
            }
        };

        void load();

        return () => {
            active = false;
        };
    }, [languageCode]);

    // --------------------------------------------------
    // QUESTION DISPLAY AND SPEECH
    // --------------------------------------------------

    const stopQuestionSpeech = () => {
        void Speech.stop();
        setIsQuestionSpeaking(false);
    };

    const speakQuestion = () => {
        if (!displayedQuestion) return;

        stopQuestionSpeech();

        Speech.speak(displayedQuestion, {
            language: speechLocale,
            rate: 0.88,
            pitch: 1,
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

    useEffect(() => {
        if (!displayedQuestion) return;

        stopQuestionSpeech();

        const timer = setTimeout(() => {
            Speech.speak(displayedQuestion, {
                language: speechLocale,
                rate: 0.88,
                pitch: 1,
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
    }, [displayedQuestion, speechLocale]);

    // --------------------------------------------------
    // AUDIO SETUP
    // --------------------------------------------------

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

        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    };

    const clearCurrentRecording = () => {
        setRecordingUri(null);
        setRecordingId(null);
        setIsSaved(false);
        setIsPaused(false);
    };

    // --------------------------------------------------
    // START RECORDING
    // --------------------------------------------------

    const startRecording = async () => {
        if (!activeQuestion || isPreparing || isProcessing || isWaitingForAI) {
            return;
        }

        stopQuestionSpeech();

        try {
            setIsPreparing(true);
            setPermissionMessage(null);
            setApiError(null);

            const permission = await requestRecordingPermissionsAsync();

            if (!permission.granted) {
                const message = permission.canAskAgain
                    ? "Microphone access was not granted. Allow microphone access for the app in Android Settings."
                    : "Open Android Settings → Apps → Expo Go → Permissions → Microphone and choose Allow.";

                setPermissionMessage(message);
                Alert.alert("Microphone permission required", message);
                return;
            }

            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });

            clearCurrentRecording();

            await recorder.prepareToRecordAsync();
            recorder.record();

            // Prepare the server prompt while the local recorder is running.
            void ensureStoryPrompt(activeQuestion).catch(error => {
                console.error("Prompt preparation error:", error);
                setApiError(
                    error instanceof Error
                        ? error.message
                        : "Could not prepare the story prompt."
                );
            });
        } catch (error) {
            console.error("Recording start error:", error);

            const message =
                error instanceof Error ? error.message : String(error);

            setPermissionMessage(message);
            Alert.alert("Couldn't start recording", message);
        } finally {
            setIsPreparing(false);
        }
    };

    // --------------------------------------------------
    // STOP AND UPLOAD RECORDING
    // --------------------------------------------------

    const stopRecording = async () => {
        if (isProcessing) return;

        try {
            setIsProcessing(true);

            await recorder.stop();

            const uri = recorder.uri;

            if (!uri) {
                throw new Error("The recorded audio file could not be found.");
            }

            setRecordingUri(uri);

            await setAudioModeAsync({
                allowsRecording: false,
                playsInSilentMode: true,
            });

            player.replace(uri);

            if (!activeQuestion) {
                throw new Error("No active question was found.");
            }

            const prompt = await ensureStoryPrompt(activeQuestion);
            const activeSessionId = await ensureStorySession();

            const filename = `recording-${Date.now()}.m4a`;

            const recording = await uploadRecording(
                activeSessionId,
                uri,
                filename,
                prompt.id,
                answerType
            );

            setRecordingId(recording.id);
            setIsSaved(true);

            Alert.alert(
                "Recording uploaded",
                "Your original voice recording has been uploaded. It is now being processed."
            );
        } catch (error) {
            console.error("Recording upload error:", error);

            Alert.alert(
                "Couldn't save your recording",
                error instanceof Error ? error.message : "Please try again."
            );
        } finally {
            setIsProcessing(false);
        }
    };

    // --------------------------------------------------
    // PAUSE AND RESUME
    // --------------------------------------------------

    const handlePauseResume = () => {
        try {
            if (isPaused) {
                recorder.record();
                setIsPaused(false);
            } else if (recorderState.isRecording) {
                recorder.pause();
                setIsPaused(true);
            }
        } catch (error) {
            Alert.alert(
                "Recording control",
                error instanceof Error
                    ? error.message
                    : "Couldn't change the recording state."
            );
        }
    };

    // --------------------------------------------------
    // RETAKE
    // --------------------------------------------------

    const handleRetake = () => {
        if (recordingId) {
            Alert.alert(
                "Recording already uploaded",
                "This answer has already been uploaded. The current backend does not yet support replacing an uploaded answer."
            );
            return;
        }

        Alert.alert(
            copy.restart,
            "The current local recording will be replaced. Would you like to record again?",
            [
                { text: copy.cancel, style: "cancel" },
                {
                    text: copy.restart,
                    style: "destructive",
                    onPress: () => {
                        player.pause();
                        clearCurrentRecording();
                        void startRecording();
                    },
                },
            ]
        );
    };

    // --------------------------------------------------
    // WAIT FOR AI FOLLOW-UP
    // --------------------------------------------------

    const waitForAIFollowUp = async (): Promise<string> => {
        const activeSessionId = sessionIdRef.current;
        const activePromptId = storyPromptIdRef.current;

        if (!activeSessionId || !activePromptId) {
            throw new Error("The current story prompt could not be found.");
        }

        setIsWaitingForAI(true);

        try {
            // Check every two seconds for up to three minutes.
            for (let attempt = 0; attempt < 90; attempt++) {
                const result = await getStoryPrompt(
                    activeSessionId,
                    activePromptId
                );

                const prompt = result.storyPrompt;

                if (
                    prompt.aiFollowUpStatus === "READY" &&
                    prompt.aiFollowUpText
                ) {
                    setAiFollowUpText(prompt.aiFollowUpText);
                    return prompt.aiFollowUpText;
                }

                if (prompt.aiFollowUpStatus === "FAILED") {
                    throw new Error(
                        "The AI follow-up could not be generated. Please check the backend logs."
                    );
                }

                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            throw new Error(
                "The next question is taking longer than expected. Please try again."
            );
        } finally {
            setIsWaitingForAI(false);
        }
    };

    // --------------------------------------------------
    // DONE: MOVE THROUGH THE THREE ANSWERS
    // --------------------------------------------------

    const handleDone = async () => {
        if (!recordingId || !isSaved || isProcessing || isWaitingForAI) {
            Alert.alert(
                "Recording not ready",
                "Please finish recording and wait until the upload is complete."
            );
            return;
        }

        player.pause();
        clearCurrentRecording();

        // Step 1 -> Step 2
        if (answerType === "MAIN") {
            if (!permanentFollowUpText.trim()) {
                Alert.alert(
                    "Follow-up question missing",
                    "This question does not have a permanent follow-up configured in the database."
                );
                return;
            }

            setAnswerType("PERMANENT_FOLLOW_UP");
            return;
        }

        // Step 2 -> Step 3
        if (answerType === "PERMANENT_FOLLOW_UP") {
            try {
                await waitForAIFollowUp();
                setAnswerType("AI_FOLLOW_UP");
            } catch (error) {
                Alert.alert(
                    "Couldn't prepare the next question",
                    error instanceof Error
                        ? error.message
                        : "Please try again."
                );
            }

            return;
        }

        // Step 3 -> Next main question
        const categoryQuestions = questions.filter(
            question => question.categoryId === categoryId
        );

        const currentIndex = categoryQuestions.findIndex(
            question => question.id === activeQuestion?.id
        );

        const nextQuestion = categoryQuestions[currentIndex + 1];

        if (!nextQuestion) {
            Alert.alert(
                "Category completed",
                "You've completed all the available questions in this category. You can choose another category to continue."
            );
            return;
        }

        setActiveQuestion(nextQuestion);

        // Keep the same session, but prepare a new prompt for the next question.
        storyPromptIdRef.current = null;
        promptQuestionIdRef.current = null;
        promptPromiseRef.current = null;

        setStoryPromptId(null);
        setPermanentFollowUpText("");
        setAiFollowUpText("");
        setAnswerType("MAIN");
        setApiError(null);
    };

    // --------------------------------------------------
    // MICROPHONE BUTTON
    // --------------------------------------------------

    const handleMicrophone = async () => {
        if (isPreparing || isProcessing || isWaitingForAI) return;

        if (isCapturing) {
            await stopRecording();
        } else {
            await startRecording();
        }
    };

    // --------------------------------------------------
    // PLAYBACK
    // --------------------------------------------------

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

    // --------------------------------------------------
    // CATEGORY SELECTION
    // --------------------------------------------------

    const handleCategoryChange = (promptId: string) => {
        if (isCapturing || isProcessing || recordingId || isWaitingForAI) {
            Alert.alert(
                "Finish this answer first",
                "Please complete the current recording before changing categories."
            );
            return;
        }

        setSelectedPrompt(promptId);

        const nextCategoryId =
            promptId === "love" ? "love" :
                promptId === "fears" ? "life-lessons" :
                    "little-things";

        const nextQuestion = questions.find(
            question => question.categoryId === nextCategoryId
        );

        if (nextQuestion) {
            setActiveQuestion(nextQuestion);

            storyPromptIdRef.current = null;
            promptQuestionIdRef.current = null;
            promptPromiseRef.current = null;

            setStoryPromptId(null);
            setPermanentFollowUpText("");
            setAiFollowUpText("");
            setAnswerType("MAIN");
            setApiError(null);
        }
    };

    const handleMemories = () => {
        router.push("/(tabs)/memories");
    };

    // --------------------------------------------------
    // UI
    // --------------------------------------------------

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

                <View style={styles.mainCard}>
                    <Text style={styles.eyebrow}>{copy.eyebrow}</Text>

                    <Text style={styles.heading}>
                        {copy.heading}{"\n"}
                        <Text style={styles.headingAccent}>
                            {copy.headingAccent}
                        </Text>
                    </Text>

                    <Text style={styles.description}>
                        {copy.description}
                    </Text>

                    {isLoadingQuestions && !activeQuestion && (
                        <View style={styles.questionBox}>
                            <ActivityIndicator color={colors.primary} />
                            <Text style={styles.questionText}>
                                {copy.loading}
                            </Text>
                        </View>
                    )}

                    {!!activeQuestion && (
                        <View style={styles.questionBox}>
                            <Text style={styles.questionEyebrow}>
                                {stepLabel}
                            </Text>

                            <Text style={styles.questionText}>
                                {displayedQuestion}
                            </Text>

                            <Pressable
                                style={styles.listenQuestionButton}
                                onPress={
                                    isQuestionSpeaking
                                        ? stopQuestionSpeech
                                        : speakQuestion
                                }
                            >
                                <Text style={styles.listenQuestionButtonText}>
                                    {isQuestionSpeaking
                                        ? "■  " + copy.stopQuestion
                                        : "🔊  " + copy.listenQuestion}
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    {isWaitingForAI && (
                        <View style={styles.processingCard}>
                            <ActivityIndicator color={colors.primary} />
                            <Text style={styles.processingText}>
                                {copy.waiting}
                            </Text>
                        </View>
                    )}

                    <View style={styles.micSection}>
                        <Pressable
                            onPress={handleMicrophone}
                            disabled={
                                isPreparing ||
                                isProcessing ||
                                isWaitingForAI ||
                                !activeQuestion
                            }
                            style={({ pressed }) => [
                                styles.micButton,
                                isCapturing && styles.micButtonRecording,
                                pressed && styles.micPressed,
                            ]}
                        >
                            {isPreparing ? (
                                <ActivityIndicator
                                    color="#FFFFFF"
                                    size="large"
                                />
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
                                    {isPaused
                                        ? copy.pausedStatus
                                        : copy.recordingStatus}
                                    {" · "}
                                    {formatTime(duration)}
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
                                <Pressable
                                    style={styles.secondaryControl}
                                    onPress={handlePauseResume}
                                >
                                    <Text style={styles.secondaryControlText}>
                                        {isPaused ? copy.resume : copy.pause}
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={styles.primaryControl}
                                    onPress={stopRecording}
                                >
                                    <Text style={styles.primaryControlText}>
                                        {copy.stop}
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    </View>

                    {isProcessing && (
                        <View style={styles.processingCard}>
                            <ActivityIndicator color={colors.primary} />
                            <Text style={styles.processingText}>
                                {copy.upload}
                            </Text>
                        </View>
                    )}

                    {isSaved && recordingUri && (
                        <View style={styles.playbackCard}>
                            <View style={styles.playbackInfo}>
                                <View style={styles.playbackIcon}>
                                    <Text style={styles.playbackMusic}>♫</Text>
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text style={styles.playbackTitle}>
                                        {copy.playback}
                                    </Text>
                                    <Text style={styles.playbackSubtitle}>
                                        {copy.preview}
                                    </Text>
                                </View>

                                <Pressable
                                    style={styles.playButton}
                                    onPress={handlePlayback}
                                >
                                    <Text style={styles.playButtonText}>
                                        {playerStatus.playing ? "Ⅱ" : "▶"}
                                    </Text>
                                </Pressable>

                                {!recordingId && (
                                    <Pressable
                                        style={styles.retakeButton}
                                        onPress={handleRetake}
                                    >
                                        <Text style={styles.retakeButtonText}>
                                            ↻
                                        </Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    )}

                    {isSaved && recordingId && (
                        <Pressable
                            style={styles.saveMemoryButton}
                            onPress={handleDone}
                            disabled={isWaitingForAI || isProcessing}
                        >
                            <Text style={styles.saveMemoryButtonText}>
                                {copy.done}
                            </Text>
                        </Pressable>
                    )}

                    <View style={styles.cardDivider} />

                    <Text style={styles.promptHeading}>
                        {copy.nudge}
                    </Text>

                    <View style={styles.promptRow}>
                        {prompts.map(prompt => (
                            <Pressable
                                key={prompt.id}
                                style={styles.promptItem}
                                onPress={() => handleCategoryChange(prompt.id)}
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
                                    {prompt.id === "love"
                                        ? copy.love
                                        : prompt.id === "fears"
                                            ? copy.fears
                                            : copy.little}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <View style={styles.cardDivider} />

                    <Pressable
                        style={styles.memoriesRow}
                        onPress={handleMemories}
                    >
                        <Text style={styles.memoriesTitle}>
                            {copy.memories}
                        </Text>
                        <Text style={styles.memoriesArrow}>→</Text>
                    </Pressable>
                </View>

                {!!apiError && (
                    <Text style={styles.apiError}>
                        {apiError}
                    </Text>
                )}

                {!!permissionMessage && (
                    <View style={styles.permissionNotice}>
                        <Text style={styles.permissionNoticeTitle}>
                            Microphone access needed
                        </Text>
                        <Text style={styles.permissionNoticeText}>
                            {permissionMessage}
                        </Text>
                    </View>
                )}

                <View style={styles.languageRow}>
                    <Pressable
                        disabled={isCapturing || isProcessing || !!recordingId}
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
                        disabled={isCapturing || isProcessing || !!recordingId}
                        onPress={() => setLanguage("ગુજરાતી")}
                        style={[
                            styles.languageOption,
                            language === "ગુજરાતી" && styles.languageSelected,
                        ]}
                    >
                        <Text
                            style={[
                                styles.languageText,
                                language === "ગુજરાતી" && styles.languageTextSelected,
                            ]}
                        >
                            ગુજરાતી
                        </Text>
                    </Pressable>

                    <Text style={styles.languageSeparator}>+</Text>

                    <Pressable
                        disabled={isCapturing || isProcessing || !!recordingId}
                        onPress={() => setLanguage("हिन्दी")}
                        style={[
                            styles.languageOption,
                            language === "हिन्दी" && styles.languageSelected,
                        ]}
                    >
                        <Text
                            style={[
                                styles.languageText,
                                language === "हिन्दी" && styles.languageTextSelected,
                            ]}
                        >
                            हिन्दी
                        </Text>
                    </Pressable>
                </View>

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

// --------------------------------------------------
// STYLES
// --------------------------------------------------

const styles = StyleSheet.create({
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
    questionBox: {
        backgroundColor: "#E9EFDF",
        borderRadius: 16,
        padding: 14,
        marginTop: 22,
    },
    questionEyebrow: {
        color: colors.secondaryText,
        fontSize: 9,
        fontWeight: "800",
        letterSpacing: 1.2,
        marginBottom: 7,
    },
    questionText: {
        color: colors.primaryDark,
        fontSize: 16,
        lineHeight: 23,
        fontWeight: "600",
    },
    listenQuestionButton: {
        alignSelf: "flex-start",
        marginTop: 12,
        borderRadius: 22,
        backgroundColor: "#E7EFDF",
        paddingVertical: 9,
        paddingHorizontal: 15,
    },
    listenQuestionButtonText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: "700",
    },
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
    recordingControls: {
        flexDirection: "row",
        gap: 10,
        width: "100%",
        marginTop: 16,
    },
    secondaryControl: {
        flex: 1,
        minHeight: 46,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
    },
    secondaryControlText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: "700",
    },
    primaryControl: {
        flex: 1,
        minHeight: 46,
        borderRadius: 24,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
    },
    primaryControlText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "700",
    },
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
    retakeButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F1E9DB",
        marginLeft: 8,
    },
    retakeButtonText: {
        color: colors.primary,
        fontSize: 25,
        fontWeight: "600",
    },
    saveMemoryButton: {
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: "center",
        marginTop: 18,
    },
    saveMemoryButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
    },
    processingCard: {
        backgroundColor: "#F8F8F0",
        borderRadius: 16,
        padding: 16,
        marginTop: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    processingText: {
        color: colors.text,
        fontSize: 13,
        flex: 1,
    },
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
    permissionNotice: {
        backgroundColor: "#FFF3E8",
        borderColor: "#E8C6A8",
        borderWidth: 1,
        borderRadius: 14,
        padding: 13,
        marginTop: 12,
    },
    permissionNoticeTitle: {
        color: "#8C4C25",
        fontSize: 13,
        fontWeight: "700",
        marginBottom: 5,
    },
    permissionNoticeText: {
        color: "#704D37",
        fontSize: 12,
        lineHeight: 18,
    },
    apiError: {
        color: "#A64E43",
        fontSize: 12,
        marginTop: 12,
        textAlign: "center",
    },
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
});
