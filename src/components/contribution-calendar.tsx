import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  HeadacheLog,
  formatDateLabel,
  getCalendarDays,
  getIntensity,
  getRecordedCheckCount,
} from '@/lib/headache-log';

type ContributionCalendarProps = {
  log: HeadacheLog;
};

const INTENSITY_COLORS = ['#e8ece8', '#c8e6c9', '#86c97f', '#f0b65f', '#d95d4f'];

export function ContributionCalendar({ log }: ContributionCalendarProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const usableWidth = Math.min(width - Spacing.four * 2, MaxContentWidth - Spacing.four * 2);
  const cellSize = Math.max(10, Math.min(16, Math.floor((usableWidth - 13 * 6) / 14)));
  const days = getCalendarDays(98);
  const weeks = Array.from({ length: 14 }, (_, weekIndex) =>
    days.slice(weekIndex * 7, weekIndex * 7 + 7)
  );

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="subtitle">Calendario</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          ultimi 98 giorni
        </ThemedText>
      </View>

      <View style={styles.grid} accessibilityRole="summary">
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((dateKey) => {
              const entry = log[dateKey];
              const intensity = getIntensity(entry);
              const checks = getRecordedCheckCount(entry);
              const color =
                typeof intensity === 'number' ? INTENSITY_COLORS[intensity] : theme.background;

              return (
                <View
                  key={dateKey}
                  accessibilityLabel={`${formatDateLabel(dateKey)}, intensita ${
                    intensity ?? 'non registrata'
                  }, ${checks} rilevazioni`}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: color,
                      borderColor: theme.backgroundSelected,
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <ThemedText type="small" themeColor="textSecondary">
          meno
        </ThemedText>
        {INTENSITY_COLORS.map((color, index) => (
          <View
            key={color}
            style={[
              styles.legendCell,
              {
                backgroundColor: color,
                borderColor: index === 0 ? theme.backgroundSelected : color,
              },
            ]}
          />
        ))}
        <ThemedText type="small" themeColor="textSecondary">
          piu
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  cell: {
    borderCurve: 'continuous',
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
  },
  grid: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
  },
  header: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legend: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  legendCell: {
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    height: 12,
    width: 12,
  },
  week: {
    gap: 6,
  },
});

