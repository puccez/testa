import AsyncStorage from '@react-native-async-storage/async-storage';

export type HeadacheSlot = 'afternoon' | 'evening';

export type HeadacheEntry = {
  date: string;
  afternoon?: number;
  evening?: number;
  updatedAt: string;
};

export type HeadacheLog = Record<string, HeadacheEntry>;

const STORAGE_KEY = 'headache-log:v1';

export const SLOTS: Record<HeadacheSlot, { label: string; shortLabel: string; time: string }> = {
  afternoon: { label: 'Dopo pranzo', shortLabel: '15:00', time: '15:00' },
  evening: { label: 'Dopo cena', shortLabel: '22:00', time: '22:00' },
};

export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(parseDateKey(dateKey));
}

export function getIntensity(entry?: HeadacheEntry) {
  if (!entry) {
    return undefined;
  }

  const values = [entry.afternoon, entry.evening].filter((value): value is number => {
    return typeof value === 'number';
  });

  if (values.length === 0) {
    return undefined;
  }

  return Math.max(...values);
}

export function getRecordedCheckCount(entry?: HeadacheEntry) {
  if (!entry) {
    return 0;
  }

  return Number(typeof entry.afternoon === 'number') + Number(typeof entry.evening === 'number');
}

export function getCalendarDays(days: number) {
  const today = new Date();

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    return getDateKey(date);
  });
}

export async function loadHeadacheLog(): Promise<HeadacheLog> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as HeadacheLog;
  } catch {
    return {};
  }
}

export async function saveHeadacheLog(log: HeadacheLog) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(log));
}

export async function saveHeadacheIntensity(
  slot: HeadacheSlot,
  intensity: number,
  dateKey = getDateKey()
) {
  const log = await loadHeadacheLog();
  const current = log[dateKey] ?? { date: dateKey, updatedAt: new Date().toISOString() };

  const next = {
    ...current,
    [slot]: intensity,
    updatedAt: new Date().toISOString(),
  };

  const nextLog = {
    ...log,
    [dateKey]: next,
  };

  await saveHeadacheLog(nextLog);

  return nextLog;
}

export async function clearHeadacheLog() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

