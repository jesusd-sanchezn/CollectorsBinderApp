import React from 'react';
import { StyleSheet } from 'react-native';
import { Layout, Text } from '@ui-kitten/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Trade'>;

export default function TradeScreen({ route }: Props) {
  const { tradeId } = route.params;
  
  return (
    <Layout style={styles.container}>
      <Text category="h2" style={styles.title}>Trade Session</Text>
      <Text category="s1" appearance="hint" style={styles.subtitle}>Trade ID: {tradeId}</Text>
      <Text category="c1" appearance="hint" style={styles.comingSoon}>Coming Soon: Digital trade negotiations and card swapping</Text>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 30,
    textAlign: 'center',
  },
  comingSoon: {
    textAlign: 'center',
  },
});
