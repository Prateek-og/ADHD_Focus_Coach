import React from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { colors, typography, spacing, shadows } from '../theme';

export const Button = ({
  title,
  onPress,
  variant = 'primary', // primary, quiet, soft, danger
  size = 'md', // sm, md, lg
  block = false,
  disabled = false,
  icon = null,
  style,
  textStyle,
}) => {
  
  const getContainerStyle = (pressed) => {
    let styleArr = [styles.base];
    
    // Size
    if (size === 'sm') styleArr.push(styles.sm);
    else if (size === 'lg') styleArr.push(styles.lg);
    
    // Block
    if (block) styleArr.push(styles.block);
    
    // Variant
    if (variant === 'primary') styleArr.push(styles.primary, pressed ? styles.primaryActive : styles.primaryBase);
    else if (variant === 'quiet') styleArr.push(styles.quiet, pressed ? styles.quietActive : styles.quietBase);
    else if (variant === 'soft') styleArr.push(styles.soft, pressed && styles.softActive);
    else if (variant === 'danger') styleArr.push(styles.danger, pressed ? styles.dangerActive : styles.dangerBase);
    
    // Disabled
    if (disabled) styleArr.push(styles.disabled);
    
    return [styleArr, style];
  };

  const getTextStyle = () => {
    let styleArr = [styles.textBase];
    
    if (size === 'sm') styleArr.push(styles.textSm);
    else if (size === 'lg') styleArr.push(styles.textLg);
    
    if (variant === 'primary' || variant === 'danger') styleArr.push(styles.textLight);
    else styleArr.push(styles.textDark);
    
    return [styleArr, textStyle];
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => getContainerStyle(pressed)}
    >
      {({ pressed }) => (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={getTextStyle()}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: spacing.buttonRadius,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: spacing.tap,
    paddingHorizontal: spacing.s6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s2,
  },
  iconContainer: {
    marginRight: 4,
  },
  sm: {
    minHeight: 40,
    paddingHorizontal: spacing.s4,
  },
  lg: {
    minHeight: 64,
    paddingHorizontal: spacing.s8,
  },
  block: {
    width: '100%',
  },
  
  // Primary
  primary: {
    backgroundColor: colors.light.primary,
  },
  primaryBase: {
    ...shadows.buttonPrimary,
    borderBottomWidth: 5,
    borderBottomColor: colors.light.primaryDark,
  },
  primaryActive: {
    ...shadows.buttonPrimaryActive,
    borderBottomWidth: 0,
    transform: [{ translateY: 5 }],
  },
  
  // Quiet
  quiet: {
    backgroundColor: colors.light.surfaceSolid,
    borderColor: colors.light.border,
  },
  quietBase: {
    ...shadows.buttonQuiet,
    borderBottomWidth: 5,
    borderBottomColor: colors.light.border,
  },
  quietActive: {
    borderBottomWidth: 0,
    transform: [{ translateY: 5 }],
  },
  
  // Soft
  soft: {
    backgroundColor: colors.light.sunken,
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  softActive: {
    borderBottomWidth: 0,
    transform: [{ translateY: 4 }],
  },
  
  // Danger
  danger: {
    backgroundColor: colors.light.bad,
  },
  dangerBase: {
    borderBottomWidth: 5,
    borderBottomColor: colors.light.badInk,
    shadowColor: colors.light.bad,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  dangerActive: {
    borderBottomWidth: 0,
    transform: [{ translateY: 5 }],
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // Disabled
  disabled: {
    opacity: 0.5,
  },
  
  // Text Styles
  textBase: {
    fontFamily: typography.fonts.heading,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.adult.lg, // 18 by default, will adjust for kids later
  },
  textSm: {
    fontSize: typography.sizes.adult.base,
  },
  textLg: {
    fontSize: typography.sizes.adult.xl,
  },
  textLight: {
    color: '#ffffff',
  },
  textDark: {
    color: colors.light.textMain,
  }
});
