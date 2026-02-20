import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, typography } from '../../theme/designSystem';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HealthScoreRing = ({ score = 0, size = 120, strokeWidth = 10, duration = 1500, textColor }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [score, duration, progress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (circumference * progress.value) / 100;
    return {
      strokeDashoffset,
    };
  });

  const getScoreColor = () => {
    if (score >= 80) return colors.success;
    if (score >= 50) return colors.warning;
    return colors.danger;
  };

  const getGradientColors = () => {
    if (score >= 80) return ['#00C896', '#50E3C2'];
    if (score >= 50) return ['#FFB020', '#F5A623'];
    return ['#FF5C5C', '#D0021B'];
  };

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={getGradientColors()[0]} />
            <Stop offset="100%" stopColor={getGradientColors()[1]} />
          </LinearGradient>
        </Defs>

        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
          strokeOpacity={0.3}
        />

        {/* Animated Progress Ring */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={StyleSheet.absoluteFillObject}>
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreText, { color: getScoreColor() }]}>
            {Math.round(score)}
          </Text>
          <Text style={[styles.scoreLabel, textColor && { color: textColor }]}>Health Score</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scoreContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    ...typography.headingXL,
    marginBottom: -4,
  },
  scoreLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
});

export default HealthScoreRing;
