import { InterstitialAd, TestIds, AdEventType } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

// Use Test ID for now so it works instantly. Replace with real AdMob ID later!
const adUnitId = __DEV__ 
  ? TestIds.INTERSTITIAL 
  : (Platform.OS === 'ios' ? TestIds.INTERSTITIAL : TestIds.INTERSTITIAL);

class AdService {
  private interstitial: InterstitialAd | null = null;
  private loaded = false;

  initialize() {
    console.log('[AdManager] Initializing Google AdMob...');
    this.loadNewAd();
  }

  private loadNewAd() {
    this.loaded = false;
    this.interstitial = InterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    this.interstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log('[AdManager] Interstitial Ad Loaded');
      this.loaded = true;
    });

    this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[AdManager] Interstitial Ad Closed');
      // Preload next ad immediately
      this.loadNewAd();
    });

    this.interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('[AdManager] Interstitial Ad Failed:', error);
    });

    this.interstitial.load();
  }

  async showAd(placement: 'PROCESS_4K' | 'SAVE_IMAGE'): Promise<boolean> {
    console.log(`[AdManager] Requested ad for: ${placement}`);
    
    return new Promise((resolve) => {
      if (this.loaded && this.interstitial) {
        // Resolve immediately when user closes the ad
        const unsubscribe = this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
          unsubscribe();
          resolve(true);
        });
        
        try {
          this.interstitial.show();
        } catch (e) {
          console.error('[AdManager] Failed to show ad:', e);
          resolve(true);
        }
      } else {
        console.log('[AdManager] Ad was not loaded yet. Skipping smoothly.');
        // Fallback so user isn't stuck
        setTimeout(() => resolve(true), 500);
      }
    });
  }
}

export const AdManager = new AdService();
