import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Star } from 'lucide-react-native';

interface RatingStarsProps {
  rating: number; // 0-5, supports 0.5 increments
  maxRating?: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  emptyColor?: string;
  readOnly?: boolean;
  showValue?: boolean;
  showCount?: boolean;
  count?: number;
  allowHalf?: boolean;
  onChange?: (rating: number) => void;
  style?: any;
}

export function RatingStars({
  rating,
  maxRating = 5,
  size = 'medium',
  color = '#FFD700',
  emptyColor = '#D3D3D3',
  readOnly = false,
  showValue = false,
  showCount = false,
  count,
  allowHalf = true,
  onChange,
  style,
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const starSizes = {
    small: 16,
    medium: 24,
    large: 32,
  };

  const starSize = starSizes[size];
  const displayRating = hoverRating !== null ? hoverRating : rating;

  const handleStarPress = (index: number, isHalf: boolean) => {
    if (readOnly || !onChange) return;

    const newRating = allowHalf && isHalf ? index + 0.5 : index + 1;
    onChange(newRating);
  };

  const renderStar = (index: number) => {
    const fullStars = Math.floor(displayRating);
    const hasHalfStar = displayRating % 1 !== 0;
    const isFullStar = index < fullStars;
    const isHalfStar = index === fullStars && hasHalfStar;

    if (readOnly) {
      // Read-only mode: just display the rating
      return (
        <View key={index} testID={`star-${index}`} style={{ position: 'relative' }}>
          {isHalfStar ? (
            <>
              {/* Empty star background */}
              <Star size={starSize} color={emptyColor} fill="none" />
              {/* Half-filled star overlay */}
              <View
                testID={`star-${index}-half`}
                style={{
                  position: 'absolute',
                  overflow: 'hidden',
                  width: starSize / 2,
                }}>
                <Star size={starSize} color={color} fill={color} />
              </View>
            </>
          ) : (
            <Star
              testID={isFullStar ? `star-${index}-full` : `star-${index}-empty`}
              size={starSize}
              color={isFullStar ? color : emptyColor}
              fill={isFullStar ? color : 'none'}
            />
          )}
        </View>
      );
    }

    // Interactive mode: allow clicking on left/right half
    return (
      <View key={index} style={{ flexDirection: 'row' }}>
        {allowHalf ? (
          <>
            {/* Left half (for 0.5 increment) */}
            <Pressable
              testID={`star-${index}-left`}
              onPress={() => handleStarPress(index, true)}
              onPressIn={() => setHoverRating(index + 0.5)}
              onPressOut={() => setHoverRating(null)}
              style={{ position: 'relative', width: starSize / 2, overflow: 'hidden' }}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${index + 0.5} stars`}>
              <Star
                size={starSize}
                color={displayRating > index ? color : emptyColor}
                fill={displayRating > index ? color : 'none'}
              />
            </Pressable>

            {/* Right half (for full star) */}
            <Pressable
              testID={`star-${index}-right`}
              onPress={() => handleStarPress(index, false)}
              onPressIn={() => setHoverRating(index + 1)}
              onPressOut={() => setHoverRating(null)}
              style={{ position: 'relative', width: starSize / 2, overflow: 'hidden' }}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${index + 1} stars`}>
              <View style={{ marginLeft: -starSize / 2 }}>
                <Star
                  size={starSize}
                  color={displayRating > index + 0.5 ? color : emptyColor}
                  fill={displayRating > index + 0.5 ? color : 'none'}
                />
              </View>
            </Pressable>
          </>
        ) : (
          // Full star only (no half support)
          <Pressable
            testID={`star-${index}-clickable`}
            onPress={() => handleStarPress(index, false)}
            onPressIn={() => setHoverRating(index + 1)}
            onPressOut={() => setHoverRating(null)}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${index + 1} star${index + 1 > 1 ? 's' : ''}`}>
            <Star
              size={starSize}
              color={displayRating > index ? color : emptyColor}
              fill={displayRating > index ? color : 'none'}
            />
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View
      testID="rating-stars-container"
      style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {Array.from({ length: maxRating }, (_, i) => renderStar(i))}
      </View>

      {showValue && (
        <Text
          className={`ml-2 font-semibold text-foreground ${
            size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base'
          }`}>
          {rating.toFixed(1)}
        </Text>
      )}

      {showCount && count !== undefined && (
        <Text
          className={`ml-1 text-muted-foreground ${
            size === 'small' ? 'text-[11px]' : size === 'medium' ? 'text-[13px]' : 'text-[15px]'
          }`}>
          ({count.toLocaleString()})
        </Text>
      )}
    </View>
  );
}

// Preset component for displaying average rating
export function AverageRating({
  rating,
  count,
  size = 'medium',
  style,
}: {
  rating: number;
  count?: number;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}) {
  return (
    <RatingStars
      rating={rating}
      readOnly
      showValue
      showCount
      count={count}
      size={size}
      style={style}
    />
  );
}

// Preset component for user rating input
export function RatingInput({
  value,
  onChange,
  size = 'large',
  style,
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}) {
  return (
    <View style={style}>
      <RatingStars
        rating={value}
        readOnly={false}
        allowHalf={false}
        onChange={onChange}
        size={size}
      />
      <Text variant="small" className="mt-2 text-center text-muted-foreground">
        {value === 0 ? 'Tap to rate' : `You rated: ${value} star${value !== 1 ? 's' : ''}`}
      </Text>
    </View>
  );
}
