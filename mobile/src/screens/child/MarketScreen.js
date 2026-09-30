import React from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { useSelector } from 'react-redux';
import { GlassCard, Chip, BuddyAvatar } from '../../components';
import { colors, typography, spacing } from '../../theme';

export const MarketScreen = () => {
  const { points } = useSelector((state) => state.user);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <GlassCard style={styles.storeCard}>
          <View style={styles.tabsRow}>
            <Text style={[styles.tabText, styles.tabActive]}>Buddies</Text>
            <Text style={styles.tabText}>Accessories</Text>
          </View>
          
          <View style={styles.grid}>
            {[...Array(6)].map((_, i) => (
              <View key={i} style={styles.gridItem} />
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.hero}>
          <View style={styles.pointsBadge}>
            <Chip label={`Points: ${points}`} variant="brand" />
          </View>
          <BuddyAvatar mood="idle" size={120} />
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
    padding: spacing.s4,
    gap: spacing.s4,
  },
  storeCard: {
    flex: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.light.border,
    paddingBottom: spacing.s3,
    marginBottom: spacing.s5,
  },
  tabText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.adult.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textMuted,
  },
  tabActive: {
    color: colors.light.textMain,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s4,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.light.sunken,
    borderWidth: 2,
    borderColor: colors.light.border,
    borderRadius: 16,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsBadge: {
    position: 'absolute',
    top: spacing.s4,
    right: spacing.s4,
    zIndex: 10,
  }
});
