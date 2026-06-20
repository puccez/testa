import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { HeadacheSlot, getDateKey, saveHeadacheIntensity } from '@/lib/headache-log';

export const HEADACHE_CATEGORY = 'headache_check';
export const HEADACHE_CHANNEL = 'headache-checks';

export const NOTIFICATION_IDS: Record<HeadacheSlot, string> = {
  afternoon: 'headache-check-afternoon',
  evening: 'headache-check-evening',
};

const ACTION_PREFIX = 'headache_intensity_';

const ACTIONS: Notifications.NotificationAction[] = [
  { identifier: `${ACTION_PREFIX}0`, buttonTitle: 'No' },
  { identifier: `${ACTION_PREFIX}1`, buttonTitle: '1' },
  { identifier: `${ACTION_PREFIX}2`, buttonTitle: '2' },
  { identifier: `${ACTION_PREFIX}4`, buttonTitle: '3+' },
].map((action) => ({
  ...action,
  options: { opensAppToForeground: true },
}));

type HeadacheNotificationData = {
  slot?: HeadacheSlot;
};

export type HeadacheMedicationPromptRequest = {
  dateKey: string;
  intensity?: number;
  slot: HeadacheSlot;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function parseIntensityAction(actionIdentifier: string) {
  if (!actionIdentifier.startsWith(ACTION_PREFIX)) {
    return undefined;
  }

  const value = Number(actionIdentifier.replace(ACTION_PREFIX, ''));

  return Number.isFinite(value) ? value : undefined;
}

export async function configureHeadacheNotificationActions() {
  if (Platform.OS === 'web') {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(HEADACHE_CHANNEL, {
      name: 'Promemoria mal di testa',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 120, 180],
      sound: null,
    });
  }

  await Notifications.setNotificationCategoryAsync(HEADACHE_CATEGORY, ACTIONS, {
    previewPlaceholder: 'Hai avuto mal di testa?',
  });
}

export async function ensureNotificationPermissions() {
  if (Platform.OS === 'web') {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  const finalStatus =
    current.status === Notifications.PermissionStatus.GRANTED
      ? current
      : await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: false,
            allowSound: false,
          },
        });

  return finalStatus.status === Notifications.PermissionStatus.GRANTED;
}

export async function scheduleHeadacheNotifications() {
  if (Platform.OS === 'web') {
    return false;
  }

  const granted = await ensureNotificationPermissions();

  if (!granted) {
    return false;
  }

  await configureHeadacheNotificationActions();

  await Promise.all(
    Object.values(NOTIFICATION_IDS).map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier)
    )
  );

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.afternoon,
    content: {
      title: 'Mal di testa?',
      body: 'Segna l intensita dopo pranzo.',
      categoryIdentifier: HEADACHE_CATEGORY,
      data: { slot: 'afternoon' satisfies HeadacheSlot },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 15,
      minute: 0,
      channelId: HEADACHE_CHANNEL,
    },
  });

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_IDS.evening,
    content: {
      title: 'Mal di testa?',
      body: 'Segna l intensita dopo cena.',
      categoryIdentifier: HEADACHE_CATEGORY,
      data: { slot: 'evening' satisfies HeadacheSlot },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 22,
      minute: 0,
      channelId: HEADACHE_CHANNEL,
    },
  });

  return true;
}

export async function sendTestHeadacheNotification() {
  if (Platform.OS === 'web') {
    return false;
  }

  const granted = await ensureNotificationPermissions();

  if (!granted) {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(HEADACHE_CHANNEL, {
      name: 'Promemoria mal di testa',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 120, 180],
      sound: null,
    });
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Notifica di test',
      body: 'Debug notifiche: nessun dato e stato salvato.',
      data: { debug: true },
    },
    trigger: null,
  });

  return true;
}

export async function handleHeadacheNotificationResponse(
  response: Notifications.NotificationResponse
) {
  const intensity = parseIntensityAction(response.actionIdentifier);
  const data = response.notification.request.content.data as HeadacheNotificationData;

  if (typeof intensity !== 'number' || !data.slot) {
    return undefined;
  }

  const dateKey = getDateKey();

  await saveHeadacheIntensity(data.slot, intensity, dateKey);

  if (intensity === 0) {
    return undefined;
  }

  return {
    dateKey,
    intensity,
    slot: data.slot,
  } satisfies HeadacheMedicationPromptRequest;
}
