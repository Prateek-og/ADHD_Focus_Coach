import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { GlassCard, Button, ProgressBar, Dialog, Chip, BuddyAvatar, Confetti } from '../../components';
import { colors, typography, spacing } from '../../theme';
import { 
  beginStep, tickTime, completeStep, deferStep, setFsmState, 
  decomposeStep, refineStep, addStuckReason, endSession 
} from '../../store/sessionSlice';
import { markTaskDone } from '../../store/taskSlice';
import { addPoints } from '../../store/userSlice';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const CIRCLE_LENGTH = 2 * Math.PI * 52; // r=52

export const FocusScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const session = useSelector((state) => state.session);
  const task = useSelector((state) => state.tasks.tasks.find(t => t.id === session.activeTaskId));
  
  const [stuckDialogOpen, setStuckDialogOpen] = useState(false);
  const [idleDialogOpen, setIdleDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [idleTimer, setIdleTimer] = useState(null);

  const progressValue = useSharedValue(CIRCLE_LENGTH);

  useEffect(() => {
    let interval;
    if (session.fsmState === 'ACTIVE') {
      interval = setInterval(() => {
        dispatch(tickTime());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [session.fsmState, dispatch]);

  useEffect(() => {
    if (session.fsmState === 'ACTIVE') {
      const frac = session.overtime ? 0 : Math.max(0, Math.min(1, session.timeLeft / session.totalTime));
      progressValue.value = withTiming(CIRCLE_LENGTH * (1 - frac), {
        duration: 1000,
        easing: Easing.linear,
      });

      // Simple idle detection simulation
      if (idleTimer) clearTimeout(idleTimer);
      const newIdleTimer = setTimeout(() => {
        if (session.fsmState === 'ACTIVE') {
          dispatch(setFsmState('INACTIVE'));
          setIdleDialogOpen(true);
        }
      }, 30000); // 30 seconds of no interaction
      setIdleTimer(newIdleTimer);
    }
    return () => {
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [session.timeLeft, session.fsmState]);

  const handleTouch = () => {
    // Reset idle timer logic
  };

  const handleDone = () => {
    dispatch(addPoints(10));
    dispatch(completeStep());
    if (session.items.length === 1) { // Will be 0 after completion
      dispatch(markTaskDone(task.id));
      dispatch(addPoints(40));
    } else {
      dispatch(beginStep());
    }
  };

  const formatTime = (seconds) => {
    const s = Math.abs(seconds);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
  };

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: progressValue.value,
  }));

  if (session.fsmState === 'NO_SESSION' || !task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.title}>Nothing running</Text>
          <Text style={styles.subtitle}>Choose a mission from Today to start.</Text>
          <Button title="Go to Today" onPress={() => navigation.navigate('Today')} />
        </View>
      </SafeAreaView>
    );
  }

  if (session.fsmState === 'COMPLETED') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Confetti />
        <View style={styles.centered}>
          <BuddyAvatar mood="cheer" size={160} style={{ marginBottom: spacing.s4 }} />
          <Text style={styles.title}>{task.title} is finished</Text>
          <Text style={styles.subtitle}>Every step done.</Text>
          <Button title="Give Feedback" onPress={() => setFeedbackDialogOpen(true)} />
        </View>

        <Dialog visible={feedbackDialogOpen} onClose={() => {}}>
          <Text style={styles.dialogTitle}>How did that feel?</Text>
          <View style={styles.dialogActions}>
            <Button title="Easy" onPress={() => { setFeedbackDialogOpen(false); dispatch(endSession()); navigation.navigate('Today'); }} block />
            <Button title="A little hard" variant="soft" onPress={() => { setFeedbackDialogOpen(false); dispatch(endSession()); navigation.navigate('Today'); }} block />
          </View>
        </Dialog>
      </SafeAreaView>
    );
  }

  if (session.fsmState === 'INITIATED') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <GlassCard style={styles.heroMini}>
            <BuddyAvatar mood="idle" size={80} />
          </GlassCard>
          
          <View style={styles.mainArea}>
            <Text style={styles.title}>{task.title}</Text>
            <Text style={styles.subtitle}>Buddy split this into {session.items.length} small steps.</Text>
            
            <View style={styles.stepListPreview}>
              {session.items.map((s, i) => (
                <View key={s.id} style={styles.previewRow}>
                  <Chip label={`${i+1}`} variant="brand" />
                  <Text style={styles.previewText} numberOfLines={1}>{s.text}</Text>
                  <Text style={styles.previewTime}>{s.min}m</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.actionsBox}>
              <Button title="Let's go" size="lg" block onPress={() => dispatch(beginStep())} />
              <Button title="Not now" variant="quiet" block onPress={() => { dispatch(endSession()); navigation.navigate('Today'); }} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (session.fsmState === 'BREAK') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <GlassCard style={styles.heroMini}>
            <BuddyAvatar mood="idle" size={80} />
          </GlassCard>
          
          <View style={styles.mainArea}>
            <Text style={styles.title}>Break time</Text>
            <Text style={styles.subtitle}>Your step is saved. Come back when you are ready.</Text>
            
            <GlassCard flat style={{width: '100%', marginBottom: spacing.s5}}>
              <Text style={{color: colors.light.textMuted}}>Waiting for you</Text>
              <Text style={{fontSize: 18, fontWeight: 'bold'}}>{session.items[0]?.text}</Text>
            </GlassCard>
            
            <Button title="I'm ready" size="lg" block onPress={() => dispatch(setFsmState('ACTIVE'))} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ACTIVE state
  const currentStep = session.items[0];

  return (
    <SafeAreaView style={styles.safeArea} onTouchStart={handleTouch}>
      <View style={styles.container}>
        <GlassCard style={styles.heroMini}>
          <BuddyAvatar mood={session.timeLeft < 10 && !session.overtime ? 'cheer' : session.overtime ? 'wait' : 'idle'} size={80} />
        </GlassCard>
        
        <View style={styles.mainArea}>
          <View style={styles.ringContainer}>
            <Svg viewBox="0 0 120 120" style={styles.svgRing}>
              <Circle cx="60" cy="60" r="52" stroke={colors.light.border} strokeWidth="16" fill="none" />
              <AnimatedCircle 
                cx="60" cy="60" r="52" 
                stroke={session.overtime ? colors.light.warn : colors.light.primary} 
                strokeWidth="16" 
                fill="none" 
                strokeDasharray={CIRCLE_LENGTH} 
                animatedProps={animatedProps} 
                strokeLinecap="round"
              />
            </Svg>
            <View style={styles.ringInner}>
              <Text style={styles.timeText}>{formatTime(session.timeLeft)}</Text>
              <Text style={styles.timeCap}>{session.overtime ? 'no rush' : 'left'}</Text>
            </View>
          </View>

          <View style={styles.progressArea}>
            <Text style={styles.stepTitle}>{currentStep?.text}</Text>
            <ProgressBar progress={session.progress} style={{marginBottom: spacing.s5}} />
            
            <View style={styles.actionGrid}>
              <Button title="Step done" onPress={handleDone} />
              <Button title="I'm stuck" variant="quiet" onPress={() => setStuckDialogOpen(true)} />
              <Button title="Break" variant="quiet" onPress={() => dispatch(setFsmState('BREAK'))} />
              <Button title="Later" variant="soft" onPress={() => dispatch(deferStep())} />
            </View>
          </View>
        </View>
      </View>

      <Dialog visible={stuckDialogOpen} onClose={() => setStuckDialogOpen(false)}>
        <Text style={styles.dialogTitle}>What's tricky?</Text>
        <View style={styles.dialogActions}>
          <Button title="It's too big" variant="soft" block onPress={() => {
            dispatch(addStuckReason('too big'));
            dispatch(decomposeStep());
            dispatch(beginStep());
            setStuckDialogOpen(false);
          }} />
          <Button title="I don't understand it" variant="soft" block onPress={() => {
            dispatch(addStuckReason('unclear'));
            dispatch(refineStep());
            dispatch(beginStep());
            setStuckDialogOpen(false);
          }} />
          <Button title="Never mind" variant="quiet" block onPress={() => setStuckDialogOpen(false)} />
        </View>
      </Dialog>

      <Dialog visible={idleDialogOpen} onClose={() => {}}>
        <Text style={styles.dialogTitle}>Still there?</Text>
        <Text style={styles.dialogSubtitle}>No rush. Tap when you want to carry on.</Text>
        <View style={styles.dialogActions}>
          <Button title="I'm back!" size="lg" block onPress={() => {
            dispatch(setFsmState('ACTIVE'));
            setIdleDialogOpen(false);
          }} />
          <Button title="Take a break" variant="quiet" block onPress={() => {
            dispatch(setFsmState('BREAK'));
            setIdleDialogOpen(false);
          }} />
        </View>
      </Dialog>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.light.backgroundBase },
  container: { flex: 1, padding: spacing.s4, gap: spacing.s4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.s4, textAlign: 'center', zIndex: 10 },
  heroMini: { alignItems: 'center', paddingVertical: spacing.s4, zIndex: 1 },
  mainArea: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', zIndex: 1 },
  title: { fontFamily: typography.fonts.heading, fontSize: typography.sizes.adult.xxl, fontWeight: typography.weights.extrabold, color: colors.light.textMain, textAlign: 'center', marginBottom: spacing.s2 },
  subtitle: { fontFamily: typography.fonts.body, fontSize: 16, color: colors.light.textMuted, textAlign: 'center', marginBottom: spacing.s5 },
  stepListPreview: { width: '100%', maxWidth: 400, gap: spacing.s3, marginBottom: spacing.s6 },
  previewRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.light.surfaceSolid, padding: spacing.s3, borderRadius: spacing.radius, gap: spacing.s3 },
  previewText: { flex: 1, fontWeight: 'bold' },
  previewTime: { color: colors.light.textMuted },
  actionsBox: { width: '100%', maxWidth: 400, gap: spacing.s3 },
  ringContainer: { position: 'relative', width: 250, height: 250, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.s6 },
  svgRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transform: [{ rotate: '-90deg' }] },
  ringInner: { alignItems: 'center' },
  timeText: { fontFamily: typography.fonts.heading, fontSize: 64, fontWeight: typography.weights.extrabold, color: colors.light.textMain, lineHeight: 70 },
  timeCap: { fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', color: colors.light.textMuted, letterSpacing: 1 },
  progressArea: { width: '100%', maxWidth: 400, marginTop: 'auto' },
  stepTitle: { fontFamily: typography.fonts.heading, fontSize: 24, fontWeight: typography.weights.bold, textAlign: 'center', marginBottom: spacing.s4 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s3, justifyContent: 'center' },
  dialogTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: spacing.s4 },
  dialogSubtitle: { fontSize: 16, textAlign: 'center', color: colors.light.textMuted, marginBottom: spacing.s4 },
  dialogActions: { gap: spacing.s3 }
});
