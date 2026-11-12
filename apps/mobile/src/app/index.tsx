
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../theme/colors";

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 380;

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
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>o.</Text>
            </View>

            <View>
              <Text style={styles.brandName}>our stories</Text>
              <Text style={styles.brandTagline}>
                EVERY VOICE MATTERS
              </Text>
            </View>
          </View>

          <View style={styles.headerBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.headerBadgeText}>A gift for life</Text>
          </View>
        </View>

        {/* Hero illustration */}
        <View style={[styles.hero, compact && styles.heroCompact]}>
          <View style={styles.heroCircleOne} />
          <View style={styles.heroCircleTwo} />

          <View style={styles.heroTopLabel}>
            <Text style={styles.heroTopLabelText}>
              A LEGACY OF LOVE
            </Text>
            <Text style={styles.heroStar}>✳</Text>
          </View>

          {/* Main memory card */}
          <View style={styles.memoryCard}>
            <View style={styles.memoryCardTop}>
              <View style={styles.memoryIcon}>
                <Text style={styles.memoryIconText}>♫</Text>
              </View>

              <View style={styles.memoryCardLabel}>
                <Text style={styles.memoryLabelTitle}>
                  A voice to remember
                </Text>
                <Text style={styles.memoryLabelSubtitle}>
                  A story, saved forever
                </Text>
              </View>

              <Text style={styles.memoryDots}>•••</Text>
            </View>

            <View style={styles.waveContainer}>
              {[12, 23, 35, 19, 43, 27, 52, 32, 45, 20, 37, 15, 29, 44, 18, 34, 12, 25, 40, 17, 30].map(
                (height, index) => (
                  <View
                    key={index}
                    style={[
                      styles.waveBar,
                      { height },
                      index === 6 || index === 13
                        ? styles.waveBarAccent
                        : null,
                    ]}
                  />
                )
              )}
            </View>

            <View style={styles.memoryCardBottom}>
              <Text style={styles.memoryDuration}>YOUR STORY</Text>
              <View style={styles.playButton}>
                <Text style={styles.playButtonText}>▶</Text>
              </View>
              <Text style={styles.memoryDuration}>FOREVER</Text>
            </View>
          </View>

          {/* Floating quote card */}
          <View style={styles.quoteCard}>
            <Text style={styles.quoteMark}>“</Text>
            <View style={styles.quoteTextContainer}>
              <Text style={styles.quoteText}>
                The little things become the biggest memories.
              </Text>
              <Text style={styles.quoteCaption}>A STORY WORTH KEEPING</Text>
            </View>
            <Text style={styles.quoteFlower}>✳</Text>
          </View>

          <View style={styles.heroFooter}>
            <View style={styles.heroFooterLine} />
            <Text style={styles.heroFooterText}>
              MADE TO BE PASSED DOWN
            </Text>
            <View style={styles.heroFooterLine} />
          </View>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <View style={styles.eyebrow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrowText}>
              MORE THAN JUST MEMORIES
            </Text>
          </View>

          <Text style={[styles.heading, compact && styles.headingCompact]}>
            Every life has a{" "}
            <Text style={styles.headingAccent}>story</Text>
            {" "}worth keeping.
          </Text>

          <Text style={styles.description}>
            Preserve the voices, memories and life lessons of the people
            you love. Because some stories deserve to live forever.
          </Text>

          {/* Primary action */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/dashboard")}
          >
            <Text style={styles.primaryButtonText}>
              Create your account
            </Text>
            <View style={styles.buttonArrow}>
              <Text style={styles.buttonArrowText}>↗</Text>
            </View>
          </Pressable>

          {/* Login action */}
          <Pressable
            style={styles.loginButton}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginText}>
              Already have an account?
            </Text>
            <Text style={styles.loginLink}>Log in</Text>
          </Pressable>

          {/* Gift activation */}
          <Pressable
            style={({ pressed }) => [
              styles.giftCard,
              pressed && styles.giftCardPressed,
            ]}
            onPress={() => router.push("/activate-gift")}
          >
            <View style={styles.giftIconBox}>
              <Text style={styles.giftIcon}>✧</Text>
            </View>

            <View style={styles.giftTextContainer}>
              <Text style={styles.giftTitle}>Received a gift?</Text>
              <Text style={styles.giftDescription}>
                Activate your memory collection
              </Text>
            </View>

            <Text style={styles.giftArrow}>→</Text>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            A lifetime of memories. A legacy of love.
          </Text>
          <Text style={styles.footerSymbol}>✳</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 22,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "700",
    marginTop: -3,
  },
  brandName: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  brandTagline: {
    color: colors.secondaryText,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F7F7EF",
    borderRadius: 30,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  headerBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "600",
  },

  // Hero
  hero: {
    height: 285,
    backgroundColor: "#D5E0CE",
    borderRadius: 27,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginBottom: 29,
  },
  heroCompact: {
    height: 260,
  },
  heroCircleOne: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "#C5D4BD",
    top: -115,
    right: -70,
  },
  heroCircleTwo: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#E5E9D9",
    bottom: -105,
    left: -50,
  },
  heroTopLabel: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
    paddingHorizontal: 3,
  },
  heroTopLabelText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2.5,
    color: colors.primary,
  },
  heroStar: {
    fontSize: 19,
    color: colors.primary,
  },
  memoryCard: {
    width: "94%",
    backgroundColor: "#FAF9F1",
    borderRadius: 20,
    padding: 17,
    shadowColor: "#284936",
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 5,
    transform: [{ rotate: "-2deg" }],
  },
  memoryCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  memoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#E2EBDD",
    justifyContent: "center",
    alignItems: "center",
  },
  memoryIconText: {
    color: colors.primary,
    fontSize: 25,
  },
  memoryCardLabel: {
    flex: 1,
    marginLeft: 10,
  },
  memoryLabelTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  memoryLabelSubtitle: {
    color: colors.secondaryText,
    fontSize: 10,
    marginTop: 3,
  },
  memoryDots: {
    color: "#9BAA97",
    letterSpacing: 2,
    fontSize: 13,
  },
  waveContainer: {
    height: 65,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
    marginBottom: 8,
  },
  waveBar: {
    width: 4,
    borderRadius: 5,
    backgroundColor: "#8FA991",
  },
  waveBarAccent: {
    backgroundColor: colors.primary,
    width: 5,
  },
  memoryCardBottom: {
    borderTopWidth: 1,
    borderTopColor: "#E7E8DD",
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memoryDuration: {
    color: "#879384",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  playButton: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonText: {
    color: "#FFFFFF",
    fontSize: 9,
    marginLeft: 2,
  },
  quoteCard: {
    width: "80%",
    backgroundColor: "#F4F0E4",
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    marginTop: -3,
    marginLeft: 34,
    transform: [{ rotate: "2deg" }],
    shadowColor: "#284936",
    shadowOpacity: 0.08,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  quoteMark: {
    color: colors.primary,
    fontSize: 34,
    fontFamily: "Georgia",
    marginRight: 8,
    marginTop: -5,
  },
  quoteTextContainer: {
    flex: 1,
  },
  quoteText: {
    color: colors.text,
    fontSize: 10,
    fontFamily: "Georgia",
    fontStyle: "italic",
    lineHeight: 14,
  },
  quoteCaption: {
    color: colors.secondaryText,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginTop: 4,
  },
  quoteFlower: {
    color: "#9DAF92",
    fontSize: 19,
    marginLeft: 5,
  },
  heroFooter: {
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 15,
  },
  heroFooterLine: {
    height: 1,
    flex: 1,
    backgroundColor: "#AFC0A7",
  },
  heroFooterText: {
    color: colors.primary,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  // Main content
  content: {
    width: "100%",
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
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "700",
    letterSpacing: -1.8,
    fontFamily: "Georgia",
  },
  headingCompact: {
    fontSize: 34,
    lineHeight: 40,
  },
  headingAccent: {
    color: colors.primary,
    fontStyle: "italic",
  },
  description: {
    color: colors.secondaryText,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 13,
    marginBottom: 21,
    maxWidth: 330,
  },

  // Buttons
  primaryButton: {
    height: 59,
    backgroundColor: colors.primary,
    borderRadius: 17,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  buttonArrow: {
    width: 33,
    height: 33,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.17)",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonArrowText: {
    color: "#FFFFFF",
    fontSize: 19,
  },
  loginButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    paddingVertical: 17,
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
  giftCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#F6F5EC",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
  },
  giftCardPressed: {
    opacity: 0.75,
  },
  giftIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#E4EBDD",
    alignItems: "center",
    justifyContent: "center",
  },
  giftIcon: {
    color: colors.primary,
    fontSize: 25,
  },
  giftTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  giftTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  giftDescription: {
    color: colors.secondaryText,
    fontSize: 10,
    marginTop: 4,
  },
  giftArrow: {
    color: colors.primary,
    fontSize: 22,
    marginHorizontal: 5,
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 25,
  },
  footerText: {
    color: colors.secondaryText,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  footerSymbol: {
    color: colors.primary,
    fontSize: 12,
  },
});
