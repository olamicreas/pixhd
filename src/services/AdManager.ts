import { RewardedInterstitialAd, TestIds, AdEventType, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

const adUnitId = __DEV__ 
  ? TestIds.REWARDED_INTERSTITIAL 
  : (Platform.OS === 'ios' ? 'ca-app-pub-5169120635628369/1260694434' : 'ca-app-pub-5169120635628369/1260694434');

class AdService {
  private interstitial: RewardedInterstitialAd | null = null;
  private loaded = false;

  initialize() {
    console.log('[AdManager] Initializing Google AdMob...');
    this.loadNewAd();
  }

  private loadNewAd() {
    this.loaded = false;
    this.interstitial = RewardedInterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    this.interstitial.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('[AdManager] Rewarded Interstitial Ad Loaded');
      this.loaded = true;
    });

    this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[AdManager] Rewarded Interstitial Ad Closed');
      // Preload next ad immediately
      this.loadNewAd();
    });

    this.interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('[AdManager] Rewarded Interstitial Ad Failed:', error);
    });

    this.interstitial.load();
  }

  async showAd(placement: 'PROCESS_4K' | 'SAVE_IMAGE'): Promise<boolean> {
    console.log(`[AdManager] Requested ad for: ${placement}`);
    
    return new Promise((resolve) => {
      if (this.loaded && this.interstitial) {
        
        let isResolved = false;
        const complete = () => {
            if (!isResolved) {
                isResolved = true;
                resolve(true);
            }
        };

        // Resolve when user earns reward or closes
        const unsubEarn = this.interstitial.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          complete();
        });
        const unsubClose = this.interstitial.addAdEventListener(AdEventType.CLOSED, () => {
          unsubEarn();
          unsubClose();
          complete();
        });
        
        try {
          this.interstitial.show();
        } catch (e) {
          console.error('[AdManager] Failed to show ad:', e);
          complete();
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
