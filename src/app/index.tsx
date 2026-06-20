import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
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
  getMedicationSuggestions,
  getRecordedCheckCount,
  HeadacheSlot,
} from '@/lib/headache-log';
import {
  HeadacheMedicationPromptRequest,
  handleHeadacheNotificationResponse,
  scheduleHeadacheNotifications,
} from '@/lib/headache-notifications';

export default function HomeScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { isLoading, log, recordIntensity, recordMedication, refresh } = useHeadacheLog();
  const [notificationStatus, setNotificationStatus] = useState<'idle' | 'enabled' | 'denied'>(
    'idle'
  );
  const [medicationPrompt, setMedicationPrompt] = useState<HeadacheMedicationPromptRequest>();
  const [isMedicationInputOpen, setIsMedicationInputOpen] = useState(false);
  const [medicationName, setMedicationName] = useState('');
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
  const medicationSuggestions = useMemo(() => {
    const query = medicationName.trim().toLocaleLowerCase('it-IT');

    return getMedicationSuggestions(log)
      .filter((suggestion) => {
        return !query || suggestion.toLocaleLowerCase('it-IT').includes(query);
      })
      .slice(0, 4);
  }, [log, medicationName]);

  const resetMedicationPrompt = useCallback(() => {
    setMedicationPrompt(undefined);
    setIsMedicationInputOpen(false);
    setMedicationName('');
  }, []);

  const showMedicationPrompt = useCallback((prompt: HeadacheMedicationPromptRequest) => {
    setMedicationPrompt(prompt);
    setIsMedicationInputOpen(false);
    setMedicationName('');
  }, []);

  const processNotificationResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const prompt = await handleHeadacheNotificationResponse(response);

      await refresh();
      await Notifications.clearLastNotificationResponseAsync();

      if (prompt) {
        showMedicationPrompt(prompt);
      }
    },
    [refresh, showMedicationPrompt]
  );

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void processNotificationResponse(response);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        return processNotificationResponse(response);
      }
    });

    return () => subscription.remove();
  }, [processNotificationResponse]);

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

  async function handleSaveMedication() {
    if (!medicationPrompt || !medicationName.trim()) {
      return;
    }

    await recordMedication(medicationPrompt.slot, medicationName, medicationPrompt.dateKey);
    resetMedicationPrompt();
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

        <Modal
          animationType="fade"
          transparent
          visible={!!medicationPrompt}
          onRequestClose={resetMedicationPrompt}>
          <View style={styles.modalOverlay}>
            <ThemedView type="backgroundElement" style={styles.medicationModal}>
              <View style={styles.medicationHeader}>
                <ThemedText type="subtitle">Medicinale</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {medicationPrompt
                    ? `${SLOTS[medicationPrompt.slot].label}, intensita ${medicationPrompt.intensity}`
                    : ''}
                </ThemedText>
              </View>

              {!isMedicationInputOpen ? (
                <>
                  <ThemedText>Hai preso medicinali?</ThemedText>
                  <View style={styles.modalActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={resetMedicationPrompt}
                      style={({ pressed }) => pressed && styles.pressed}>
                      <ThemedView style={styles.secondaryButton}>
                        <ThemedText type="smallBold">No</ThemedText>
                      </ThemedView>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setIsMedicationInputOpen(true)}
                      style={({ pressed }) => pressed && styles.pressed}>
                      <ThemedView style={[styles.primaryButton, { backgroundColor: theme.text }]}>
                        <ThemedText
                          type="smallBold"
                          style={[styles.primaryButtonText, { color: theme.background }]}>
                          Si
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <TextInput
                    autoCapitalize="words"
                    autoCorrect={false}
                    onChangeText={setMedicationName}
                    onSubmitEditing={handleSaveMedication}
                    placeholder="Nome medicinale"
                    placeholderTextColor={theme.textSecondary}
                    returnKeyType="done"
                    style={[
                      styles.medicationInput,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                      },
                    ]}
                    value={medicationName}
                  />

                  {medicationSuggestions.length > 0 ? (
                    <View style={styles.suggestionList}>
                      {medicationSuggestions.map((suggestion) => (
                        <Pressable
                          key={suggestion}
                          accessibilityRole="button"
                          onPress={() => setMedicationName(suggestion)}
                          style={({ pressed }) => pressed && styles.pressed}>
                          <ThemedView style={styles.suggestionButton}>
                            <ThemedText type="smallBold">{suggestion}</ThemedText>
                          </ThemedView>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}

                  <View style={styles.modalActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={resetMedicationPrompt}
                      style={({ pressed }) => pressed && styles.pressed}>
                      <ThemedView style={styles.secondaryButton}>
                        <ThemedText type="smallBold">Annulla</ThemedText>
                      </ThemedView>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={handleSaveMedication}
                      style={({ pressed }) => [
                        pressed && styles.pressed,
                        !medicationName.trim() && styles.disabled,
                      ]}>
                      <ThemedView style={[styles.primaryButton, { backgroundColor: theme.text }]}>
                        <ThemedText
                          type="smallBold"
                          style={[styles.primaryButtonText, { color: theme.background }]}>
                          Salva
                        </ThemedText>
                      </ThemedView>
                    </Pressable>
                  </View>
                </>
              )}
            </ThemedView>
          </View>
        </Modal>
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
  disabled: {
    opacity: 0.4,
  },
  header: {
    gap: Spacing.two,
  },
  loadingCard: {
    alignItems: 'center',
    borderRadius: 8,
    padding: Spacing.four,
  },
  medicationHeader: {
    gap: Spacing.one,
  },
  medicationInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  medicationModal: {
    borderCurve: 'continuous',
    borderRadius: 8,
    gap: Spacing.three,
    maxWidth: 420,
    padding: Spacing.three,
    width: '100%',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    flex: 1,
    justifyContent: 'center',
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
  pressed: {
    opacity: 0.72,
  },
  primaryButton: {
    borderRadius: 20,
    minWidth: 86,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  primaryButtonText: {
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  secondaryButton: {
    borderRadius: 20,
    minWidth: 86,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
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
  suggestionButton: {
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  suggestionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  todayValue: {
    fontSize: 56,
    fontVariant: ['tabular-nums'],
    lineHeight: 60,
  },
});
