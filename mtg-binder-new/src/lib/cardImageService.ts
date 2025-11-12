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
  collector_number: string;
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

  // Get card price from Scryfall
  static async getCardPrice(cardName: string, setName?: string, isFoil: boolean = false): Promise<number> {
    try {
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

  // Batch fetch multiple cards
  static async getMultipleCardImages(cards: Array<{name: string, set?: string}>): Promise<Map<string, string>> {
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

