import { Link } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';

type PlaceholderScreenProps = {
  title: string;
  description: string;
};

export default function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <Link href="/(tabs)/index" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Back to home</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
  },
  title: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    color: colors.secondaryText,
    fontSize: 15,
    marginTop: 14,
    textAlign: 'center',
  },
  button: {
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});
