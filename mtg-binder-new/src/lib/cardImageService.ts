// Service to fetch real card images from Scryfall API
export interface ScryfallCard {
  id: string;
  name: string;
  image_uris?: {
    normal: string;
    small: string;
    border_crop: string;
  };
  card_faces?: Array<{
    image_uris?: {
      normal: string;
      small: string;
      border_crop: string;
    };
  }>;
  set: string;
  set_name: string;
  set_type?: string;
  collector_number: string;
  released_at?: string;
  finishes?: string[];
  frame_effects?: string[];
  prices?: {
    usd?: string;
    usd_foil?: string;
  };
}

export class CardImageService {
  private static cache = new Map<string, string>();

  // Fetch card image from Scryfall API
  static async getCardImage(cardName: string, setName?: string): Promise<string> {
    // Check cache first
    const cacheKey = `${cardName}-${setName || 'any'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      console.log(`Fetching image for: ${cardName} from set: ${setName}`);
      
      // Search for the card on Scryfall with better query handling
      // Card names with apostrophes (like "Teferi's Protection") are handled correctly
      // The cardName is already properly parsed from CSV and contains the apostrophe
      let searchQuery = `name:"${cardName}"`;
      
      // Add set filter if available
      if (setName && setName.trim()) {
        // Handle special set names
        const setCode = this.getSetCode(setName);
        if (setCode) {
          searchQuery += ` set:${setCode}`;
          console.log(`Using set code: ${setCode} for set: ${setName}`);
        }
      }
      
      // encodeURIComponent properly handles apostrophes and other special characters
      const encodedQuery = encodeURIComponent(searchQuery);
      const url = `https://api.scryfall.com/cards/search?q=${encodedQuery}&format=json`;
      console.log(`Scryfall URL: ${url}`);
      
      const response = await fetch(url);

      if (!response.ok) {
        console.log(`Scryfall API error: ${response.status} for ${cardName}`);
        if (response.status === 404) {
          // Card not found, try without set filter
          return this.searchCardWithoutSet(cardName);
        }
        throw new Error(`Scryfall API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const card = data.data[0] as ScryfallCard;
        let imageUrl = '';

        // Get the best available image
        if (card.image_uris?.normal) {
          imageUrl = card.image_uris.normal;
        } else if (card.image_uris?.border_crop) {
          imageUrl = card.image_uris.border_crop;
        } else if (card.image_uris?.small) {
          imageUrl = card.image_uris.small;
        } else if (card.card_faces?.[0]?.image_uris?.normal) {
          imageUrl = card.card_faces[0].image_uris.normal;
        }

        if (imageUrl) {
          console.log(`Found image for ${cardName}: ${imageUrl}`);
          // Cache the result
          this.cache.set(cacheKey, imageUrl);
          return imageUrl;
        }
      }

      // If no exact match, try a broader search
      console.log(`No exact match for ${cardName}, trying broader search`);
      const broadResponse = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodeURIComponent(cardName)}&format=json`
      );

      if (broadResponse.ok) {
        const broadData = await broadResponse.json();
        if (broadData.data && broadData.data.length > 0) {
          const card = broadData.data[0] as ScryfallCard;
          let imageUrl = '';

          if (card.image_uris?.normal) {
            imageUrl = card.image_uris.normal;
          } else if (card.image_uris?.border_crop) {
            imageUrl = card.image_uris.border_crop;
          } else if (card.image_uris?.small) {
            imageUrl = card.image_uris.small;
          } else if (card.card_faces?.[0]?.image_uris?.normal) {
            imageUrl = card.card_faces[0].image_uris.normal;
          }

          if (imageUrl) {
            console.log(`Found image for ${cardName} (broad search): ${imageUrl}`);
            this.cache.set(cacheKey, imageUrl);
            return imageUrl;
          }
        }
      }

      console.log(`No image found for ${cardName}`);
      return '';
    } catch (error) {
      console.error(`Error fetching card image for ${cardName}:`, error);
      return '';
    }
  }

  // Helper function to extract image URL from a card
  private static extractImageUrl(card: ScryfallCard): string {
    if (card.image_uris?.normal) {
      return card.image_uris.normal;
    } else if (card.image_uris?.border_crop) {
      return card.image_uris.border_crop;
    } else if (card.image_uris?.small) {
      return card.image_uris.small;
    } else if (card.card_faces?.[0]?.image_uris?.normal) {
      return card.card_faces[0].image_uris.normal;
    }
    return '';
  }

  // Helper function to check if card is non-foil
  private static isNonFoil(card: ScryfallCard): boolean {
    return !card.finishes || !card.finishes.includes('foil');
  }

  // Get latest non-foil printing of a card with EXACT name matching (for imports)
  // This ensures "Badgermole" matches "Badgermole" and not "Badgermole Cub"
  static async getLatestNonFoilPrintingExact(cardName: string): Promise<{
    imageUrl: string;
    setName: string;
    setCode: string;
    collectorNumber: string;
    price: number;
  } | null> {
    try {
      try {
        // Try non-foil first with exact name match using quoted search
        // The quotes ensure exact phrase matching in Scryfall
        const exactQuery = encodeURIComponent(`name:"${cardName}" -is:foil`);
        const response = await fetch(`https://api.scryfall.com/cards/search?q=${exactQuery}&order=released&dir=desc&format=json`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            // CRITICAL: Filter to ensure EXACT name match (case-insensitive)
            // This prevents "Badgermole" from matching "Badgermole Cub"
            const exactMatches = data.data.filter((c: ScryfallCard) => 
              c.name.toLowerCase().trim() === cardName.toLowerCase().trim()
            );
            
            if (exactMatches.length > 0) {
              const specialPrintings = exactMatches.filter((c: ScryfallCard) => 
                c.frame_effects && c.frame_effects.length > 0 && this.isNonFoil(c)
              );
              const selectedCard = specialPrintings.length > 0 ? specialPrintings[0] : exactMatches.find((c: ScryfallCard) => this.isNonFoil(c)) || exactMatches[0];
              
              const imageUrl = this.extractImageUrl(selectedCard);
              if (imageUrl) {
                return {
                  imageUrl,
                  setName: selectedCard.set_name || '',
                  setCode: selectedCard.set || '',
                  collectorNumber: selectedCard.collector_number || '',
                  price: selectedCard.prices?.usd ? parseFloat(selectedCard.prices.usd) : 0
                };
              }
            }
          }
        }
        
        // If no non-foil found, try all printings with exact match
        const allExactQuery = encodeURIComponent(`name:"${cardName}"`);
        const allResponse = await fetch(`https://api.scryfall.com/cards/search?q=${allExactQuery}&order=released&dir=desc&format=json`);
        
        if (allResponse.ok) {
          const allData = await allResponse.json();
          if (allData.data && allData.data.length > 0) {
            // CRITICAL: Filter to ensure EXACT name match (case-insensitive)
            const exactMatches = allData.data.filter((c: ScryfallCard) => 
              c.name.toLowerCase().trim() === cardName.toLowerCase().trim()
            );
            
            if (exactMatches.length > 0) {
              const specialPrintings = exactMatches.filter((c: ScryfallCard) => 
                c.frame_effects && c.frame_effects.length > 0
              );
              const nonFoilCards = exactMatches.filter((c: ScryfallCard) => this.isNonFoil(c));
              const selectedCard = specialPrintings.length > 0 ? specialPrintings[0] : 
                                 (nonFoilCards.length > 0 ? nonFoilCards[0] : exactMatches[0]);
              
              const imageUrl = this.extractImageUrl(selectedCard);
              if (imageUrl) {
                return {
                  imageUrl,
                  setName: selectedCard.set_name || '',
                  setCode: selectedCard.set || '',
                  collectorNumber: selectedCard.collector_number || '',
                  price: selectedCard.prices?.usd ? parseFloat(selectedCard.prices.usd) : 0
                };
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error in exact search for ${cardName}:`, error);
        // Continue to next strategy
      }

      // Strategy 2: Try Scryfall's exact named endpoint (but verify the name matches)
      // Only use this if the search API didn't find an exact match
      try {
        const exactName = encodeURIComponent(cardName);
        const exactResponse = await fetch(`https://api.scryfall.com/cards/named?exact=${exactName}`);
        
        if (exactResponse.ok) {
          const card = await exactResponse.json() as ScryfallCard;
          // CRITICAL: Verify the returned card name matches exactly what we searched for
          if (card.name && card.name.toLowerCase().trim() === cardName.toLowerCase().trim()) {
            // Only proceed if the name matches exactly
            const imageUrl = this.extractImageUrl(card);
            if (imageUrl && this.isNonFoil(card)) {
              return {
                imageUrl,
                setName: card.set_name || '',
                setCode: card.set || '',
                collectorNumber: card.collector_number || '',
                price: card.prices?.usd ? parseFloat(card.prices.usd) : 0
              };
            }
          }
        }
      } catch (error) {
        // Continue
      }

      // Strategy 3: Handle double-faced cards with exact matching
      if (cardName.includes(' // ')) {
        const faces = cardName.split(' // ');
        const firstFace = faces[0].trim();
        const secondFace = faces[1]?.trim();
        
        try {
          // Search for double-faced cards with exact match on first face
          const query = encodeURIComponent(`name:"${firstFace}" -is:foil`);
          const response = await fetch(`https://api.scryfall.com/cards/search?q=${query}&order=released&dir=desc&format=json`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
              // Filter for cards that match the full double-faced name exactly
              const exactMatches = data.data.filter((c: ScryfallCard) => {
                const cardNameLower = c.name.toLowerCase().trim();
                const searchNameLower = cardName.toLowerCase().trim();
                return cardNameLower === searchNameLower;
              });
              
              if (exactMatches.length > 0) {
                const specialPrintings = exactMatches.filter((c: ScryfallCard) => 
                  c.frame_effects && c.frame_effects.length > 0 && this.isNonFoil(c)
                );
                const selectedCard = specialPrintings.length > 0 ? specialPrintings[0] : exactMatches.find((c: ScryfallCard) => this.isNonFoil(c)) || exactMatches[0];
                
                const imageUrl = this.extractImageUrl(selectedCard);
                if (imageUrl) {
                  return {
                    imageUrl,
                    setName: selectedCard.set_name || '',
                    setCode: selectedCard.set || '',
                    collectorNumber: selectedCard.collector_number || '',
                    price: selectedCard.prices?.usd ? parseFloat(selectedCard.prices.usd) : 0
                  };
                }
              }
            }
          }
        } catch (error) {
          // Continue
        }
      }

      return null;
    } catch (error) {
      console.error(`Error fetching exact card printing for ${cardName}:`, error);
      return null;
    }
  }

  // Get latest non-foil printing of a card (prefers special printings)
  // Uses fuzzy matching - good for user searches but NOT for imports
  static async getLatestNonFoilPrinting(cardName: string): Promise<{
    imageUrl: string;
    setName: string;
    setCode: string;
    collectorNumber: string;
    price: number;
  } | null> {
    try {
      // Strategy 1: Use Scryfall's fuzzy named endpoint FIRST (most forgiving for special characters)
      // This handles cases like "Palantir" -> "Palantír"
      try {
        const fuzzyName = encodeURIComponent(cardName);
        const fuzzyResponse = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${fuzzyName}`);
        
        if (fuzzyResponse.ok) {
          const card = await fuzzyResponse.json() as ScryfallCard;
          // If we found a card, search for all its printings
          if (card.name) {
            // First try non-foil only
            const allPrintingsQuery = encodeURIComponent(`name:"${card.name}" -is:foil`);
            const printingsResponse = await fetch(`https://api.scryfall.com/cards/search?q=${allPrintingsQuery}&order=released&dir=desc&format=json`);
            
            if (printingsResponse.ok) {
              const printingsData = await printingsResponse.json();
              if (printingsData.data && printingsData.data.length > 0) {
                // Prefer special printings
                const specialPrintings = printingsData.data.filter((c: ScryfallCard) => 
                  c.frame_effects && c.frame_effects.length > 0 && this.isNonFoil(c)
                );
                const selectedCard = specialPrintings.length > 0 ? specialPrintings[0] : printingsData.data.find((c: ScryfallCard) => this.isNonFoil(c)) || printingsData.data[0];
                
                const imageUrl = this.extractImageUrl(selectedCard);
                if (imageUrl) {
                  return {
                    imageUrl,
                    setName: selectedCard.set_name || '',
                    setCode: selectedCard.set || '',
                    collectorNumber: selectedCard.collector_number || '',
                    price: selectedCard.prices?.usd ? parseFloat(selectedCard.prices.usd) : 0
                  };
                }
              }
            }
            
            // If no non-foil found, try all printings (including foil)
            const allPrintingsQueryAny = encodeURIComponent(`name:"${card.name}"`);
            const allPrintingsResponse = await fetch(`https://api.scryfall.com/cards/search?q=${allPrintingsQueryAny}&order=released&dir=desc&format=json`);
            
            if (allPrintingsResponse.ok) {
              const allPrintingsData = await allPrintingsResponse.json();
              if (allPrintingsData.data && allPrintingsData.data.length > 0) {
                // Prefer special printings, then non-foil, then any
                const specialPrintings = allPrintingsData.data.filter((c: ScryfallCard) => 
                  c.frame_effects && c.frame_effects.length > 0
                );
                const nonFoilCards = allPrintingsData.data.filter((c: ScryfallCard) => this.isNonFoil(c));
                const selectedCard = specialPrintings.length > 0 ? specialPrintings[0] : 
                                   (nonFoilCards.length > 0 ? nonFoilCards[0] : allPrintingsData.data[0]);
                
                const imageUrl = this.extractImageUrl(selectedCard);
                if (imageUrl) {
                  return {
                    imageUrl,
                    setName: selectedCard.set_name || '',
                    setCode: selectedCard.set || '',
                    collectorNumber: selectedCard.collector_number || '',
                    price: selectedCard.prices?.usd ? parseFloat(selectedCard.prices.usd) : 0
                  };
                }
              }
            }
          }
        }
      } catch (error) {
        // Continue to next strategy
      }

      // Strategy 2: Handle double-faced cards (split on //)
      if (cardName.includes(' // ')) {
        const firstFace = cardName.split(' // ')[0];
        try {
          // Try non-foil first
          const query = encodeURIComponent(`name:"${firstFace}" -is:foil`);
          const response = await fetch(`https://api.scryfall.com/cards/search?q=${query}&order=released&dir=desc&format=json`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.length > 0) {
              const specialPrintings = data.data.filter((c: ScryfallCard) => 
                c.frame_effects && c.frame_effects.length > 0 && this.isNonFoil(c)
              );
              const selectedCard = specialPrintings.length > 0 ? specialPrintings[0] : data.data.find((c: ScryfallCard) => this.isNonFoil(c)) || data.data[0];
              
              const imageUrl = this.extractImageUrl(selectedCard);
              if (imageUrl) {
                return {
                  imageUrl,
                  setName: selectedCard.set_name || '',
                  setCode: selectedCard.set || '',
                  collectorNumber: selectedCard.collector_number || '',
                  price: selectedCard.prices?.usd ? parseFloat(selectedCard.prices.usd) : 0
                };
              }
            }
          }
          
          // If no non-foil found, try all printings
          const allQuery = encodeURIComponent(`name:"${firstFace}"`);
          const allResponse = await fetch(`https://api.scryfall.com/cards/search?q=${allQuery}&order=released&dir=desc&format=json`);
          
          if (allResponse.ok) {
            const allData = await allResponse.json();
            if (allData.data && allData.data.length > 0) {
              const specialPrintings = allData.data.filter((c: ScryfallCard) => 
                c.frame_effects && c.frame_effects.length > 0
              );
              const nonFoilCards = allData.data.filter((c: ScryfallCard) => this.isNonFoil(c));
              const selectedCard = specialPrintings.length > 0 ? specialPrintings[0] : 
                                 (nonFoilCards.length > 0 ? nonFoilCards[0] : allData.data[0]);
              
              const imageUrl = this.extractImageUrl(selectedCard);
              if (imageUrl) {
                return {
                  imageUrl,
                  setName: selectedCard.set_name || '',
                  setCode: selectedCard.set || '',
                  collectorNumber: selectedCard.collector_number || '',
                  price: selectedCard.prices?.usd ? parseFloat(selectedCard.prices.usd) : 0
                };
              }
            }
          }
        } catch (error) {
          // Continue
        }
      }

      // Strategy 3: Search without quotes (partial/fuzzy matching in search API)
      try {
        // Try non-foil first
        const query = encodeURIComponent(`${cardName} -is:foil`);
        const response = await fetch(`https://api.scryfall.com/cards/search?q=${query}&order=released&dir=desc&format=json`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const specialPrintings = data.data.filter((c: ScryfallCard) => 
              c.frame_effects && c.frame_effects.length > 0 && this.isNonFoil(c)
            );
            const selectedCard = specialPrintings.length > 0 ? specialPrintings[0] : data.data.find((c: ScryfallCard) => this.isNonFoil(c)) || data.data[0];
            
            const imageUrl = this.extractImageUrl(selectedCard);
            if (imageUrl) {
              return {
                imageUrl,
                setName: selectedCard.set_name || '',
                setCode: selectedCard.set || '',
                collectorNumber: selectedCard.collector_number || '',
                price: selectedCard.prices?.usd ? parseFloat(selectedCard.prices.usd) : 0
              };
            }
          }
        }
        
        // If no non-foil found, try all printings
        const allQuery = encodeURIComponent(cardName);
        const allResponse = await fetch(`https://api.scryfall.com/cards/search?q=${allQuery}&order=released&dir=desc&format=json`);
        
        if (allResponse.ok) {
          const allData = await allResponse.json();
          if (allData.data && allData.data.length > 0) {
            const specialPrintings = allData.data.filter((c: ScryfallCard) => 
              c.frame_effects && c.frame_effects.length > 0
            );
            const nonFoilCards = allData.data.filter((c: ScryfallCard) => this.isNonFoil(c));
            const selectedCard = specialPrintings.length > 0 ? specialPrintings[0] : 
                               (nonFoilCards.length > 0 ? nonFoilCards[0] : allData.data[0]);
            
            const imageUrl = this.extractImageUrl(selectedCard);
            if (imageUrl) {
              return {
                imageUrl,
                setName: selectedCard.set_name || '',
                setCode: selectedCard.set || '',
                collectorNumber: selectedCard.collector_number || '',
                price: selectedCard.prices?.usd ? parseFloat(selectedCard.prices.usd) : 0
              };
            }
          }
        }
      } catch (error) {
        // Continue
      }

      // Strategy 4: Final fallback - search for any printing
      try {
        const query = encodeURIComponent(cardName);
        const response = await fetch(`https://api.scryfall.com/cards/search?q=${query}&order=released&dir=desc&format=json`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            // Prefer non-foil, but use any if needed
            const nonFoilCards = data.data.filter((c: ScryfallCard) => this.isNonFoil(c));
            const specialPrintings = data.data.filter((c: ScryfallCard) => 
              c.frame_effects && c.frame_effects.length > 0
            );
            
            // Priority: special non-foil > special any > non-foil > any
            const specialNonFoil = specialPrintings.filter((c: ScryfallCard) => this.isNonFoil(c));
            const selectedCard = specialNonFoil.length > 0 ? specialNonFoil[0] :
                               (specialPrintings.length > 0 ? specialPrintings[0] :
                               (nonFoilCards.length > 0 ? nonFoilCards[0] : data.data[0]));
            
            const imageUrl = this.extractImageUrl(selectedCard);
            if (imageUrl) {
              return {
                imageUrl,
                setName: selectedCard.set_name || '',
                setCode: selectedCard.set || '',
                collectorNumber: selectedCard.collector_number || '',
                price: selectedCard.prices?.usd ? parseFloat(selectedCard.prices.usd) : 0
              };
            }
          }
        }
      } catch (error) {
        // Continue
      }

      console.log(`No printings found for ${cardName} after all strategies`);
      return null;
    } catch (error) {
      console.error(`Error fetching latest printing for ${cardName}:`, error);
      return null;
    }
  }

  // Get card price from Scryfall
  static async getCardPrice(cardName: string, setName?: string, isFoil: boolean = false): Promise<number> {
    try {
      // Card names with apostrophes (like "Teferi's Protection") are handled correctly
      // encodeURIComponent properly encodes apostrophes and other special characters
      const searchQuery = setName 
        ? `name:"${cardName}" set:"${setName}"`
        : `name:"${cardName}"`;
      
      const encodedQuery = encodeURIComponent(searchQuery);
      const response = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodedQuery}&format=json`
      );

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const card = data.data[0] as ScryfallCard;
        const price = isFoil ? card.prices?.usd_foil : card.prices?.usd;
        return price ? parseFloat(price) : 0;
      }

      return 0;
    } catch (error) {
      console.error('Error fetching card price:', error);
      return 0;
    }
  }

  // Batch fetch prices for multiple cards with rate limiting
  static async getMultipleCardPrices(
    cards: Array<{name: string, set?: string, isFoil?: boolean}>,
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, number>> {
    const results = new Map<string, number>();
    // Scryfall allows 10 requests per second, so we can safely process 10 cards at a time
    const BATCH_SIZE = 10; // Process 10 cards at a time (increased from 5)
    const DELAY_BETWEEN_BATCHES = 100; // 100ms delay between batches (reduced from 200ms)
    const DELAY_BETWEEN_CARDS = 50; // 50ms delay between cards in a batch (reduced from 100ms)
    
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
      const batch = cards.slice(i, i + BATCH_SIZE);
      
      // Process batch in parallel (but limited to BATCH_SIZE)
      const batchPromises = batch.map(async (card, batchIndex) => {
        // Add small delay even within batch to be respectful
        if (batchIndex > 0) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CARDS));
        }
        
        try {
          const price = await this.getCardPrice(card.name, card.set, card.isFoil || false);
          return { name: card.name, price };
        } catch (error) {
          console.error(`Error fetching price for ${card.name}:`, error);
          return { name: card.name, price: 0 };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ name, price }) => {
        results.set(name, price);
      });
      
      // Report progress
      if (onProgress) {
        onProgress(Math.min(i + BATCH_SIZE, cards.length), cards.length);
      }
      
      // Delay between batches (except for the last batch)
      if (i + BATCH_SIZE < cards.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    console.log(`Successfully fetched ${results.size} out of ${cards.length} card prices`);
    return results;
  }

  // Batch fetch multiple cards
  static async getMultipleCardImages(
    cards: Array<{name: string, set?: string}>,
    onProgress?: (current: number, total: number) => void
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    // Process cards one at a time to be very respectful to the API
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      try {
        console.log(`Processing card ${i + 1}/${cards.length}: ${card.name}`);
        const imageUrl = await this.getCardImage(card.name, card.set);
        if (imageUrl) {
          results.set(card.name, imageUrl);
        }
      } catch (error) {
        console.error(`Error fetching image for ${card.name}:`, error);
      }

      // Report progress
      if (onProgress) {
        onProgress(i + 1, cards.length);
      }

      // Delay between each card to be respectful to the API
      if (i < cards.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Successfully fetched ${results.size} out of ${cards.length} card images`);
    return results;
  }

  // Helper method to convert set names to Scryfall set codes
  private static getSetCode(setName: string): string | null {
    const setMapping: { [key: string]: string } = {
      'Outlaws of Thunder Junction': 'otj',
      'The Brothers\' War Commander': 'brc',
      'Tarkir: Dragonstorm': 'tds',
      'Strixhaven: School of Mages': 'stx',
      'Rivals of Ixalan Promos': 'rix',
      'Breaking News': 'bn',
      'Theros': 'ths',
      'Double Masters 2022': '2x2',
      'Modern Masters 2015': 'mm2',
      'Bloomburrow': 'blb',
      'Wilds of Eldraine: Enchanting Tales': 'woe',
      'The List': 'lst',
      'Chronicles': 'chr',
      'Strixhaven Mystical Archive': 'sta',
      'Wilds of Eldraine': 'woe',
      'War of the Spark': 'war',
      'The Big Score': 'tbs',
      'Commander 2020': 'c20',
      'Planeshift': 'pls',
      'Iconic Masters': 'ima',
      'Guilds of Ravnica': 'grn',
      'Murders at Karlov Manor': 'mkm',
      'Limited Edition Alpha': 'lea',
      'Dominaria United': 'dmu'
    };

    return setMapping[setName] || null;
  }

  // Fallback search without set filter
  private static async searchCardWithoutSet(cardName: string): Promise<string> {
    try {
      const searchQuery = `name:"${cardName}"`;
      const encodedQuery = encodeURIComponent(searchQuery);
      const response = await fetch(
        `https://api.scryfall.com/cards/search?q=${encodedQuery}&format=json`
      );

      if (!response.ok) {
        return '';
      }

      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const card = data.data[0] as ScryfallCard;
        let imageUrl = '';

        if (card.image_uris?.normal) {
          imageUrl = card.image_uris.normal;
        } else if (card.image_uris?.border_crop) {
          imageUrl = card.image_uris.border_crop;
        } else if (card.image_uris?.small) {
          imageUrl = card.image_uris.small;
        } else if (card.card_faces?.[0]?.image_uris?.normal) {
          imageUrl = card.card_faces[0].image_uris.normal;
        }

        return imageUrl;
      }

      return '';
    } catch (error) {
      console.error('Error in fallback search:', error);
      return '';
    }
  }
}

