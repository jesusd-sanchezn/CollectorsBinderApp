// User and Authentication types
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: Date;
}

// Binder and Collection types
export interface Binder {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  pages: BinderPage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BinderPage {
  id: string;
  pageNumber: number;
  slots: BinderSlot[];
}

export interface BinderSlot {
  id: string;
  position: number; // 0-8 for 3x3 grid
  card?: Card;
  isEmpty: boolean;
}

// Card types
export interface Card {
  id: string;
  name: string;
  set: string;
  setCode: string;
  collectorNumber: string;
  imageUrl: string;
  price?: number;
  rarity: string;
  condition: 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';
  finish: 'nonfoil' | 'foil' | 'etched';
  quantity: number;
  notes?: string;
}

// Friend and Social types
export interface Friend {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
}

// Trade types
export interface Trade {
  id: string;
  initiatorId: string;
  recipientId: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  wants: TradeItem[];
  offers: TradeItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TradeItem {
  id: string;
  cardId: string;
  card: Card;
  quantity: number;
  notes?: string;
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  MyBinders: undefined;
  BinderView: { binderId: string; ownerId: string; ownerName: string };
  Friends: undefined;
  FriendBinders: { friendId: string; friendName: string };
  Trade: { tradeId: string };
};
