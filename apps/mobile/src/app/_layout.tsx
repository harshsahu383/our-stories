
import React, { useEffect, useState } from 'react';

import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';

import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

import {
  restoreAuthSession,
  getCurrentUser,
  clearAuthSession,
} from '@/services/api';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  // Validate the saved session once when the app starts.
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const hasToken = await restoreAuthSession();

        if (hasToken) {
          await getCurrentUser();

          if (mounted) {
            setAuthenticated(true);
          }
        } else {
          if (mounted) {
            setAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Authentication initialization failed:', error);

        await clearAuthSession();

        if (mounted) {
          setAuthenticated(false);
        }
      } finally {
        if (mounted) {
          setAuthReady(true);
          await SplashScreen.hideAsync();
        }
      }
    }

    void initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Protect private routes without redirecting users
  // away from Signup, Login, or Email Verification.
  useEffect(() => {
    if (!authReady) return;

    const firstSegment = segments[0];

    const isPublicRoute =
      firstSegment === 'login' ||
      firstSegment === 'signup' ||
      firstSegment === 'verify-email' ||
      firstSegment === 'activate-gift' ||
      firstSegment === undefined;

    if (!authenticated && !isPublicRoute) {
      router.replace('/');
    }
  }, [authReady, authenticated, segments, router]);

  if (!authReady) {
    return null;
  }

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <AnimatedSplashOverlay />

      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </ThemeProvider>
  );
}
