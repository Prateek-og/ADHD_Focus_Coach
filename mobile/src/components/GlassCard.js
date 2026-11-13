import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, spacing, shadows } from '../theme';

export const GlassCard = ({ children, style, sunken = false, flat = false }) => {
  if (sunken || flat) {
    return (
      <View style={[
        styles.card,
        styles.sunken,
        flat && styles.flat,
        style
      ]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={20} tint="light" style={[styles.card, styles.glass, style]}>
      {children}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: spacing.radius,
    padding: spacing.s6,
    overflow: 'hidden',
  },
  glass: {
    backgroundColor: colors.light.surface,
    borderColor: colors.light.border,
    borderWidth: 1,
    ...shadows.glass,
  },
  sunken: {
    backgroundColor: colors.light.sunken,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  flat: {
    backgroundColor: colors.light.sunken,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 1,
    borderColor: 'transparent',
  }
});
