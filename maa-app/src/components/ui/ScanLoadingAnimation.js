import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors, typography, spacing } from '../../theme/designSystem';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Simple fallback animation using components if Lottie file not available
const FallbackAnimation = ({ title }) => {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="cloud-search" size={64} color={colors.primary} />
      <Text style={styles.title}>{title || 'AI is analyzing your data...'}</Text>
      <Text style={styles.subtitle}>Generating intelligent insights</Text>
    </View>
  );
};

// Assuming the user doesn't have a lottie file locally. We will provide a fallback wrapper
// or use a remote JSON if passed, otherwise default to a simpler local placeholder or spinner.
const ScanLoadingAnimation = ({ title, source }) => {
  const animationRef = useRef(null);

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.play();
    }
  }, []);

  if (!source) {
    return <FallbackAnimation title={title} />;
  }

  return (
    <View style={styles.container}>
      <LottieView
        ref={animationRef}
        source={source}
        autoPlay
        loop
        style={styles.animation}
      />
      {title && <Text style={styles.title}>{title}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  animation: {
    width: 250,
    height: 250,
  },
  title: {
    ...typography.headingM,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  subtitle: {
    ...typography.bodyM,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
  }
});

export default ScanLoadingAnimation;
