
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import {
    verifyEmail,
    resendVerification,
} from "@/services/api";
import { colors } from "../theme/colors";

export default function VerifyEmailScreen() {
    const params = useLocalSearchParams<{ email?: string }>();
    const email = String(params.email || "").trim().toLowerCase();

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    const handleVerify = async () => {
        Keyboard.dismiss();

        if (!email) {
            Alert.alert("Email missing", "Please return to signup and try again.");
            return;
        }

        if (!/^\d{6}$/.test(code)) {
            Alert.alert("Invalid code", "Please enter your six-digit verification code.");
            return;
        }

        try {
            setLoading(true);

            const user = await verifyEmail({
                email,
                code,
            });

            if (user.role !== "PURCHASER") {
                Alert.alert(
                    "Account unavailable",
                    "This account is not a purchaser account."
                );
                return;
            }

            router.replace("/dashboard");
        } catch (error) {
            Alert.alert(
                "Verification failed",
                error instanceof Error ? error.message : "Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email) {
            Alert.alert("Email missing", "Please return to signup and try again.");
            return;
        }

        try {
            setResending(true);
            const result = await resendVerification(email);
            Alert.alert("Check your email", result.message);
        } catch (error) {
            Alert.alert(
                "Unable to resend code",
                error instanceof Error ? error.message : "Please try again later."
            );
        } finally {
            setResending(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor={colors.background}
            />

            <KeyboardAvoidingView
                style={styles.keyboard}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Pressable
                        style={styles.backButton}
                        onPress={() => router.replace("/signup")}
                    >
                        <Text style={styles.backText}>← Back to signup</Text>
                    </Pressable>

                    <View style={styles.iconCircle}>
                        <Text style={styles.icon}>✉</Text>
                    </View>

                    <Text style={styles.eyebrow}>ONE LAST STEP</Text>

                    <Text style={styles.heading}>
                        Verify your{"\n"}
                        <Text style={styles.headingAccent}>email address.</Text>
                    </Text>

                    <Text style={styles.description}>
                        We've sent a six-digit verification code to:
                    </Text>

                    <Text style={styles.email}>{email}</Text>

                    <View style={styles.formCard}>
                        <Text style={styles.label}>VERIFICATION CODE</Text>

                        <TextInput
                            style={styles.codeInput}
                            value={code}
                            onChangeText={(value) =>
                                setCode(value.replace(/\D/g, "").slice(0, 6))
                            }
                            placeholder="000000"
                            placeholderTextColor="#A3AEA1"
                            keyboardType="number-pad"
                            maxLength={6}
                            textContentType="oneTimeCode"
                            autoComplete="one-time-code"
                            editable={!loading}
                        />

                        <Pressable
                            style={[
                                styles.verifyButton,
                                loading && styles.disabledButton,
                            ]}
                            onPress={handleVerify}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.buttonText}>Verify and continue →</Text>
                            )}
                        </Pressable>

                        <View style={styles.resendRow}>
                            <Text style={styles.resendText}>Didn't receive the code?</Text>

                            <Pressable
                                onPress={handleResend}
                                disabled={resending || loading}
                            >
                                <Text style={styles.resendLink}>
                                    {resending ? "Sending..." : "Resend code"}
                                </Text>
                            </Pressable>
                        </View>

                        {resending && (
                            <ActivityIndicator
                                color={colors.primary}
                                style={styles.resendLoader}
                            />
                        )}
                    </View>

                    <Text style={styles.footer}>
                        Your stories deserve a safe place.
                    </Text>
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
    keyboard: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 35,
    },
    backButton: {
        alignSelf: "flex-start",
        paddingVertical: 10,
        marginBottom: 45,
    },
    backText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: "700",
    },
    iconCircle: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: "#DCE6D6",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 28,
    },
    icon: {
        fontSize: 32,
        color: colors.primary,
    },
    eyebrow: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 2,
        marginBottom: 13,
    },
    heading: {
        color: colors.text,
        fontSize: 38,
        lineHeight: 45,
        fontWeight: "700",
        fontFamily: "Georgia",
    },
    headingAccent: {
        color: colors.primary,
        fontStyle: "italic",
    },
    description: {
        color: colors.secondaryText,
        fontSize: 13,
        lineHeight: 21,
        marginTop: 18,
    },
    email: {
        color: colors.text,
        fontSize: 14,
        fontWeight: "700",
        marginTop: 5,
        marginBottom: 28,
    },
    formCard: {
        backgroundColor: "#F9F8F0",
        borderRadius: 23,
        borderWidth: 1,
        borderColor: "#E5E8DC",
        padding: 20,
    },
    label: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    codeInput: {
        height: 62,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E3E8DD",
        borderRadius: 14,
        textAlign: "center",
        color: colors.text,
        fontSize: 26,
        fontWeight: "700",
        letterSpacing: 10,
        paddingLeft: 15,
    },
    verifyButton: {
        minHeight: 55,
        backgroundColor: colors.primary,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 20,
    },
    disabledButton: {
        opacity: 0.7,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "700",
    },
    resendRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 5,
        marginTop: 22,
    },
    resendText: {
        color: colors.secondaryText,
        fontSize: 12,
    },
    resendLink: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: "800",
    },
    resendLoader: {
        marginTop: 10,
    },
    footer: {
        color: colors.secondaryText,
        fontSize: 11,
        textAlign: "center",
        marginTop: 35,
    },
});
