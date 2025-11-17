// Utility function to format dates as yyyy-mm-dd
export const formatDate = (timestamp: any): string => {
  if (!timestamp) return 'Recently';
  
  try {
    let date: Date;
    
    // If it's a Firebase timestamp, convert it to Date
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    }
    // If it's already a Date object
    else if (timestamp instanceof Date) {
      date = timestamp;
    }
    // If it's a number (milliseconds)
    else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    }
    else {
      return 'Recently';
    }
    
    // Format as yyyy-mm-dd
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Recently';
  }
};

