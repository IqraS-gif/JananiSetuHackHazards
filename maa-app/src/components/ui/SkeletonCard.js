import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { borderRadius, colors, spacing } from '../../theme/designSystem';

const SkeletonCard = ({ width = '100%', height = 120, style, animated = true }) => {
  const opacity = new Animated.Value(0.3);

  useEffect(() => {
    if (!animated) return;
    
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    );
    
    pulse.start();
    
    return () => pulse.stop();
  }, [animated, opacity]);

  return (
    <Animated.View 
      style={[
        styles.skeleton, 
        { width, height, opacity },
        style
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.border,
    borderRadius: borderRadius.md,
    marginVertical: spacing.sm,
  },
});

export default SkeletonCard;
