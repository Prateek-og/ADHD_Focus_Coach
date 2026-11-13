import React from 'react';
import { StyleSheet, View, Modal, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, SlideInDown, FadeOut, SlideOutDown } from 'react-native-reanimated';
import { colors, spacing } from '../theme';

export const Dialog = ({ 
  visible, 
  onClose, 
  children,
  dismissable = true,
  style 
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => {
        if (dismissable && onClose) onClose();
      }}
    >
      <Animated.View 
        style={styles.overlay}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
      >
        <BlurView intensity={8} style={StyleSheet.absoluteFill}>
          <Pressable 
            style={StyleSheet.absoluteFill} 
            onPress={() => {
              if (dismissable && onClose) onClose();
            }} 
          />
        </BlurView>
        
        <Animated.View 
          style={[styles.dialog, style]}
          entering={SlideInDown.duration(400).springify().damping(18).stiffness(150)}
          exiting={SlideOutDown.duration(300)}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s4,
  },
  dialog: {
    backgroundColor: colors.light.surfaceSolid,
    borderRadius: 32,
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    padding: 40,
    flexDirection: 'column',
    gap: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.3,
    shadowRadius: 50,
    elevation: 24,
  }
});
