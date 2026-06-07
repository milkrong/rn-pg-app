import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors } from "@/ui/tokens";

type Props = {
  color?: string;
  size?: number;
};

export function TypingDots({ color = colors.coral, size = 6 }: Props) {
  const dot0 = useRef(new Animated.Value(0.3)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const dots = [dot0, dot1, dot2];
    const animations = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 140),
          Animated.timing(dot, {
            toValue: 1,
            duration: 360,
            useNativeDriver: true
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 360,
            useNativeDriver: true
          }),
          Animated.delay((2 - index) * 140)
        ])
      )
    );

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [dot0, dot1, dot2]);

  const dotStyle = { width: size, height: size, borderRadius: size / 2, backgroundColor: color };

  return (
    <View style={styles.row}>
      <Animated.View style={[dotStyle, { opacity: dot0 }]} />
      <Animated.View style={[dotStyle, { opacity: dot1 }]} />
      <Animated.View style={[dotStyle, { opacity: dot2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingVertical: 6
  }
});
