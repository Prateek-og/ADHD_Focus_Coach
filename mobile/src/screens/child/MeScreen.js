import React from 'react';
import { useSelector } from 'react-redux';
import { GlassCard, StatCard, Chip, BuddyAvatar } from '../../components';
import { colors, typography, spacing } from '../../theme';

export const MeScreen = () => {
  const { childProfile, points } = useSelector((state) => state.user);
  const { streak } = useSelector((state) => state.tasks);

  const BADGES = [
    { n: 'First step', p: 50 },
    { n: '3 day streak', p: 150 },
    { n: 'Ten tasks', p: 300 },
    { n: 'Helper', p: 500 }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <GlassCard style={styles.hero}>
          <Text style={styles.name}>{childProfile.name}</Text>
          <BuddyAvatar mood="idle" size={140} />
        </GlassCard>

        <View style={styles.row}>
          <StatCard 
            value={streak} 
            label="Day streak" 
            style={styles.flexHalf}
          />
          <StatCard 
            value={points} 
            label="Points" 
            style={styles.flexHalf}
          />
        </View>

        <GlassCard style={styles.rewardsCard}>
          <Text style={styles.sectionTitle}>Rewards</Text>
          <View style={styles.badgeGrid}>
            {BADGES.map((b, i) => {
              const unlocked = points >= b.p;
              return (
                <View key={i} style={[styles.badge, !unlocked && styles.lockedBadge]}>
                  <View style={[styles.badgeIcon, !unlocked && styles.lockedIcon]} />
                  <Text style={styles.badgeName}>{b.n}</Text>
                  <Text style={styles.badgePoints}>{b.p} pts</Text>
                </View>
              );
            })}
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
    padding: spacing.s4,
    gap: spacing.s4,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.s8,
  },
  name: {
    position: 'absolute',
    top: spacing.s5,
    right: spacing.s5,
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.adult.lg,
    fontWeight: typography.weights.bold,
    color: colors.light.textMain,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.s4,
  },
  flexHalf: {
    flex: 1,
  },
  rewardsCard: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.adult.xl,
    fontWeight: typography.weights.extrabold,
    color: colors.light.textMain,
    textAlign: 'center',
    marginBottom: spacing.s5,
  },
  badgeGrid: {
    flexDirection: 'column',
    gap: spacing.s3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceSolid,
    padding: spacing.s3,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  lockedBadge: {
    opacity: 0.6,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.light.accent,
    marginRight: spacing.s3,
  },
  lockedIcon: {
    backgroundColor: colors.light.sunken,
  },
  badgeName: {
    flex: 1,
    fontFamily: typography.fonts.body,
    fontSize: 16,
    fontWeight: typography.weights.extrabold,
    color: colors.light.textMain,
  },
  badgePoints: {
    fontFamily: typography.fonts.body,
    fontSize: 14,
    color: colors.light.textMuted,
  }
});
