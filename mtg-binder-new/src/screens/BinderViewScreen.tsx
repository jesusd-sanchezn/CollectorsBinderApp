import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Modal,
  Dimensions,
  Image,
  View
} from 'react-native';
import { Layout, Text, Button, Input, Spinner } from '@ui-kitten/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Binder, BinderPage, BinderSlot, Card, TradeItem } from '../types';
import { BinderService } from '../lib/binderService';
import { CSVParser } from '../lib/csvParser';
import { useAuthStore } from '../state/useAuthStore';
import { TradeService } from '../lib/tradeService';
import { NotificationService } from '../lib/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'BinderView'>;

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 60) / 3; // 3 cards per row with margins

export default function BinderViewScreen({ route }: Props) {
  const { binderId, ownerId, ownerName } = route.params;
  const { user } = useAuthStore();
  const [binder, setBinder] = useState<Binder | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [importing, setImporting] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCardSlot, setSelectedCardSlot] = useState<{pageNumber: number, slotPosition: number} | null>(null);
  
  // Trade selection state (only when viewing friend's binder)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCardsForTrade, setSelectedCardsForTrade] = useState<Map<string, {card: Card, pageNumber: number, slotPosition: number}>>(new Map());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [creatingTrade, setCreatingTrade] = useState(false);
  
  // Determine if current user is the owner
  const isOwner = user?.uid === ownerId;

  useEffect(() => {
    loadBinder();
  }, [binderId]);

  const loadBinder = async () => {
    try {
      setLoading(true);
      // Load binder from Firebase or create empty binder
      const binder = await BinderService.getBinder(binderId);
      if (binder) {
        setBinder(binder);
      } else {
        // Create empty binder if not found
        const emptyBinder: Binder = {
          id: binderId,
          ownerId,
          name: `${ownerName}'s Binder`,
          description: 'A digital MTG collection',
          isPublic: true,
          pages: [
            {
              id: 'page-1',
              pageNumber: 1,
              slots: Array.from({ length: 9 }, (_, i) => ({
                id: `slot-1-${i}`,
                position: i,
                isEmpty: true
              }))
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setBinder(emptyBinder);
        // Note: We're not saving this to Firebase yet - it will be saved when user adds content
      }
    } catch (error) {
      console.error('Error loading binder:', error);
      Alert.alert('Error', 'Failed to load binder');
    } finally {
      setLoading(false);
    }
  };

  const importCSV = async () => {
    if (!csvData.trim()) {
      Alert.alert('Error', 'Please paste your CSV data');
      return;
    }

    try {
      setImporting(true);
      
      // Parse CSV locally first
      const parseResult = CSVParser.parseDelverLensCSV(csvData);
      
      if (!parseResult.success) {
        Alert.alert('CSV Parse Error', parseResult.errors.join('\n'));
        return;
      }

      // Convert to app format with real card images
      Alert.alert('Loading Images', `Fetching card images from Scryfall for ${parseResult.cards.length} cards... This may take a few minutes.`);
      const appCards = await CSVParser.convertToAppCards(parseResult.cards);
      
              // Add cards to the binder using BinderService
              if (binder) {
                let importedCount = 0;
                let currentBinder = { ...binder }; // Work with a local copy

                for (const card of appCards) {
                  let slotFound = false;
                  
                  // Try to find an empty slot in existing pages
                  for (let pageIndex = 0; pageIndex < currentBinder.pages.length && !slotFound; pageIndex++) {
                    const page = currentBinder.pages[pageIndex];
                    for (let slotIndex = 0; slotIndex < page.slots.length && !slotFound; slotIndex++) {
                      if (page.slots[slotIndex].isEmpty) {
                        // Add card to this slot
                        await BinderService.addCardToSlot(
                          binderId,
                          pageIndex + 1,
                          slotIndex,
                          card
                        );
                        slotFound = true;
                        importedCount++;
                        
                        // Update local binder state
                        currentBinder.pages[pageIndex].slots[slotIndex] = {
                          id: `${binderId}-${pageIndex + 1}-${slotIndex}`,
                          position: slotIndex,
                          card,
                          isEmpty: false
                        };
                      }
                    }
                  }

                  // If no empty slots found, add a new page
                  if (!slotFound) {
                    await BinderService.addPageToBinder(binderId);
                    // Add card to first slot of the new page
                    await BinderService.addCardToSlot(
                      binderId,
                      currentBinder.pages.length + 1,
                      0,
                      card
                    );
                    importedCount++;
                    
                    // Update local binder state
                    const newPageNumber = currentBinder.pages.length + 1;
                    const newPage: BinderPage = {
                      id: `page-${newPageNumber}`,
                      pageNumber: newPageNumber,
                      slots: Array.from({ length: 9 }, (_, i): BinderSlot => ({
                        id: `slot-${newPageNumber}-${i}`,
                        position: i,
                        isEmpty: i !== 0
                      }))
                    };
                    newPage.slots[0] = {
                      id: `${binderId}-${newPageNumber}-0`,
                      position: 0,
                      card: card as Card,
                      isEmpty: false
                    };
                    currentBinder.pages.push(newPage);
                  }
                }

                // Update the local binder state immediately
                setBinder(currentBinder);
                
                // Also reload from Firebase to ensure consistency
                await loadBinder();
                Alert.alert('Success', `Imported ${importedCount} cards successfully!`);
                setCsvData('');
                setShowImportModal(false);
              }
    } catch (error) {
      console.error('Error importing CSV:', error);
      Alert.alert('Error', 'Failed to import CSV. Please check the format.');
    } finally {
      setImporting(false);
    }
  };

  const addPage = async () => {
    try {
      await BinderService.addPageToBinder(binderId);
      await loadBinder(); // Reload to get updated data
    } catch (error) {
      console.error('Error adding page:', error);
      Alert.alert('Error', 'Failed to add page');
    }
  };

  const handleCardPress = (card: Card, pageNumber: number, slotPosition: number) => {
    // In selection mode, toggle card selection instead of opening modal
    if (selectionMode && !isOwner) {
      toggleCardSelection(card, pageNumber, slotPosition);
      return;
    }
    
    // Normal behavior: open card modal
    setSelectedCard(card);
    setSelectedCardSlot({ pageNumber, slotPosition });
    setShowCardModal(true);
  };

  // Toggle selection mode (for viewing friend's binders)
  const toggleSelectionMode = () => {
    if (isOwner) return; // Can't select from own binder
    
    setSelectionMode(!selectionMode);
    if (!selectionMode) {
      // Entering selection mode - clear previous selections
      setSelectedCardsForTrade(new Map());
    }
  };

  // Toggle card selection for trade
  const toggleCardSelection = (card: Card, pageNumber: number, slotPosition: number) => {
    const cardKey = `${pageNumber}-${slotPosition}`;
    const newSelections = new Map(selectedCardsForTrade);
    
    if (newSelections.has(cardKey)) {
      newSelections.delete(cardKey);
    } else {
      newSelections.set(cardKey, { card, pageNumber, slotPosition });
    }
    
    setSelectedCardsForTrade(newSelections);
  };

  // Check if card is selected
  const isCardSelected = (pageNumber: number, slotPosition: number): boolean => {
    const cardKey = `${pageNumber}-${slotPosition}`;
    return selectedCardsForTrade.has(cardKey);
  };

  // Confirm trade and send notification
  const handleConfirmTrade = async () => {
    if (!user || selectedCardsForTrade.size === 0) {
      Alert.alert('Error', 'Please select at least one card');
      return;
    }

    try {
      setCreatingTrade(true);

      // Convert selected cards to TradeItems
      const wants: TradeItem[] = Array.from(selectedCardsForTrade.values()).map((item, index) => ({
        id: `item-${Date.now()}-${index}`,
        cardId: item.card.id,
        card: item.card,
        quantity: item.card.quantity || 1,
        notes: ''
      }));

      // Create trade in Firebase
      const tradeId = await TradeService.createTrade(
        ownerId,
        ownerName,
        user.displayName || user.email?.split('@')[0] || 'Someone',
        wants,
        [] // No offers for now
      );

      // Send notification to binder owner
      await NotificationService.notifyTradeRequest(
        user.displayName || user.email?.split('@')[0] || 'Someone',
        tradeId,
        wants.length
      );

      // Success!
      Alert.alert(
        'Trade Request Sent!',
        `Your trade request for ${wants.length} card${wants.length === 1 ? '' : 's'} has been sent to ${ownerName}. They will receive a notification.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset selection
              setSelectionMode(false);
              setSelectedCardsForTrade(new Map());
              setShowConfirmModal(false);
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error creating trade:', error);
      Alert.alert('Error', 'Failed to create trade request. Please try again.');
    } finally {
      setCreatingTrade(false);
    }
  };

  const handleRearrangeCards = async () => {
    if (!binder) return;

    try {
      Alert.alert(
        'Rearrange Cards',
        'This will reorganize all cards to fill empty slots and remove empty pages. Continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Rearrange',
            onPress: async () => {
              try {
                await BinderService.rearrangeCards(binderId);
                await loadBinder();
                Alert.alert('Success', 'Cards rearranged successfully!');
              } catch (error) {
                console.error('Error rearranging cards:', error);
                Alert.alert('Error', 'Failed to rearrange cards');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in rearrange confirmation:', error);
    }
  };

  const handleMarkForTrade = async () => {
    if (!selectedCard || !selectedCardSlot || !user || isOwner) return;

    try {
      // Add card to selection
      toggleCardSelection(selectedCard, selectedCardSlot.pageNumber, selectedCardSlot.slotPosition);
      
      // Enter selection mode if not already
      if (!selectionMode) {
        setSelectionMode(true);
      }
      
      setShowCardModal(false);
      
      Alert.alert(
        'Card Added',
        `"${selectedCard.name}" has been added to your trade selection. Use "Review" to confirm.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error adding card to selection:', error);
      Alert.alert('Error', 'Failed to add card to selection');
    }
  };

  const handleDeleteCard = async () => {
    if (!selectedCardSlot || !binder) {
      return;
    }

    try {
      // Show confirmation dialog
      Alert.alert(
        'Delete Card',
        `Are you sure you want to delete "${selectedCard?.name}"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Remove card from Firebase
                await BinderService.removeCardFromSlot(
                  binderId,
                  selectedCardSlot.pageNumber,
                  selectedCardSlot.slotPosition
                );

                // Rearrange cards to fill empty slots and remove empty pages
                await BinderService.rearrangeCards(binderId);

                // Reload binder to get the rearranged data
                await loadBinder();
                
                setShowCardModal(false);
                setSelectedCard(null);
                setSelectedCardSlot(null);

                Alert.alert('Success', 'Card deleted and binder rearranged!');
              } catch (error) {
                console.error('Error deleting card:', error);
                Alert.alert('Error', 'Failed to delete card');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error in delete confirmation:', error);
    }
  };

  const renderCardSlot = (slot: BinderSlot, pageNumber: number) => {
    if (slot.isEmpty) {
      return (
        <TouchableOpacity style={styles.emptySlot}>
          <Text style={styles.emptySlotText}>+</Text>
        </TouchableOpacity>
      );
    }

    const isSelected = isCardSelected(pageNumber, slot.position);
    const showSelectionUI = selectionMode && !isOwner;

    return (
      <TouchableOpacity 
        style={[
          styles.cardSlot,
          showSelectionUI && styles.cardSlotSelectionMode,
          isSelected && styles.cardSlotSelected
        ]}
        onPress={() => handleCardPress(slot.card!, pageNumber, slot.position)}
      >
        {/* Selection Checkbox Overlay */}
        {showSelectionUI && (
          <View style={[styles.selectionCheckbox, isSelected && styles.selectionCheckboxSelected]}>
            {isSelected && <Text style={styles.selectionCheckmark}>✓</Text>}
          </View>
        )}
        {/* Card Name at Top */}
        <View style={styles.cardNameContainer}>
          <Text style={styles.cardNameText} numberOfLines={2}>
            {slot.card?.name}
          </Text>
        </View>

        <View style={styles.cardImageContainer}>
          {slot.card?.imageUrl ? (
            <Image 
              source={{ uri: slot.card.imageUrl }} 
              style={styles.cardImage}
              resizeMode="none"
              onError={() => {
                // Image failed to load, will show placeholder
                console.log('Image failed to load:', slot.card?.imageUrl);
              }}
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Text style={styles.cardSet}>{slot.card?.setCode}</Text>
            </View>
          )}

          {/* Card Info Labels */}
          <View style={styles.cardInfoContainer}>
            <View style={styles.cardInfoRow}>
              <Text style={styles.cardInfoLabel}>Condition:</Text>
              <Text style={styles.cardInfoValue}>{slot.card?.condition}</Text>
            </View>
            <View style={styles.cardInfoRow}>
              <Text style={styles.cardInfoLabel}>Finish:</Text>
              <Text style={styles.cardInfoValue}>{slot.card?.finish}</Text>
            </View>
            {slot.card?.price && (
              <View style={styles.cardInfoRow}>
                <Text style={styles.cardInfoLabel}>Price:</Text>
                <Text style={styles.cardPrice}>${slot.card.price}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPage = (page: BinderPage) => {
    // Ensure we have exactly 9 slots for 3x3 grid
    const slots = page.slots.slice(0, 9);
    while (slots.length < 9) {
      slots.push({
        id: `empty-${slots.length}`,
        position: slots.length,
        isEmpty: true
      });
    }

    return (
      <View style={styles.pageGrid}>
        {slots.map((slot) => (
          <View key={slot.id} style={styles.slotContainer}>
            {renderCardSlot(slot, page.pageNumber)}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <Layout style={styles.loadingContainer}>
        <Spinner size="large" status="primary" />
        <Text category="s1" appearance="hint" style={styles.loadingText}>Loading binder...</Text>
      </Layout>
    );
  }

  if (!binder) {
    return (
      <Layout style={styles.errorContainer}>
        <Text category="h5" status="danger">Binder not found</Text>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      <Layout style={styles.header} level="2">
        {/* Title Row */}
        <Layout style={styles.headerTitleRow}>
          <Text category="h5" style={styles.title}>{binder.name}</Text>
        </Layout>
        
        {/* Action Buttons Row */}
        {isOwner && (
          <Layout style={styles.headerActions}>
            <Button 
              status="primary"
              size="small"
              style={styles.actionButton}
              onPress={() => setShowImportModal(true)}
            >
              📥 Import
            </Button>
            <Button 
              status="primary"
              size="small"
              style={styles.actionButton}
              onPress={addPage}
            >
              📄 Add Page
            </Button>
            <Button 
              status="primary"
              size="small"
              style={styles.actionButton}
              onPress={handleRearrangeCards}
            >
              🔄 Rearrange
            </Button>
          </Layout>
        )}
        {!isOwner && (
          <Layout style={styles.headerActions}>
            <Button 
              status={selectionMode ? "danger" : "success"}
              size="small"
              style={styles.actionButton}
              onPress={toggleSelectionMode}
            >
              {selectionMode ? '✕ Cancel' : '✓ Select Cards'}
            </Button>
            {selectionMode && selectedCardsForTrade.size > 0 && (
              <Button 
                status="info"
                size="small"
                style={styles.actionButton}
                onPress={() => setShowConfirmModal(true)}
              >
                📋 Review ({selectedCardsForTrade.size})
              </Button>
            )}
          </Layout>
        )}
      </Layout>

      <Layout style={styles.binderContent}>
        {/* Current Page Display */}
        <Layout style={styles.currentPageContainer}>
          {renderPage(binder.pages[currentPage])}
        </Layout>

        {/* Page Navigation */}
        <Layout style={styles.pageNavigation} level="2">
          <Button 
            status="primary"
            size="small"
            disabled={currentPage === 0}
            onPress={() => setCurrentPage(Math.max(0, currentPage - 1))}
          >
            ← Previous
          </Button>
          
          <Text category="s1" style={styles.pageIndicator}>
            Page {currentPage + 1} of {binder.pages.length}
          </Text>
          
          <Button 
            status="primary"
            size="small"
            disabled={currentPage >= binder.pages.length - 1}
            onPress={() => setCurrentPage(Math.min(binder.pages.length - 1, currentPage + 1))}
          >
            Next →
          </Button>
        </Layout>
      </Layout>

      {/* CSV Import Modal */}
      <Modal
        visible={showImportModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <Layout style={styles.modalContainer}>
          <Layout style={styles.modalHeader} level="2">
            <Button
              appearance="ghost"
              status="basic"
              size="small"
              onPress={() => setShowImportModal(false)}
            >
              Cancel
            </Button>
            <Text category="h6" style={styles.modalTitle}>Import Cards from CSV</Text>
            <Button
              status="success"
              size="small"
              onPress={importCSV}
              disabled={importing}
              accessoryLeft={importing ? () => <Spinner size="small" status="control" /> : undefined}
            >
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </Layout>

          {/* Loading Overlay */}
          {importing && (
            <Layout style={styles.loadingOverlay}>
              <Layout style={styles.loadingContent}>
                <Spinner size="large" status="primary" />
                <Text category="s1" appearance="hint" style={styles.loadingText}>Fetching card images from Scryfall...</Text>
                <Text category="s1" appearance="hint" style={styles.loadingSubtext}>This may take a few minutes</Text>
              </Layout>
            </Layout>
          )}

          <Layout style={styles.modalContent}>
            <Text category="h6" style={styles.instructionsTitle}>📋 CSV Import Instructions</Text>
            <Text category="s1" appearance="hint" style={styles.instructionsText}>
              Paste your DelverLens CSV export here. The format should include:
            </Text>
            <Text category="s1" appearance="hint" style={styles.instructionsList}>
              • Card Name (required){'\n'}
              • Set Name (required){'\n'}
              • Quantity (required){'\n'}
              • Condition (optional, defaults to NM){'\n'}
              • Finish (optional, defaults to nonfoil)
            </Text>
            
            <Layout style={styles.sampleBox} level="3">
              <Text category="s1" style={styles.sampleTitle}>📝 Sample CSV Format:</Text>
              <Text category="s1" appearance="hint" style={styles.sampleText}>
                Card Name,Set Name,Quantity,Condition,Finish{'\n'}
                Lightning Bolt,Magic 2010,4,NM,nonfoil{'\n'}
                Counterspell,Magic 2010,2,LP,foil
              </Text>
            </Layout>

            <Input
              style={styles.csvInput}
              value={csvData}
              onChangeText={setCsvData}
              placeholder="Paste your CSV data here..."
              multiline={true}
              disabled={importing}
              textStyle={styles.csvInputText}
            />

            <Layout style={styles.infoBox} level="3">
              <Text category="h6" style={styles.infoTitle}>💡 Tips</Text>
              <Text category="s1" appearance="hint" style={styles.infoText}>
                • Use DelverLens app to scan your cards{'\n'}
                • Export as CSV from DelverLens{'\n'}
                • Cards will be automatically priced{'\n'}
                • Empty slots will be filled automatically
              </Text>
            </Layout>
          </Layout>
        </Layout>
      </Modal>

      {/* Trade Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <Layout style={styles.modalContainer}>
          <Layout style={styles.modalHeader} level="2">
            <Button
              appearance="ghost"
              status="basic"
              size="small"
              onPress={() => setShowConfirmModal(false)}
            >
              Cancel
            </Button>
            <Text category="h6" style={styles.modalTitle}>Review Trade Selection</Text>
            <Layout style={{ width: 60 }} />
          </Layout>

          <ScrollView style={styles.modalContent}>
            <Text category="s1" appearance="hint" style={styles.confirmInstructions}>
              You are requesting {selectedCardsForTrade.size} card{selectedCardsForTrade.size === 1 ? '' : 's'} from {ownerName}'s binder.
              A notification will be sent once you confirm.
            </Text>

            <Text category="h6" style={styles.confirmSubtitle}>Selected Cards:</Text>
            
            {Array.from(selectedCardsForTrade.values()).map((item, index) => (
              <Layout key={index} style={styles.selectedCardItem} level="3">
                <Image 
                  source={{ uri: item.card.imageUrl }} 
                  style={styles.selectedCardImage}
                  resizeMode="contain"
                />
                <Layout style={styles.selectedCardInfo}>
                  <Text category="s1" style={styles.selectedCardName}>{item.card.name}</Text>
                  <Text category="s1" appearance="hint" style={styles.selectedCardSet}>{item.card.set} ({item.card.setCode})</Text>
                  <Text category="c1" appearance="hint" style={styles.selectedCardCondition}>
                    {item.card.condition} • {item.card.finish}
                    {item.card.price && ` • $${item.card.price}`}
                  </Text>
                </Layout>
              </Layout>
            ))}

            <Layout style={styles.confirmFooter}>
              <Button 
                status="success"
                size="large"
                style={styles.confirmButton}
                onPress={handleConfirmTrade}
                disabled={creatingTrade}
                accessoryLeft={creatingTrade ? () => <Spinner size="small" status="control" /> : undefined}
              >
                {creatingTrade ? 'Creating Trade...' : '✓ Confirm Trade Request'}
              </Button>
            </Layout>
          </ScrollView>
        </Layout>
      </Modal>

      {/* Card Detail Modal */}
      <Modal
        visible={showCardModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCardModal(false)}
      >
        <Layout style={styles.cardModalOverlay}>
          <TouchableOpacity 
            style={styles.cardModalBackground}
            onPress={() => setShowCardModal(false)}
            activeOpacity={1}
          >
            <Layout style={styles.cardModalContent} level="3">
              <Button
                appearance="ghost"
                status="basic"
                size="small"
                style={styles.cardModalCloseButton}
                onPress={() => setShowCardModal(false)}
              >
                ✕
              </Button>
              
              {selectedCard && (
                <Layout style={styles.cardDetailContainer}>
                  <Image 
                    source={{ uri: selectedCard.imageUrl }} 
                    style={styles.cardDetailImage}
                    resizeMode="contain"
                  />
                  
                  <Layout style={styles.cardDetailInfo}>
                    <Text category="h6" style={styles.cardDetailName}>{selectedCard.name}</Text>
                    <Text category="s1" appearance="hint" style={styles.cardDetailSet}>{selectedCard.set} ({selectedCard.setCode})</Text>
                    
                    <Layout style={styles.cardDetailStats}>
                      <Layout style={styles.cardDetailStat}>
                        <Text category="c1" appearance="hint" style={styles.cardDetailStatLabel}>Condition:</Text>
                        <Text category="s1" style={styles.cardDetailStatValue}>{selectedCard.condition}</Text>
                      </Layout>
                      <Layout style={styles.cardDetailStat}>
                        <Text category="c1" appearance="hint" style={styles.cardDetailStatLabel}>Finish:</Text>
                        <Text category="s1" style={styles.cardDetailStatValue}>{selectedCard.finish}</Text>
                      </Layout>
                      <Layout style={styles.cardDetailStat}>
                        <Text category="c1" appearance="hint" style={styles.cardDetailStatLabel}>Quantity:</Text>
                        <Text category="s1" style={styles.cardDetailStatValue}>{selectedCard.quantity}</Text>
                      </Layout>
                      {selectedCard.price && (
                        <Layout style={styles.cardDetailStat}>
                          <Text category="c1" appearance="hint" style={styles.cardDetailStatLabel}>Price:</Text>
                          <Text category="s1" status="success" style={styles.cardDetailPrice}>${selectedCard.price}</Text>
                        </Layout>
                      )}
                    </Layout>
                    
                    {/* Action Button - Delete for owner, Mark for Trade for friends */}
                    {isOwner ? (
                      <Button 
                        status="danger"
                        size="medium"
                        style={styles.deleteButton}
                        onPress={handleDeleteCard}
                      >
                        🗑️ Delete Card
                      </Button>
                    ) : (
                      <Button 
                        status="info"
                        size="medium"
                        style={styles.tradeButton}
                        onPress={handleMarkForTrade}
                      >
                        🔄 Mark for Trade
                      </Button>
                    )}
                  </Layout>
                </Layout>
              )}
            </Layout>
          </TouchableOpacity>
        </Layout>
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
  },
  header: {
    flexDirection: 'column',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitleRow: {
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 2,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  binderContent: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  pageNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8, // Reduced from 15 to 8
    backgroundColor: '#2a2a2a',
    borderRadius: 8, // Reduced from 12 to 8
    marginBottom: 10, // Reduced from 20 to 10
  },
  navButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12, // Reduced from 16 to 12
    paddingVertical: 6, // Reduced from 8 to 6
    borderRadius: 4, // Reduced from 6 to 4
  },
  navButtonDisabled: {
    backgroundColor: '#333',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 12, // Reduced from 14 to 12
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#666',
  },
  pageIndicator: {
    color: '#fff',
    fontSize: 14, // Reduced from 16 to 14
    fontWeight: 'bold',
  },
  currentPageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 680, // Increased height to accommodate taller cards (3 rows × 240px + gaps)
  },
  slotContainer: {
    width: '30%', // 3 columns with proper spacing
    height: 220, // Much more height to show full card image
    marginBottom: 10, // Gap between rows
  },
  cardSlot: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    padding: 2, // Slightly more padding for bigger pockets
    overflow: 'hidden',
  },
  emptySlot: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#555',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotText: {
    color: '#888',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardNameContainer: {
    height: 10, // Smaller height for card name to give more space to image
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 1,
  },
  cardNameText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 12,
  },
  cardImageContainer: {
    flex: 1,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%', // Take full height of container
    borderRadius: 8,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%', // Take full height of container
    backgroundColor: '#333',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardName: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  cardSet: {
    color: '#ccc',
    fontSize: 8,
  },
  cardInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 45, // Even more height to ensure price is clearly visible
    paddingTop: 2,
    backgroundColor: 'rgba(26, 26, 26, 0.95)', // More opaque background for better readability
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1, // Increased spacing for better readability
  },
  cardInfoLabel: {
    color: '#888',
    fontSize: 8, // Larger for better readability
    fontWeight: '600',
  },
  cardInfoValue: {
    color: '#ccc',
    fontSize: 8, // Larger for better readability
    fontWeight: '500',
  },
  cardPrice: {
    color: '#4CAF50',
    fontSize: 11, // Larger for better readability
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  cancelButton: {
    color: '#4CAF50',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  importButton: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  instructionsList: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 20,
    lineHeight: 20,
  },
  csvInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    textAlignVertical: 'top',
    height: 200,
    marginBottom: 20,
  },
  csvInputText: {
    fontSize: 14,
    color: '#fff',
    minHeight: 200,
  },
  infoBox: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  sampleBox: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  sampleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  sampleText: {
    fontSize: 12,
    color: '#ccc',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  // Card Detail Modal Styles
  cardModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardModalBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    position: 'relative',
  },
  cardModalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  cardModalCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardDetailContainer: {
    alignItems: 'center',
  },
  cardDetailImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 20,
  },
  cardDetailInfo: {
    width: '100%',
  },
  cardDetailName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDetailSet: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  cardDetailStats: {
    borderRadius: 8,
    padding: 15,
  },
  cardDetailStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardDetailStatLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  cardDetailStatValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  cardDetailPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    minWidth: 250,
  },
  loadingSubtext: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tradeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
  },
  tradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Selection Mode Styles
  cardSlotSelectionMode: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  cardSlotSelected: {
    borderColor: '#4CAF50',
    borderWidth: 3,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  selectionCheckbox: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  selectionCheckboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  selectionCheckmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtonActive: {
    backgroundColor: '#4CAF50',
  },
  reviewButton: {
    backgroundColor: '#2196F3',
  },
  // Confirmation Modal Styles
  confirmInstructions: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  confirmSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    marginTop: 10,
  },
  selectedCardItem: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  selectedCardImage: {
    width: 60,
    height: 84,
    borderRadius: 4,
    marginRight: 12,
  },
  selectedCardInfo: {
    flex: 1,
  },
  selectedCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  selectedCardSet: {
    fontSize: 12,
    color: '#ccc',
    marginBottom: 4,
  },
  selectedCardCondition: {
    fontSize: 12,
    color: '#888',
  },
  confirmFooter: {
    paddingVertical: 20,
    paddingTop: 30,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
