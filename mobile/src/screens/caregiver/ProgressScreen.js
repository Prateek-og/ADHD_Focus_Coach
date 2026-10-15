import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView } from 'react-native';
import { GlassCard } from '../../components';
import { colors, typography, spacing } from '../../theme';

export const ProgressScreen = () => {
  
  // Mock AI Insights data based on focus-buddy.html prototype
  const insights = [
    {
      id: 1, icon: '☀️', title: 'Golden Hour',
      primary: 'Tasks before 6 PM have a 78% completion rate.',
      secondary: '',
    },
    {
      id: 2, icon: '⏱️', title: 'Time Estimate Accuracy',
      primary: 'Parent estimate: 20m\nActual average: 35m',
      secondary: '',
      warn: true,
    },
    {
      id: 3, icon: '▶️', title: 'Starting vs Finishing',
      primary: 'Time to start first step: 12 mins.',
      secondary: 'High difficulty starting, but normal completion once started.',
    },
    {
      id: 4, icon: '⚠️', title: 'Where they get stuck',
      primary: 'Most sessions stop at Step 3.',
      secondary: 'Typically deferred or abandoned.',
    },
    {
      id: 5, icon: '🧩', title: 'Task Size Analysis',
      primary: '4+ step tasks are deferred 40% more often.',
      secondary: 'Parent will be warned during creation.',
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
        </View>

        <Text style={styles.sectionHeader}>AI Insights & Analytics</Text>

        <View style={styles.grid}>
          {insights.map(item => (
            <GlassCard key={item.id} style={styles.insightCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.icon}>{item.icon}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
              </View>
              <Text style={[styles.primaryText, item.warn && styles.warnText]}>{item.primary}</Text>
              {item.secondary ? <Text style={styles.secondaryText}>{item.secondary}</Text> : null}
            </GlassCard>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.light.backgroundBase },
  scroll: { flex: 1 },
  container: { padding: spacing.s4, gap: spacing.s4, paddingBottom: spacing.s8 },
  header: { marginBottom: spacing.s4 },
  title: { fontFamily: typography.fonts.heading, fontSize: typography.sizes.adult.xxl, fontWeight: typography.weights.extrabold, color: colors.light.textMain },
  sectionHeader: { fontFamily: typography.fonts.heading, fontSize: 20, fontWeight: typography.weights.bold, marginTop: spacing.s4, marginBottom: spacing.s2 },
  grid: { gap: spacing.s4 },
  insightCard: { padding: spacing.s5, gap: spacing.s3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.s2 },
  icon: { fontSize: 20 },
  cardTitle: { fontFamily: typography.fonts.heading, fontSize: 18, fontWeight: typography.weights.bold, color: colors.light.textMain },
  primaryText: { fontFamily: typography.fonts.body, fontSize: 16, color: colors.light.textMain, lineHeight: 22 },
  warnText: { color: colors.light.warnInk, fontWeight: 'bold' },
  secondaryText: { fontFamily: typography.fonts.body, fontSize: 14, color: colors.light.textMuted },
});
