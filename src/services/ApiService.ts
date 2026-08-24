import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import Constants from 'expo-constants';

// 1. Auto-detect host IP from Expo debugger connection (Works for physical phones + emulators)
const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost;
const hostIp = debuggerHost ? debuggerHost.split(':')[0] : null;

// 2. Determine target base URL based on platform & environment
export const getBaseUrl = (): string => {
  if (__DEV__) {
    if (hostIp) {
      return `http://${hostIp}:8000`; // Auto-connects physical phones & emulators via LAN IP
    }
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000'; // Android emulator localhost alias
    }
    return 'http://localhost:8000'; // iOS simulator
  }
  return 'http://YOUR_PRODUCTION_VPS_IP:8000';
};

export const API_BASE_URL = "https://olamicreas--pixhd-backend-fastapi-app.modal.run";
console.log(`[PixHD Network] Connecting to AI Backend at: ${API_BASE_URL}`);

// Health check to verify live backend link
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    // Increase timeout to 15 seconds. Modal Serverless containers take ~5-10 seconds to "wake up" from a cold start.
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (err) {
    console.warn(`[PixHD Network] Health check failed for ${API_BASE_URL}:`, err);
    return false;
  }
}

// 4K Ultra Processing Upload Handler
export async function enhanceUltra4K(imageUri: string, mode: string = 'ultra4k', fidelity: number = 0.75): Promise<string> {
  const isHealthy = await checkBackendHealth();
  if (!isHealthy) {
    throw new Error('You are not connected to the internet, or the server is temporarily offline. Please check your network and try again.');
  }

  const targetUrl = `${API_BASE_URL}/api/enhance-ultra`;
  
  const uploadPromise = FileSystem.uploadAsync(targetUrl, imageUri, {
    httpMethod: 'POST',
    uploadType: 1, // 1 = MULTIPART
    fieldName: 'file',
    parameters: {
      mode: mode,
      fidelity: fidelity.toString(),
    },
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('The enhancement took too long. Please check your internet connection and try again.')), 300000);
  });

  const uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as FileSystem.FileSystemUploadResult;

  if (uploadResult.status !== 200) {
    throw new Error(`The AI engine is currently busy or experiencing issues. Please try again later.`);
  }
  
  if (!uploadResult.body) {
    throw new Error(`The AI engine returned an empty response. Please try again.`);
  }

  // Save the returned 4K binary JPEG to the persistent Document directory.
  // iOS 17 strict sandboxing often blocks MediaLibrary from reading directly from the temporary Cache directory!
  const localOutputUri = `${FileSystem.documentDirectory}pixhd_enhanced_${Date.now()}.jpg`;
  await FileSystem.writeAsStringAsync(localOutputUri, uploadResult.body, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return localOutputUri;
}
