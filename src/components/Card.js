import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function Card({ children, style, variant = 'default' }) {
  return (
    <View style={[styles.card, variant === 'alt' && styles.alt, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alt: {
    backgroundColor: colors.surfaceAlt,
  },
});
