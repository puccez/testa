import { Button, Host } from '@expo/ui/swift-ui';
import { controlSize } from '@expo/ui/swift-ui/modifiers';

type IosQuickActionProps = {
  onPress: () => void;
};

export function IosQuickAction({ onPress }: IosQuickActionProps) {
  return (
    <Host matchContents>
      <Button
        label="Segna zero ora"
        systemImage="checkmark.circle"
        modifiers={[controlSize('large')]}
        onPress={onPress}
      />
    </Host>
  );
}

