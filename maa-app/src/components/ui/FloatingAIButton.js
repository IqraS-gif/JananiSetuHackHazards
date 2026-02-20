import React, { useRef } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, shadows, borderRadius, spacing } from '../../theme/designSystem';

const FloatingAIButton = ({ onPress, style }) => {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 100,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 100,
      bounciness: 10,
    }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.container,
          shadows.floatingShadow,
          { transform: [{ scale: scaleValue }] },
          style
        ]}
      >
        <LinearGradient
          colors={colors.cardGradientPurple}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          <MaterialCommunityIcons name="robot-outline" size={28} color="#FFF" />
        </LinearGradient>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.lg,
    zIndex: 999,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FloatingAIButton;
