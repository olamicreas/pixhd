import { Platform } from 'react-native';
import { initializeStartIoSdk, loadAd, showAd, AdType, AdResultType } from 'react-native-start-io-sdk';

export const START_IO_CONFIG = {
  appId: Platform.select({
    ios: '207958252',
    android: '207990509',
  }),
  publisherId: '191344762',
};

class AdService {
  private isInitialized = false;

  async initialize() {
    try {
      if (this.isInitialized) return;
      if (Platform.OS !== 'android') {
        // As per the user request, we are skipping iOS ads due to ATT rules for now.
        console.log('[Start.io] Skipped init on iOS');
        return;
      }

      await initializeStartIoSdk({
        androidAppId: START_IO_CONFIG.appId || '',
        testAd: false,
      });
      console.log('[Start.io] Initialized successfully');
      this.isInitialized = true;
      
      // Preload first ad
      await loadAd(AdType.AUTOMATIC);
    } catch (e) {
      console.error('[Start.io] Error initializing:', e);
    }
  }

  async showAd(placement: 'PROCESS_4K' | 'SAVE_IMAGE'): Promise<boolean> {
    console.log(`[Start.io SDK] Triggering ad placement: ${placement}`);
    
    if (Platform.OS !== 'android') {
      return true; // Skip ads on iOS immediately
    }

    if (!this.isInitialized) {
      return true;
    }

    return new Promise((resolve) => {
      try {
        showAd((result) => {
          console.log('[Start.io] Ad finished with result:', result);
          // Preload the next ad in the background
          loadAd(AdType.AUTOMATIC).catch(() => {});
          resolve(true);
        });
      } catch (error) {
        console.error('[Start.io] Error showing ad:', error);
        resolve(true); // fall back to resolving so the user isn't stuck
      }
    });
  }
}

export const AdManager = new AdService();
