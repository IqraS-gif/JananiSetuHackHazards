import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, shadows, spacing } from '../../theme/designSystem';

const GradientCard = ({ 
  colors, 
  children, 
  style, 
  contentStyle, 
  start = { x: 0, y: 0 }, 
  end = { x: 1, y: 1 },
  withShadow = true,
}) => {
  return (
    <View style={[styles.container, withShadow && shadows.cardShadow, style]}>
      <LinearGradient
        colors={colors}
        start={start}
        end={end}
        style={[styles.gradient, contentStyle]}
      >
        {children}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    marginVertical: spacing.sm,
  },
  gradient: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
});

export default GradientCard;
