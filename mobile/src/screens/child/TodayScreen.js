import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { GlassCard, TaskItem, BuddyAvatar } from '../../components';
import { initiateSession } from '../../store/sessionSlice';
import { colors, typography, spacing } from '../../theme';

export const TodayScreen = () => {
  const { tasks } = useSelector((state) => state.tasks);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const handleStartTask = (task) => {
    dispatch(initiateSession({ taskId: task.id, steps: task.steps }));
    navigation.navigate('Focus');
  };

  const pendingTasks = tasks.filter(t => !t.done);
  const allDone = pendingTasks.length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <GlassCard style={styles.hero}>
          <BuddyAvatar mood={allDone ? 'cheer' : 'idle'} size={140} style={{ marginBottom: spacing.s4 }} />
          <Text style={styles.heroTitle}>
            {allDone ? 'All done today!' : `${pendingTasks.length} things to do`}
          </Text>
        </GlassCard>

        <GlassCard style={styles.taskListCard}>
          <Text style={styles.sectionTitle}>Today's tasks</Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {tasks.map(t => (
              <TaskItem
                key={t.id}
                title={t.title}
                duration={t.minutes}
                isDone={t.done}
                onAction={() => handleStartTask(t)}
              />
            ))}
          </ScrollView>
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
    paddingVertical: spacing.s6,
  },
  heroTitle: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.adult.xl,
    fontWeight: typography.weights.extrabold,
    color: colors.light.textMain,
  },
  taskListCard: {
    flex: 1,
    paddingBottom: 0,
  },
  sectionTitle: {
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.adult.xl,
    fontWeight: typography.weights.extrabold,
    color: colors.light.textMain,
    marginBottom: spacing.s4,
  },
  scroll: {
    flex: 1,
  }
});
