import { useMemo } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useHeadacheLog } from '@/hooks/use-headache-log';
import { useTheme } from '@/hooks/use-theme';
import {
  HeadacheEntry,
  SLOTS,
  formatDateLabel,
  getIntensity,
  getRecordedCheckCount,
} from '@/lib/headache-log';

export default function DetailsScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { clear, log } = useHeadacheLog();
  const entries = useMemo(() => {
    return Object.values(log)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);
  }, [log]);

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.four,
      paddingBottom: Spacing.four,
    },
  });

  function handleClear() {
    if (Platform.OS === 'web') {
      void clear();
      return;
    }

    Alert.alert('Cancella dati', 'Vuoi cancellare tutte le rilevazioni salvate?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Cancella', style: 'destructive', onPress: () => void clear() },
    ]);
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Cronologia</ThemedText>
          <ThemedText themeColor="textSecondary">
            Ultimi giorni registrati, con valore massimo giornaliero e due momenti separati.
          </ThemedText>
        </View>

        <View style={styles.list}>
          {entries.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <ThemedText type="smallBold">Nessuna rilevazione</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Registra il primo valore dalla schermata principale.
              </ThemedText>
            </ThemedView>
          ) : (
            entries.map((entry) => <HistoryRow key={entry.date} entry={entry} />)
          )}
        </View>

        <ThemedView type="backgroundElement" style={styles.infoCard}>
          <ThemedText type="smallBold">Come leggere il calendario</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Ogni quadratino e un giorno. Il colore usa il valore massimo tra dopo pranzo e dopo
            cena, cosi i picchi restano visibili.
          </ThemedText>
        </ThemedView>

        <Pressable onPress={handleClear} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.clearButton}>
            <ThemedText type="smallBold">Cancella dati</ThemedText>
          </ThemedView>
        </Pressable>
      </ThemedView>
    </ScrollView>
  );
}

function HistoryRow({ entry }: { entry: HeadacheEntry }) {
  const intensity = getIntensity(entry);
  const checks = getRecordedCheckCount(entry);

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={styles.rowMain}>
        <ThemedText type="smallBold">{formatDateLabel(entry.date)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {checks}/2 rilevazioni
        </ThemedText>
      </View>
      <View style={styles.slotValues}>
        <ThemedText type="small" themeColor="textSecondary">
          {SLOTS.afternoon.shortLabel}: {entry.afternoon ?? '-'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {SLOTS.evening.shortLabel}: {entry.evening ?? '-'}
        </ThemedText>
      </View>
      <ThemedText style={styles.rowValue}>{intensity ?? '-'}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  clearButton: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 8,
    padding: Spacing.three,
  },
  container: {
    flexGrow: 1,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    width: '100%',
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  emptyCard: {
    borderCurve: 'continuous',
    borderRadius: 8,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  header: {
    gap: Spacing.two,
  },
  infoCard: {
    borderCurve: 'continuous',
    borderRadius: 8,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
  row: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 8,
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  rowMain: {
    flex: 1,
    gap: Spacing.one,
  },
  rowValue: {
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    minWidth: 32,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  slotValues: {
    gap: Spacing.one,
  },
});

