import '../global.css';
import { ThemeProvider, DarkTheme } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import Constants from 'expo-constants';
import { AdManager } from '../services/AdManager';

export default function Layout() {
  const [forceUpdate, setForceUpdate] = useState(false);

  useEffect(() => {
    AdManager.initialize();

    const checkVersion = async () => {
      try {
        const res = await fetch('https://huggingface.co/spaces/Olamicreas/pixhd-v2/raw/main/version.json', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const minVersion = data.minimum_version; // e.g. "1.2.0"
          const currentVersion = Constants.expoConfig?.version || '1.1.0';
          
          if (minVersion) {
            const v1 = minVersion.split('.').map(Number);
            const v2 = currentVersion.split('.').map(Number);
            for (let i = 0; i < 3; i++) {
              if (v1[i] > (v2[i] || 0)) {
                setForceUpdate(true);
                return;
              } else if (v1[i] < (v2[i] || 0)) {
                break;
              }
            }
          }
        }
      } catch (e) {
        // Failsafe: if network is down or file doesn't exist, allow app to run
      }
    };
    
    checkVersion();
  }, []);

  if (forceUpdate) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: '#08090C', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>Update Required</Text>
          <Text style={{ color: '#94a3b8', textAlign: 'center', marginBottom: 30 }}>
            A new version of PixHD is available. You must update to continue using the app.
          </Text>
          <Pressable 
            onPress={() => Linking.openURL('https://apps.apple.com/app/id6804444552')}
            style={{ backgroundColor: '#4f46e5', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30 }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Update Now</Text>
          </Pressable>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
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
