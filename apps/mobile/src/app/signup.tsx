
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
import { signup } from "@/services/api";
import { colors } from "../theme/colors";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    Keyboard.dismiss();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (
      !cleanName ||
      !cleanEmail ||
      !cleanPhone ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert("Missing details", "Please fill in all the fields.");
      return;
    }

    if (cleanName.length < 2) {
      Alert.alert("Invalid name", "Please enter your full name.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    if (!/^[+]?[\d\s()-]{7,20}$/.test(cleanPhone)) {
      Alert.alert("Invalid phone number", "Please enter a valid phone number.");
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        "Weak password",
        "Your password must contain at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Your passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      Alert.alert(
        "Almost there!",
        "Please accept the Terms of Service and Privacy Policy."
      );
      return;
    }


    try {
      setLoading(true);

      await signup({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password,
        language: "en",
      });

      router.replace({
        pathname: "/verify-email",
        params: { email: cleanEmail },
      });
    } catch (error) {
      Alert.alert(
        "Signup failed",
        error instanceof Error
          ? error.message
          : "Unable to create your account. Please try again."
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
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backArrow}>←</Text>
            </Pressable>

            <View style={styles.miniBrand}>
              <Text style={styles.miniBrandText}>our stories</Text>
            </View>

            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>01 / 03</Text>
            </View>
          </View>

          <View style={styles.headingSection}>
            <View style={styles.eyebrow}>
              <View style={styles.eyebrowLine} />
              <Text style={styles.eyebrowText}>YOUR STORY STARTS HERE</Text>
            </View>

            <Text style={styles.heading}>
              Create your{"\n"}
              <Text style={styles.headingAccent}>account.</Text>
            </Text>

            <Text style={styles.subtitle}>
              A little step today. A lifetime of stories tomorrow.
              Let's create a place for the memories that matter.
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Your details</Text>
              <Text style={styles.requiredText}>* Required</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>FULL NAME</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>♙</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#A3AEA1"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={!loading}
                />
              </View>
            </View>

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
              <Text style={styles.label}>PHONE NUMBER</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>☎</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#A3AEA1"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  maxLength={20}
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
                  placeholder="Create a password"
                  placeholderTextColor="#A3AEA1"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  returnKeyType="next"
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
              <Text style={styles.inputHint}>
                Use at least 8 characters.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>♙</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password again"
                  placeholderTextColor="#A3AEA1"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSignup}
                  editable={!loading}
                />
                <Pressable
                  onPress={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  hitSlop={10}
                  disabled={loading}
                >
                  <Text style={styles.passwordAction}>
                    {showConfirmPassword ? "HIDE" : "SHOW"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              style={styles.termsRow}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              disabled={loading}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxActive,
                ]}
              >
                {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>

              <Text style={styles.termsText}>
                I agree to the{" "}
                <Text style={styles.termsLink}>Terms of Service</Text>
                {" "}and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && !loading && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.submitText}>Creating account...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.submitText}>Create my account</Text>
                  <View style={styles.submitArrowCircle}>
                    <Text style={styles.submitArrow}>↗</Text>
                  </View>
                </>
              )}
            </Pressable>

            <View style={styles.secureNote}>
              <Text style={styles.secureIcon}>✧</Text>
              <Text style={styles.secureText}>
                Your personal details stay private and secure.
              </Text>
            </View>
          </View>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <Pressable onPress={() => router.push("/login")}>
              <Text style={styles.loginLink}>Log in</Text>
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
    marginBottom: 30,
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
  miniBrand: {
    flex: 1,
    alignItems: "center",
  },
  miniBrandText: {
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
  headingSection: {
    marginBottom: 23,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 13,
  },
  eyebrowLine: {
    width: 22,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.primary,
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
    letterSpacing: -1.8,
    fontWeight: "700",
    fontFamily: "Georgia",
  },
  headingAccent: {
    color: colors.primary,
    fontStyle: "italic",
  },
  subtitle: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 12,
    maxWidth: 330,
  },
  formCard: {
    backgroundColor: "#F9F8F0",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E5E8DC",
    padding: 19,
    shadowColor: "#344C39",
    shadowOpacity: 0.06,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 21,
  },
  formTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  requiredText: {
    color: colors.secondaryText,
    fontSize: 10,
  },
  inputGroup: {
    marginBottom: 17,
  },
  label: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 9,
  },
  inputWrapper: {
    minHeight: 54,
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
  inputHint: {
    color: colors.secondaryText,
    fontSize: 10,
    marginTop: 7,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 2,
    marginBottom: 21,
  },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#A7B7A0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
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
  termsText: {
    flex: 1,
    color: colors.secondaryText,
    fontSize: 11,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: "700",
  },
  submitButton: {
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
  submitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  submitArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.17)",
    alignItems: "center",
    justifyContent: "center",
  },
  submitArrow: {
    color: "#FFFFFF",
    fontSize: 19,
  },
  secureNote: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 23,
  },
  loginText: {
    color: colors.secondaryText,
    fontSize: 12,
  },
  loginLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  footer: {
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    color: colors.secondaryText,
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
