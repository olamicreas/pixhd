import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, StyleSheet, Modal, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Download, Maximize } from 'lucide-react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import Slider from '@react-native-community/slider';
import { enhanceUltra4K } from '../services/ApiService';
import { AdManager } from '../services/AdManager';

const { width } = Dimensions.get('window');
const IMAGE_WIDTH = width - 40;
const IMAGE_HEIGHT = IMAGE_WIDTH * 1.25;

export default function EditorScreen() {
  const router = useRouter();
  const { imageUri, mode } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const activeImage = typeof imageUri === 'string' ? imageUri : '';
  const currentMode = typeof mode === 'string' ? mode : 'ultra4k';
  const [enhancedUri, setEnhancedUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fidelity, setFidelity] = useState(75);

  const topPadding = Math.max(insets.top + 10, 20);
  const bottomPadding = Math.max(insets.bottom + 12, 20);

  const dividerPosition = useSharedValue(IMAGE_WIDTH / 2);

  // Full container pan tracking
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      dividerPosition.value = Math.max(0, Math.min(IMAGE_WIDTH, e.x));
    });

  const animatedHandleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dividerPosition.value - 14 }]
  }));

  const animatedBeforeStyle = useAnimatedStyle(() => ({
    width: dividerPosition.value,
    overflow: 'hidden'
  }));

  // Auto-run enhancement when navigating from HomeScreen
  useEffect(() => {
    if (activeImage && !enhancedUri) {
      executeEnhancement(fidelity / 100);
    }
  }, []);

  const executeEnhancement = async (fidelityVal: number) => {
    if (!activeImage || isProcessing) return;
    await AdManager.showAd('PROCESS_4K');
    try {
      setIsProcessing(true);
      const resultUri = await enhanceUltra4K(activeImage, currentMode, fidelityVal);
      setEnhancedUri(resultUri);
    } catch (error: any) {
      Alert.alert('PixHD', error.message || 'Enhancement failed. Please retry.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveImage = async () => {
    await AdManager.showAd('SAVE_IMAGE');
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('PixHD', 'Photo library permission required.');
        return;
      }
      
      let targetUri = enhancedUri || activeImage;
      if (targetUri.startsWith('data:image')) {
        const base64Data = targetUri.split(',')[1];
        const tempFilePath = FileSystem.cacheDirectory + `pixhd_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(tempFilePath, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        targetUri = tempFilePath;
      }
      
      await MediaLibrary.createAssetAsync(targetUri);
      Alert.alert('PixHD', 'Saved high-res photo to gallery!');
    } catch (error) {
      console.error(error);
      Alert.alert('PixHD', 'Failed to save image.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#040507', paddingTop: topPadding, paddingBottom: bottomPadding }}>
      <View className="flex-1 bg-dark p-5 pt-2 gap-4 justify-between">
        
        {/* Header */}
        <View className="flex-row items-center justify-between z-50">
          <Pressable onPress={() => router.back()} className="w-8 h-8 rounded-full bg-card border border-white/10 items-center justify-center">
            <X color="#CBD5E1" size={16} />
          </Pressable>
          <Text className="text-xs font-medium text-slate-300">Preview</Text>
          <Pressable onPress={() => executeEnhancement(fidelity / 100)} className="px-3 py-1.5 rounded-full bg-indigo-600 active:bg-indigo-500">
            <Text className="text-white text-xs font-semibold">Process 4K</Text>
          </Pressable>
        </View>

        {/* Before / After Slider Canvas */}
        <GestureDetector gesture={panGesture}>
          <View style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#000' }}>
            
            {/* Enhanced Layer (Underneath) */}
            <Image source={{ uri: enhancedUri || activeImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            {!!enhancedUri && (
              <View className="absolute top-3 right-3 bg-black/60 px-2 py-0.5 rounded">
                <Text className="text-[10px] font-medium text-indigo-300">After</Text>
              </View>
            )}

            {/* Original Raw Image (Clipped Left Layer) */}
            <Animated.View style={[StyleSheet.absoluteFill, !!enhancedUri ? animatedBeforeStyle : { width: IMAGE_WIDTH }]}>
              <View style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}>
                <Image source={{ uri: activeImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <View className="absolute top-3 left-3 bg-black/60 px-2 py-0.5 rounded">
                  <Text className="text-[10px] font-medium text-slate-300">Before</Text>
                </View>
              </View>
            </Animated.View>

            {/* Divider Line & Handle */}
            {!!enhancedUri && (
              <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: 28, alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }, animatedHandleStyle]}>
                <View style={{ width: 2, height: '100%', backgroundColor: 'white' }} />
                <View style={{ position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', elevation: 5 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1e293b' }}>↔</Text>
                </View>
              </Animated.View>
            )}
          </View>
        </GestureDetector>

        {/* Controls */}
        <View className="bg-card p-4 rounded-xl border border-white/10 gap-2">
          <View className="flex-row justify-between items-center">
            <Text className="text-xs font-medium text-slate-300">Clarity Strength</Text>
            <Text className="text-xs text-slate-400">{Math.round(fidelity)}%</Text>
          </View>
          <Slider 
            style={{ width: '100%', height: 36 }}
            minimumValue={0} 
            maximumValue={100} 
            value={fidelity}
            onValueChange={setFidelity} 
            onSlidingComplete={(val) => executeEnhancement(val / 100)}
            minimumTrackTintColor="#4F46E5"
            maximumTrackTintColor="#334155"
            thumbTintColor="#4F46E5"
          />
        </View>

        {/* Save CTA */}
        <Pressable className="w-full py-3.5 rounded-xl flex-row items-center justify-center gap-1.5 bg-white active:bg-slate-200" onPress={handleSaveImage}>
          <Download color="#08090C" size={16} />
          <Text className="font-semibold text-xs text-[#08090C]">Save Image</Text>
        </Pressable>
      </View>

      {/* Processing Modal */}
      {isProcessing && (
        <View className="absolute inset-0 bg-black/90 flex items-center justify-center p-6 z-50">
          <ActivityIndicator className="mb-4" color="#4F46E5" size="large" />
          <Text className="text-sm font-medium text-white mb-1">Enhancing Image</Text>
          <Text className="text-xs text-slate-400">Processing Neural Prior...</Text>
        </View>
      )}
    </View>
  );
}
