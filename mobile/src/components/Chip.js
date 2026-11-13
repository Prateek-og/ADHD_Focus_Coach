import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../theme';

export const Chip = ({
  label,
  variant = 'default', // default, ok, warn, bad, brand, grape
  icon = null,
  style,
}) => {
  
  const getContainerStyle = () => {
    let styleArr = [styles.base];
    
    if (variant === 'ok') styleArr.push(styles.ok);
    else if (variant === 'warn') styleArr.push(styles.warn);
    else if (variant === 'bad') styleArr.push(styles.bad);
    else if (variant === 'brand') styleArr.push(styles.brand);
    else if (variant === 'grape') styleArr.push(styles.grape);
    else styleArr.push(styles.default);
    
    return [styleArr, style];
  };

  const getTextStyle = () => {
    let styleArr = [styles.textBase];
    
    if (variant === 'default') styleArr.push(styles.textDark);
    else styleArr.push(styles.textLight);
    
    return styleArr;
  };

  return (
    <View style={getContainerStyle()}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={getTextStyle()}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: spacing.buttonRadius,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: 6,
  },
  textBase: {
    fontFamily: typography.fonts.body,
    fontWeight: typography.weights.extrabold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  textDark: {
    color: colors.light.textMuted,
  },
  textLight: {
    color: '#ffffff',
  },
  
  // Variants
  default: {
    backgroundColor: colors.light.surfaceSolid,
    borderColor: colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ok: {
    backgroundColor: colors.light.ok,
    borderColor: colors.light.okInk,
  },
  warn: {
    backgroundColor: colors.light.warn,
    borderColor: colors.light.warnInk,
  },
  bad: {
    backgroundColor: colors.light.bad,
    borderColor: colors.light.badInk,
  },
  brand: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primaryDark,
    shadowColor: colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  grape: {
    backgroundColor: '#8B5CF6',
    borderColor: '#6D28D9',
  }
});
