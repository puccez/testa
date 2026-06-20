import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { HEADACHE_INTENSITY_LEVELS, HeadacheIntensity } from '@/lib/headache-log';

type IntensityControlProps = {
  value?: HeadacheIntensity;
  onChange: (value: HeadacheIntensity) => void;
};

export function IntensityControl({ value, onChange }: IntensityControlProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {HEADACHE_INTENSITY_LEVELS.map((level) => {
        const isSelected = value === level;

        return (
          <Pressable
            key={level}
            accessibilityRole="button"
            accessibilityLabel={`Intensita ${level}`}
            onPress={() => onChange(level)}
            style={({ pressed }) => [
              styles.button,
              {
                borderColor: isSelected ? theme.text : theme.backgroundSelected,
                backgroundColor: isSelected ? theme.text : theme.backgroundElement,
                opacity: pressed ? 0.72 : 1,
              },
            ]}>
            <ThemedText
              type="smallBold"
              style={[styles.buttonText, { color: isSelected ? theme.background : theme.text }]}>
              {level}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function IntensityLegend() {
  return (
    <ThemedView style={styles.legend}>
      <ThemedText type="small" themeColor="textSecondary">
        0 niente
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        4 massimo
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontVariant: ['tabular-nums'],
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
