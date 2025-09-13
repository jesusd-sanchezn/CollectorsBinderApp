export type Visibility = 'friends' | 'private';


export interface UserProfile {
id: string;
handle: string;
name: string;
avatarUrl?: string;
friends: string[];
settings: { pushEnabled: boolean; showPrices: boolean };
}


export interface Slot { row: number; col: number; collectionItemId?: string; }
export interface Page { index: number; slots: Slot[]; }
export interface Binder {
id: string;
ownerId: string;
name: string;
visibility: Visibility;
pageCount: number;
pages: Page[];
}


export type Finish = 'nonfoil' | 'foil' | 'etched';
export type Condition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG';


export interface CollectionItem {
id: string;
ownerId: string;
scryfall: {
id: string; // printing UUID
oracleId: string;
set: string;
collectorNumber: string;
name: string;
imageUri?: string;
colorIdentity: ('W'|'U'|'B'|'R'|'G')[];
legality: Record<string,string>;
};
printing: { finish: Finish; language: string; condition: Condition };
qty: number;
tradable: boolean;
tags?: string[];
price?: { latest: number|null; currency: 'USD' };
}