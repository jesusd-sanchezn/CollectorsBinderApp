// Helper function to get country flag emoji from country name
// This is a simplified mapping - for production, consider using a library like country-flag-icons
export const getCountryFlag = (countryName?: string): string => {
  if (!countryName) return '';
  
  // Normalize country name (trim and make case-insensitive lookup)
  const normalizedName = countryName.trim();
  
  // Map country names to flag emojis (case-sensitive for exact matches)
  const countryToFlag: Record<string, string> = {
    'United States': '🇺🇸',
    'Canada': '🇨🇦',
    'United Kingdom': '🇬🇧',
    'Australia': '🇦🇺',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'Italy': '🇮🇹',
    'Spain': '🇪🇸',
    'Netherlands': '🇳🇱',
    'Belgium': '🇧🇪',
    'Switzerland': '🇨🇭',
    'Austria': '🇦🇹',
    'Sweden': '🇸🇪',
    'Norway': '🇳🇴',
    'Denmark': '🇩🇰',
    'Finland': '🇫🇮',
    'Poland': '🇵🇱',
    'Portugal': '🇵🇹',
    'Greece': '🇬🇷',
    'Ireland': '🇮🇪',
    'Czech Republic': '🇨🇿',
    'Hungary': '🇭🇺',
    'Romania': '🇷🇴',
    'Bulgaria': '🇧🇬',
    'Croatia': '🇭🇷',
    'Serbia': '🇷🇸',
    'Slovakia': '🇸🇰',
    'Slovenia': '🇸🇮',
    'Lithuania': '🇱🇹',
    'Latvia': '🇱🇻',
    'Estonia': '🇪🇪',
    'Japan': '🇯🇵',
    'China': '🇨🇳',
    'South Korea': '🇰🇷',
    'India': '🇮🇳',
    'Indonesia': '🇮🇩',
    'Philippines': '🇵🇭',
    'Thailand': '🇹🇭',
    'Vietnam': '🇻🇳',
    'Malaysia': '🇲🇾',
    'Singapore': '🇸🇬',
    'Brazil': '🇧🇷',
    'Mexico': '🇲🇽',
    'Argentina': '🇦🇷',
    'Chile': '🇨🇱',
    'Colombia': '🇨🇴',
    'Peru': '🇵🇪',
    'Venezuela': '🇻🇪',
    'Ecuador': '🇪🇨',
    'Uruguay': '🇺🇾',
    'Paraguay': '🇵🇾',
    'Bolivia': '🇧🇴',
    'Russia': '🇷🇺',
    'Ukraine': '🇺🇦',
    'Turkey': '🇹🇷',
    'Saudi Arabia': '🇸🇦',
    'United Arab Emirates': '🇦🇪',
    'Israel': '🇮🇱',
    'Egypt': '🇪🇬',
    'South Africa': '🇿🇦',
    'Nigeria': '🇳🇬',
    'Kenya': '🇰🇪',
    'Morocco': '🇲🇦',
    'Algeria': '🇩🇿',
    'Tunisia': '🇹🇳',
    'New Zealand': '🇳🇿',
    'Iceland': '🇮🇸',
    'Luxembourg': '🇱🇺',
    'Monaco': '🇲🇨',
    'Liechtenstein': '🇱🇮',
    'Malta': '🇲🇹',
    'Cyprus': '🇨🇾',
    'Andorra': '🇦🇩',
    'San Marino': '🇸🇲',
    'Vatican City': '🇻🇦',
  };
  
  // Try exact match first
  if (countryToFlag[normalizedName]) {
    return countryToFlag[normalizedName];
  }
  
  // Try case-insensitive match
  const lowerName = normalizedName.toLowerCase();
  for (const [key, value] of Object.entries(countryToFlag)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  
  // No match found
  console.log(`No flag found for country: "${countryName}"`);
  return '';
};

