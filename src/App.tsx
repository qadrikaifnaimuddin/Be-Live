import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import ProfileScreen from './components/ProfileScreen';
import MessagesScreen from './components/MessagesScreen';
import NotificationsPanel from './components/NotificationsPanel';
import SearchScreen from './components/SearchScreen';
import UserProfilePage from './components/UserProfilePage';
import CallOverlay from './components/CallOverlay';
import { useFollowSystem } from './lib/useFollowSystem';
import { useWebRTC, RemoteUser } from './lib/useWebRTC';
import { User, Post, Story, Highlight } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { MessageCircle, User as UserIcon, Bell, Search } from 'lucide-react';

type AppTab = 'profile' | 'search' | 'messages' | 'notifications';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [googleSignupSession, setGoogleSignupSession] = useState<{ id: string; email: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('profile');
  const [activeChatUserId, setActiveChatUserId] = useState<string | undefined>(undefined);
  const [isChatActive, setIsChatActive] = useState(false);

  const handleCallStart = async (info: { remoteUserId: string; callType: 'audio' | 'video' }) => {
    if (!currentUser || !isSupabaseConfigured || !supabase) return;
    try {
      // Find or create direct room
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('id, name, type, avatar, members, last_message, last_message_time, creator_id, admin_ids, allow_anonymous, description, created_at')
        .eq('type', 'direct')
        .contains('members', [currentUser.id]);

      let roomId: string | null = null;
      const foundRoom = rooms?.find(r => r.members && r.members.includes(info.remoteUserId));
      if (foundRoom) {
        roomId = foundRoom.id;
      } else {
        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('username, name, avatar')
          .eq('id', info.remoteUserId)
          .maybeSingle();

        const otherName = otherProfile ? (otherProfile.name || `@${otherProfile.username}`) : 'Direct Message';
        const otherAvatar = otherProfile?.avatar || '';
        const { data: newRoom } = await supabase
          .from('chat_rooms')
          .insert({
            name: otherName,
            type: 'direct',
            avatar: otherAvatar,
            creator_id: currentUser.id,
            members: [currentUser.id, info.remoteUserId],
            admin_ids: [currentUser.id, info.remoteUserId],
            allow_anonymous: false,
            description: `@${otherProfile?.username || ''}`
          })
          .select()
          .single();
        if (newRoom) roomId = newRoom.id;
      }

      const callIcon = info.callType === 'video' ? '📹' : '📞';
      const label = info.callType === 'video' ? 'Video Call' : 'Voice Call';
      await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: info.remoteUserId,
        room_id: roomId,
        text: `${callIcon} ${label} Started`,
        media_type: 'call',
        is_read: true,
        is_delivered: true
      });
    } catch (e) {
      console.error('Failed to log call start:', e);
    }
  };

  const handleCallEnd = async (record: any) => {
    if (!currentUser || !isSupabaseConfigured || !supabase) return;
    try {
      // 1. Log to call_history
      await supabase.from('call_history').insert({
        caller_id: record.status === 'outgoing' || record.status === 'completed' || record.status === 'declined' ? currentUser.id : record.remoteUserId,
        receiver_id: record.status === 'outgoing' || record.status === 'completed' || record.status === 'declined' ? record.remoteUserId : currentUser.id,
        call_type: record.callType,
        status: record.status,
        duration: record.duration,
      });

      // 2. Find room ID
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('id, name, type, avatar, members, last_message, last_message_time, creator_id, admin_ids, allow_anonymous, description, created_at')
        .eq('type', 'direct')
        .contains('members', [currentUser.id]);

      const foundRoom = rooms?.find(r => r.members && r.members.includes(record.remoteUserId));
      if (foundRoom) {
        const callIcon = record.callType === 'video' ? '📹' : '📞';
        const label = record.callType === 'video' ? 'Video Call' : 'Voice Call';
        const durationText = record.duration > 0
          ? `${Math.floor(record.duration / 60)}m ${record.duration % 60}s`
          : '';
        const endStatus = record.status === 'missed' ? 'Missed' : record.status === 'declined' ? 'Declined' : 'Ended';
        
        let text = `${callIcon} ${label} ${endStatus}`;
        if (durationText) text += ` - Duration: ${durationText}`;

        await supabase.from('messages').insert({
          sender_id: currentUser.id,
          receiver_id: record.remoteUserId,
          room_id: foundRoom.id,
          text,
          media_type: 'call',
          is_read: true,
          is_delivered: true
        });
      }
    } catch (e) {
      console.error('Failed to log call end:', e);
    }
  };

  // Follow system — Supabase-backed, Realtime
  const followSystem = useFollowSystem(currentUser?.id ?? null);

  // WebRTC call system — pass full user so caller info is in the offer payload
  const webRTC = useWebRTC(currentUser ? {
    id: currentUser.id,
    name: currentUser.name,
    username: currentUser.username,
    avatar: currentUser.avatar,
  } : null, handleCallEnd, handleCallStart);

  // Build a RemoteUser object from a User for outgoing calls
  const makeRemoteUser = (u: User): RemoteUser => ({
    id: u.id,
    name: u.name,
    username: u.username,
    avatar: u.avatar,
  });

  const handleStartCall = (targetUser: User, type: 'audio' | 'video') => {
    webRTC.startCall(makeRemoteUser(targetUser), type);
  };

  // ProfileScreen states
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  // 1. Initial State restoration from localStorage or Supabase
  useEffect(() => {
    const storedCurrentUser = localStorage.getItem('be_live_current_user');
    if (storedCurrentUser) {
      try {
        const parsed = JSON.parse(storedCurrentUser);
        if (parsed) {
          if (!parsed.followers) parsed.followers = [];
          if (!parsed.following) parsed.following = [];
        }
        setCurrentUser(parsed);
      } catch (e) {
        console.error('Failed to parse current user:', e);
        localStorage.removeItem('be_live_current_user');
      }
    }

    const storedGoogleSession = localStorage.getItem('google_signup_session');
    if (storedGoogleSession) {
      try {
        setGoogleSignupSession(JSON.parse(storedGoogleSession));
      } catch (e) {
        console.error('Failed to parse google session:', e);
      }
    }

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('id, username, email, name, bio, avatar, color, is_private, is_anonymous_mode, avatar_config, username_last_changed_at, name_last_changed_at, chat_wallpaper_prefs')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profile) {
              const loggedUser: User = {
                id: profile.id,
                username: profile.username,
                email: profile.email || '',
                name: profile.name || '',
                bio: profile.bio || '',
                avatar: profile.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.username}`,
                color: profile.color || '#C4B99D',
                isPrivate: profile.is_private || false,
                isAnonymousMode: profile.is_anonymous_mode || false,
                avatarConfig: profile.avatar_config || null,
                usernameLastChangedAt: profile.username_last_changed_at || null,
                nameLastChangedAt: profile.name_last_changed_at || null,
                chatWallpaperPrefs: profile.chat_wallpaper_prefs || {},
                isEmailVerified: !!session.user.email_confirmed_at,
                followers: [],
                following: []
              };
              setCurrentUser(loggedUser);
              localStorage.setItem('be_live_current_user', JSON.stringify(loggedUser));
              localStorage.removeItem('google_signup_session');
              setGoogleSignupSession(null);
            } else {
              const oauthMode = localStorage.getItem('google_oauth_mode') || 'signup';
              localStorage.removeItem('google_oauth_mode');

              if (oauthMode === 'signin') {
                await supabase.auth.signOut();
                setCurrentUser(null);
                localStorage.removeItem('be_live_current_user');
                localStorage.setItem('oauth_error', 'No account found with this Google email. Please register first.');
                window.location.reload();
              } else {
                const sessionDetails = {
                  id: session.user.id,
                  email: session.user.email || '',
                  name: session.user.user_metadata?.full_name || 'New Creator'
                };
                localStorage.setItem('google_signup_session', JSON.stringify(sessionDetails));
                setGoogleSignupSession(sessionDetails);
              }
            }
          } catch (err) {
            console.error('[Supabase Auth Change Error]:', err);
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Update last_seen timestamp periodically to show active status
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !currentUser?.id) return;

    const updateLastSeen = async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', currentUser.id);
      } catch (err) {
        console.error('Failed to update last_seen:', err);
      }
    };

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 20000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // Load stories and highlights from Supabase
  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured || !supabase) return;

    const loadStoriesAndHighlights = async () => {
      try {
        // Fetch active stories (within 24 hours) or fetch all to allow highlights archival creation
        const { data: storiesData } = await supabase
          .from('stories')
          .select('*, profiles(username, avatar)')
          .order('created_at', { ascending: false });

        if (storiesData) {
          setStories(
            storiesData.map((s: any) => ({
              id: s.id,
              userId: s.user_id,
              username: s.profiles?.username || 'user',
              userAvatar: s.profiles?.avatar || '',
              mediaUrl: s.media_url,
              mediaType: s.media_type,
              caption: s.caption || '',
              createdAt: s.created_at,
              viewers: s.viewers || [],
            }))
          );
        }

        // Fetch story highlights
        const { data: highlightsData } = await supabase
          .from('story_highlights')
          .select('*')
          .eq('user_id', currentUser.id);

        if (highlightsData) {
          setHighlights(
            highlightsData.map((h: any) => ({
              id: h.id,
              userId: h.user_id,
              title: h.title,
              coverUrl: h.cover_url || '',
              storyIds: h.story_ids || [],
              createdAt: new Date(h.created_at).toLocaleDateString(),
            }))
          );
        }
      } catch (err) {
        console.error('[loadStoriesAndHighlights Error]:', err);
      }
    };

    loadStoriesAndHighlights();
  }, [currentUser?.id]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('be_live_current_user', JSON.stringify(user));
  };

  const handleRegisterUser = (_user: User) => {
    // Supabase handles persistence
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    localStorage.removeItem('be_live_current_user');
    localStorage.removeItem('google_signup_session');
    setGoogleSignupSession(null);
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').delete().eq('id', currentUser.id);
        await supabase.auth.signOut();
      } catch (err) {
        console.error('[Account Deletion Error]:', err);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem('be_live_current_user');
    localStorage.removeItem('google_signup_session');
    setGoogleSignupSession(null);
  };

  // ProfileScreen Handlers
  const handleAddHighlight = async (title: string, coverUrl: string, storyIds: string[]) => {
    if (!currentUser) return;
    const tempId = `highlight_${Date.now()}`;
    const newHighlight: Highlight = {
      id: tempId,
      userId: currentUser.id,
      title,
      coverUrl,
      storyIds,
      createdAt: 'Just now'
    };
    setHighlights(prev => [newHighlight, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('story_highlights')
          .insert({
            user_id: currentUser.id,
            title,
            cover_url: coverUrl,
            story_ids: storyIds
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setHighlights(prev => prev.map(h => h.id === tempId ? {
            ...h,
            id: data.id,
            createdAt: new Date(data.created_at).toLocaleDateString()
          } : h));
        }
      } catch (err) {
        console.error('[handleAddHighlight Error]:', err);
      }
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    setStories(prev => prev.filter(s => s.id !== storyId));

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('stories')
          .delete()
          .eq('id', storyId);
        if (error) throw error;
      } catch (err) {
        console.error('[handleDeleteStory Error]:', err);
      }
    }
  };

  const handleUpdateHighlight = async (updatedHighlight: Highlight) => {
    setHighlights(prev => prev.map(h => h.id === updatedHighlight.id ? updatedHighlight : h));

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('story_highlights')
          .update({
            title: updatedHighlight.title,
            cover_url: updatedHighlight.coverUrl,
            story_ids: updatedHighlight.storyIds
          })
          .eq('id', updatedHighlight.id);
        if (error) throw error;
      } catch (err) {
        console.error('[handleUpdateHighlight Error]:', err);
      }
    }
  };

  const handleAddStory = async (mediaUrl: string, mediaType: 'image' | 'video', caption: string = '') => {
    if (!currentUser) return;
    const tempId = `story_${Date.now()}`;
    const expiresAtDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const newStory: Story = {
      id: tempId,
      userId: currentUser.id,
      username: currentUser.username,
      userAvatar: currentUser.avatar,
      mediaUrl,
      mediaType,
      caption,
      createdAt: new Date().toISOString(),
      viewers: []
    };
    setStories(prev => [newStory, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('stories')
          .insert({
            user_id: currentUser.id,
            media_url: mediaUrl,
            media_type: mediaType,
            caption: caption,
            expires_at: expiresAtDate.toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setStories(prev => prev.map(s => s.id === tempId ? {
            ...s,
            id: data.id,
            createdAt: data.created_at,
            expiresAt: data.expires_at
          } : s));
        }
      } catch (err) {
        console.error('[handleAddStory Error]:', err);
      }
    }
  };

  const handleToggleFollow = async (targetUserId: string) => {
    if (!currentUser) return;
    if (followSystem.isFollowing(targetUserId)) {
      await followSystem.unfollow(targetUserId);
    } else {
      // Determine if target is private — fetch from DB
      let targetIsPrivate = false;
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.from('profiles').select('is_private').eq('id', targetUserId).maybeSingle();
        targetIsPrivate = data?.is_private ?? false;
      }
      await followSystem.follow(targetUserId, targetIsPrivate);
    }
  };

  const handleUpdateProfile = async (
    name: string,
    bio: string,
    avatar: string,
    username?: string,
    passwordHash?: string,
    email?: string,
    isPrivate?: boolean,
    allowAnonymousDMs?: boolean
  ) => {
    if (!currentUser) return;
    const updatedUser = {
      ...currentUser,
      name,
      bio,
      avatar,
      username: username || currentUser.username,
      email: email || currentUser.email,
      isPrivate: isPrivate !== undefined ? isPrivate : currentUser.isPrivate,
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('be_live_current_user', JSON.stringify(updatedUser));

    if (isSupabaseConfigured && supabase) {
      const dbPayload: Record<string, any> = {
        name: updatedUser.name,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar,
        username: updatedUser.username,
        is_private: updatedUser.isPrivate,
      };
      if (updatedUser.avatarConfig !== undefined)
        dbPayload.avatar_config = updatedUser.avatarConfig;
      // Persist lock timestamps if present
      if (updatedUser.usernameLastChangedAt !== undefined)
        dbPayload.username_last_changed_at = updatedUser.usernameLastChangedAt;
      if (updatedUser.nameLastChangedAt !== undefined)
        dbPayload.name_last_changed_at = updatedUser.nameLastChangedAt;
      // Persist wallpaper prefs if present
      if (updatedUser.chatWallpaperPrefs !== undefined)
        dbPayload.chat_wallpaper_prefs = updatedUser.chatWallpaperPrefs;

      const { error } = await supabase.from('profiles').update(dbPayload).eq('id', updatedUser.id);
      if (error) console.error('[Supabase Profile Update Error]:', error.message);
    }
  };

  const handleUpdateProfileSettings = (updatedFields: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updatedFields };
    setCurrentUser(updatedUser);
    localStorage.setItem('be_live_current_user', JSON.stringify(updatedUser));

    // Persist select fields to DB immediately (wallpapers, lock times, avatar config)
    if (isSupabaseConfigured && supabase) {
      const dbFields: Record<string, any> = {};
      if (updatedFields.avatar !== undefined)
        dbFields.avatar = updatedFields.avatar;
      if (updatedFields.avatarConfig !== undefined)
        dbFields.avatar_config = updatedFields.avatarConfig;
      if (updatedFields.chatWallpaperPrefs !== undefined)
        dbFields.chat_wallpaper_prefs = updatedFields.chatWallpaperPrefs;
      if (updatedFields.usernameLastChangedAt !== undefined)
        dbFields.username_last_changed_at = updatedFields.usernameLastChangedAt;
      if (updatedFields.nameLastChangedAt !== undefined)
        dbFields.name_last_changed_at = updatedFields.nameLastChangedAt;
      if (updatedFields.isAnonymousMode !== undefined)
        dbFields.is_anonymous_mode = updatedFields.isAnonymousMode;

      if (Object.keys(dbFields).length > 0) {
        supabase.from('profiles').update(dbFields).eq('id', currentUser.id)
          .then(({ error }) => { if (error) console.error('[Supabase Settings Update]:', error.message); });
      }
    }
  };

  const handleLikePost = (postId: string) => {
    if (!currentUser) return;
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = post.likes.includes(currentUser.id);
        const updatedLikes = isLiked
          ? post.likes.filter(id => id !== currentUser.id)
          : [...post.likes, currentUser.id];
        return { ...post, likes: updatedLikes };
      }
      return post;
    }));
  };

  const handleAddComment = (postId: string, text: string, parentId?: string) => {
    if (!currentUser) return;
    const newComment = {
      id: `comment_${Date.now()}`,
      postId,
      username: currentUser.username,
      avatar: currentUser.avatar,
      text,
      createdAt: 'Just now',
      parentId,
      likes: []
    };
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return { ...post, comments: [...(post.comments || []), newComment] };
      }
      return post;
    }));
  };

  // Navigate to messages and open a specific DM
  const handleOpenDM = (userId: string) => {
    localStorage.setItem('be_live_active_dm_target', userId);
    setActiveChatUserId(userId);
    setActiveTab('messages');
  };

  // Use as string to prevent TypeScript over-narrowing in JSX
  const tab: string = activeTab;

  const navigate = useNavigate();

  const handleOpenDMAndNavigate = (userId: string) => {
    handleOpenDM(userId);
    navigate('/');
  };

  const mainApp = (
    <div className="min-h-screen bg-[#070605] text-stone-100 font-sans selection:bg-[#C4B99D] selection:text-stone-950">
      {!currentUser ? (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onRegisterUser={handleRegisterUser}
          googleSignupSession={googleSignupSession}
          onClearGoogleSignupSession={() => setGoogleSignupSession(null)}
        />
      ) : (
        <div className="relative flex flex-col min-h-screen">
          {/* ── Screens ── */}
          <div className="flex-1 pb-16">
            {activeTab === 'profile' && (
              <ProfileScreen
                user={currentUser}
                currentUser={currentUser}
                posts={[]}
                stories={stories}
                highlights={highlights}
                onAddHighlight={handleAddHighlight}
                onDeleteStory={handleDeleteStory}
                onUpdateHighlight={handleUpdateHighlight}
                onAddStory={handleAddStory}
                onToggleFollow={handleToggleFollow}
                onUpdateProfile={handleUpdateProfile}
                onUpdateProfileSettings={handleUpdateProfileSettings}
                onLogout={handleLogout}
                onDeleteAccount={handleDeleteAccount}
                onOpenMessages={handleOpenDM}
              />
            )}

            {activeTab === 'search' && currentUser && (
              <SearchScreen
                currentUser={currentUser}
                isFollowing={followSystem.isFollowing}
                hasPendingRequest={followSystem.hasPendingRequest}
                onFollow={followSystem.follow}
                onUnfollow={followSystem.unfollow}
                onOpenDM={handleOpenDM}
                onClose={() => setActiveTab('profile')}
              />
            )}

            {activeTab === 'messages' && (
              <MessagesScreen
                currentUser={currentUser}
                onViewProfile={async (userId, username) => {
                  if (username) {
                    navigate(`/${username}`);
                  } else {
                    const { data } = await supabase
                      .from('profiles')
                      .select('username')
                      .eq('id', userId)
                      .maybeSingle();
                    if (data?.username) {
                      navigate(`/${data.username}`);
                    }
                  }
                }}
                onActiveChatChange={setIsChatActive}
                activeChatUserId={activeChatUserId}
                onClearActiveChatUser={() => setActiveChatUserId(undefined)}
                onStartCall={handleStartCall}
              />
            )}

            {activeTab === 'notifications' && (
              <div className="min-h-screen">
                <NotificationsPanel
                  notifications={followSystem.notifications}
                  incomingRequests={followSystem.incomingRequests}
                  unreadCount={followSystem.unreadCount}
                  onAcceptRequest={followSystem.acceptRequest}
                  onRejectRequest={followSystem.rejectRequest}
                  onMarkRead={followSystem.markNotificationsRead}
                  onViewProfile={(userId) => {
                    setActiveTab('profile');
                  }}
                />
              </div>
            )}
          </div>

          {/* ── Bottom Navigation ── */}
          {!(activeTab === 'messages' && isChatActive) && tab !== 'search' && (
            <nav className="fixed bottom-0 left-0 right-0 z-20 bg-stone-950/95 border-t border-stone-900 backdrop-blur-lg">
              <div className="flex items-center justify-around py-2 max-w-lg mx-auto">

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all cursor-pointer ${activeTab === 'profile' ? 'text-stone-100' : 'text-stone-600 hover:text-stone-400'}`}
                >
                  <div className={`p-2 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-stone-800' : ''}`}>
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
                </button>

                <button
                  onClick={() => setActiveTab('search')}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all cursor-pointer ${tab === 'search' ? 'text-emerald-400' : 'text-stone-600 hover:text-stone-400'}`}
                >
                  <div className={`p-2 rounded-xl transition-all ${tab === 'search' ? 'bg-emerald-500/20' : ''}`}>
                    <Search className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Search</span>
                </button>

                <button
                  onClick={() => setActiveTab('messages')}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all cursor-pointer ${activeTab === 'messages' ? 'text-violet-400' : 'text-stone-600 hover:text-stone-400'}`}
                >
                  <div className={`p-2 rounded-xl transition-all ${activeTab === 'messages' ? 'bg-violet-500/20' : ''}`}>
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Messages</span>
                </button>

                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all cursor-pointer relative ${activeTab === 'notifications' ? 'text-amber-400' : 'text-stone-600 hover:text-stone-400'}`}
                >
                  <div className={`relative p-2 rounded-xl transition-all ${activeTab === 'notifications' ? 'bg-amber-500/20' : ''}`}>
                    <Bell className="w-5 h-5" />
                    {followSystem.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {followSystem.unreadCount > 99 ? '99+' : followSystem.unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Activity</span>
                </button>

              </div>
            </nav>
          )}
        </div>
      )}

      {/* ── Global Call Overlay — renders over every screen ── */}
      <CallOverlay
        state={webRTC.state}
        localVideoRef={webRTC.localVideoRef}
        remoteVideoRef={webRTC.remoteVideoRef}
        onAccept={webRTC.acceptCall}
        onReject={webRTC.rejectCall}
        onEnd={webRTC.endCall}
        onToggleMute={webRTC.toggleMute}
        onToggleVideo={webRTC.toggleVideo}
        onToggleSpeaker={webRTC.toggleSpeaker}
        onFlipCamera={webRTC.flipCamera}
        onShareScreen={webRTC.shareScreen}
        onUpgradeToVideo={webRTC.upgradeToVideo}
      />
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={mainApp} />
      <Route
        path="/:username"
        element={
          <UserProfilePage
            currentUser={currentUser}
            isFollowing={followSystem.isFollowing}
            hasPendingRequest={followSystem.hasPendingRequest}
            onFollow={followSystem.follow}
            onUnfollow={followSystem.unfollow}
            onOpenDM={handleOpenDMAndNavigate}
          />
        }
      />
    </Routes>
  );

}
