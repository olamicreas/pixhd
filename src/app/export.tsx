import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { AdManager } from '../services/AdManager';

export default function ExportModal() {
  const router = useRouter();

  const handleSave = () => {
    // Show interstitial ad before saving
    AdManager.showInterstitialAd(() => {
      // Logic to save image using expo-file-system and expo-media-library
      alert('Saved to Photos!');
      router.back();
    });
  };

  return (
    <View className="flex-1 bg-dark px-6 pt-10">
      <Text className="text-2xl font-bold text-white mb-6">Save Photo</Text>
      
      <View className="bg-card rounded-xl p-4 mb-6 border border-white/10">
        <Text className="text-slate-400 mb-2 text-xs uppercase tracking-wider">Quality</Text>
        <View className="flex-row justify-between items-center py-2 border-b border-white/10">
          <Text className="text-white font-medium">JPEG 100%</Text>
          <View className="w-5 h-5 rounded-full bg-accent" />
        </View>
        <View className="flex-row justify-between items-center py-2 mt-2">
          <Text className="text-white font-medium">Lossless PNG</Text>
          <View className="w-5 h-5 rounded-full border border-slate-500" />
        </View>
      </View>

      <Pressable 
        className="bg-white py-4 rounded-xl items-center mb-4 active:bg-slate-200"
        onPress={handleSave}
      >
        <Text className="text-dark font-bold text-lg">Save to Gallery</Text>
      </Pressable>
      
      <Pressable 
        className="py-4 items-center"
        onPress={() => router.back()}
      >
        <Text className="text-gray-400 font-bold">Cancel</Text>
      </Pressable>
    </View>
  );
}
