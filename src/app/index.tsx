import { View, Text, Pressable, ScrollView, Alert, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Upload, ChevronRight, Wand2, Maximize, Sparkles, Palette } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'android' 
    ? Math.max(insets.top, RNStatusBar.currentHeight || 0) + 12 
    : insets.top + 8;
  const bottomPadding = insets.bottom + 8;

  const pickImage = async (mode: string = 'enhance') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'PixHD needs access to your photos to enhance them.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      let selectedUri = result.assets[0].uri;
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          selectedUri,
          [],
          { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
        );
        selectedUri = manipResult.uri;
      } catch (e) {
        console.warn('Failed to transcode image, using original', e);
      }
      router.push({ pathname: '/editor', params: { imageUri: selectedUri, mode } });
    }
  };

  return (
    <View className="flex-1 bg-[#040507]" style={{ paddingTop: topPadding, paddingBottom: bottomPadding }}>
      <ScrollView 
        className="flex-1 bg-dark" 
        contentContainerStyle={{ padding: 24, paddingBottom: 24, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Minimal Top Header */}
        <View className="flex-row items-center justify-between pt-2 mb-6">
          <View>
            <Text className="text-3xl font-bold text-white tracking-tight">PixHD</Text>
            <Text className="text-sm text-slate-400 mt-1">Photo Enhancer</Text>
          </View>
        </View>

        {/* Clean Main Upload Box */}
        <Pressable 
          onPress={() => pickImage('enhance')} 
          className="rounded-2xl bg-card p-8 border border-white/10 active:opacity-80 transition-all mb-8 shadow-lg shadow-black/50"
        >
          <View className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 items-center justify-center mb-6">
            <Upload size={28} color="#818CF8" />
          </View>

          <View>
            <Text className="text-xl font-bold text-white mb-2">Enhance Photo</Text>
            <Text className="text-sm text-slate-400 leading-relaxed">Fix blur, restore face details, and sharpen quality in one tap.</Text>
          </View>

          <View className="pt-6 mt-6 border-t border-white/5 flex-row items-center">
            <Text className="text-sm text-indigo-400 font-semibold">Select from gallery</Text>
            <ChevronRight size={18} color="#818CF8" className="ml-1" />
          </View>
        </Pressable>

        {/* Studio Modules */}
        <View className="flex-1 justify-end">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">Studio Tools</Text>

          <View className="flex-row flex-wrap justify-between gap-y-4">
            <ToolCard 
              title="Unblur Face" 
              desc="Fix blurry portraits" 
              icon={<Wand2 size={24} color="#818CF8" />} 
              onPress={() => pickImage('unblur')}
            />
            <ToolCard 
              title="4K Upscale" 
              desc="Increase resolution" 
              icon={<Maximize size={24} color="#818CF8" />} 
              onPress={() => pickImage('ultra4k')}
            />
            <ToolCard 
              title="Retouch" 
              desc="Smooth skin tones" 
              icon={<Sparkles size={24} color="#818CF8" />} 
              onPress={() => pickImage('retouch')}
            />
            <ToolCard 
              title="Colorize" 
              desc="Restore old B&W" 
              icon={<Palette size={24} color="#818CF8" />} 
              onPress={() => pickImage('colorize')}
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

function ToolCard({ title, desc, icon, onPress }: { title: string, desc: string, icon: React.ReactNode, onPress: () => void }) {
  return (
    <Pressable 
      onPress={onPress}
      className="w-[48%] aspect-square bg-card p-5 rounded-2xl border border-white/10 active:opacity-80 transition-all justify-between shadow-md shadow-black/40"
    >
      <View className="w-12 h-12 rounded-full bg-indigo-500/10 items-center justify-center">
        {icon}
      </View>
      <View>
        <Text className="text-base font-bold text-white mb-1">{title}</Text>
        <Text className="text-xs text-slate-400 leading-tight">{desc}</Text>
      </View>
    </Pressable>
  );
}
