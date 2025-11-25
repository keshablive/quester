import React from 'react';
import { View } from 'react-native';
import { Star, Award, Clock } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { SellerReputation } from '@/lib/types/marketplace';

interface SellerReputationCardProps {
  reputation: SellerReputation;
  variant?: 'full' | 'compact';
  onPress?: () => void;
  onBadgePress?: (badgeId: string) => void;
}

export const SellerReputationCard = React.memo<SellerReputationCardProps>(
  ({ reputation, variant = 'full', onPress }) => {
    const {
      totalSales,
      averageRating,
      totalReviews,
      responseTime,
      xp,
      level,
      badges,
      courseRating,
      questCompletionRate,
      reputationScore,
    } = reputation;

    // Determine reputation color based on score
    const getReputationColor = () => {
      if (reputationScore >= 80) return 'hsl(142, 76%, 36%)'; // green
      if (reputationScore >= 60) return 'hsl(48, 96%, 53%)'; // yellow
      return 'hsl(0, 84%, 60%)'; // red
    };

    const formatRating = (rating: number) => rating.toFixed(1);

    // Compact variant shows minimal info
    if (variant === 'compact') {
      return (
        <View
          className="flex-row items-center gap-2 py-2"
          accessibilityRole="button"
          accessibilityLabel="Seller reputation card"
          onTouchEnd={onPress}>
          <View className="flex-row items-center gap-1">
            <Star size={16} fill="gold" color="gold" />
            <Text variant="small" className="font-semibold">
              {formatRating(averageRating)}
            </Text>
          </View>
          <Text variant="small" className="text-muted-foreground">
            Level {level}
          </Text>
        </View>
      );
    }

    // Full variant shows all details
    return (
      <Card>
        {/* Reputation Score Badge */}
        <View
          className="absolute right-2 top-2 h-16 w-16 items-center justify-center rounded-full border-4"
          style={{ borderColor: getReputationColor() }}
          testID={`reputation-score-${reputationScore}`}
          accessibilityLabel={`Reputation score ${reputationScore} out of 100`}>
          <Text variant="h2">{reputationScore}</Text>
          <Text variant="small" className="text-muted-foreground">
            Score
          </Text>
        </View>

        {/* Level and XP */}
        <CardHeader>
          <CardTitle>Level {level}</CardTitle>
          <Text variant="small" className="text-muted-foreground">
            {xp.toLocaleString()} XP
          </Text>
        </CardHeader>

        <CardContent>
          {/* Rating */}
          <View className="mb-3 flex-row items-center gap-2">
            <View
              className="flex-row items-center gap-1"
              accessibilityLabel={`${formatRating(averageRating)} stars out of 5, ${totalReviews} reviews`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  fill={i < Math.floor(averageRating) ? 'gold' : 'none'}
                  color={i < averageRating ? 'gold' : 'gray'}
                  testID={`star-icon-${i}`}
                />
              ))}
            </View>
            <Text variant="h3">{formatRating(averageRating)}</Text>
            <Text variant="small" className="text-muted-foreground">
              ({totalReviews} reviews)
            </Text>
          </View>

          {/* Stats Grid */}
          <View className="mb-4 flex-row flex-wrap gap-4">
            {/* Total Sales */}
            <View className="min-w-[100px] flex-1">
              <Text variant="h2">{totalSales}</Text>
              <Text variant="small" className="text-muted-foreground">
                Total Sales
              </Text>
            </View>

            {/* Response Time */}
            <View className="min-w-[100px] flex-1 items-center">
              <View className="mb-1 flex-row items-center gap-1">
                <Clock size={16} color="gray" />
                <Text variant="small" className="font-semibold">
                  {responseTime}
                </Text>
              </View>
              <Text variant="small" className="text-muted-foreground">
                Response Time
              </Text>
            </View>
          </View>

          {/* Course Rating (if instructor) */}
          {courseRating && (
            <View className="mb-2 flex-row items-center gap-2">
              <Star size={16} color="gold" />
              <Text variant="small">
                <Text className="font-semibold">{formatRating(courseRating)}</Text>{' '}
                <Text className="text-muted-foreground">Course Rating</Text>
              </Text>
            </View>
          )}

          {/* Quest Completion Rate (if creator) */}
          {questCompletionRate !== undefined && (
            <View className="mb-4 flex-row items-center gap-2">
              <Award size={16} color="green" />
              <Text variant="small">
                <Text className="font-semibold">{Math.round(questCompletionRate * 100)}%</Text>{' '}
                <Text className="text-muted-foreground">Quest Completion</Text>
              </Text>
            </View>
          )}

          {/* Badges */}
          {badges.length > 0 ? (
            <View className="gap-2">
              <Text variant="small" className="font-semibold">
                Badges
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {badges.map((badge) => (
                  <Badge key={badge.id} variant="secondary">
                    <Text variant="small">{badge.name}</Text>
                  </Badge>
                ))}
              </View>
            </View>
          ) : (
            <Text variant="small" className="italic text-muted-foreground">
              {totalSales === 0 ? 'New Seller' : 'No badges earned'}
            </Text>
          )}
        </CardContent>
      </Card>
    );
  }
);
SellerReputationCard.displayName = 'SellerReputationCard';
