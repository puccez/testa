import * as Notifications from 'expo-notifications';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContributionCalendar } from '@/components/contribution-calendar';
import { IntensityControl, IntensityLegend } from '@/components/intensity-control';
import { IosQuickAction } from '@/components/ios-quick-action';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useHeadacheLog } from '@/hooks/use-headache-log';
import { useTheme } from '@/hooks/use-theme';
import {
  SLOTS,
  getDateKey,
  getIntensity,
  getRecordedCheckCount,
  HeadacheSlot,
} from '@/lib/headache-log';
import {
  handleHeadacheNotificationResponse,
  scheduleHeadacheNotifications,
} from '@/lib/headache-notifications';

export default function HomeScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { isLoading, log, recordIntensity, refresh } = useHeadacheLog();
  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'enabled' | 'denied'>(
    'idle'
  );
  const todayKey = getDateKey();
  const todayEntry = log[todayKey];
  const todayIntensity = getIntensity(todayEntry);
  const todayChecks = getRecordedCheckCount(todayEntry);

  const insets = useMemo(
    () => ({
      ...safeAreaInsets,
      bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
    }),
    [safeAreaInsets]
  );

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

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleHeadacheNotificationResponse(response).then(() => refresh());
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        return handleHeadacheNotificationResponse(response).then(() => refresh());
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  async function handleEnableNotifications() {
    const scheduled = await scheduleHeadacheNotifications();
    setNotificationStatus(scheduled ? 'enabled' : 'denied');
  }

  async function handleRecord(slot: HeadacheSlot, intensity: number) {
    await recordIntensity(slot, intensity);
  }

  async function handleZeroNow() {
    const slot = new Date().getHours() >= 19 ? 'evening' : 'afternoon';
    await recordIntensity(slot, 0);
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Headache Tracker</ThemedText>
          <ThemedText themeColor="textSecondary">
            Due check al giorno. Un calendario per vedere subito intensita e frequenza.
          </ThemedText>
        </View>

        {isLoading ? (
          <ThemedView type="backgroundElement" style={styles.loadingCard}>
            <ActivityIndicator />
          </ThemedView>
        ) : (
          <>
            <ThemedView type="backgroundElement" style={styles.summaryCard}>
              <View style={styles.summaryContent}>
                <ThemedText type="small" themeColor="textSecondary">
                  oggi
                </ThemedText>
                <ThemedText style={styles.todayValue}>
                  {typeof todayIntensity === 'number' ? todayIntensity : '-'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {todayChecks}/2 rilevazioni
                </ThemedText>
              </View>
              <IosQuickAction onPress={handleZeroNow} />
            </ThemedView>

            <ContributionCalendar log={log} />

            <ThemedView style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle">Registra oggi</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  0-4
                </ThemedText>
              </View>

              <View style={styles.checkList}>
                {(Object.keys(SLOTS) as HeadacheSlot[]).map((slot) => (
                  <ThemedView key={slot} type="backgroundElement" style={styles.checkCard}>
                    <View style={styles.checkHeader}>
                      <View>
                        <ThemedText type="smallBold">{SLOTS[slot].label}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          promemoria {SLOTS[slot].time}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.currentValue}>
                        {typeof todayEntry?.[slot] === 'number' ? todayEntry[slot] : '-'}
                      </ThemedText>
                    </View>
                    <IntensityControl
                      value={todayEntry?.[slot]}
                      onChange={(value) => handleRecord(slot, value)}
                    />
                  </ThemedView>
                ))}
              </View>

              <IntensityLegend />
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.notificationCard}>
              <View style={styles.notificationText}>
                <ThemedText type="smallBold">Notifiche</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Promemoria locali ogni giorno alle 15:00 e alle 22:00 con bottoni rapidi.
                </ThemedText>
              </View>
              <ThemedText
                type="linkPrimary"
                onPress={handleEnableNotifications}
                accessibilityRole="button">
                {notificationStatus === 'enabled'
                  ? 'Attive'
                  : notificationStatus === 'denied'
                    ? 'Permesso negato'
                    : 'Attiva'}
              </ThemedText>
            </ThemedView>
          </>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  checkCard: {
    borderCurve: 'continuous',
    borderRadius: 8,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  checkHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checkList: {
    gap: Spacing.two,
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
  currentValue: {
    fontSize: 24,
    fontVariant: ['tabular-nums'],
  },
  header: {
    gap: Spacing.two,
  },
  loadingCard: {
    alignItems: 'center',
    borderRadius: 8,
    padding: Spacing.four,
  },
  notificationCard: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 8,
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  notificationText: {
    flex: 1,
    gap: Spacing.one,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  summaryContent: {
    gap: Spacing.one,
  },
  todayValue: {
    fontSize: 56,
    fontVariant: ['tabular-nums'],
    lineHeight: 60,
  },
});

