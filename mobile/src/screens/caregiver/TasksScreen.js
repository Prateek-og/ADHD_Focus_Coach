import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { GlassCard, Button, InputField, Chip, IconButton } from '../../components';
import { addTask, deleteTask } from '../../store/taskSlice';
import { colors, typography, spacing } from '../../theme';

export const TasksScreen = () => {
  const { tasks } = useSelector((state) => state.tasks);
  const dispatch = useDispatch();
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', desc: '', minutes: '10', at: '17:00', priority: 'Normal', recur: 'Daily', reward: '' });

  const handleSave = () => {
    if (!formData.title) return;
    
    dispatch(addTask({
      id: Date.now().toString(),
      ...formData,
      minutes: parseInt(formData.minutes, 10) || 10,
      done: false,
      steps: [
        { id: `s1_${Date.now()}`, t: 'Get everything you need', m: 2 },
        { id: `s2_${Date.now()}`, t: 'Do the main part', m: Math.max(2, (parseInt(formData.minutes, 10) || 10) - 4) },
        { id: `s3_${Date.now()}`, t: 'Tidy up and check', m: 2 }
      ]
    }));
    setShowForm(false);
    setFormData({ title: '', desc: '', minutes: '10', at: '17:00', priority: 'Normal', recur: 'Daily', reward: '' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Tasks</Text>
          <Button title="New Task" size="sm" onPress={() => setShowForm(true)} />
        </View>

        {showForm && (
          <GlassCard style={styles.formCard}>
            <Text style={styles.formTitle}>New task</Text>
            
            <InputField label="Title" value={formData.title} onChangeText={(t) => setFormData({...formData, title: t})} placeholder="e.g. Tidy your room" />
            <InputField label="Description" value={formData.desc} onChangeText={(t) => setFormData({...formData, desc: t})} placeholder="Optional details" />
            
            <View style={styles.rowGrid}>
              <View style={styles.flex1}><InputField label="Start time" value={formData.at} onChangeText={(t) => setFormData({...formData, at: t})} /></View>
              <View style={styles.flex1}><InputField label="Minutes" value={formData.minutes} onChangeText={(t) => setFormData({...formData, minutes: t})} /></View>
            </View>

            <InputField label="Priority (Low, Normal, High)" value={formData.priority} onChangeText={(t) => setFormData({...formData, priority: t})} />
            <InputField label="Reward (optional)" value={formData.reward} onChangeText={(t) => setFormData({...formData, reward: t})} placeholder="e.g. 10 min game time" />

            <View style={styles.formActions}>
              <Button title="Cancel" variant="quiet" onPress={() => setShowForm(false)} />
              <Button title="Save task" onPress={handleSave} />
            </View>
          </GlassCard>
        )}

        <View style={styles.taskList}>
          {tasks.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No tasks yet</Text>
              <Text style={styles.emptySub}>Add the first routine.</Text>
            </View>
          ) : (
            tasks.map(t => (
              <GlassCard key={t.id} style={styles.taskCard}>
                <View style={styles.taskMeta}>
                  <Text style={styles.taskTitle}>{t.title}</Text>
                  <Text style={styles.taskSub}>{t.at} • {t.minutes} min • {t.recur} • {t.priority}</Text>
                  <View style={styles.taskChips}>
                    <Chip label={`${t.steps.length} steps`} />
                    {t.reward ? <Chip label={t.reward} variant="brand" /> : null}
                  </View>
                </View>
                <View style={styles.taskActions}>
                  <Button title="Delete" variant="danger" size="sm" onPress={() => dispatch(deleteTask(t.id))} />
                </View>
              </GlassCard>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.light.backgroundBase },
  scroll: { flex: 1 },
  container: { padding: spacing.s4, gap: spacing.s4, paddingBottom: spacing.s8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.s2 },
  title: { fontFamily: typography.fonts.heading, fontSize: typography.sizes.adult.xxl, fontWeight: typography.weights.extrabold, color: colors.light.textMain },
  formCard: { borderColor: colors.light.primary, borderWidth: 2, marginBottom: spacing.s4 },
  formTitle: { fontFamily: typography.fonts.heading, fontSize: typography.sizes.adult.xl, fontWeight: typography.weights.bold, marginBottom: spacing.s4 },
  rowGrid: { flexDirection: 'row', gap: spacing.s4 },
  flex1: { flex: 1 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.s3, marginTop: spacing.s5 },
  taskList: { gap: spacing.s4 },
  taskCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.s5, gap: spacing.s4 },
  taskMeta: { flex: 1 },
  taskTitle: { fontFamily: typography.fonts.heading, fontSize: 22, fontWeight: typography.weights.extrabold, color: colors.light.textMain, marginBottom: 4 },
  taskSub: { fontFamily: typography.fonts.body, fontSize: 14, fontWeight: typography.weights.bold, color: colors.light.textMuted, marginBottom: 8 },
  taskChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 },
  taskActions: { flexDirection: 'column', gap: spacing.s2 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: typography.fonts.heading, fontSize: 24, fontWeight: typography.weights.bold, color: colors.light.textMain, marginBottom: 8 },
  emptySub: { color: colors.light.textMuted, fontSize: 16 }
});
