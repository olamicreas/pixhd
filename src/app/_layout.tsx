import '../global.css';
import { ThemeProvider, DarkTheme } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AdManager } from '../services/AdManager';

export default function Layout() {
  useEffect(() => {
    AdManager.initialize();
  }, []);
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" translucent />
        <ThemeProvider value={DarkTheme}>

          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#08090C' },
              headerTintColor: '#fff',
              contentStyle: { backgroundColor: '#08090C' }
            }}
          >
            <Stack.Screen name="index" options={{ title: 'PixHD', headerShown: false }} />
            <Stack.Screen name="editor" options={{ title: 'Editor', presentation: 'fullScreenModal', headerShown: false }} />
            <Stack.Screen name="export" options={{ title: 'Export', presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
