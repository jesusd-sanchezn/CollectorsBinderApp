import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, ViewStyle, View } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

interface ScreenContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
}

export function ScreenContainer({
  children,
  style,
  contentStyle,
  edges = ['top', 'right', 'left', 'bottom'],
}: ScreenContainerProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, style]}>
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#222B45',
  },
  content: {
    flex: 1,
  },
});

