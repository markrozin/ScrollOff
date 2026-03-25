import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Share,
} from 'react-native';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import BackButton from '../components/BackButton';
import { colors, spacing, radius } from '../theme';

const MOCK_PLAYERS = [
  { id: '1', name: 'You', isLeader: true, isYou: true },
  { id: '2', name: 'Liron', isLeader: false, isYou: false },
  { id: '3', name: 'Sarah', isLeader: false, isYou: false },
];

const PAYMENT_METHODS = [
  { id: 'card', label: 'Credit / Debit Card' },
  { id: 'crypto', label: 'Crypto Wallet' },
];

export default function LobbyScreen({ navigation, route }) {
  const { code, isLeader = false, settings, partyName } = route.params || {};
  const [name, setName] = useState('');
  const [nameSet, setNameSet] = useState(isLeader);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [players] = useState(MOCK_PLAYERS);

  const maxDeposit = settings
    ? (settings.buyIn + settings.penalty * settings.duration).toFixed(2)
    : null;

  const handleShare = async () => {
    try {
      await Share.share({ message: `Join my ScrollOff challenge! Code: ${code}` });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        <BackButton onPress={() => navigation.goBack()} />

        <View style={styles.header}>
          <Text style={styles.title}>{partyName || 'Lobby'}</Text>
          <View style={styles.codePill}>
            <Text style={styles.codeLabel}>Code</Text>
            <Text style={styles.codeText}>{code}</Text>
          </View>
        </View>

        {/* Name Entry */}
        {!nameSet && (
          <Card style={styles.nameCard}>
            <Text style={styles.sectionTitle}>Your Name</Text>
            <Input value={name} onChangeText={setName} placeholder="Enter your name" />
            <Button
              title="Join"
              onPress={() => name.trim() && setNameSet(true)}
              style={!name.trim() ? styles.disabled : null}
            />
          </Card>
        )}

        {/* Settings */}
        {settings && (
          <Card variant="alt" style={styles.settingsCard}>
            <Text style={styles.sectionTitle}>Challenge Settings</Text>
            <View style={styles.settingsGrid}>
              <SettingChip label="Buy-in" value={`$${settings.buyIn}`} />
              <SettingChip label="Duration" value={`${settings.duration} days`} />
              <SettingChip label="Daily limit" value={`${settings.dailyLimit}h`} />
              <SettingChip label="Penalty" value={`$${settings.penalty}/day`} />
            </View>
            {maxDeposit && (
              <View style={styles.depositRow}>
                <Text style={styles.depositLabel}>Your max deposit</Text>
                <Text style={styles.depositValue}>${maxDeposit}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Players */}
        <Card style={styles.playersCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Players ({players.length})</Text>
            <TouchableOpacity onPress={handleShare} activeOpacity={0.7}>
              <Text style={styles.inviteLink}>+ Invite</Text>
            </TouchableOpacity>
          </View>
          {players.map((p, i) => {
            const hues = ['#A5B4FC', '#C4B5FD', '#67E8F9', '#86EFAC', '#FCA5A5', '#FCD34D'];
            const color = hues[i % hues.length];
            return (
              <View key={p.id} style={styles.playerRow}>
                <View style={[styles.avatar, { borderColor: color }]}>
                  <Text style={[styles.avatarText, { color }]}>{p.name[0].toUpperCase()}</Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{p.name}{p.isYou ? ' · you' : ''}</Text>
                  {p.isLeader && <Text style={styles.roleText}>Game Leader</Text>}
                </View>
                <View style={[styles.readyDot, p.isYou && styles.readyDotActive]} />
              </View>
            );
          })}
        </Card>

        {/* Payment */}
        <Card style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {PAYMENT_METHODS.map(pm => (
            <TouchableOpacity
              key={pm.id}
              style={[styles.paymentOption, selectedPayment === pm.id && styles.paymentOptionActive]}
              onPress={() => setSelectedPayment(pm.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.paymentLabel, selectedPayment === pm.id && styles.paymentLabelActive]}>
                {pm.label}
              </Text>
              <View style={[styles.radio, selectedPayment === pm.id && styles.radioActive]} />
            </TouchableOpacity>
          ))}
        </Card>

        <TouchableOpacity onPress={() => navigation.navigate('Instructions')} activeOpacity={0.7}>
          <Text style={styles.howItWorks}>How it works</Text>
        </TouchableOpacity>

        {isLeader ? (
          <Button
            title="Start Challenge"
            size="lg"
            onPress={() => navigation.replace('Game', { code, settings, players, partyName })}
            style={styles.fullWidth}
          />
        ) : (
          <Button
            title="Ready"
            size="lg"
            variant={selectedPayment && nameSet ? 'primary' : 'outline'}
            onPress={() => {}}
            style={styles.fullWidth}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingChip({ label, value }) {
  return (
    <View style={styles.settingChip}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: 'Raleway_800ExtraBold',
    fontSize: 36,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeLabel: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 11,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: colors.primary,
    letterSpacing: 3,
  },

  nameCard: { gap: spacing.md },
  settingsCard: { gap: spacing.md },
  settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  settingChip: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    width: '47%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingLabel: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 11,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingValue: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 16,
    color: colors.textDark,
  },
  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  depositLabel: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 14,
    color: colors.textMid,
  },
  depositValue: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 16,
    color: colors.primary,
  },

  playersCard: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 16,
    color: colors.textDark,
  },
  inviteLink: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 14,
    color: colors.primary,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarText: {
    fontFamily: 'Raleway_800ExtraBold',
    fontSize: 17,
    color: colors.primary,
  },
  playerInfo: { flex: 1, gap: 2 },
  playerName: {
    fontFamily: 'Raleway_700Bold',
    fontSize: 15,
    color: colors.textDark,
  },
  roleText: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 12,
    color: colors.accent,
  },
  readyDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.border,
  },
  readyDotActive: {
    backgroundColor: '#86EFAC',
    borderColor: '#86EFAC',
  },

  paymentCard: { gap: spacing.md },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  paymentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  paymentIcon: { fontSize: 20 },
  paymentLabel: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 15,
    color: colors.textMid,
    flex: 1,
  },
  paymentLabelActive: {
    fontFamily: 'Raleway_600SemiBold',
    color: colors.textDark,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },

  howItWorks: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 14,
    color: colors.textMid,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.4 },
});
