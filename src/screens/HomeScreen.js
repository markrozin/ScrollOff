import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Button from '../components/Button';
import { colors, spacing, radius } from '../theme';

const MOCK_ONGOING_GAMES = [
  {
    id: '1',
    partyName: 'Friday Squad',
    currentDay: 6,
    duration: 7,
    players: 4,
    rank: 2,
    settings: { buyIn: 10, dailyLimit: 3, duration: 7, penalty: 5 },
  },
  {
    id: '2',
    partyName: 'Work Crew',
    currentDay: 3,
    duration: 14,
    players: 6,
    rank: 1,
    settings: { buyIn: 20, dailyLimit: 2, duration: 14, penalty: 10 },
  },
];

export default function HomeScreen({ navigation }) {
  const [joinCode, setJoinCode] = useState('');

  const handleJoinByCode = () => {
    if (!joinCode.trim()) return;
    navigation.navigate('Lobby', { code: joinCode.trim().toUpperCase(), isNew: false });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          <View style={styles.hero}>
            <Text style={styles.title}>ScrollOff</Text>
            <Text style={styles.subtitle}>
              Compete with friends to{'\n'}scroll less. Win real money.
            </Text>
          </View>

          {/* Ongoing games */}
          {MOCK_ONGOING_GAMES.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your active games</Text>
              <View style={styles.gameList}>
                {MOCK_ONGOING_GAMES.map(game => (
                  <TouchableOpacity
                    key={game.id}
                    style={styles.gameCard}
                    onPress={() => navigation.navigate('Game', { settings: game.settings, partyName: game.partyName })}
                    activeOpacity={0.75}
                  >
                    <View style={styles.gameCardLeft}>
                      <Text style={styles.gameCode}>{game.partyName}</Text>
                      <Text style={styles.gameMeta}>
                        {game.players} players · Day {game.currentDay} of {game.duration}
                      </Text>
                    </View>
                    <View style={styles.gameCardRight}>
                      <Text style={styles.gameRankLabel}>Rank</Text>
                      <Text style={styles.gameRank}>#{game.rank}</Text>
                    </View>
                    <View style={styles.progressPip}>
                      <View
                        style={[
                          styles.progressPipFill,
                          { height: `${(game.currentDay / game.duration) * 100}%` },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <Button
              title="Create a Game"
              size="lg"
              onPress={() => navigation.navigate('CreateGame')}
              style={styles.fullWidth}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or join with a code</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.joinRow}>
              <TextInput
                value={joinCode}
                onChangeText={t => setJoinCode(t.toUpperCase())}
                placeholder="Enter code"
                placeholderTextColor={colors.textLight}
                autoCapitalize="characters"
                maxLength={8}
                style={styles.codeInput}
              />
              <Button title="Join" onPress={handleJoinByCode} style={styles.joinBtn} />
            </View>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Instructions')} activeOpacity={0.7}>
            <Text style={styles.howItWorks}>How it works</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.xl,
  },
  hero: { alignItems: 'center', gap: spacing.sm },
  title: {
    fontFamily: 'Raleway_800ExtraBold',
    fontSize: 58,
    color: colors.primary,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 17,
    color: colors.textMid,
    textAlign: 'center',
    lineHeight: 26,
  },

  // Ongoing games
  section: { width: '100%', gap: spacing.sm },
  sectionLabel: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 13,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  gameList: { gap: spacing.sm },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  gameCardLeft: { flex: 1, gap: 4 },
  gameCode: {
    fontFamily: 'Raleway_800ExtraBold',
    fontSize: 18,
    color: colors.textDark,
    letterSpacing: 2,
  },
  gameMeta: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 13,
    color: colors.textMid,
  },
  gameCardRight: { alignItems: 'center', gap: 2 },
  gameRankLabel: {
    fontFamily: 'Raleway_400Regular',
    fontSize: 11,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gameRank: {
    fontFamily: 'Raleway_800ExtraBold',
    fontSize: 22,
    color: colors.primary,
  },
  progressPip: {
    width: 4,
    height: 40,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  progressPipFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },

  // Actions
  actions: {
    width: '100%',
    gap: spacing.md,
    alignItems: 'center',
  },
  fullWidth: { width: '100%' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerText: {
    fontFamily: 'Raleway_400Regular',
    color: colors.textLight,
    fontSize: 13,
  },
  joinRow: { flexDirection: 'row', width: '100%', gap: spacing.sm },
  codeInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontFamily: 'Raleway_700Bold',
    fontSize: 17,
    color: colors.textDark,
    letterSpacing: 3,
    textAlign: 'center',
  },
  joinBtn: { paddingHorizontal: spacing.xl },
  howItWorks: {
    fontFamily: 'Raleway_600SemiBold',
    fontSize: 15,
    color: colors.textMid,
    textDecorationLine: 'underline',
  },
});
