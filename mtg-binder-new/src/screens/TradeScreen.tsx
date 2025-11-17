import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, Image, Animated, PanResponder, Dimensions, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Layout, Text, Button, Card, Spinner } from '@ui-kitten/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Trade, TradeItem } from '../types';
import { TradeService } from '../lib/tradeService';
import { useAuthStore } from '../state/useAuthStore';
import AlertModal from '../components/AlertModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Trade'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

import { formatDate } from '../lib/dateUtils';

// Swipeable Trade Card Component
interface SwipeableTradeCardProps {
  trade: Trade;
  isRecipient: boolean;
  isPending: boolean;
  onAccept: (tradeId: string, selectedCardIds?: string[]) => void;
  onDecline: (tradeId: string, selectedCardIds?: string[]) => void;
  selectedCards: string[];
  onToggleCard: (cardId: string) => void;
}

const SwipeableTradeCard: React.FC<SwipeableTradeCardProps> = ({
  trade,
  isRecipient,
  isPending,
  onAccept,
  onDecline,
  selectedCards,
  onToggleCard,
}) => {
  const [pan] = useState(new Animated.ValueXY());

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isRecipient && isPending,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      if (isRecipient && isPending) {
        // Only activate if horizontal movement is greater than vertical
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      }
      return false;
    },
    onPanResponderGrant: () => {
      // Reset position when gesture starts
      pan.setOffset({ x: 0, y: 0 });
      pan.setValue({ x: 0, y: 0 });
    },
    onPanResponderMove: (evt, gestureState) => {
      if (isRecipient && isPending) {
        pan.setValue({ x: gestureState.dx, y: 0 });
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (isRecipient && isPending) {
        pan.flattenOffset();
        const swipeDistance = gestureState.dx;
        
        if (Math.abs(swipeDistance) > SWIPE_THRESHOLD) {
          if (swipeDistance > 0) {
            // Swipe right - Accept
            Animated.timing(pan, {
              toValue: { x: SCREEN_WIDTH, y: 0 },
              duration: 200,
              useNativeDriver: false, // Use false for ValueXY with offset
            }).start(() => {
              onAccept(trade.id, selectedCards.length > 0 ? selectedCards : undefined);
            });
          } else {
            // Swipe left - Decline
            Animated.timing(pan, {
              toValue: { x: -SCREEN_WIDTH, y: 0 },
              duration: 200,
              useNativeDriver: false,
            }).start(() => {
              onDecline(trade.id, selectedCards.length > 0 ? selectedCards : undefined);
            });
          }
        } else {
          // Return to original position
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            tension: 50,
            friction: 7,
          }).start();
        }
      }
    },
  });

  const rotate = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  // Interpolate opacity from pan.x to avoid native driver conflicts
  const opacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [0.5, 1, 0.5],
    extrapolate: 'clamp',
  });

  // Accept indicator (appears when swiping right)
  const acceptOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD, SCREEN_WIDTH],
    outputRange: [0, 0.3, 1],
    extrapolate: 'clamp',
  });

  const acceptScale = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD, SCREEN_WIDTH],
    outputRange: [0.5, 0.8, 1],
    extrapolate: 'clamp',
  });

  // Decline indicator (appears when swiping left)
  const declineOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, -SWIPE_THRESHOLD, 0],
    outputRange: [1, 0.3, 0],
    extrapolate: 'clamp',
  });

  const declineScale = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, -SWIPE_THRESHOLD, 0],
    outputRange: [1, 0.8, 0.5],
    extrapolate: 'clamp',
  });

  const calculateTradeValue = (items: TradeItem[]) => {
    return items.reduce((total, item) => {
      return total + (item.card?.price || 0) * (item.quantity || 1);
    }, 0);
  };

  const totalValue = calculateTradeValue(trade.wants || []);
  const selectedValue = calculateTradeValue(
    (trade.wants || []).filter(item => selectedCards.includes(item.id))
  );

  return (
    <Layout style={styles.swipeableContainer}>
      {/* Accept Indicator (Right) */}
      {isRecipient && isPending && (
        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.acceptIndicator,
            {
              opacity: acceptOpacity,
              transform: [{ scale: acceptScale }],
            },
          ]}
          pointerEvents="none"
        >
          <Feather name="check" size={80} color="#FF8610" />
          <Text category="h6" status="success" style={styles.indicatorText}>
            ACCEPT
          </Text>
        </Animated.View>
      )}

      {/* Decline Indicator (Left) */}
      {isRecipient && isPending && (
        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.declineIndicator,
            {
              opacity: declineOpacity,
              transform: [{ scale: declineScale }],
            },
          ]}
          pointerEvents="none"
        >
          <Feather name="x" size={80} color="#FF3D71" />
          <Text category="h6" status="danger" style={styles.indicatorText}>
            DECLINE
          </Text>
        </Animated.View>
      )}

      <Animated.View
        style={[
          {
            transform: [{ translateX: pan.x }, { rotate }],
            opacity: opacity,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Card style={styles.tradeCard}>
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
          
          {isRecipient && isPending && (
            <Layout style={styles.selectionInfo} level="2">
              <Text category="s2" appearance="hint">
                {selectedCards.length === 0 
                  ? 'Select cards to trade (or swipe to accept/decline all)'
                  : `${selectedCards.length} of ${trade.wants?.length || 0} cards selected`
                }
              </Text>
            </Layout>
          )}
          
          {(trade.wants || []).length > 0 && (
            <Layout style={styles.cardsList}>
              <Text category="s2" style={styles.sectionTitle}>Requested Cards:</Text>
              {(trade.wants || []).map((item, index) => {
                const isSelected = selectedCards.includes(item.id);
                const canSelect = isRecipient && isPending;
                
                return (
                  <Layout 
                    key={item.id || index} 
                    level="3"
                    style={[
                      styles.cardItem, 
                      isSelected && styles.cardItemSelected,
                    ]}
                  >
                    {canSelect && (
                      <TouchableOpacity
                        onPress={() => onToggleCard(item.id)}
                        style={[styles.cardCheckbox, isSelected && styles.cardCheckboxSelected]}
                      >
                        {isSelected && <Feather name="check" size={16} color="#FFFFFF" />}
                      </TouchableOpacity>
                    )}
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
                );
              })}
            </Layout>
          )}
          
          <Layout style={styles.tradeFooter}>
            <Text category="s1" style={styles.totalValue}>
              {selectedCards.length > 0 && isRecipient && isPending ? (
                <>
                  Selected Value: <Text status="success">${selectedValue.toFixed(2)}</Text>
                  {' / '}
                  <Text appearance="hint">Total: ${totalValue.toFixed(2)}</Text>
                </>
              ) : (
                <>
                  Total Value: <Text status="success">${totalValue.toFixed(2)}</Text>
                </>
              )}
            </Text>
            <Text category="c1" appearance="hint" style={styles.tradeDate}>
              {formatDate(trade.createdAt)}
            </Text>
          </Layout>

          {isRecipient && isPending && (
            <Layout style={styles.swipeHint} level="2">
              <Text category="c1" appearance="hint" style={styles.swipeHintText}>
                <Feather name="arrow-right" size={12} /> Swipe right to accept • Swipe left to decline <Feather name="arrow-left" size={12} />
              </Text>
            </Layout>
          )}
        </Layout>
      </Card>
      </Animated.View>
    </Layout>
  );
};

export default function TradeScreen({ navigation }: Props) {
  const { user } = useAuthStore();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'danger'>('danger');
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'declined'>('pending');
  const [selectedCardsByTrade, setSelectedCardsByTrade] = useState<Record<string, string[]>>({});

  const showAlertModal = (title: string, message: string, type: 'success' | 'danger' = 'danger') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

  const loadTrades = async () => {
    try {
      setLoading(true);
      const userTrades = await TradeService.getUserTrades();
      setTrades(userTrades || []);
      // Initialize selected cards for each pending trade
      const initialSelections: Record<string, string[]> = {};
      userTrades?.forEach(trade => {
        if (trade.status === 'pending' && trade.recipientId === user?.uid) {
          initialSelections[trade.id] = [];
        }
      });
      setSelectedCardsByTrade(initialSelections);
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

  const handleAcceptTrade = async (tradeId: string, selectedCardIds?: string[]) => {
    try {
      await TradeService.acceptTrade(tradeId, selectedCardIds);
      showAlertModal('Success', 'Trade accepted!', 'success');
      // Remove from selected cards
      const newSelections = { ...selectedCardsByTrade };
      delete newSelections[tradeId];
      setSelectedCardsByTrade(newSelections);
      await loadTrades();
    } catch (error) {
      console.error('Error accepting trade:', error);
      showAlertModal('Error', 'Failed to accept trade');
    }
  };

  const handleDeclineTrade = async (tradeId: string, selectedCardIds?: string[]) => {
    try {
      await TradeService.declineTrade(tradeId, selectedCardIds);
      showAlertModal('Success', 'Trade declined', 'success');
      // Remove from selected cards
      const newSelections = { ...selectedCardsByTrade };
      delete newSelections[tradeId];
      setSelectedCardsByTrade(newSelections);
      await loadTrades();
    } catch (error) {
      console.error('Error declining trade:', error);
      showAlertModal('Error', 'Failed to decline trade');
    }
  };

  const toggleCardSelection = (tradeId: string, cardId: string) => {
    const currentSelections = selectedCardsByTrade[tradeId] || [];
    const isSelected = currentSelections.includes(cardId);
    
    const newSelections = {
      ...selectedCardsByTrade,
      [tradeId]: isSelected
        ? currentSelections.filter(id => id !== cardId)
        : [...currentSelections, cardId],
    };
    
    setSelectedCardsByTrade(newSelections);
  };

  // Filter trades by status and sort by creation date descending
  const filteredTrades = trades
    .filter(trade => {
      if (activeTab === 'pending') return trade.status === 'pending';
      if (activeTab === 'accepted') return trade.status === 'accepted';
      if (activeTab === 'declined') return trade.status === 'declined';
      return false;
    })
    .sort((a, b) => {
      // Sort by createdAt descending (newest first)
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 
                    a.createdAt instanceof Date ? a.createdAt.getTime() : 
                    typeof a.createdAt === 'number' ? a.createdAt : 0;
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 
                    b.createdAt instanceof Date ? b.createdAt.getTime() : 
                    typeof b.createdAt === 'number' ? b.createdAt : 0;
      return bDate - aDate; // Descending order (newest first)
    });

  // Count trades by status
  const pendingCount = trades.filter(t => t.status === 'pending').length;
  const acceptedCount = trades.filter(t => t.status === 'accepted').length;
  const declinedCount = trades.filter(t => t.status === 'declined').length;

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
      {/* Tab Navigation */}
      <Layout style={styles.tabContainer} level="2">
        <Button
          appearance={activeTab === 'pending' ? 'filled' : 'ghost'}
          status={activeTab === 'pending' ? 'primary' : 'basic'}
          size="small"
          style={styles.tab}
          onPress={() => setActiveTab('pending')}
        >
          Pending ({pendingCount})
        </Button>
        <Button
          appearance={activeTab === 'accepted' ? 'filled' : 'ghost'}
          status={activeTab === 'accepted' ? 'primary' : 'basic'}
          size="small"
          style={styles.tab}
          onPress={() => setActiveTab('accepted')}
        >
          Accepted ({acceptedCount})
        </Button>
        <Button
          appearance={activeTab === 'declined' ? 'filled' : 'ghost'}
          status={activeTab === 'declined' ? 'primary' : 'basic'}
          size="small"
          style={styles.tab}
          onPress={() => setActiveTab('declined')}
        >
          Declined ({declinedCount})
        </Button>
      </Layout>

      <ScrollView style={styles.tradesList}>
        {filteredTrades.length === 0 ? (
          <Layout style={styles.emptyState}>
            <Feather name="refresh-cw" size={64} color="#FF8610" />
            <Text category="h5" style={styles.emptyTitle}>
              {activeTab === 'pending' && 'No pending trades'}
              {activeTab === 'accepted' && 'No accepted trades'}
              {activeTab === 'declined' && 'No declined trades'}
            </Text>
            <Text category="s1" appearance="hint" style={styles.emptyDescription} center>
              {activeTab === 'pending' && 'Start browsing your friends\' binders to request cards'}
              {activeTab === 'accepted' && 'Accepted trades will appear here'}
              {activeTab === 'declined' && 'Declined trades will appear here'}
            </Text>
          </Layout>
        ) : (
          filteredTrades.map((trade) => {
            const isRecipient = trade.recipientId === user?.uid;
            const isPending = trade.status === 'pending';
            const selectedCards = selectedCardsByTrade[trade.id] || [];
            
            return (
              <SwipeableTradeCard
                key={trade.id}
                trade={trade}
                isRecipient={isRecipient}
                isPending={isPending}
                onAccept={handleAcceptTrade}
                onDecline={handleDeclineTrade}
                selectedCards={selectedCards}
                onToggleCard={(cardId) => toggleCardSelection(trade.id, cardId)}
              />
            );
          })
        )}
      </ScrollView>

      <AlertModal
        visible={showAlert}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setShowAlert(false)}
      />
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flex: 1,
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
    backgroundColor: '#FF8610',
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
  selectionInfo: {
    padding: 8,
    borderRadius: 6,
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
    alignItems: 'center',
  },
  cardItemSelected: {
    borderWidth: 2,
    borderColor: '#FF8610',
  },
  cardCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cardCheckboxSelected: {
    backgroundColor: '#FF8610',
    borderColor: '#FF8610',
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
  swipeHint: {
    marginTop: 12,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 11,
  },
  swipeableContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  swipeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderRadius: 8,
  },
  acceptIndicator: {
    backgroundColor: 'rgba(255, 134, 16, 0.1)',
  },
  declineIndicator: {
    backgroundColor: 'rgba(255, 61, 113, 0.1)',
  },
  indicatorText: {
    marginTop: 8,
    fontWeight: 'bold',
    fontSize: 18,
  },
});
