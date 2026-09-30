import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { GlassCard, StatCard, Chip } from '../../components';
import { colors, typography, spacing } from '../../theme';

export const HomeScreen = () => {
  const { tasks, completedToday, streak } = useSelector((state) => state.tasks);
  
  // Basic mock notifications for the UI
  const notes = [
    { id: 1, type: 'TASK_REMINDER', msg: 'Tidy your room starts in 15 minutes.', when: '17:15', read: false },
    { id: 2, type: 'CAREGIVER_UPDATE', msg: 'Aarav finished Finish maths worksheet.', when: 'Just now', read: true }
  ];

  const pendingCount = tasks.filter(t => !t.done).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Today</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard value={streak} label="Day streak" style={styles.stat} />
          <StatCard value={completedToday} label="Finished today" style={styles.stat} />
          <StatCard value={pendingCount} label="Still to do" style={styles.stat} />
        </View>

        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's tasks</Text>
          </View>
          
          <View style={styles.taskList}>
            {tasks.map(t => (
              <View key={t.id} style={styles.rowItem}>
                <Chip label={t.at} variant={t.done ? 'ok' : 'default'} />
                <Text style={styles.taskTitle} numberOfLines={1}>{t.title}</Text>
                {t.done ? (
                  <Chip label="Done" variant="ok" />
                ) : (
                  <Chip label={t.priority} />
                )}
              </View>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent updates</Text>
          </View>
          
          <View style={styles.noteList}>
            {notes.map(n => (
              <View key={n.id} style={[styles.noteRow, n.read && styles.noteRead]}>
                <View style={[styles.dot, n.read && styles.dotRead]} />
                <View style={styles.noteContent}>
                  <Text style={styles.noteMsg}>{n.msg}</Text>
                  <Text style={styles.noteMeta}>{n.type.replace(/_/g, ' ')} • {n.when}</Text>
                </View>
              </View>
            ))}
          </View>
        </GlassCard>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.light.backgroundBase },
  scroll: { flex: 1 },
  container: { padding: spacing.s4, gap: spacing.s6, paddingBottom: spacing.s8 },
  header: { marginBottom: spacing.s2 },
  title: { fontFamily: typography.fonts.heading, fontSize: typography.sizes.adult.xxl, fontWeight: typography.weights.extrabold, color: colors.light.textMain },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s3 },
  stat: { flex: 1, minWidth: 100 },
  card: { padding: spacing.s5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.s5 },
  cardTitle: { fontFamily: typography.fonts.heading, fontSize: typography.sizes.adult.xl, fontWeight: typography.weights.extrabold, color: colors.light.textMain, flex: 1 },
  taskList: { gap: spacing.s3 },
  rowItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.light.surfaceSolid, padding: spacing.s4, borderRadius: spacing.radius, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)', gap: spacing.s3 },
  taskTitle: { flex: 1, fontFamily: typography.fonts.body, fontSize: 16, fontWeight: typography.weights.bold, color: colors.light.textMain },
  noteList: { gap: spacing.s4 },
  noteRow: { flexDirection: 'row', gap: spacing.s3, borderBottomWidth: 1, borderBottomColor: colors.light.border, paddingBottom: spacing.s4 },
  noteRead: { opacity: 0.6 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.light.primary, marginTop: 4, shadowColor: colors.light.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 },
  dotRead: { backgroundColor: colors.light.textMuted, shadowOpacity: 0, elevation: 0 },
  noteContent: { flex: 1 },
  noteMsg: { fontFamily: typography.fonts.body, fontSize: 15, fontWeight: typography.weights.bold, color: colors.light.textMain, marginBottom: 2 },
  noteMeta: { fontFamily: typography.fonts.body, fontSize: 12, color: colors.light.textMuted, textTransform: 'capitalize' }
});
