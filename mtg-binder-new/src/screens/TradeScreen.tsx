import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { Layout, Text, Button, Card, Spinner } from '@ui-kitten/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Trade } from '../types';
import { TradeService } from '../lib/tradeService';
import { useAuthStore } from '../state/useAuthStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Trade'>;

// Helper function to format Firebase timestamps
const formatFirebaseTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'Recently';
  
  try {
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleDateString();
    }
    return 'Recently';
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Recently';
  }
};

export default function TradeScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrades = async () => {
    try {
      setLoading(true);
      const userTrades = await TradeService.getUserTrades();
      setTrades(userTrades || []);
    } catch (error) {
      console.error('Error loading trades:', error);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrades();
  }, []);

  const handleAcceptTrade = async (tradeId: string) => {
    try {
      await TradeService.acceptTrade(tradeId);
      Alert.alert('Success', 'Trade accepted!');
      await loadTrades();
    } catch (error) {
      console.error('Error accepting trade:', error);
      Alert.alert('Error', 'Failed to accept trade');
    }
  };

  const handleDeclineTrade = async (tradeId: string) => {
    try {
      await TradeService.declineTrade(tradeId);
      Alert.alert('Success', 'Trade declined');
      await loadTrades();
    } catch (error) {
      console.error('Error declining trade:', error);
      Alert.alert('Error', 'Failed to decline trade');
    }
  };

  const calculateTradeValue = (wants: any[]) => {
    return wants.reduce((total, item) => {
      return total + (item.card?.price || 0) * (item.quantity || 1);
    }, 0);
  };

  if (loading) {
    return (
      <Layout style={styles.loadingContainer}>
        <Spinner size="large" status="primary" />
        <Text category="s1" appearance="hint" style={styles.loadingText}>Loading trades...</Text>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      <ScrollView style={styles.tradesList}>
        {trades.length === 0 ? (
          <Layout style={styles.emptyState}>
            <Text category="h1" style={styles.emptyIcon}>🔄</Text>
            <Text category="h5" style={styles.emptyTitle}>No trades yet</Text>
            <Text category="s1" appearance="hint" style={styles.emptyDescription} center>
              Start browsing your friends' binders to request cards
            </Text>
          </Layout>
        ) : (
          trades.map((trade) => {
            const isRecipient = trade.recipientId === user?.uid;
            const isPending = trade.status === 'pending';
            const totalValue = calculateTradeValue(trade.wants || []);
            
            return (
              <Card key={trade.id} style={styles.tradeCard}>
                <Layout style={styles.tradeContent}>
                  <Layout style={styles.tradeHeader}>
                    <Text category="h6" style={styles.tradeTitle}>
                      {isRecipient ? 'Incoming Request' : 'Your Request'}
                    </Text>
                    <Layout style={[styles.statusBadge, styles[`status${trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}`]]}>
                      <Text category="c1" style={styles.statusText}>{trade.status}</Text>
                    </Layout>
                  </Layout>
                  
                  <Text category="s1" appearance="hint" style={styles.tradeInfo}>
                    {isRecipient ? `From: ${trade.initiatorName || 'Unknown'}` : `To: ${trade.recipientName || 'Unknown'}`}
                  </Text>
                  
                  {(trade.wants || []).length > 0 && (
                    <Layout style={styles.cardsList}>
                      <Text category="s2" style={styles.sectionTitle}>Requested Cards:</Text>
                      {(trade.wants || []).map((item, index) => (
                        <Layout key={index} style={styles.cardItem} level="3">
                          {item.card?.imageUrl ? (
                            <Image 
                              source={{ uri: item.card.imageUrl }} 
                              style={styles.cardImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <Layout style={styles.cardPlaceholder}>
                              <Text category="c1" appearance="hint">?</Text>
                            </Layout>
                          )}
                          <Layout style={styles.cardInfo}>
                            <Text category="s1" style={styles.cardName}>{item.card?.name || 'Unknown Card'}</Text>
                            <Text category="c1" appearance="hint" style={styles.cardDetails}>
                              {item.card?.set} • Qty: {item.quantity}
                            </Text>
                            {item.card?.price && (
                              <Text category="s1" status="success" style={styles.cardPrice}>
                                ${(item.card.price * (item.quantity || 1)).toFixed(2)}
                              </Text>
                            )}
                          </Layout>
                        </Layout>
                      ))}
                    </Layout>
                  )}
                  
                  <Layout style={styles.tradeFooter}>
                    <Text category="s1" style={styles.totalValue}>
                      Total Value: <Text status="success">${totalValue.toFixed(2)}</Text>
                    </Text>
                    <Text category="c1" appearance="hint" style={styles.tradeDate}>
                      {formatFirebaseTimestamp(trade.createdAt)}
                    </Text>
                  </Layout>

                  {isRecipient && isPending && (
                    <Layout style={styles.actions}>
                      <Button
                        status="primary"
                        size="small"
                        style={styles.actionButton}
                        onPress={() => handleAcceptTrade(trade.id)}
                      >
                        ✓ Accept
                      </Button>
                      <Button
                        status="danger"
                        size="small"
                        style={styles.actionButton}
                        onPress={() => handleDeclineTrade(trade.id)}
                      >
                        ✕ Decline
                      </Button>
                    </Layout>
                  )}
                </Layout>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  tradesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  tradeCard: {
    marginBottom: 12,
  },
  tradeContent: {
    padding: 8,
  },
  tradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tradeTitle: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusPending: {
    backgroundColor: '#FF8610',
  },
  statusAccepted: {
    backgroundColor: '#00E096',
  },
  statusDeclined: {
    backgroundColor: '#FF3D71',
  },
  statusCompleted: {
    backgroundColor: '#0095FF',
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tradeInfo: {
    marginBottom: 12,
  },
  cardsList: {
    marginBottom: 12,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
  cardItem: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  cardImage: {
    width: 50,
    height: 70,
    borderRadius: 4,
    marginRight: 12,
  },
  cardPlaceholder: {
    width: 50,
    height: 70,
    borderRadius: 4,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    marginBottom: 4,
  },
  cardDetails: {
    marginBottom: 4,
  },
  cardPrice: {
    fontWeight: 'bold',
  },
  tradeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  totalValue: {
    fontWeight: '600',
  },
  tradeDate: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
});
