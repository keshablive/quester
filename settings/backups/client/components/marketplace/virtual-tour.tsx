import React, { useState } from 'react';
import { View, Image, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react-native';

interface VirtualTourProps {
  tourUrls: string[];
  onClose?: () => void;
  fullscreen?: boolean;
}

export function VirtualTour({ tourUrls, onClose, fullscreen = false }: VirtualTourProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  if (!tourUrls || tourUrls.length === 0) {
    return null;
  }

  const currentUrl = tourUrls[currentIndex];
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(currentUrl);

  return (
    <View
      testID="tour-container"
      className={fullscreen ? 'absolute left-0 top-0 z-[1000] bg-black' : ''}
      style={[
        {
          width: Dimensions.get('window').width,
          height: fullscreen
            ? Dimensions.get('window').height
            : Dimensions.get('window').height * 0.6,
        },
        fullscreen ? { position: 'absolute', top: 0, left: 0 } : {},
      ]}>
      <Card className="flex-1 overflow-hidden">
        {/* Header */}
        <View className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between bg-black/50 p-4">
          <View className="flex-row items-center">
            {tourUrls.map((_, index) => (
              <Pressable
                key={index}
                testID={`pagination-dot-${index}${index === currentIndex ? '-active' : ''}`}
                onPress={() => setCurrentIndex(index)}
                className={`mr-2 h-2 rounded ${index === currentIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
                accessibilityLabel={`Go to tour ${index + 1}`}
                accessibilityRole="button"
                accessibilityState={{ selected: index === currentIndex }}
              />
            ))}
          </View>

          {onClose && (
            <Pressable
              testID="close-button"
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-black/50"
              accessibilityLabel="Close virtual tour"
              accessibilityRole="button">
              <X size={24} color="white" />
            </Pressable>
          )}
        </View>

        {/* Content */}
        <View className="flex-1 bg-black">
          {loading && (
            <View
              testID="loading-indicator"
              className="absolute inset-0 z-[5] items-center justify-center bg-black/70">
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          )}

          {isImage ? (
            // Regular image
            <Image
              testID="tour-image"
              source={{ uri: currentUrl }}
              className="h-full w-full"
              resizeMode="contain"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
          ) : (
            // 360° panorama or embedded viewer
            <WebView
              testID="tour-webview"
              source={{ uri: currentUrl }}
              className="flex-1 bg-black"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
            />
          )}
        </View>

        {/* Navigation Arrows */}
        {tourUrls.length > 1 && (
          <>
            {currentIndex > 0 && (
              <Pressable
                testID="nav-button-left"
                className="absolute h-[50px] w-[50px] items-center justify-center rounded-full bg-white/90 shadow-lg"
                style={{ top: '50%', left: 16, marginTop: -25 }}
                onPress={() => setCurrentIndex(currentIndex - 1)}
                accessibilityLabel="Previous tour"
                accessibilityRole="button">
                <View className="h-5 w-5">
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderTopWidth: 10,
                      borderBottomWidth: 10,
                      borderRightWidth: 15,
                      borderStyle: 'solid',
                      borderTopColor: 'transparent',
                      borderBottomColor: 'transparent',
                      borderRightColor: '#1F2937',
                    }}
                  />
                </View>
              </Pressable>
            )}

            {currentIndex < tourUrls.length - 1 && (
              <Pressable
                testID="nav-button-right"
                className="absolute h-[50px] w-[50px] items-center justify-center rounded-full bg-white/90 shadow-lg"
                style={{ top: '50%', right: 16, marginTop: -25 }}
                onPress={() => setCurrentIndex(currentIndex + 1)}
                accessibilityLabel="Next tour"
                accessibilityRole="button">
                <View className="h-5 w-5">
                  <View
                    style={{
                      width: 0,
                      height: 0,
                      borderTopWidth: 10,
                      borderBottomWidth: 10,
                      borderLeftWidth: 15,
                      borderStyle: 'solid',
                      borderTopColor: 'transparent',
                      borderBottomColor: 'transparent',
                      borderLeftColor: '#1F2937',
                    }}
                  />
                </View>
              </Pressable>
            )}
          </>
        )}
      </Card>
    </View>
  );
}
