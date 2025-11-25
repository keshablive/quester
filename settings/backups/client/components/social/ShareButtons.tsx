import React from 'react';
import { View, Pressable, Share, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import {
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle as WhatsApp,
  Share2,
} from 'lucide-react-native';
import * as Linking from 'expo-linking';

interface ShareButtonsProps {
  title: string;
  url: string;
  description?: string;
  imageUrl?: string;
  hashtags?: string[];
  onShare?: (platform: string) => void;
  style?: any;
  size?: 'small' | 'medium' | 'large';
  variant?: 'icons' | 'buttons';
}

export function ShareButtons({
  title,
  url,
  description,
  imageUrl: _imageUrl,
  hashtags = [],
  onShare,
  style,
  size = 'medium',
  variant = 'icons',
}: ShareButtonsProps) {
  const iconSizes = {
    small: 20,
    medium: 24,
    large: 32,
  };

  const iconSize = iconSizes[size];

  const handleShareFacebook = async () => {
    try {
      const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      const supported = await Linking.canOpenURL(shareUrl);

      if (supported) {
        await Linking.openURL(shareUrl);
        onShare?.('facebook');
      } else {
        Alert.alert('Error', 'Cannot open Facebook share dialog');
      }
    } catch (error) {
      console.error('Facebook share error:', error);
      Alert.alert('Error', 'Failed to share on Facebook');
    }
  };

  const handleShareTwitter = async () => {
    try {
      const text = `${title}${description ? ` - ${description}` : ''}`;
      const hashtagsStr = hashtags.length > 0 ? `&hashtags=${hashtags.join(',')}` : '';
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(url)}${hashtagsStr}`;

      const supported = await Linking.canOpenURL(shareUrl);

      if (supported) {
        await Linking.openURL(shareUrl);
        onShare?.('twitter');
      } else {
        Alert.alert('Error', 'Cannot open Twitter share dialog');
      }
    } catch (error) {
      console.error('Twitter share error:', error);
      Alert.alert('Error', 'Failed to share on Twitter');
    }
  };

  const handleShareLinkedIn = async () => {
    try {
      const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        url
      )}`;
      const supported = await Linking.canOpenURL(shareUrl);

      if (supported) {
        await Linking.openURL(shareUrl);
        onShare?.('linkedin');
      } else {
        Alert.alert('Error', 'Cannot open LinkedIn share dialog');
      }
    } catch (error) {
      console.error('LinkedIn share error:', error);
      Alert.alert('Error', 'Failed to share on LinkedIn');
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      const text = `${title}${description ? `\n${description}` : ''}\n${url}`;
      const shareUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;

      const supported = await Linking.canOpenURL(shareUrl);

      if (supported) {
        await Linking.openURL(shareUrl);
        onShare?.('whatsapp');
      } else {
        Alert.alert('Error', 'WhatsApp is not installed on this device');
      }
    } catch (error) {
      console.error('WhatsApp share error:', error);
      Alert.alert('Error', 'Failed to share on WhatsApp');
    }
  };

  const handleShareNative = async () => {
    try {
      const result = await Share.share({
        title,
        message: `${title}${description ? `\n${description}` : ''}\n${url}`,
        url,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          onShare?.(result.activityType);
        } else {
          onShare?.('native');
        }
      }
    } catch (error) {
      console.error('Native share error:', error);
      Alert.alert('Error', 'Failed to share');
    }
  };

  if (variant === 'buttons') {
    return (
      <View style={[{ flexDirection: 'column', gap: 8 }, style]}>
        <Pressable
          testID="share-button-facebook"
          accessibilityLabel="Share on Facebook"
          accessibilityRole="button"
          accessibilityHint="Opens Facebook share dialog"
          onPress={handleShareFacebook}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#1877F2',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
          }}>
          <Facebook testID="facebook-icon" size={20} color="white" />
          <Text style={{ color: 'white', marginLeft: 8, fontWeight: '600', fontSize: 15 }}>
            Share on Facebook
          </Text>
        </Pressable>

        <Pressable
          testID="share-button-twitter"
          accessibilityLabel="Share on Twitter"
          accessibilityRole="button"
          accessibilityHint="Opens Twitter share dialog"
          onPress={handleShareTwitter}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#1DA1F2',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
          }}>
          <Twitter testID="twitter-icon" size={20} color="white" />
          <Text style={{ color: 'white', marginLeft: 8, fontWeight: '600', fontSize: 15 }}>
            Share on Twitter
          </Text>
        </Pressable>

        <Pressable
          testID="share-button-linkedin"
          accessibilityLabel="Share on LinkedIn"
          accessibilityRole="button"
          accessibilityHint="Opens LinkedIn share dialog"
          onPress={handleShareLinkedIn}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#0A66C2',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
          }}>
          <Linkedin testID="linkedin-icon" size={20} color="white" />
          <Text style={{ color: 'white', marginLeft: 8, fontWeight: '600', fontSize: 15 }}>
            Share on LinkedIn
          </Text>
        </Pressable>

        <Pressable
          testID="share-button-whatsapp"
          accessibilityLabel="Share on WhatsApp"
          accessibilityRole="button"
          accessibilityHint="Opens WhatsApp share dialog"
          onPress={handleShareWhatsApp}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#25D366',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
          }}>
          <WhatsApp testID="whatsapp-icon" size={20} color="white" />
          <Text style={{ color: 'white', marginLeft: 8, fontWeight: '600', fontSize: 15 }}>
            Share on WhatsApp
          </Text>
        </Pressable>

        <Pressable
          onPress={handleShareNative}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#666',
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
          }}>
          <Share2 size={20} color="white" />
          <Text style={{ color: 'white', marginLeft: 8, fontWeight: '600', fontSize: 15 }}>
            More Options
          </Text>
        </Pressable>
      </View>
    );
  }

  // Default: icon variant
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 16 }, style]}>
      <Pressable
        testID="share-button-facebook"
        accessibilityLabel="Share on Facebook"
        accessibilityRole="button"
        accessibilityHint="Opens Facebook share dialog"
        onPress={handleShareFacebook}
        style={{
          width: iconSize * 1.8,
          height: iconSize * 1.8,
          borderRadius: (iconSize * 1.8) / 2,
          backgroundColor: '#1877F2',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Facebook testID="facebook-icon" size={iconSize} color="white" />
      </Pressable>

      <Pressable
        testID="share-button-twitter"
        accessibilityLabel="Share on Twitter"
        accessibilityRole="button"
        accessibilityHint="Opens Twitter share dialog"
        onPress={handleShareTwitter}
        style={{
          width: iconSize * 1.8,
          height: iconSize * 1.8,
          borderRadius: (iconSize * 1.8) / 2,
          backgroundColor: '#1DA1F2',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Twitter testID="twitter-icon" size={iconSize} color="white" />
      </Pressable>

      <Pressable
        testID="share-button-linkedin"
        accessibilityLabel="Share on LinkedIn"
        accessibilityRole="button"
        accessibilityHint="Opens LinkedIn share dialog"
        onPress={handleShareLinkedIn}
        style={{
          width: iconSize * 1.8,
          height: iconSize * 1.8,
          borderRadius: (iconSize * 1.8) / 2,
          backgroundColor: '#0A66C2',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Linkedin testID="linkedin-icon" size={iconSize} color="white" />
      </Pressable>

      <Pressable
        testID="share-button-whatsapp"
        accessibilityLabel="Share on WhatsApp"
        accessibilityRole="button"
        accessibilityHint="Opens WhatsApp share dialog"
        onPress={handleShareWhatsApp}
        style={{
          width: iconSize * 1.8,
          height: iconSize * 1.8,
          borderRadius: (iconSize * 1.8) / 2,
          backgroundColor: '#25D366',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <WhatsApp testID="whatsapp-icon" size={iconSize} color="white" />
      </Pressable>

      <Pressable
        onPress={handleShareNative}
        style={{
          width: iconSize * 1.8,
          height: iconSize * 1.8,
          borderRadius: (iconSize * 1.8) / 2,
          backgroundColor: '#666',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Share2 size={iconSize} color="white" />
      </Pressable>
    </View>
  );
}
