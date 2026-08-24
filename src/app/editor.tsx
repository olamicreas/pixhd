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
  const [fidelity, setFidelity] = useState(65); // 65% preserves face identity while enhancing
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fix header padding
  const topPadding = Math.max(insets.top + 15, 30);
  const bottomPadding = Math.max(insets.bottom + 12, 20);

  const dividerPosition = useSharedValue(IMAGE_WIDTH / 2);

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
        const tempFilePath = FileSystem.documentDirectory + `pixhd_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(tempFilePath, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        targetUri = tempFilePath;
      }
      
      // Use saveToLibraryAsync for better compatibility
      await MediaLibrary.saveToLibraryAsync(targetUri);
      Alert.alert('PixHD', 'Saved 4K photo to your gallery!');
      setIsFullscreen(false);
    } catch (error: any) {
      console.error(error);
      Alert.alert('PixHD Error', `Failed to save image: ${error.message || JSON.stringify(error)}`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#040507', paddingTop: topPadding, paddingBottom: bottomPadding }}>
      <View className="flex-1 bg-dark p-5 pt-2 gap-4 justify-between">
        
        {/* Header */}
        <View className="flex-row items-center justify-between z-50 mb-2">
          <Pressable onPress={() => router.back()} className="w-9 h-9 rounded-full bg-card border border-white/10 items-center justify-center">
            <X color="#CBD5E1" size={20} />
          </Pressable>
          <Text className="text-sm font-medium text-slate-300">Preview</Text>
          <Pressable onPress={() => executeEnhancement(fidelity / 100)} className="px-4 py-2 rounded-full bg-indigo-600 active:bg-indigo-500">
            <Text className="text-white text-xs font-semibold">Process</Text>
          </Pressable>
        </View>

        {/* Before / After Slider Canvas */}
        <View className="relative">
          <GestureDetector gesture={panGesture}>
            <View style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#000' }}>
              
              {/* Enhanced Layer */}
              <Image source={{ uri: enhancedUri || activeImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              {!!enhancedUri && (
                <View className="absolute top-3 right-3 bg-black/60 px-2 py-0.5 rounded">
                  <Text className="text-[10px] font-medium text-indigo-300">After</Text>
                </View>
              )}

              {/* Original Layer */}
              <Animated.View style={[StyleSheet.absoluteFill, !!enhancedUri ? animatedBeforeStyle : { width: IMAGE_WIDTH }]}>
                <View style={{ width: IMAGE_WIDTH, height: IMAGE_HEIGHT }}>
                  <Image source={{ uri: activeImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <View className="absolute top-3 left-3 bg-black/60 px-2 py-0.5 rounded">
                    <Text className="text-[10px] font-medium text-slate-300">Before</Text>
                  </View>
                </View>
              </Animated.View>

              {/* Slider Handle */}
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

          {/* Fullscreen Button */}
          {!!enhancedUri && (
            <Pressable 
              onPress={() => setIsFullscreen(true)}
              className="absolute bottom-3 right-3 bg-black/70 p-2.5 rounded-full border border-white/20"
            >
              <Maximize color="white" size={18} />
            </Pressable>
          )}
        </View>

        {/* Controls */}
        <View className="bg-card p-4 rounded-xl border border-white/10 gap-2 mt-2">
          <View className="flex-row justify-between items-center">
            <Text className="text-xs font-medium text-slate-300">Identity Preservation</Text>
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
        <Pressable className="w-full py-4 rounded-xl flex-row items-center justify-center gap-2 bg-white active:bg-slate-200 mt-auto" onPress={handleSaveImage}>
          <Download color="#08090C" size={18} />
          <Text className="font-semibold text-sm text-[#08090C]">Save 4K Image</Text>
        </Pressable>
      </View>

      {/* Fullscreen Viewer Modal */}
      <Modal visible={isFullscreen} transparent={true} animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'black' }}>
          <Image 
            source={{ uri: enhancedUri || activeImage }} 
            style={{ width: '100%', height: '100%' }} 
            resizeMode="contain" 
          />
          
          <Pressable 
            style={{ position: 'absolute', top: topPadding, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 }}
            onPress={() => setIsFullscreen(false)}
          >
            <X color="white" size={24} />
          </Pressable>

          <Pressable 
            className="absolute bottom-12 self-center flex-row items-center justify-center gap-2 bg-indigo-600 px-8 py-4 rounded-full active:bg-indigo-500"
            onPress={handleSaveImage}
          >
            <Download color="white" size={20} />
            <Text className="text-white font-bold text-base">Save Fullscreen</Text>
          </Pressable>
        </View>
      </Modal>

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
