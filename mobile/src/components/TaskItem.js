import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassCard } from './GlassCard';
import { Button } from './Button';
import { Chip } from './Chip';
import { colors, typography, spacing } from '../theme';

export const TaskItem = ({ 
  title, 
  duration, 
  isDone, 
  icon, 
  onAction,
  actionLabel = 'Start',
  style 
}) => {
  return (
    <GlassCard style={[styles.container, style]}>
      <View style={[styles.iconBox, isDone && styles.iconBoxDone]}>
        {icon}
      </View>
      
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.subtitle}>{duration} min</Text>
      </View>

      {isDone ? (
        <Chip label="Done!" variant="ok" />
      ) : (
        <Button 
          title={actionLabel} 
          onPress={onAction} 
          size="sm" 
        />
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.s5,
    gap: spacing.s5,
    marginBottom: spacing.s4,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.primaryWash,
  },
  iconBoxDone: {
    backgroundColor: colors.light.okWash,
  },
  meta: {
    flex: 1,
  },
  title: {
    fontFamily: typography.fonts.heading,
    fontWeight: typography.weights.extrabold,
    fontSize: typography.sizes.adult.xl,
    color: colors.light.textMain,
    marginBottom: 4,
    lineHeight: 26,
  },
  subtitle: {
    fontFamily: typography.fonts.body,
    fontSize: 15,
    fontWeight: typography.weights.semibold,
    color: colors.light.textMuted,
  }
});
