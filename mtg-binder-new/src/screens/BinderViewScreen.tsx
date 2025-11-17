import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal,
  Image,
  View,
  Platform,
  Linking
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Layout, Text, Button, Input, Spinner } from '@ui-kitten/components';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Binder, BinderPage, BinderSlot, Card, TradeItem } from '../types';
import { BinderService } from '../lib/binderService';
import { CSVParser } from '../lib/csvParser';
import { useAuthStore } from '../state/useAuthStore';
import { TradeService } from '../lib/tradeService';
import { NotificationService } from '../lib/notificationService';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';
import { CardImageService } from '../lib/cardImageService';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { ScreenContainer } from '../components/ScreenContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'BinderView'>;

export default function BinderViewScreen({ route }: Props) {
  const { binderId, ownerId, ownerName } = route.params;
  const { user } = useAuthStore();
  const [binder, setBinder] = useState<Binder | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ stage: '', current: 0, total: 0 });
  const [showCardModal, setShowCardModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedCardSlot, setSelectedCardSlot] = useState<{pageNumber: number, slotPosition: number} | null>(null);
  const [slotToFill, setSlotToFill] = useState<{pageNumber: number; slotPosition: number} | null>(null);
  
  // Trade selection state (only when viewing friend's binder)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCardsForTrade, setSelectedCardsForTrade] = useState<Map<string, {card: Card, pageNumber: number, slotPosition: number}>>(new Map());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [creatingTrade, setCreatingTrade] = useState(false);

  // Manual add card state
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [cardSearchTerm, setCardSearchTerm] = useState('');
  const [cardSearchLoading, setCardSearchLoading] = useState(false);
  const [cardSearchResult, setCardSearchResult] = useState<Card | null>(null);
  const [cardSearchMessage, setCardSearchMessage] = useState<string | null>(null);
  const [cardSearchMessageType, setCardSearchMessageType] = useState<'info' | 'danger'>('info');
  const [addingCard, setAddingCard] = useState(false);
  const longPressActiveRef = useRef(false);
  
  // Alert and Confirm modal state
  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'danger' | 'warning'>('danger');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRearrangeConfirm, setShowRearrangeConfirm] = useState(false);
  
  // Determine if current user is the owner
  const isOwner = user?.uid === ownerId;
  
  const showAlertModal = (title: string, message: string, type: 'success' | 'danger' | 'warning' = 'danger') => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
  };

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
        showAlertModal(
          'Binder Unavailable',
          'This binder could not be found. It may be private or has been removed.',
          'warning'
        );
        setBinder(null);
      }
    } catch (error) {
      console.error('Error loading binder:', error);
      showAlertModal('Error', 'Failed to load binder');
    } finally {
      setLoading(false);
    }
  };

  const pickCSVFile = async () => {
    try {
      // Allow all file types and validate by extension
      // This ensures CSV files are visible in the file picker on all platforms
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Accept all files
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.name?.toLowerCase() || '';
        
        // Check if it's a CSV file by extension
        if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
          showAlertModal('Warning', 'Please select a CSV file (.csv extension)', 'warning');
          return;
        }
        
        const fileUri = asset.uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        setCsvData(fileContent);
        showAlertModal('File Loaded', `Loaded ${asset.name}`, 'success');
      }
    } catch (error) {
      console.error('Error picking CSV file:', error);
      showAlertModal('Error', 'Failed to pick CSV file. Please try again.');
    }
  };

  const importCSV = async () => {
    if (!csvData.trim()) {
      showAlertModal('Error', 'Please upload or paste your CSV data');
      return;
    }

    try {
      setImporting(true);
      
      // Parse CSV locally first
      const parseResult = CSVParser.parseDelverLensCSV(csvData);
      
      if (!parseResult.success) {
        showAlertModal('CSV Parse Error', parseResult.errors.join('\n'), 'warning');
        return;
      }

      // Convert to app format with real card images
      const cardCount = parseResult.cards.length;
      if (cardCount > 50) {
        showAlertModal(
          'Large Import Detected', 
          `Importing ${cardCount} cards. This will take several minutes. Please keep the app open.`, 
          'warning'
        );
      }
      
      const appCards = await CSVParser.convertToAppCards(
        parseResult.cards,
        (stage, current, total) => {
          setImportProgress({ stage, current, total });
          console.log(`Import progress: ${stage} - ${current}/${total}`);
        }
      );
      
      // Reset progress after completion
      setImportProgress({ stage: '', current: 0, total: 0 });
      
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
                showAlertModal('Success', `Imported ${importedCount} cards successfully!`, 'success');
                setCsvData('');
                setShowImportModal(false);
              }
    } catch (error) {
      console.error('Error importing CSV:', error);
      showAlertModal('Error', 'Failed to import CSV. Please check the format.');
      setImportProgress({ stage: '', current: 0, total: 0 });
    } finally {
      setImporting(false);
      setImportProgress({ stage: '', current: 0, total: 0 });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const templateContent = 'Quantity,Name\n4,Lightning Bolt\n2,Counterspell\n1,Teferi\'s Protection\n';
      const fileName = 'mtg-binder-import-template.csv';
      
      // Save to document directory (user-accessible location)
      const documentDir = FileSystem.documentDirectory;
      if (!documentDir) {
        showAlertModal('Error', 'Unable to access document directory');
        return;
      }
      
      const fileUri = `${documentDir}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, templateContent);
      
      // Open the file - on mobile, we use sharing which allows user to choose app to open with
      // This is the standard way to "open" files on mobile platforms
      try {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          // This will show a dialog to open the file in an app (Excel, Sheets, etc.)
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Open CSV Template',
            UTI: 'public.comma-separated-values-text' // iOS UTI for CSV
          });
        } else {
          showAlertModal(
            'Template Downloaded',
            'CSV template has been saved. You can find it in your file manager.',
            'success'
          );
        }
      } catch (error) {
        // User may have cancelled the dialog, which is fine
        console.log('File open dialog cancelled or error:', error);
      }
    } catch (error) {
      console.error('Error downloading CSV template:', error);
      showAlertModal('Error', 'Failed to download CSV template. Please try again.');
    }
  };

  const addPage = async () => {
    try {
      await BinderService.addPageToBinder(binderId);
      await loadBinder(); // Reload to get updated data
    } catch (error) {
      console.error('Error adding page:', error);
      showAlertModal('Error', 'Failed to add page');
    }
  };

  const resetAddCardForm = () => {
    setCardSearchTerm('');
    setCardSearchResult(null);
    setCardSearchMessage(null);
    setCardSearchMessageType('info');
    setCardSearchLoading(false);
  };

  const extractImageUrl = (card: any): string => {
    if (card.image_uris?.normal) {
      return card.image_uris.normal;
    }
    if (card.image_uris?.large) {
      return card.image_uris.large;
    }
    if (card.card_faces?.[0]?.image_uris?.normal) {
      return card.card_faces[0].image_uris.normal;
    }
    return '';
  };

  const mapScryfallCardToAppCard = (card: any): Card => {
    const rawPrice = card.prices?.usd ?? card.prices?.usd_foil ?? '';
    const parsedPrice = parseFloat(rawPrice);

    const baseCard: Card = {
      id: card.id || `scryfall-${Date.now()}`,
      name: card.name,
      set: card.set_name || 'Unknown Set',
      setCode: card.set ? (card.set as string).toUpperCase() : 'CUSTOM',
      collectorNumber: card.collector_number || 'N/A',
      imageUrl: extractImageUrl(card),
      rarity: card.rarity || 'unknown',
      condition: 'NM',
      finish: 'nonfoil',
      quantity: 1,
    };

    if (Number.isFinite(parsedPrice)) {
      baseCard.price = parsedPrice;
    }

    return baseCard;
  };


  const sanitizeCardForFirestore = (card: Card): Card => {
    const sanitized: any = { ...card };
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });
    return sanitized as Card;
  };
  const fetchCardFromScryfall = async (query: string): Promise<Card | null> => {
    try {
      const response = await fetch(`https://api.scryfall.com/cards/named?${query}`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return mapScryfallCardToAppCard(data);
    } catch (error) {
      console.error('Error contacting Scryfall:', error);
      return null;
    }
  };

  const searchCardOnScryfall = async (term: string): Promise<Card | null> => {
    const encoded = encodeURIComponent(term);
    const exact = await fetchCardFromScryfall(`exact=${encoded}`);
    if (exact) {
      return exact;
    }
    return fetchCardFromScryfall(`fuzzy=${encoded}`);
  };

  const handleStartAddCard = (pageNumber: number, slotPosition: number) => {
    if (!isOwner) {
      return;
    }
    resetAddCardForm();
    setSlotToFill({ pageNumber, slotPosition });
    setShowAddCardModal(true);
  };

  const handleCloseAddCardModal = () => {
    resetAddCardForm();
    setShowAddCardModal(false);
    setSlotToFill(null);
  };

  const handleSearchForCard = async () => {
    const term = cardSearchTerm.trim();
    if (!term) {
      setCardSearchMessageType('danger');
      setCardSearchMessage('Enter a card name to search.');
      setCardSearchResult(null);
      return;
    }

    setCardSearchLoading(true);
    setCardSearchMessage(null);
    setCardSearchResult(null);

    try {
      const result = await searchCardOnScryfall(term);
      if (result) {
        setCardSearchResult(result);
        setCardSearchMessageType('info');
        setCardSearchMessage(`${result.name} (${result.set})`);
      } else {
        setCardSearchMessageType('danger');
        setCardSearchMessage('No card found. Try a different name or spelling.');
      }
    } catch (error) {
      console.error('Error searching for card:', error);
      setCardSearchMessageType('danger');
      setCardSearchMessage('Unable to search right now. Please try again.');
    } finally {
      setCardSearchLoading(false);
    }
  };

  const handleAddCardToSlot = async () => {
    if (!slotToFill || !cardSearchResult) {
      setCardSearchMessageType('danger');
      setCardSearchMessage('Search for a card before adding it to the binder.');
      return;
    }

    setAddingCard(true);

    try {
      const rawCard: Card = {
        ...cardSearchResult,
        id: `${cardSearchResult.id}-${Date.now()}`,
        quantity: 1,
      };

      const cardToSave = sanitizeCardForFirestore(rawCard);

      await BinderService.addCardToSlot(
        binderId,
        slotToFill.pageNumber,
        slotToFill.slotPosition,
        cardToSave
      );

      await loadBinder();
      showAlertModal('Success', `"${cardToSave.name}" has been added to your binder.`, 'success');
      handleCloseAddCardModal();
    } catch (error) {
      console.error('Error adding searched card:', error);
      showAlertModal('Error', 'Failed to add this card. Please try again.');
    } finally {
      setAddingCard(false);
    }
  };
  const openCardDetails = (card: Card, pageNumber: number, slotPosition: number) => {
    setSelectedCard(card);
    setSelectedCardSlot({ pageNumber, slotPosition });
    setShowCardModal(true);
  };

  const handleCardPress = (card: Card, pageNumber: number, slotPosition: number) => {
    if (longPressActiveRef.current) {
      longPressActiveRef.current = false;
      return;
    }

    if (selectionMode && !isOwner) {
      toggleCardSelection(card, pageNumber, slotPosition);
      return;
    }

    openCardDetails(card, pageNumber, slotPosition);
  };

  const handleCardLongPress = (card: Card, pageNumber: number, slotPosition: number) => {
    longPressActiveRef.current = true;
    openCardDetails(card, pageNumber, slotPosition);
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
      showAlertModal('Error', 'Please select at least one card');
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
      showAlertModal(
        'Trade Request Sent!',
        `Your trade request for ${wants.length} card${wants.length === 1 ? '' : 's'} has been sent to ${ownerName}. They will receive a notification.`,
        'success'
      );
      
      // Reset selection
      setSelectionMode(false);
      setSelectedCardsForTrade(new Map());
      setShowConfirmModal(false);

    } catch (error) {
      console.error('Error creating trade:', error);
      showAlertModal('Error', 'Failed to create trade request. Please try again.');
    } finally {
      setCreatingTrade(false);
    }
  };

  const handleRearrangeCards = async () => {
    if (!binder) return;

    setShowRearrangeConfirm(true);
  };

  const confirmRearrangeCards = async () => {
    try {
      await BinderService.rearrangeCards(binderId);
      await loadBinder();
      showAlertModal('Success', 'Cards rearranged successfully!', 'success');
    } catch (error) {
      console.error('Error rearranging cards:', error);
      showAlertModal('Error', 'Failed to rearrange cards');
    } finally {
      setShowRearrangeConfirm(false);
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
      
      showAlertModal(
        'Card Added',
        `"${selectedCard.name}" has been added to your trade selection. Use "Review" to confirm.`,
        'success'
      );
    } catch (error) {
      console.error('Error adding card to selection:', error);
      showAlertModal('Error', 'Failed to add card to selection');
    }
  };

  const handleDeleteCard = async () => {
    if (!selectedCardSlot || !binder || !selectedCard) {
      return;
    }

    setShowDeleteConfirm(true);
  };

  const confirmDeleteCard = async () => {
    if (!selectedCardSlot || !binder) {
      setShowDeleteConfirm(false);
      return;
    }

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

      showAlertModal('Success', 'Card deleted and binder rearranged!', 'success');
    } catch (error) {
      console.error('Error deleting card:', error);
      showAlertModal('Error', 'Failed to delete card');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const renderCardSlot = (slot: BinderSlot, pageNumber: number) => {
    if (slot.isEmpty) {
      return (
        <TouchableOpacity
          style={[styles.emptySlot, !isOwner && styles.emptySlotDisabled]}
          activeOpacity={isOwner ? 0.85 : 1}
          onPress={() => isOwner && handleStartAddCard(pageNumber, slot.position)}
        >
          <Feather name="plus" size={26} color={isOwner ? '#FF8610' : '#555'} />
          <Text style={styles.emptySlotText}>
            {isOwner ? 'Add card' : 'Empty'}
          </Text>
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
        onPressIn={() => {
          longPressActiveRef.current = false;
        }}
        onPress={() => handleCardPress(slot.card!, pageNumber, slot.position)}
        onLongPress={() => handleCardLongPress(slot.card!, pageNumber, slot.position)}
        activeOpacity={0.9}
      >
        {/* Selection Checkbox Overlay */}
        {showSelectionUI && (
          <View style={[styles.selectionCheckbox, isSelected && styles.selectionCheckboxSelected]}>
            {isSelected && <Feather name="check" size={16} color="#FFFFFF" />}
          </View>
        )}
        {/* Card Name at Top */}
        <View style={styles.cardImageContainer}>
          {slot.card?.imageUrl ? (
            <Image 
              source={{ uri: slot.card.imageUrl }} 
              style={styles.cardImage}
              resizeMode="cover"
              onError={() => {
                console.log('Image failed to load:', slot.card?.imageUrl);
              }}
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Text style={styles.cardSet}>{slot.card?.setCode}</Text>
            </View>
          )}
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
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.screenContent}>
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
                accessoryLeft={() => <Feather name="download" size={16} color="#FFFFFF" />}
              >
                Import
              </Button>
              <Button 
                status="primary"
                size="small"
                style={styles.actionButton}
                onPress={addPage}
                accessoryLeft={() => <Feather name="file-plus" size={16} color="#FFFFFF" />}
              >
                Add Page
              </Button>
              <Button 
                status="primary"
                size="small"
                style={styles.actionButton}
                onPress={handleRearrangeCards}
                accessoryLeft={() => <Feather name="refresh-cw" size={16} color="#FFFFFF" />}
              >
                Rearrange
              </Button>
            </Layout>
          )}
          {!isOwner && (
            <Layout style={styles.headerActions}>
              <Button 
                status={selectionMode ? "danger" : "primary"}
                size="small"
                style={styles.actionButton}
                onPress={toggleSelectionMode}
                accessoryLeft={() => <Feather name={selectionMode ? "x" : "check-square"} size={16} color="#FFFFFF" />}
              >
                {selectionMode ? 'Cancel' : 'Select Cards'}
              </Button>
              {selectionMode && selectedCardsForTrade.size > 0 && (
                <Button 
                  status="info"
                  size="small"
                  style={styles.actionButton}
                  onPress={() => setShowConfirmModal(true)}
                  accessoryLeft={() => <Feather name="clipboard" size={16} color="#FFFFFF" />}
                >
                  Review ({selectedCardsForTrade.size})
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
      </ScrollView>

      {/* CSV Import Modal */}
      <Modal
        visible={showImportModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top']}>
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
              status="primary"
              size="small"
              onPress={importCSV}
              disabled={importing}
              accessoryLeft={importing ? () => <Spinner size="small" status="control" /> : undefined}
            >
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </Layout>

          {importing && (
            <Layout style={styles.loadingOverlay}>
              <Layout style={styles.loadingContent}>
                <Spinner size="large" status="primary" />
                <Text category="s1" appearance="hint" style={styles.loadingText}>
                  {importProgress.stage === 'fetching' 
                    ? `Fetching latest printings from Scryfall... (${importProgress.current}/${importProgress.total})`
                    : 'Processing cards...'}
                </Text>
                <Text category="s1" appearance="hint" style={styles.loadingSubtext}>
                  {importProgress.total > 50 
                    ? `Large import in progress. Please keep the app open. Estimated time: ${Math.ceil((importProgress.total - importProgress.current) * 0.3)} seconds remaining`
                    : 'This may take a few minutes'}
                </Text>
                {importProgress.total > 0 && (
                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { width: `${(importProgress.current / importProgress.total) * 100}%` }
                      ]} 
                    />
                  </View>
                )}
              </Layout>
            </Layout>
          )}

          <ScrollView 
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            <Text category="h6" style={styles.instructionsTitle}>CSV Import Instructions</Text>
            <Text category="s1" appearance="hint" style={styles.instructionsText}>
              Upload a CSV file or paste your card list here. Only quantity and card name are required. The app will automatically fetch the latest non-foil printing of each card.
            </Text>
            <Text category="s1" appearance="hint" style={styles.instructionsList}>
              <Text style={{ fontWeight: 'bold' }}>Column Order (if no header):</Text>{'\n'}
              1. Quantity (required){'\n'}
              2. Card Name (required){'\n\n'}
              <Text style={{ fontWeight: 'bold' }}>Or include a header row with "Quantity" and "Name" columns.</Text>{'\n\n'}
              <Text style={{ fontStyle: 'italic' }}>Note: The app will automatically select the latest non-foil printing (preferring special printings like showcase or borderless).</Text>
            </Text>

            <Button
              appearance="filled"
              status="primary"
              onPress={pickCSVFile}
              style={styles.uploadButton}
              disabled={importing}
              accessoryLeft={() => <Feather name="upload" size={16} color="#FFFFFF" />}
            >
              Upload CSV File
            </Button>

            <Button
              appearance="outline"
              status="info"
              onPress={handleDownloadTemplate}
              style={styles.templateButton}
              accessoryLeft={() => <Feather name="download-cloud" size={16} color="#FF8610" />}
            >
              Download CSV Template
            </Button>

            <Text category="s1" appearance="hint" style={styles.orText}>
              Or paste CSV data here:
            </Text>

            <Input
              style={styles.csvInput}
              value={csvData}
              onChangeText={setCsvData}
              placeholder="Paste your CSV data here..."
              multiline={true}
              disabled={importing}
              textStyle={styles.csvInputText}
            />

            <Layout style={styles.sampleBox} level="3">
              <Text category="s1" style={styles.sampleTitle}>📝 Sample CSV Format:</Text>
              <Text category="s1" appearance="hint" style={styles.sampleText}>
                <Text style={{ fontWeight: 'bold' }}>With Header:</Text>{'\n'}
                Quantity,Name{'\n'}
                4,Lightning Bolt{'\n'}
                2,Counterspell{'\n'}
                1,Teferi's Protection{'\n\n'}
                <Text style={{ fontWeight: 'bold' }}>Without Header (default order):</Text>{'\n'}
                4,Lightning Bolt{'\n'}
                2,Counterspell{'\n'}
                1,Teferi's Protection
              </Text>
            </Layout>

            <Layout style={styles.infoBox} level="3">
              <Text category="h6" style={styles.infoTitle}>💡 Tips</Text>
              <Text category="s1" appearance="hint" style={styles.infoText}>
                • Use DelverLens app to scan your cards{'\n'}
                • Export as CSV from DelverLens{'\n'}
                • Cards will be automatically priced{'\n'}
                • Empty slots will be filled automatically
              </Text>
            </Layout>
          </ScrollView>
        </Layout>
        </SafeAreaView>
      </Modal>

      {/* Manual Add Card Modal */}
      <Modal
        visible={showAddCardModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseAddCardModal}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <Layout style={styles.modalContainer} level="1">
            <Layout style={styles.modalHeader} level="2">
        <Button
          appearance="ghost"
          status="basic"
          size="small"
          onPress={handleCloseAddCardModal}
        >
          Cancel
        </Button>
        <Text category="h6" style={styles.modalTitle}>Add Card to Slot</Text>
        <Layout style={{ width: 60 }} />
      </Layout>

      <ScrollView
        contentContainerStyle={styles.addCardContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text category="s1" style={styles.inputLabel}>Search for a Card</Text>
        <Input
          style={styles.textInput}
          value={cardSearchTerm}
          onChangeText={setCardSearchTerm}
          placeholder="e.g., Lightning Bolt"
          autoCapitalize="words"
          autoCorrect={false}
        />
        <Layout style={styles.searchActions} level="1">
          <Button
            status="primary"
            onPress={handleSearchForCard}
            disabled={cardSearchLoading}
            accessoryLeft={cardSearchLoading ? () => <Spinner size="small" status="control" /> : undefined}
          >
            {cardSearchLoading ? 'Searching...' : 'Search'}
          </Button>
        </Layout>
        {cardSearchMessage ? (
          <Text
            category="s1"
            status={cardSearchMessageType === 'danger' ? 'danger' : 'info'}
            style={styles.searchStatusText}
          >
            {cardSearchMessage}
          </Text>
        ) : null}
        {cardSearchResult && (
          <Layout style={styles.searchResultCard} level="2">
            <Image
              source={{ uri: cardSearchResult.imageUrl }}
              style={styles.searchResultImage}
              resizeMode="contain"
            />
            <Layout style={styles.searchResultInfo}>
              <Text category="h6" style={styles.searchResultTitle}>{cardSearchResult.name}</Text>
              <Text category="s1" appearance="hint" style={styles.searchResultSubtitle}>
                {cardSearchResult.set} ({cardSearchResult.setCode})
              </Text>
              {cardSearchResult.price ? (
                <Text category="s1" style={styles.searchResultPrice}>
                  ${cardSearchResult.price.toFixed(2)}
                </Text>
              ) : null}
            </Layout>
            <Button
              status="success"
              size="small"
              style={styles.searchResultButton}
              onPress={handleAddCardToSlot}
              disabled={addingCard}
              accessoryLeft={addingCard ? () => <Spinner size="small" status="control" /> : undefined}
            >
              {addingCard ? 'Adding...' : 'Add Card'}
            </Button>
          </Layout>
        )}
      </ScrollView>
          </Layout>
        </SafeAreaView>
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
                accessoryLeft={() => <Text style={styles.cardModalCloseText}>✕</Text>}
              />
              
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
                        onPress={handleDeleteCard}
                        accessoryLeft={() => <Feather name="trash-2" size={16} color="#FFFFFF" />}
                      >
                        Delete Card
                      </Button>
                    ) : (
                      <Button 
                        status="primary"
                        size="medium"
                        onPress={handleMarkForTrade}
                        accessoryLeft={() => <Feather name="refresh-cw" size={16} color="#FFFFFF" />}
                      >
                        Mark for Trade
                      </Button>
                    )}
                  </Layout>
                </Layout>
              )}
            </Layout>
          </TouchableOpacity>
        </Layout>
      </Modal>
      
      <AlertModal
        visible={showAlert}
        title={alertTitle}
        message={alertMessage}
        type={alertType}
        onClose={() => setShowAlert(false)}
      />

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Card"
        message={`Are you sure you want to delete "${selectedCard?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmStatus="danger"
        onConfirm={confirmDeleteCard}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        visible={showRearrangeConfirm}
        title="Rearrange Cards"
        message="This will reorganize all cards to fill empty slots and remove empty pages. Continue?"
        confirmText="Rearrange"
        cancelText="Cancel"
        confirmStatus="warning"
        onConfirm={confirmRearrangeCards}
        onCancel={() => setShowRearrangeConfirm(false)}
      />

      {/* Trade Review Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <Layout style={styles.tradeReviewModalContainer}>
            <Layout style={styles.tradeReviewHeader} level="2">
              <Text category="h5" style={styles.tradeReviewTitle}>Review Trade Request</Text>
              <Button
                appearance="ghost"
                status="basic"
                size="small"
                onPress={() => setShowConfirmModal(false)}
                style={{ width: 40 }}
                accessoryLeft={() => <Feather name="x" size={20} color="#FFFFFF" />}
              />
            </Layout>

            <ScrollView style={styles.tradeReviewContent}>
              <Text category="s1" appearance="hint" style={styles.tradeReviewInstructions}>
                You are requesting {selectedCardsForTrade.size} card{selectedCardsForTrade.size === 1 ? '' : 's'} from {ownerName}. Review your selection below and confirm to send the trade request.
              </Text>

              <Layout style={styles.selectedCardsList}>
                {Array.from(selectedCardsForTrade.values()).map((item, index) => (
                  <Layout key={`${item.pageNumber}-${item.slotPosition}`} style={styles.selectedCardItem} level="3">
                    {item.card.imageUrl ? (
                      <Image 
                        source={{ uri: item.card.imageUrl }} 
                        style={styles.selectedCardImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Layout style={styles.selectedCardPlaceholder}>
                        <Text category="c1" appearance="hint">?</Text>
                      </Layout>
                    )}
                    <Layout style={styles.selectedCardInfo}>
                      <Text category="s1" style={styles.selectedCardName}>{item.card.name}</Text>
                      <Text category="c1" appearance="hint" style={styles.selectedCardDetails}>
                        {item.card.set} • {item.card.condition} • {item.card.finish}
                      </Text>
                      {item.card.price && (
                        <Text category="s1" status="success" style={styles.selectedCardPrice}>
                          ${(item.card.price * (item.card.quantity || 1)).toFixed(2)}
                        </Text>
                      )}
                    </Layout>
                  </Layout>
                ))}
              </Layout>
            </ScrollView>

            <Layout style={styles.tradeReviewFooter} level="2">
              <Button
                appearance="ghost"
                status="basic"
                onPress={() => setShowConfirmModal(false)}
                style={styles.tradeReviewCancelButton}
              >
                Cancel
              </Button>
              <Button
                status="primary"
                onPress={handleConfirmTrade}
                disabled={creatingTrade}
                style={styles.tradeReviewConfirmButton}
                accessoryLeft={creatingTrade ? () => <Spinner size="small" status="control" /> : undefined}
              >
                {creatingTrade ? 'Sending...' : 'Confirm Trade Request'}
              </Button>
            </Layout>
          </Layout>
        </SafeAreaView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    gap: 12,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    marginBottom: 16,
  },
  headerTitleRow: {
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    flexGrow: 1,
    minWidth: '28%',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  binderContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 20,
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
    backgroundColor: '#FF8610',
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
    width: '100%',
    alignItems: 'center',
  },
  pageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
  },
  slotContainer: {
    width: '31%',
    aspectRatio: 63 / 88,
    marginBottom: 16,
  },
  cardSlot: {
    flex: 1,
    flexDirection: 'column',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  emptySlot: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3a3a3a',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  emptySlotText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptySlotDisabled: {
    opacity: 0.6,
  },
  cardImageContainer: {
    flex: 1,
    flexGrow: 1,
    width: '100%',
  },
  cardImage: {
    flex: 1,
    width: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  cardImagePlaceholder: {
    flex: 1,
    flexGrow: 1,
    width: '100%',
    backgroundColor: '#333',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardSet: {
    color: '#ccc',
    fontSize: 8,
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
    color: '#FF8610',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  importButton: {
    color: '#FF8610',
    fontSize: 16,
    fontWeight: '600',
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
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
  uploadButton: {
    marginTop: 12,
    marginBottom: 12,
  },
  templateButton: {
    marginTop: 12,
    marginBottom: 16,
    borderColor: '#FF8610',
  },
  orText: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
    color: '#999',
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
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  addCardContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  searchActions: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  searchStatusText: {
    marginTop: 12,
  },
  searchResultCard: {
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#2a2a2a',
    gap: 12,
    alignItems: 'center',
  },
  searchResultImage: {
    width: 120,
    height: 170,
    borderRadius: 8,
  },
  searchResultInfo: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
  },
  searchResultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  searchResultSubtitle: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  searchResultPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8610',
  },
  searchResultButton: {
    alignSelf: 'stretch',
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
    borderRadius: 12,
    padding: 20,
    position: 'relative',
  },
  cardModalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  cardModalCloseText: {
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
    textAlign: 'center',
    marginBottom: 8,
  },
  cardDetailSet: {
    fontSize: 14,
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
    fontWeight: '600',
  },
  cardDetailStatValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardDetailPrice: {
    fontSize: 14,
    color: '#FF8610',
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
  progressBarContainer: {
    width: '80%',
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF8610',
    borderRadius: 4,
  },
  // Selection Mode Styles
  cardSlotSelectionMode: {
    borderWidth: 2,
    borderColor: '#FF8610',
  },
  cardSlotSelected: {
    borderColor: '#FF8610',
    borderWidth: 3,
    backgroundColor: 'rgba(255, 134, 16, 0.1)',
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
    backgroundColor: '#FF8610',
    borderColor: '#FF8610',
  },
  selectionCheckmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionButtonActive: {
    backgroundColor: '#FF8610',
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
    borderWidth: 1,
    borderColor: '#FF8610',
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
    backgroundColor: '#FF8610',
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
  screenContent: {
    paddingBottom: 32,
  },
  // Trade Review Modal Styles
  tradeReviewModalContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  tradeReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tradeReviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  tradeReviewContent: {
    flex: 1,
    padding: 20,
  },
  tradeReviewInstructions: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 20,
    lineHeight: 20,
  },
  selectedCardsList: {
    gap: 12,
  },
  selectedCardItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedCardImage: {
    width: 60,
    height: 84,
    borderRadius: 4,
    marginRight: 12,
  },
  selectedCardPlaceholder: {
    width: 60,
    height: 84,
    borderRadius: 4,
    marginRight: 12,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCardInfo: {
    flex: 1,
  },
  selectedCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  selectedCardDetails: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  selectedCardPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  tradeReviewFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  tradeReviewCancelButton: {
    flex: 1,
  },
  tradeReviewConfirmButton: {
    flex: 1,
  },
});


















