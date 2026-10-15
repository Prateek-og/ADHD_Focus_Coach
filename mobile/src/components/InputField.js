import React from 'react';
import { StyleSheet, Text, View, TextInput } from 'react-native';
import { colors, typography, spacing } from '../theme';

export const InputField = ({ label, value, onChangeText, placeholder, multiline = false, style }) => {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          multiline && styles.multiline
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.light.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: spacing.s1,
    marginBottom: spacing.s3,
  },
  label: {
    fontFamily: typography.fonts.body,
    fontSize: 15,
    fontWeight: typography.weights.bold,
    color: colors.light.textMuted,
    marginLeft: 4,
  },
  input: {
    width: '100%',
    minHeight: spacing.tap,
    paddingHorizontal: spacing.s4,
    paddingVertical: spacing.s3,
    backgroundColor: colors.light.sunken,
    borderWidth: 2,
    borderColor: colors.light.border,
    borderRadius: 16,
    fontSize: typography.sizes.adult.lg,
    fontFamily: typography.fonts.body,
    color: colors.light.textMain,
  },
  multiline: {
    minHeight: 100,
    paddingTop: spacing.s3,
  }
});
