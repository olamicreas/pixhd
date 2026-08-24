import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import EventSource from "react-native-sse";

// Polyfill EventSource for @gradio/client
// @ts-ignore
global.EventSource = EventSource;

import { Client } from '@gradio/client';

export const API_BASE_URL = "Olamicreas/pixhd-backend";
console.log(`[PixHD Network] Connecting to AI Backend at Hugging Face: ${API_BASE_URL}`);

// Health check to verify live backend link
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`https://huggingface.co/spaces/${API_BASE_URL}`, {
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

  // Convert the local React Native file URI to a Blob so Gradio client can upload it
  const response = await fetch(imageUri);
  const blob = await response.blob();

  // Connect to the Hugging Face Gradio Space
  const app = await Client.connect(API_BASE_URL);
  
  // Submit the prediction
  // Parameters match our app.py: inputs=[gr.Image(), gr.Textbox(), gr.Number()]
  const result = await app.predict("/predict", [
    blob, 
    mode, 
    fidelity
  ]);

  if (!result || !result.data || result.data.length === 0) {
    throw new Error(`The AI engine returned an empty response. Please try again.`);
  }

  // Gradio outputs a file path object: { url: "https://...", path: "..." }
  const remoteFile = result.data[0] as { url: string };
  if (!remoteFile || !remoteFile.url) {
    throw new Error(`Could not parse the enhanced image URL from the AI engine.`);
  }

  // Download the processed image back to the device
  const localOutputUri = `${FileSystem.documentDirectory}pixhd_enhanced_${Date.now()}.jpg`;
  const downloadResult = await FileSystem.downloadAsync(remoteFile.url, localOutputUri);
  
  if (downloadResult.status !== 200) {
    throw new Error(`Failed to download the enhanced image. Please try again.`);
  }

  return downloadResult.uri;
}
