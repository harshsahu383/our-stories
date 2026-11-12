
import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Keyboard,
    Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "../theme/colors";

export default function VerifyEmailScreen() {
    const { email } = useLocalSearchParams<{ email: string }>();

    const [otp, setOtp] = useState("");
    const otpInputRef = useRef<TextInput>(null);
    const [seconds, setSeconds] = useState(30);

    useEffect(() => {
        if (seconds <= 0) return;

        const timer = setTimeout(() => {
            setSeconds((previous) => previous - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [seconds]);

    const handleResend = () => {
        if (seconds > 0) return;

        setOtp("");
        setSeconds(30);

        Alert.alert(
            "Coming soon",
            "Email OTP resend will work once backend integration is complete."
        );
    };

    const handleVerify = () => {
        Keyboard.dismiss();

        if (otp.length !== 6) {
            Alert.alert(
                "Incomplete code",
                "Please enter your complete 6-digit verification code."
            );
            return;
        }

        Alert.alert(
            "Backend integration pending",
            "Your OTP verification will be connected to the server next."
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor={colors.background}
            />

            <KeyboardAvoidingView
                style={styles.keyboardContainer}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                    automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                >
                    {/* Header */}
                    <View style={styles.topBar}>
                        <Pressable
                            style={styles.backButton}
                            onPress={() => router.back()}
                        >
                            <Text style={styles.backArrow}>←</Text>
                        </Pressable>

                        <Text style={styles.brandName}>our stories</Text>

                        <View style={styles.stepBadge}>
                            <Text style={styles.stepText}>02 / 03</Text>
                        </View>
                    </View>

                    {/* Email illustration */}
                    <View style={styles.illustrationContainer}>
                        <View style={styles.outerCircle}>
                            <View style={styles.middleCircle}>
                                <View style={styles.mailCard}>
                                    <Text style={styles.mailIcon}>✉</Text>
                                </View>
                                <View style={styles.verifiedBadge}>
                                    <Text style={styles.verifiedCheck}>✓</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.decorativeDotOne} />
                        <View style={styles.decorativeDotTwo} />
                        <Text style={styles.decorativeStar}>✳</Text>
                    </View>

                    {/* Heading */}
                    <View style={styles.headingSection}>
                        <View style={styles.eyebrow}>
                            <View style={styles.eyebrowLine} />
                            <Text style={styles.eyebrowText}>ONE SMALL STEP</Text>
                        </View>

                        <Text style={styles.heading}>
                            Check your{"\n"}
                            <Text style={styles.headingAccent}>inbox.</Text>
                        </Text>

                        <Text style={styles.subtitle}>
                            We've sent a 6-digit verification code to your email.
                            Enter it below to continue your journey.
                        </Text>
                    </View>

                    {/* Email card */}
                    <View style={styles.emailCard}>
                        <View style={styles.emailIconBox}>
                            <Text style={styles.emailIcon}>✉</Text>
                        </View>

                        <View style={styles.emailDetails}>
                            <Text style={styles.emailLabel}>VERIFICATION EMAIL</Text>
                            <Text style={styles.emailAddress} numberOfLines={1}>
                                {email || "your email address"}
                            </Text>
                        </View>

                        <Pressable
                            onPress={() => router.back()}
                            style={styles.editButton}
                        >
                            <Text style={styles.editText}>EDIT</Text>
                        </Pressable>
                    </View>

                    {/* OTP form */}
                    <View style={styles.otpCard}>
                        <Text style={styles.otpTitle}>Enter verification code</Text>
                        <Text style={styles.otpSubtitle}>
                            Your code contains six digits.
                        </Text>

                        <View style={styles.otpInputRow}>
                            <View
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            >
                                <View style={styles.otpBoxesContainer}>
                                    {Array.from({ length: 6 }).map((_, index) => (
                                        <View
                                            key={index}
                                            style={[
                                                styles.otpBox,
                                                otp.length === index && styles.otpBoxActive,
                                                otp.length > index && styles.otpBoxFilled,
                                            ]}
                                        >
                                            <Text style={styles.otpDigit}>
                                                {otp[index] || ""}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            <Pressable
                                style={StyleSheet.absoluteFill}
                                onPress={() => otpInputRef.current?.focus()}
                            />

                            <TextInput
                                ref={otpInputRef}
                                style={styles.hiddenOtpInput}
                                value={otp}
                                onChangeText={(value) =>
                                    setOtp(value.replace(/[^0-9]/g, "").slice(0, 6))
                                }
                                keyboardType="number-pad"
                                maxLength={6}
                                autoComplete="one-time-code"
                                textContentType="oneTimeCode"
                                caretHidden
                            />
                        </View>

                        <Pressable
                            style={styles.otpTapArea}
                            onPress={() => otpInputRef?.current?.focus?.()}
                        />

                        <View style={styles.otpFooter}>
                            <Text style={styles.otpCount}>
                                {otp.length}/6 digits entered
                            </Text>

                            <View style={styles.resendRow}>
                                <Text style={styles.resendHint}>Didn't receive it? </Text>
                                <Pressable onPress={handleResend} disabled={seconds > 0}>
                                    <Text
                                        style={[
                                            styles.resendLink,
                                            seconds > 0 && styles.resendDisabled,
                                        ]}
                                    >
                                        {seconds > 0
                                            ? `Resend in 00:${String(seconds).padStart(2, "0")}`
                                            : "Resend code"}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>

                    {/* Verify button */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.verifyButton,
                            pressed && styles.buttonPressed,
                        ]}
                        onPress={handleVerify}
                    >
                        <Text style={styles.verifyButtonText}>Verify my email</Text>
                        <View style={styles.verifyArrowCircle}>
                            <Text style={styles.verifyArrow}>↗</Text>
                        </View>
                    </Pressable>

                    {/* Privacy note */}
                    <View style={styles.privacyNote}>
                        <Text style={styles.privacyIcon}>✧</Text>
                        <Text style={styles.privacyText}>
                            Your stories are personal. Your privacy matters.
                        </Text>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            A lifetime of memories. A legacy of love.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardContainer: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 23,
        paddingTop: 8,
        paddingBottom: 25,
    },

    

    // Header
    topBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 22,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: "#F8F8F0",
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: "center",
        alignItems: "center",
    },
    backArrow: {
        color: colors.primary,
        fontSize: 23,
    },
    brandName: {
        color: colors.text,
        fontSize: 18,
        fontWeight: "700",
        letterSpacing: -0.7,
    },
    stepBadge: {
        backgroundColor: "#DCE6D6",
        borderRadius: 20,
        paddingHorizontal: 11,
        paddingVertical: 8,
    },
    stepText: {
        color: colors.primary,
        fontSize: 9,
        fontWeight: "800",
        letterSpacing: 1,
    },

    // Illustration
    illustrationContainer: {
        height: 155,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 17,
    },
    outerCircle: {
        width: 139,
        height: 139,
        borderRadius: 70,
        backgroundColor: "#D8E3D1",
        justifyContent: "center",
        alignItems: "center",
    },
    middleCircle: {
        width: 105,
        height: 105,
        borderRadius: 53,
        backgroundColor: "#ECF0E5",
        justifyContent: "center",
        alignItems: "center",
    },
    mailCard: {
        width: 67,
        height: 55,
        borderRadius: 15,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        transform: [{ rotate: "-7deg" }],
        shadowColor: colors.primary,
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 5 },
        elevation: 4,
    },
    otpBoxesContainer: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    mailIcon: {
        color: "#FFFFFF",
        fontSize: 29,
    },
    verifiedBadge: {
        position: "absolute",
        bottom: 4,
        right: 5,
        width: 29,
        height: 29,
        borderRadius: 15,
        backgroundColor: "#E3EBDD",
        borderWidth: 2,
        borderColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
    },
    verifiedCheck: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: "800",
    },
    decorativeDotOne: {
        position: "absolute",
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: "#A7BA9E",
        top: 23,
        left: "23%",
    },
    decorativeDotTwo: {
        position: "absolute",
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: "#C0AD85",
        bottom: 22,
        right: "25%",
    },
    decorativeStar: {
        position: "absolute",
        top: 27,
        right: "23%",
        fontSize: 20,
        color: colors.primary,
    },

    // Heading
    headingSection: {
        marginBottom: 19,
    },
    eyebrow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        marginBottom: 11,
    },
    eyebrowLine: {
        width: 22,
        height: 2,
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    eyebrowText: {
        color: colors.primary,
        fontSize: 9,
        fontWeight: "800",
        letterSpacing: 2,
    },
    heading: {
        color: colors.text,
        fontSize: 42,
        lineHeight: 47,
        fontWeight: "700",
        letterSpacing: -1.7,
        fontFamily: "Georgia",
    },
    headingAccent: {
        color: colors.primary,
        fontStyle: "italic",
    },
    subtitle: {
        color: colors.secondaryText,
        fontSize: 12,
        lineHeight: 20,
        marginTop: 11,
        maxWidth: 330,
    },

    // Email card
    emailCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F5F5EB",
        borderRadius: 17,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 13,
        marginBottom: 17,
    },
    emailIconBox: {
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: "#E0E9DA",
        justifyContent: "center",
        alignItems: "center",
    },
    emailIcon: {
        color: colors.primary,
        fontSize: 21,
    },
    emailDetails: {
        flex: 1,
        marginLeft: 11,
    },
    emailLabel: {
        color: colors.secondaryText,
        fontSize: 8,
        fontWeight: "800",
        letterSpacing: 1.3,
        marginBottom: 5,
    },
    emailAddress: {
        color: colors.text,
        fontSize: 12,
        fontWeight: "700",
    },
    editButton: {
        paddingHorizontal: 9,
        paddingVertical: 8,
    },
    editText: {
        color: colors.primary,
        fontSize: 9,
        fontWeight: "800",
        letterSpacing: 1,
    },

    // OTP
    otpCard: {
        backgroundColor: "#F9F8F0",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#E5E8DC",
        padding: 18,
        marginBottom: 17,
    },
    otpTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: "700",
    },
    otpSubtitle: {
        color: colors.secondaryText,
        fontSize: 11,
        marginTop: 5,
    },
    otpInputRow: {
        height: 52,
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
        position: "relative",
    },
    otpBox: {
        width: "14%",
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#DFE6D9",
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
    },
    otpBoxActive: {
        borderColor: colors.primary,
        borderWidth: 1.8,
        backgroundColor: "#EFF3E9",
    },
    otpBoxFilled: {
        backgroundColor: "#EAF0E5",
        borderColor: "#A8BBA2",
    },
    otpDigit: {
        color: colors.primary,
        fontSize: 21,
        fontWeight: "700",
    },
    hiddenOtpInput: {
        position: "absolute",
        opacity: 0,
        width: 1,
        height: 1,
    },
    otpTapArea: {
        height: 4,
    },
    otpFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 17,
        flexWrap: "wrap",
        rowGap: 8,
    },
    otpCount: {
        color: colors.secondaryText,
        fontSize: 10,
    },
    resendRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    resendHint: {
        color: colors.secondaryText,
        fontSize: 10,
    },
    resendLink: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: "800",
    },
    resendDisabled: {
        color: "#9DA99A",
    },

    // Verify
    verifyButton: {
        height: 56,
        backgroundColor: colors.primary,
        borderRadius: 16,
        paddingHorizontal: 17,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    buttonPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.985 }],
    },
    verifyButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "700",
    },
    verifyArrowCircle: {
        width: 32,
        height: 32,
        borderRadius: 11,
        backgroundColor: "rgba(255,255,255,0.17)",
        justifyContent: "center",
        alignItems: "center",
    },
    verifyArrow: {
        color: "#FFFFFF",
        fontSize: 19,
    },

    // Footer
    privacyNote: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 7,
        marginTop: 17,
    },
    privacyIcon: {
        color: colors.primary,
        fontSize: 15,
    },
    privacyText: {
        color: colors.secondaryText,
        fontSize: 10,
    },
    footer: {
        alignItems: "center",
        marginTop: 23,
    },
    footerText: {
        color: colors.secondaryText,
        fontSize: 10,
    },
});
