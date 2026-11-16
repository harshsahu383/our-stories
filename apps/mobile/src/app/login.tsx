
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
import { router } from "expo-router";
import { login } from "@/services/api";
import { colors } from "../theme/colors";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    Keyboard.dismiss();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      Alert.alert("Missing details", "Please enter your email and password.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const user = await login({
        email: cleanEmail,
        password,
      });

      if (user.role !== "PURCHASER") {
        Alert.alert(
          "Account unavailable",
          "This login is for purchaser accounts."
        );
        return;
      }

      router.replace("/dashboard");
    } catch (error) {
      Alert.alert(
        "Login failed",
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
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
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backArrow}>←</Text>
            </Pressable>

            <Text style={styles.brandName}>our stories</Text>

            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>WELCOME BACK</Text>
            </View>
          </View>

          <View style={styles.illustration}>
            <View style={styles.outerCircle}>
              <View style={styles.innerCircle}>
                <Text style={styles.illustrationIcon}>♫</Text>
              </View>
            </View>
            <View style={styles.smallDot} />
            <Text style={styles.star}>✳</Text>
          </View>

          <View style={styles.headingSection}>
            <View style={styles.eyebrow}>
              <View style={styles.eyebrowLine} />
              <Text style={styles.eyebrowText}>YOUR MEMORIES AWAIT</Text>
            </View>

            <Text style={styles.heading}>
              Welcome{"\n"}
              <Text style={styles.headingAccent}>back.</Text>
            </Text>

            <Text style={styles.subtitle}>
              Your stories are right where you left them.
              Sign in and continue preserving what matters.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Sign in to your account</Text>
            <Text style={styles.formSubtitle}>
              Enter your account details below.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✉</Text>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor="#A3AEA1"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="next"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>♙</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="#A3AEA1"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!loading}
                />

                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={10}
                  disabled={loading}
                >
                  <Text style={styles.passwordAction}>
                    {showPassword ? "HIDE" : "SHOW"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.optionsRow}>
              <Pressable
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
                disabled={loading}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxActive,
                  ]}
                >
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/forgot-password")}
                disabled={loading}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                pressed && !loading && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.loginButtonText}>Signing in...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Sign in</Text>
                  <View style={styles.arrowCircle}>
                    <Text style={styles.arrow}>↗</Text>
                  </View>
                </>
              )}
            </Pressable>

            <View style={styles.secureNote}>
              <Text style={styles.secureIcon}>✧</Text>
              <Text style={styles.secureText}>
                Your memories remain private and secure.
              </Text>
            </View>
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>New to Our Stories?</Text>
            <Pressable onPress={() => router.push("/signup")}>
              <Text style={styles.signupLink}>Create an account</Text>
            </Pressable>
          </View>

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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F8F8F0",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
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
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stepText: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },
  illustration: {
    height: 125,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 13,
  },
  outerCircle: {
    width: 115,
    height: 115,
    borderRadius: 58,
    backgroundColor: "#D8E3D1",
    alignItems: "center",
    justifyContent: "center",
  },
  innerCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#ECF0E5",
    alignItems: "center",
    justifyContent: "center",
  },
  illustrationIcon: {
    color: colors.primary,
    fontSize: 43,
  },
  smallDot: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#B3C1A8",
    left: "25%",
    top: 20,
  },
  star: {
    position: "absolute",
    color: colors.primary,
    fontSize: 20,
    right: "24%",
    bottom: 17,
  },
  headingSection: {
    marginBottom: 22,
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
    fontSize: 43,
    lineHeight: 48,
    fontWeight: "700",
    letterSpacing: -1.8,
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
  formCard: {
    backgroundColor: "#F9F8F0",
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#E5E8DC",
    padding: 19,
    shadowColor: "#344C39",
    shadowOpacity: 0.06,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  formTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  formSubtitle: {
    color: colors.secondaryText,
    fontSize: 11,
    marginTop: 5,
    marginBottom: 21,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 9,
  },
  inputWrapper: {
    minHeight: 55,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3E8DD",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },
  inputIcon: {
    color: "#829580",
    fontSize: 18,
    width: 29,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    paddingVertical: 13,
  },
  passwordAction: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    paddingLeft: 8,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#A7B7A0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  rememberText: {
    color: colors.secondaryText,
    fontSize: 10,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
  },
  loginButton: {
    minHeight: 56,
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
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.17)",
    justifyContent: "center",
    alignItems: "center",
  },
  arrow: {
    color: "#FFFFFF",
    fontSize: 19,
  },
  secureNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 15,
  },
  secureIcon: {
    color: colors.primary,
    fontSize: 15,
  },
  secureText: {
    color: colors.secondaryText,
    fontSize: 10,
  },
  signupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 24,
  },
  signupText: {
    color: colors.secondaryText,
    fontSize: 12,
  },
  signupLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  footer: {
    alignItems: "center",
    marginTop: 25,
  },
  footerText: {
    color: colors.secondaryText,
    fontSize: 10,
  },
});
