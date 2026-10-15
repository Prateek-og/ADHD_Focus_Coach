import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { GlassCard, Button, InputField, Chip } from '../../components';
import { updateProfile, removePreference } from '../../store/userSlice';
import { colors, typography, spacing } from '../../theme';

export const ChildProfileScreen = () => {
  const { childProfile, preferences } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: childProfile.name,
    age: childProfile.age.toString(),
    klass: childProfile.klass,
    description: childProfile.description,
  });

  const handleSave = () => {
    dispatch(updateProfile({
      ...formData,
      age: parseInt(formData.age, 10) || 8,
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Child profile</Text>
        </View>

        <GlassCard style={styles.card}>
          <View style={styles.rowGrid}>
            <View style={styles.flex2}><InputField label="Name" value={formData.name} onChangeText={(t) => setFormData({...formData, name: t})} /></View>
            <View style={styles.flex1}><InputField label="Age" value={formData.age} onChangeText={(t) => setFormData({...formData, age: t})} /></View>
          </View>
          
          <InputField label="Class" value={formData.klass} onChangeText={(t) => setFormData({...formData, klass: t})} />
          
          <InputField 
            label="What should the coach know?" 
            value={formData.description} 
            onChangeText={(t) => setFormData({...formData, description: t})} 
            multiline 
          />
          
          <Button title="Save profile" onPress={handleSave} style={{ alignSelf: 'flex-start', marginTop: spacing.s3 }} />
        </GlassCard>

        <GlassCard style={[styles.card, { marginTop: spacing.s4 }]}>
          <Text style={styles.cardTitle}>What the coach has learned</Text>
          <View style={styles.chipRow}>
            {preferences.map((p, i) => (
              <View key={i} style={styles.prefChip}>
                <Chip label={p} variant="grape" />
              </View>
            ))}
          </View>
          <Text style={styles.hintText}>Kept to three at most, counted from the child's answers. You can remove any of them.</Text>
        </GlassCard>

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
  card: { padding: spacing.s5, gap: spacing.s2 },
  rowGrid: { flexDirection: 'row', gap: spacing.s4 },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  cardTitle: { fontFamily: typography.fonts.heading, fontSize: 18, fontWeight: typography.weights.bold, marginBottom: spacing.s4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s3, marginBottom: spacing.s4 },
  prefChip: { flexDirection: 'row', alignItems: 'center' },
  hintText: { fontSize: 14, color: colors.light.textMuted, lineHeight: 20 }
});
