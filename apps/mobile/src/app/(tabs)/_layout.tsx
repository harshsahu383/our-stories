
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

  // Check authentication once when the app starts.
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const hasToken = await restoreAuthSession();

        if (hasToken) {
          try {
            await getCurrentUser();

            if (mounted) {
              setAuthenticated(true);
            }
          } catch (error) {
            console.error('Session validation failed:', error);

            await clearAuthSession();

            if (mounted) {
              setAuthenticated(false);
            }
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

  // Protect private routes.
  useEffect(() => {
    if (!authReady) return;

    const firstSegment = segments[0];

    const isPublicRoute =
      firstSegment === 'login' ||
      firstSegment === 'signup' ||
      firstSegment === 'verify-email' ||
      firstSegment === 'activate-gift';

    async function protectRoute() {
      const hasToken = await restoreAuthSession();

      if (hasToken) {
        try {
          await getCurrentUser();

          setAuthenticated(true);

          if (isPublicRoute) {
            router.replace('/dashboard');
          }
        } catch (error) {
          console.error('Route validation failed:', error);

          await clearAuthSession();
          setAuthenticated(false);

          if (!isPublicRoute && firstSegment !== undefined) {
            router.replace('/');
          }
        }
      } else {
        setAuthenticated(false);

        if (!isPublicRoute && firstSegment !== undefined) {
          router.replace('/');
        }
      }
    }

    void protectRoute();
  }, [authReady, segments, router]);

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
