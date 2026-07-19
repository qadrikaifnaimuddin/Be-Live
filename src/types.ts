/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  bio: string;
  avatar: string;
  followers: string[]; // User IDs of followers
  following: string[]; // User IDs of following
  color?: string; // Participant color for collaborative sandbox
  passwordHash?: string; // Store password for non-Google flow
  isGoogleAccount?: boolean;
  isPrivate?: boolean;
  isAnonymousMode?: boolean;
  anonUsername?: string;
  anonBio?: string;
  anonEmoji?: string;
  anonVoicePitch?: 'high' | 'low' | 'bold' | 'light' | 'robot' | 'helium';
  allowAnonymousDMs?: boolean;
  allowNonFollowerAccess?: boolean; // private account toggle to allow sharing with non-followers
  privateAccessGrants?: { userId: string; expiresAt?: string }[]; // Specific users granted complete private section access with optional expiration
  savedPostIds?: string[]; // List of bookmarked post IDs
  avatarConfig?: any; // Custom 3D Avatar styles from AvatarStudio
  // DB-backed (previously localStorage-only)
  usernameLastChangedAt?: string | null; // ISO timestamp — enforces 30-day username lock
  nameLastChangedAt?: string | null;     // ISO timestamp — enforces 30-day name lock
  chatWallpaperPrefs?: Record<string, string>; // { [chatId]: tailwindClass } — synced to profiles table
  isEmailVerified?: boolean; // Read from Supabase Auth email_confirmed_at
}

export interface Comment {
  id: string;
  postId: string;
  username: string;
  avatar: string;
  text: string;
  createdAt: string;
  parentId?: string; // Pointer to parent comment ID for infinite nesting
  likes?: string[]; // User IDs who liked this comment
}

export interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  receiverId: string; // Can be user ID or ChatRoom ID
  text?: string;
  encryptedText?: string; // Ciphertext representation for E2EE display
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'snap' | 'audio' | 'location' | 'poll' | 'payment' | 'call'; // 'snap' is view-once, 'audio' is recorded voice, 'location' is shared gps, 'poll' is dynamic interactive poll, 'payment' is simulated digital cash, 'call' is voice/video call log
  snapViewed?: boolean; // True once opened and closed
  isE2EE: boolean;
  createdAt: string;
  isRead?: boolean;
  isDelivered?: boolean;
  deliveredAt?: string;
  readAt?: string;
  deletedBy?: string[];
  
  // Snapchat-like disappearing features
  isDisappearing?: boolean;
  disappearDuration?: number; // Duration in seconds (e.g. 10, or 86400 for 24h)
  disappearTimeLeft?: number; // Countdown for 10s disappearance
  disappeared?: boolean; // True once the countdown completes

  // Share features (Instagram-like)
  sharedPostId?: string; // Shared post info card
  sharedUserId?: string; // Shared profile info card

  // Advanced Instagram chat elements
  replyToId?: string;
  replyToText?: string;
  replyToSenderName?: string;
  reactions?: Record<string, string>; // userId -> emoji
  isPinned?: boolean;
  isForwarded?: boolean;

  // Poll fields
  pollQuestion?: string;
  pollOptions?: string[]; // e.g. ["Option 1", "Option 2"]
  pollVotes?: Record<number, string[]>; // optionIndex -> array of userIds who voted

  // Payment fields
  paymentAmount?: number;
  paymentTheme?: 'hearts' | 'sparks' | 'cyber' | 'luxe';
  paymentStatus?: 'pending' | 'claimed';

  // Doodle/Drawing canvas fields
  isDoodle?: boolean;
  doodleBg?: string; // Color or template name

  // Live Location fields
  liveLocationDuration?: number; // In minutes, e.g. 15, 60, 480
  liveLocationStatus?: 'active' | 'stopped';
  liveLocationStartedAt?: string;

  // Sticker & GIF fields
  isSticker?: boolean;
  isGif?: boolean;
}

export interface CallSession {
  id: string;
  callerId: string;
  receiverId: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'connected' | 'ended' | 'missed' | 'declined';
  isE2EE: boolean;
  duration?: number; // In seconds
}

export interface CallHistoryRecord {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  type: 'audio' | 'video';
  status: 'incoming' | 'outgoing' | 'missed' | 'declined';
  createdAt: string;
  duration?: number; // In seconds
  participants?: string[]; // List of user IDs who were in the call
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  imageUrl: string;
  caption: string;
  location?: string;
  likes: string[]; // User IDs who liked this post
  comments: Comment[];
  createdAt: string;
  visibility?: 'public' | 'private'; // 'public' or 'private' custom post-level visibility control
  sharedAccess?: { userId: string; expiresAt?: string }[]; // Specific users granted access to a private post with optional expiration
  isArchived?: boolean; // True if the post is archived by the owner
  isAnonymous?: boolean; // True if the post was created anonymously
  type?: 'help' | 'dare' | string; // Type of custom post (e.g. 'help' or 'dare')
  
  // Instagram-like tagging features
  taggedUsers?: string[]; // User IDs tagged in the post image

  // Dynamic media platform features
  mediaType?: 'image' | 'video' | 'audio' | 'link' | 'document' | 'text';
  videoUrl?: string;
  audioUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
  documentUrl?: string;
  documentTitle?: string;
  documentContent?: string;
  documentFileType?: string;
  
  // Custom text post styling fields
  textGradient?: string;
  textFont?: string;
  textAlign?: 'left' | 'center' | 'right';
  textFontSize?: string;

  // Multiple media supports (Carousels/Playlists)
  images?: string[];
  videos?: string[];
  audios?: { url: string; title: string }[];
  links?: { url: string; title: string }[];
  documents?: { url: string; title: string; content?: string; fileType: string }[];
}

export interface Story {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption?: string;
  createdAt: string; // ISO string or simple age text
  viewers: string[]; // List of user IDs who viewed this story
}

export interface Highlight {
  id: string;
  userId: string;
  title: string;
  coverUrl: string;
  storyIds: string[]; // List of story IDs in this highlight
  createdAt: string;
}

// WhatsApp / Instagram Groups & Channels
export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  type: 'group' | 'channel' | 'direct'; // Groups (all talk) or Channels (admin only)
  avatar: string;
  creatorId: string;
  members: string[]; // User IDs included
  adminIds: string[]; // Admins who can send messages in channels
  createdAt: string;
  lastMessage?: string;
  lastMessageTime?: string;
  allowAnonymous?: boolean;
  deletedBy?: string[];
  lastSeen?: string;
}

// Snapchat-like Streaks
export interface Streak {
  id: string;
  partnerId: string; // User ID of the streak partner
  count: number;
  lastInteraction: string; // ISO string
  hoursRemaining: number; // Visual countdown
  active: boolean;
}

// Real-time Notifications
export interface Notification {
  id: string;
  userId: string; // Receiver user ID
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'streak' | 'group_message' | 'channel_broadcast';
  text: string;
  createdAt: string;
  isRead: boolean;
  postId?: string; // If related to a post
  chatRoomId?: string; // If related to a group/channel
}

export interface LoungeRoomParticipant {
  userId: string;
  username: string;
  name: string;
  avatar: string;
  isMicOn: boolean;
  isCameraOn: boolean;
  isMutedByAdmin?: boolean;
  isAnonymous?: boolean;
}

export interface JoinRequest {
  userId: string;
  username: string;
  name: string;
  avatar: string;
  isAnonymous?: boolean;
}

export interface LoungeRoom {
  id: string;
  title: string;
  description?: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  privacy: 'public' | 'private';
  roomType: 'audio' | 'video' | 'both';
  participants: LoungeRoomParticipant[];
  joinRequests?: JoinRequest[];
  viewerCount: number;
  createdAt: string;
  active: boolean;
  allowAnonymous?: boolean;
  locationName?: string;
  coords?: [number, number];
}

