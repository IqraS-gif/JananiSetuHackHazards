import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, borderRadius, typography, spacing } from '../../theme/designSystem';

const AnimatedRiskBar = ({ riskLevel = 'Low', percentage = 20, animated = true, textColor }) => {
  const widthPercentage = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      widthPercentage.value = withTiming(percentage, {
        duration: 1200,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      widthPercentage.value = percentage;
    }
  }, [percentage, animated, widthPercentage]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${widthPercentage.value}%`,
    };
  });

  const getRiskColor = () => {
    switch (riskLevel.toLowerCase()) {
      case 'high':
        return colors.danger;
      case 'medium':
        return colors.warning;
      case 'low':
      case 'normal':
        return colors.success;
      default:
        return colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, textColor && { color: textColor }]}>Risk Factor</Text>
        <Text style={[styles.value, { color: textColor || getRiskColor() }]}>
          {riskLevel}
        </Text>
      </View>
      <View style={styles.barContainer}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: getRiskColor() },
            animatedStyle,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: spacing.sm,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.bodyM,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  value: {
    ...typography.bodyM,
    fontWeight: '700',
  },
  barContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.round,
  },
});

export default AnimatedRiskBar;
