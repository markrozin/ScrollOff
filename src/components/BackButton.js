import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

export default function BackButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.btn} activeOpacity={0.7}>
      <Text style={styles.arrow}>‹</Text>
      <Text style={styles.label}>Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingRight: 16,
  },
  arrow: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 28,
    color: colors.primary,
    lineHeight: 32,
    marginTop: -2,
  },
  label: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 16,
    color: colors.primary,
  },
});
