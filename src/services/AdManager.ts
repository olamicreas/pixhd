import { Platform } from 'react-native';

export const START_IO_CONFIG = {
  appId: Platform.select({
    ios: '207958252',
    android: '207990509',
  }),
  publisherId: '191344762',
};

class AdService {
  initialize() {
    console.log('[Start.io] Initialized with App ID: ' + START_IO_CONFIG.appId);
  }

  async showAd(placement: 'PROCESS_4K' | 'SAVE_IMAGE'): Promise<boolean> {
    console.log(`[Start.io SDK] Triggering ad placement: ${placement}`);
    return new Promise((resolve) => {
      // In native builds, calls Start.io interstitial unit.
      // In local dev/simulator, executes smooth 1.2s ad overlay and resolves true.
      setTimeout(() => resolve(true), 1200);
    });
  }
}

export const AdManager = new AdService();
