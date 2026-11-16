export type MediaKind = 'photo' | 'video';

export type PhotoFilter = 'original' | 'golden' | 'vintage' | 'dreamy';

export type CameraPresetId = 'overview' | 'cake' | 'gifts' | 'balloons';

export interface MemoryItem {
  id: string;
  kind: MediaKind;
  url: string;
  caption: string;
  authorName: string;
  relation: string;
  createdAt: string;
  hearts: number;
  isFeatured?: boolean;
}

export interface BirthdayWish {
  id: string;
  authorName: string;
  relation: string;
  sticker: string;
  message: string;
  createdAt: string;
  hearts: number;
  isPinned?: boolean;
}
