import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../theme';

export const StatCard = ({ value, label, style }) => {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.light.surfaceSolid,
    borderRadius: spacing.radius,
    padding: spacing.s5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 3,
    borderColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
  },
  value: {
    fontFamily: typography.fonts.heading,
    fontSize: 48,
    fontWeight: typography.weights.extrabold,
    lineHeight: 48,
    color: colors.light.primaryDark,
    marginBottom: spacing.s2,
  },
  label: {
    fontFamily: typography.fonts.body,
    fontSize: 14,
    fontWeight: typography.weights.extrabold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.light.textMuted,
  }
});
