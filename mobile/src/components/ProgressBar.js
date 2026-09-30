import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { colors } from '../theme';

export const ProgressBar = ({ progress = 0, style }) => {
  // progress should be between 0 and 1
  const safeProgress = Math.max(0, Math.min(1, progress));
  
  const animatedWidth = useSharedValue(safeProgress * 100);

  useEffect(() => {
    animatedWidth.value = withTiming(safeProgress * 100, {
      duration: 600,
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    });
  }, [safeProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedWidth.value}%`,
    };
  });

  return (
    <View style={[styles.track, style]}>
      <Animated.View style={[styles.fill, animatedStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 12,
    borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.light.primary,
    borderRadius: 99,
  }
});
