import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Trade'>;

export default function TradeScreen({ route }: Props) {
  const { tradeId } = route.params;
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trade Session</Text>
      <Text style={styles.subtitle}>Trade ID: {tradeId}</Text>
      <Text style={styles.comingSoon}>Coming Soon: Digital trade negotiations and card swapping</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 30,
    textAlign: 'center',
  },
  comingSoon: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});
