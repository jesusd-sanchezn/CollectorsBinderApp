import { CardImageService } from './cardImageService';

// Local CSV parser for DelverLens format
export interface ParsedCard {
  name: string;
  set: string;
  quantity: number;
  condition: string;
  finish: string;
  notes?: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  cards: ParsedCard[];
}

export class CSVParser {
  static parseDelverLensCSV(csvData: string): ImportResult {
    const lines = csvData.trim().split('\n');
    const cards: ParsedCard[] = [];
    const errors: string[] = [];
    
    if (lines.length < 1) {
      return {
        success: false,
        imported: 0,
        errors: ['CSV must have at least one data row'],
        cards: []
      };
    }

    // Detect if first line is a header or data
    const firstLine = this.parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    const hasHeader = this.detectHeader(firstLine);
    
    let nameIndex: number;
    let quantityIndex: number;
    let dataStartIndex: number;

    if (hasHeader) {
      // Parse header to find column indices - only need quantity and name
      const header = firstLine;
      nameIndex = header.findIndex(h => h.includes('name') || h.includes('card'));
      quantityIndex = header.findIndex(h => h.includes('quantityx') || h.includes('qty') || h.includes('quantity') || h.includes('count'));
      dataStartIndex = 1; // Start from second line

      // Validate required columns
      if (nameIndex === -1) {
        errors.push('Card name column not found in header');
      }
      if (quantityIndex === -1) {
        errors.push('Quantity column not found in header');
      }

      if (errors.length > 0) {
        return {
          success: false,
          imported: 0,
          errors,
          cards: []
        };
      }
    } else {
      // No header detected - use default column order: Quantity, Name
      quantityIndex = 0;
      nameIndex = 1;
      dataStartIndex = 0; // Start from first line
    }

    // Parse data rows
    for (let i = dataStartIndex; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        
        if (values.length < Math.max(nameIndex, quantityIndex) + 1) {
          errors.push(`Row ${i + 1}: Not enough columns (need at least quantity and card name)`);
          continue;
        }

        // Parse quantity (handle "1x" format)
        const quantityStr = values[quantityIndex]?.trim() || '1';
        const quantity = parseInt(quantityStr.replace(/x/gi, '')) || 1;
        
        // Extract card name - preserves apostrophes and other special characters
        // Examples: "Teferi's Protection", "Jace's Phantasm", "O'Brien's Card"
        const cardName = values[nameIndex]?.trim() || '';
        
        const card: ParsedCard = {
          name: cardName,
          set: '', // Will be fetched from Scryfall
          quantity: quantity,
          condition: 'NM', // Default condition
          finish: 'nonfoil', // Always nonfoil, will fetch latest printing
          notes: ''
        };

        if (!card.name) {
          errors.push(`Row ${i + 1}: Card name is required`);
          continue;
        }

        cards.push(card);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      imported: cards.length,
      errors,
      cards
    };
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inDoubleQuotes = false;
    let inSingleQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = i + 1 < line.length ? line[i + 1] : null;
      const prevChar = i > 0 ? line[i - 1] : null;
      const inQuotes = inDoubleQuotes || inSingleQuotes;
      
      if (char === '"') {
        if (inDoubleQuotes && nextChar === '"') {
          // Escaped quote (double quote inside double-quoted field) - add quote to current field
          // This handles: "Card ""Name""" -> Card "Name"
          current += '"';
          i++; // Skip the next quote
        } else if (inDoubleQuotes && (nextChar === ',' || nextChar === null || nextChar === '\r' || nextChar === '\n')) {
          // End of double-quoted field: "Field", or "Field" at end of line
          inDoubleQuotes = false;
          // Don't add the closing quote to current, it's just a delimiter
        } else if (!inQuotes && (i === 0 || prevChar === ',')) {
          // Start of double-quoted field: ,"Field" or "Field" at start
          inDoubleQuotes = true;
          // Don't add the opening quote to current
        } else if (inDoubleQuotes) {
          // Unexpected quote inside double-quoted field (not escaped) - treat as literal
          // This handles malformed CSV gracefully
          current += '"';
        } else {
          // Unquoted field with a quote character - treat as literal character
          // This handles: Card "Name" (technically invalid CSV but we'll be lenient)
          current += '"';
        }
      } else if (char === "'" && !inDoubleQuotes) {
        // Handle single quotes - only process if not already in double quotes
        if (inSingleQuotes && (nextChar === ',' || nextChar === null || nextChar === '\r' || nextChar === '\n')) {
          // End of single-quoted field: 'Field', or 'Field' at end of line
          inSingleQuotes = false;
          // Don't add the closing quote to current, it's just a delimiter
        } else if (!inQuotes && (i === 0 || prevChar === ',')) {
          // Start of single-quoted field: ,'Field' or 'Field' at start
          inSingleQuotes = true;
          // Don't add the opening quote to current
        } else if (inSingleQuotes && nextChar === "'") {
          // Escaped single quote (double single quote inside single-quoted field)
          // This handles: 'Card ''Name''' -> Card 'Name'
          current += "'";
          i++; // Skip the next quote
        } else if (inSingleQuotes) {
          // Single quote inside single-quoted field (not escaped) - treat as literal
          current += "'";
        } else {
          // Unquoted field with a single quote - treat as literal character (apostrophe)
          // This handles: Teferi's Protection (apostrophe in card name)
          current += "'";
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator - only when not in any quotes
        result.push(current.trim());
        current = '';
      } else {
        // Add character to current field
        // This includes:
        // - Single quotes/apostrophes (') when inside double quotes or unquoted
        //   Examples: "Teferi's Protection", 'Teferi's Protection', Teferi's Protection
        // - Commas when inside quotes (part of the field value)
        // - All other characters including spaces, special chars, etc.
        current += char;
      }
    }
    
    // Add the last field (even if we ended in quotes, that's fine)
    result.push(current.trim());
    
    return result;
  }

  // Detect if the first line is a header row or data
  private static detectHeader(firstLine: string[]): boolean {
    if (firstLine.length === 0) return false;
    
    // Check if the line contains header-like keywords (simplified for quantity and name only)
    const headerKeywords = ['name', 'card', 'quantity', 'qty', 'count'];
    const lineText = firstLine.join(' ').toLowerCase();
    
    // Count how many header keywords are found
    const keywordMatches = headerKeywords.filter(keyword => lineText.includes(keyword)).length;
    
    // Check if first column looks like a quantity number (data) vs text (header)
    const firstColumn = firstLine[0]?.trim() || '';
    const looksLikeQuantity = !isNaN(parseFloat(firstColumn.replace(/x/gi, ''))) && firstColumn.length < 15;
    
    // Check if second column looks like a card name (common card name patterns)
    const secondColumn = firstLine[1]?.trim() || '';
    const hasCardNamePattern = secondColumn.length > 3 && 
      (secondColumn.includes(' ') || 
       secondColumn.includes("'") || 
       secondColumn.length > 10);
    
    // It's a header if:
    // - We find header keywords (name/quantity), OR
    // - First column doesn't look like a quantity
    if (keywordMatches >= 1) {
      return true; // Header indicator
    }
    
    if (looksLikeQuantity && hasCardNamePattern) {
      return false; // Looks like data row
    }
    
    // Default: if first column doesn't look like a number, assume header
    return !looksLikeQuantity;
  }

  // Convert parsed cards to our app's Card format
  static async convertToAppCards(
    parsedCards: ParsedCard[],
    onProgress?: (stage: string, current: number, total: number) => void
  ): Promise<any[]> {
    const appCards: any[] = [];
    // Scryfall allows 10 requests per second, so we can safely process 10 cards at a time
    // Each card makes ~2-3 API calls, but they're sequential within each card
    const BATCH_SIZE = 10; // Process 10 cards at a time (increased from 5)
    const DELAY_BETWEEN_BATCHES = 100; // 100ms delay between batches (reduced from 200ms)
    const DELAY_BETWEEN_CARDS = 50; // 50ms delay between cards in a batch (reduced from 100ms)
    
    // Process cards in batches to fetch latest non-foil printings
    for (let i = 0; i < parsedCards.length; i += BATCH_SIZE) {
      const batch = parsedCards.slice(i, i + BATCH_SIZE);
      
      // Process batch
      const batchPromises = batch.map(async (card, batchIndex) => {
        // Add small delay even within batch to be respectful
        if (batchIndex > 0) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CARDS));
        }
        
        try {
          if (onProgress) {
            onProgress('fetching', i + batchIndex + 1, parsedCards.length);
          }
          
          // Fetch latest non-foil printing using EXACT matching (no fuzzy search)
          // This ensures "Badgermole" matches "Badgermole" and not "Badgermole Cub"
          const printing = await CardImageService.getLatestNonFoilPrintingExact(card.name);
          
          if (printing) {
            return {
              id: `imported-${Date.now()}-${i + batchIndex}`,
              name: card.name,
              set: printing.setName,
              setCode: printing.setCode,
              collectorNumber: printing.collectorNumber,
              imageUrl: printing.imageUrl || this.getFallbackImageUrl(card.name),
              price: printing.price || this.getEstimatedPrice(card.name, 'nonfoil'),
              rarity: 'Unknown',
              condition: card.condition as any,
              finish: 'nonfoil' as any,
              quantity: card.quantity,
              notes: card.notes
            };
          } else {
            // Fallback if no printing found
            return {
              id: `imported-${Date.now()}-${i + batchIndex}`,
              name: card.name,
              set: '',
              setCode: '',
              collectorNumber: '',
              imageUrl: this.getFallbackImageUrl(card.name),
              price: this.getEstimatedPrice(card.name, 'nonfoil'),
              rarity: 'Unknown',
              condition: card.condition as any,
              finish: 'nonfoil' as any,
              quantity: card.quantity,
              notes: card.notes
            };
          }
        } catch (error) {
          console.error(`Error processing card ${card.name}:`, error);
          // Return fallback card
          return {
            id: `imported-${Date.now()}-${i + batchIndex}`,
            name: card.name,
            set: '',
            setCode: '',
            collectorNumber: '',
            imageUrl: this.getFallbackImageUrl(card.name),
            price: 0,
            rarity: 'Unknown',
            condition: card.condition as any,
            finish: 'nonfoil' as any,
            quantity: card.quantity,
            notes: card.notes
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      appCards.push(...batchResults);
      
      // Delay between batches (except for the last batch)
      if (i + BATCH_SIZE < parsedCards.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    return appCards;
  }

  private static getFallbackImageUrl(cardName: string): string {
    // Use real working image URLs for common cards
    const commonCards: { [key: string]: string } = {
      // Classic cards
      'Lightning Bolt': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Counterspell': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397703&type=card',
      'Black Lotus': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=3&type=card',
      'Mox Sapphire': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=4&type=card',
      'Mox Ruby': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=5&type=card',
      'Mox Pearl': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=6&type=card',
      'Mox Emerald': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=7&type=card',
      'Mox Jet': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=8&type=card',
      'Ancestral Recall': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=9&type=card',
      'Time Walk': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=10&type=card',
      'Timetwister': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=11&type=card',
      'Sol Ring': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Command Tower': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Arcane Signet': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Swords to Plowshares': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Path to Exile': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Brainstorm': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Ponder': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Preordain': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Serum Visions': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      
      // Cards from your CSV that have known images
      'Island': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Propaganda': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Narset, Parter of Veils': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Narset\'s Reversal': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Unmoored Ego': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Skullcrack': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'White Ward': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
    };

    return commonCards[cardName] || '';
  }

  private static getCardImageUrl(cardName: string, setName: string): string {
    // Use real working image URLs for common cards
    const commonCards: { [key: string]: string } = {
      'Lightning Bolt': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Counterspell': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397703&type=card',
      'Black Lotus': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=3&type=card',
      'Mox Sapphire': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=4&type=card',
      'Mox Ruby': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=5&type=card',
      'Mox Pearl': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=6&type=card',
      'Mox Emerald': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=7&type=card',
      'Mox Jet': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=8&type=card',
      'Ancestral Recall': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=9&type=card',
      'Time Walk': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=10&type=card',
      'Timetwister': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=11&type=card',
      'Sol Ring': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Command Tower': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Arcane Signet': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Swords to Plowshares': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Path to Exile': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Brainstorm': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Ponder': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Preordain': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
      'Serum Visions': 'https://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=397722&type=card',
    };

    return commonCards[cardName] || '';
  }

  private static getEstimatedPrice(cardName: string, finish: string): number {
    // Simple price estimation for demo
    const basePrices: { [key: string]: number } = {
      'Lightning Bolt': 0.25,
      'Counterspell': 0.15,
      'Black Lotus': 50000,
      'Mox Sapphire': 15000,
      'Mox Ruby': 12000,
      'Mox Pearl': 10000,
      'Mox Emerald': 8000,
      'Mox Jet': 9000,
      'Ancestral Recall': 8000,
      'Time Walk': 12000,
      'Timetwister': 3000,
    };

    const basePrice = basePrices[cardName] || 1.0;
    return finish === 'foil' ? basePrice * 2 : basePrice;
  }

  private static extractSetCode(setName: string): string {
    // Set code extraction for your specific sets
    const commonSets: { [key: string]: string } = {
      'Outlaws of Thunder Junction': 'OTJ',
      'The Brothers\' War Commander': 'BRO',
      'Tarkir: Dragonstorm': 'TDS',
      'Strixhaven: School of Mages': 'STX',
      'Rivals of Ixalan Promos': 'RIX',
      'Breaking News': 'BN',
      'Theros': 'THS',
      'Double Masters 2022': '2X2',
      'Modern Masters 2015': 'MM2',
      'Bloomburrow': 'BLB',
      'Wilds of Eldraine: Enchanting Tales': 'WOE',
      'The List': 'LST',
      'Chronicles': 'CHR',
      'Strixhaven Mystical Archive': 'STA',
      'Wilds of Eldraine': 'WOE',
      'War of the Spark': 'WAR',
      'The Big Score': 'TBS',
      'Commander 2020': 'C20',
      'Planeshift': 'PLS',
      'Iconic Masters': 'IMA',
      'Guilds of Ravnica': 'GRN',
      'Murders at Karlov Manor': 'MKM',
      'Limited Edition Alpha': 'LEA',
      'Dominaria United': 'DMU'
    };

    return commonSets[setName] || setName.substring(0, 3).toUpperCase();
  }
}
