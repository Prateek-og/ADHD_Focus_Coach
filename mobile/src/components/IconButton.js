import React from 'react';
import { StyleSheet, Pressable, View, Text } from 'react-native';
import { colors, spacing } from '../theme';

export const IconButton = ({
  icon,
  onPress,
  badgeCount = 0,
  style,
  disabled = false
}) => {
  
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        pressed ? styles.active : styles.idle,
        disabled && styles.disabled,
        style
      ]}
    >
      {icon}
      
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 16,
  },
  idle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  active: {
    transform: [{ translateY: 2 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    backgroundColor: colors.light.bad,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.light.bad,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  }
});
