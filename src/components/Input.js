import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function Input({ label, value, onChangeText, placeholder, keyboardType, style, ...props }) {
  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        keyboardType={keyboardType}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 14,
    color: colors.textMid,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontFamily: 'Raleway_700Bold',
    fontSize: 18,
    color: colors.textDark,
  },
});
