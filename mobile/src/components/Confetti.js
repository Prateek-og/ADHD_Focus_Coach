import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  Easing,
  withSpring
} from 'react-native-reanimated';
import { colors } from '../theme';

const { width, height } = Dimensions.get('window');
const NUM_PARTICLES = 40;
const CONFETTI_COLORS = [
  colors.light.primary, 
  colors.light.accent, 
  colors.light.ok, 
  '#ec4899', 
  '#8b5cf6'
];

const Particle = ({ index }) => {
  const isCircle = index % 2 === 0;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Random trajectory parameters
  const angle = (Math.random() * Math.PI) + Math.PI; // Upwards hemisphere
  const velocity = 300 + Math.random() * 400; // Distance to travel
  const targetX = Math.cos(angle) * velocity;
  const targetY = (Math.sin(angle) * velocity) + 200; // Added gravity effect
  const rotations = Math.random() * 4 + 2; // Spin

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 1200 + Math.random() * 400,
      easing: Easing.bezier(0.25, 1, 0.5, 1),
    });
    
    opacity.value = withDelay(
      800 + Math.random() * 400, 
      withTiming(0, { duration: 300 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateX: progress.value * targetX },
        { translateY: progress.value * targetY },
        { rotate: `${progress.value * rotations * 360}deg` },
        { scale: 1 - (progress.value * 0.5) } // Shrink slightly at the end
      ]
    };
  });

  return (
    <Animated.View 
      style={[
        styles.particle,
        { backgroundColor: color },
        isCircle && styles.circle,
        animatedStyle
      ]} 
    />
  );
};

export const Confetti = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      {[...Array(NUM_PARTICLES)].map((_, i) => (
        <Particle key={i} index={i} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    top: -height * 0.2, // Start burst slightly above center
  },
  particle: {
    position: 'absolute',
    width: 12,
    height: 12,
  },
  circle: {
    borderRadius: 6,
  }
});
