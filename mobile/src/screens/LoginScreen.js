import React from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { useDispatch } from 'react-redux';
import { setRoleAndBand } from '../../store/authSlice';
import { Button, GlassCard } from '../../components';
import { colors, typography, spacing } from '../../theme';

export const LoginScreen = () => {
  const dispatch = useDispatch();

  const handleLogin = (role, band) => {
    dispatch(setRoleAndBand({ role, band }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.avatarPlaceholder} />
          <Text style={styles.title}>Focus Buddy</Text>
          <Text style={styles.subtitle}>Your personal coaching dog for getting things done.</Text>
        </View>
        
        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>Who is using the app?</Text>
          <View style={styles.actions}>
            <Button 
              title="I am a Child" 
              size="lg" 
              block 
              onPress={() => handleLogin('child', 'young')} 
            />
            <Button 
              title="I am a Caregiver" 
              variant="quiet" 
              size="lg" 
              block 
              onPress={() => handleLogin('caregiver', 'young')} 
            />
          </View>
        </GlassCard>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.light.backgroundBase,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s4,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.s8,
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.light.primaryWash,
    marginBottom: spacing.s6,
  },
  title: {
    fontFamily: typography.fonts.heading,
    fontSize: 48,
    fontWeight: typography.weights.extrabold,
    color: colors.light.primaryDark,
    marginBottom: spacing.s3,
  },
  subtitle: {
    fontFamily: typography.fonts.body,
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.light.textMain,
    textAlign: 'center',
    maxWidth: 340,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: typography.fonts.body,
    fontSize: 14,
    fontWeight: typography.weights.extrabold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.light.textMuted,
    marginBottom: spacing.s4,
  },
  actions: {
    width: '100%',
    gap: spacing.s4,
  }
});
