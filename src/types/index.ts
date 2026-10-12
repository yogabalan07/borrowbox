export type Category = 
  | 'textbooks'
  | 'electronics'
  | 'lab_gear'
  | 'creative'
  | 'outdoors'
  | 'sports'
  | 'miscellaneous';

export type ItemCondition = 'like_new' | 'good' | 'fair';

export type ItemLendingMode = 'free' | 'rent';

export interface User {
  id: string;
  name: string;
  email: string;
  college: string;
  department: string;
  yearOfStudy: string; // e.g. "Junior (3rd Year)"
  avatarUrl: string;
  bio?: string;
  phone?: string;
  rating: number; // e.g. 4.9
  reviewCount: number;
  isVerified: boolean;
  isAdmin: boolean;
  joinedDate: string;
}

export type UserPreview = Pick<User, 'id' | 'name' | 'college' | 'department' | 'yearOfStudy' | 'avatarUrl' | 'rating' | 'reviewCount' | 'isVerified'>;

export interface Item {
  id: string;
  title: string;
  description: string;
  category: Category;
  condition: ItemCondition;
  lendingMode: ItemLendingMode;
  dailyPrice: number; // 0 for free
  deposit: number; // optional deposit amount (0 if none)
  pickupLocation: string; // e.g. "Green Library East Wing" or "FroSoCo Common Room"
  images: string[];
  ownerId: string;
  owner: UserPreview;
  isAvailable: boolean;
  minBorrowDays: number;
  maxBorrowDays: number;
  guidelines?: string;
  createdAt: string;
  updatedAt: string;
}

export type BorrowRequestStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'return_pending'
  | 'overdue'
  | 'returned'
  | 'cancelled';

export interface BorrowRequest {
  id: string;
  itemId: string;
  item: Item;
  borrowerId: string;
  borrower: UserPreview;
  ownerId: string;
  owner: UserPreview;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  dailyPrice: number;
  deposit: number;
  estimatedTotal: number; // dailyPrice * totalDays
  message: string;
  status: BorrowRequestStatus;
  pickupLocation: string;
  handoverConfirmedAt?: string;
  returnedConfirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  otherParticipant: UserPreview;
  itemId?: string;
  itemTitle?: string;
  lastMessage?: {
    text: string;
    timestamp: string;
    senderId: string;
  };
  unreadCount: number;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'request' | 'approval' | 'return' | 'message' | 'system';
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface ReportedItem {
  id: string;
  itemId: string;
  itemTitle: string;
  reason: string;
  reporterName: string;
  reporterCollege: string;
  reportedAt: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface AdminStats {
  totalUsers: number;
  totalListings: number;
  activeLoans: number;
  completedLoans: number;
  pendingModerations: number;
  totalSavingsGenerated: number;
}
