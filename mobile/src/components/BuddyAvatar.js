import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Rive, { Fit, Alignment } from 'rive-react-native';
import { colors } from '../theme';

// Placeholder for the Buddy Avatar. 
// When you add your .riv files to the assets folder, replace the `resourceName` or use `url`.
export const BuddyAvatar = ({ 
  mood = 'idle', // 'idle', 'cheer', 'wait', 'spin'
  size = 140, 
  style 
}) => {
  const riveRef = useRef(null);

  useEffect(() => {
    // If your Rive file uses state machines to control mood, trigger it here.
    // Example: riveRef.current?.fireState('BuddyStateMachine', mood);
    // For simple animations, you could just play an animation by name:
    if (riveRef.current) {
      try {
        riveRef.current.play(mood);
      } catch (e) {
        // Fallback or ignore if the animation name doesn't exactly match
      }
    }
  }, [mood]);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {/* 
        Replace this placeholder block with your actual .riv file usage. 
        Example: 
        <Rive 
          ref={riveRef}
          resourceName="buddy_avatar" // name of the file in android/app/src/main/res/raw or ios bundle
          // OR url="https://link.to/your/file.riv"
          stateMachineName="BuddyStateMachine"
          fit={Fit.Cover}
          alignment={Alignment.Center}
          style={{ width: '100%', height: '100%' }}
        />
      */}
      
      {/* Temporary fallback until .riv is linked: */}
      <View style={{ width: '100%', height: '100%', backgroundColor: colors.light.primaryWash, borderRadius: size / 2 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
