import { Platform } from 'react-native';

export const START_IO_CONFIG = {
  appId: Platform.select({
    ios: '207958252',
    android: '207990509',
  }),
  publisherId: '191344762',
};

class AdService {
  async initialize() {
    console.log('[AdManager] Initialized with App ID: ' + START_IO_CONFIG.appId);
    console.warn('[AdManager] Start.io SDK was removed due to severe native compilation crashes on React Native 0.86. Falling back to mock ads.');
  }

  async showAd(placement: 'PROCESS_4K' | 'SAVE_IMAGE'): Promise<boolean> {
    console.log(`[AdManager] Triggering mock ad placement: ${placement}`);
    return new Promise((resolve) => {
      // Simulate an ad delay so the app still functions correctly
      setTimeout(() => resolve(true), 1200);
    });
  }
}

export const AdManager = new AdService();
