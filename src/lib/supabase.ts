import { createClient } from '@supabase/supabase-js';

// Direct configuration for immediate use
// Users can also override with .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cmflpwqxlflxojwyexab.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtZmxwd3F4bGZseG9qd3lleGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODAyODUsImV4cCI6MjA5MTY1NjI4NX0.avmqqAah5Eqaz0Ugd4k0IuP3bXm_8IMNQOUg0m7DqBY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication functions
export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Skip email confirmation by not sending verification email
      // This works when "Enable email confirmations" is disabled in Supabase
      options: {
        emailRedirectTo: undefined,
        captchaToken: undefined
      }
    });
    
    if (error) throw error;
    
    // Auto-confirm the user by signing them in immediately
    if (data.user) {
      await supabase.auth.signInWithPassword({
        email,
        password,
      });
      // Initialize user stats for new user
      await initializeUserStats(data.user.id);
    }
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Sign up error:', error.message);
    
    // Handle email rate limit error
    if (error.message.includes('rate limit') || error.message.includes('Email')) {
      return { 
        success: false, 
        error: 'Sign up failed: email rate limit exceeded. Disable email confirmations in the Supabase console or try again later.' 
      };
    }
    
    return { success: false, error: error.message };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    // Initialize user stats if not exists (after successful login)
    if (data.user) {
      await initializeUserStats(data.user.id);
    }
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Sign in error:', error.message);
    
    // Provide more helpful error messages
    if (error.message.includes('Invalid login credentials')) {
      return { 
        success: false, 
        error: 'Incorrect username or password, or the user is not registered yet. Please sign up first.' 
      };
    }
    
    return { success: false, error: error.message };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Sign out error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error: any) {
    return null;
  }
}

// Database functions for user data
export async function getUserStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - user has no stats yet
        return null;
      }
      throw error;
    }
    
    return data;
  } catch (error: any) {
    console.error('Get user stats error:', error.message);
    return null;
  }
}

// Initialize user stats if not exists
export async function initializeUserStats(userId: string) {
  try {
    // Check if stats already exist
    const existingStats = await getUserStats(userId);
    if (existingStats) {
      return existingStats;
    }
    
    // Create new stats record
    const { data, error } = await supabase
      .from('user_stats')
      .insert({
        user_id: userId,
        total_duration: 0,
        total_sessions: 0,
        study_duration: 0,
        study_sessions: 0,
        exercise_duration: 0,
        exercise_sessions: 0,
        grass_count: 0,
        tree_count: 0,
        elf_count: 0,
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('Initialized user stats for:', userId);
    return data;
  } catch (error: any) {
    console.error('Initialize user stats error:', error.message);
    return null;
  }
}

export async function updateUserStats(userId: string, stats: any) {
  try {
    const { data, error } = await supabase
      .from('user_stats')
      .upsert({
        user_id: userId,
        ...stats,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Update user stats error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function createFocusSession(sessionData: any) {
  try {
    const { data, error } = await supabase
      .from('focus_sessions')
      .insert([{
        user_id: sessionData.userId,
        duration: sessionData.duration,
        mode: sessionData.mode || 'study',
        completed_at: new Date().toISOString(),
      }])
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Create focus session error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getUserSessions(userId: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Get user sessions error:', error.message);
    return [];
  }
}

// Database functions for ecosystem items
export async function unlockItem(userId: string, itemType: 'grass' | 'tree' | 'elf', quantity: number = 1) {
  try {
    // Insert item unlock record first
    const { data: unlockData, error: unlockError } = await supabase
      .from('item_unlocks')
      .insert([{
        user_id: userId,
        item_type: itemType,
        quantity: quantity,
      }])
      .select()
      .single();
    
    if (unlockError) throw unlockError;
    
    // Reduce total_sessions by 3 (cost to unlock blind box)
    // This ensures sessions are cumulative and decrease when opening blind boxes
    // First get current stats
    const currentStats = await getUserStats(userId);
    if (currentStats) {
      const newTotalSessions = Math.max((currentStats.total_sessions || 0) - 3, 0);
      
      const { error: updateError } = await supabase
        .from('user_stats')
        .update({
          total_sessions: newTotalSessions,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error('Failed to reduce total_sessions:', updateError);
      }
    }
    
    // Use RPC to atomically increment the count and create user_stats if needed
    const { data, error } = await supabase.rpc('increment_item_count', {
      p_user_id: userId,
      p_item_type: itemType,
      p_quantity: quantity,
    });
    
    if (error) {
      // Fallback: Direct update if RPC doesn't exist
      // First check if user_stats exists
      const existingStats = await getUserStats(userId);
      const updateField = itemType === 'grass' ? 'grass_count' : itemType === 'tree' ? 'tree_count' : 'elf_count';
      
      if (existingStats) {
        // Update existing record
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('user_stats')
          .update({
            [updateField]: (existingStats[updateField] || 0) + quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .select()
          .single();
        
        if (fallbackError) throw fallbackError;
        return { success: true, data: fallbackData };
      } else {
        // Create new record
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('user_stats')
          .insert({
            user_id: userId,
            grass_count: itemType === 'grass' ? quantity : 0,
            tree_count: itemType === 'tree' ? quantity : 0,
            elf_count: itemType === 'elf' ? quantity : 0,
          })
          .select()
          .single();
        
        if (fallbackError) throw fallbackError;
        return { success: true, data: fallbackData };
      }
    }
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Unlock item error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getEcosystemItems(userId: string) {
  try {
    const stats = await getUserStats(userId);
    return {
      grass: stats?.grass_count || 0,
      tree: stats?.tree_count || 0,
      elf: stats?.elf_count || 0,
    };
  } catch (error: any) {
    console.error('Get ecosystem items error:', error.message);
    return { grass: 0, tree: 0, elf: 0 };
  }
}

export async function getUserItemUnlocks(userId: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('item_unlocks')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Get user item unlocks error:', error.message);
    return [];
  }
}

// Get all users with their stats
export async function getAllUsers(limit = 50) {
  try {
    console.log('Querying user_stats...');
    
    // First, get all user_stats
    const { data: statsData, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (statsError) {
      console.error('Stats query error:', statsError);
      throw statsError;
    }
    
    console.log('Raw stats data:', statsData);
    console.log('Stats data count:', statsData?.length || 0);
    
    // Create a map of user_id -> stats
    const statsMap = new Map();
    if (statsData) {
      statsData.forEach(stat => {
        statsMap.set(stat.user_id, stat);
      });
      console.log('Found user_stats records:', statsData.length);
    }
    
    // Return with user_email
    const allUsers = Array.from(statsMap.values()).map(stat => ({
      ...stat,
      user_email: `User_${stat.user_id.slice(0, 8)}`
    }));
    
    console.log('Total users to display:', allUsers.length);
    console.log('Users:', allUsers.map(u => ({ user_id: u.user_id, email: u.user_email })));
    return allUsers;
  } catch (error: any) {
    console.error('Get all users error:', error.message);
    return [];
  }
}

// Check if user has activity today
export async function hasTodayActivity(userId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();
    
    // Check focus sessions today
    const { data: sessions, error: sessionsError } = await supabase
      .from('focus_sessions')
      .select('id')
      .eq('user_id', userId)
      .gte('completed_at', todayStart)
      .limit(1);
    
    if (sessionsError) throw sessionsError;
    
    if (sessions && sessions.length > 0) {
      return true;
    }
    
    // TODO: Add exercise sessions check when available
    // For now, just check focus sessions
    
    return false;
  } catch (error: any) {
    console.error('Check today activity error:', error.message);
    return false;
  }
}

// Music disc functions
export async function unlockMusicDisc(
  userId: string, 
  discType: 'common' | 'rare' | 'legendary',
  discName: string,
  discColor: string
) {
  try {
    const { data, error } = await supabase
      .from('music_discs')
      .insert({
        user_id: userId,
        disc_type: discType,
        disc_name: discName,
        disc_color: discColor,
        is_used: false
      })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Unlock music disc error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getUserMusicDiscs(userId: string) {
  try {
    const { data, error } = await supabase
      .from('music_discs')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Get music discs error:', error.message);
    return [];
  }
}

export async function useMusicDisc(discId: string) {
  try {
    const { error } = await supabase
      .from('music_discs')
      .update({ 
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', discId);
    
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Use music disc error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function unlockSong(
  userId: string,
  songId: string,
  songName: string,
  artist: string,
  genre: string,
  duration: number
) {
  try {
    const { data, error } = await supabase
      .from('music_library')
      .insert({
        user_id: userId,
        song_id: songId,
        song_name: songName,
        artist: artist,
        genre: genre,
        duration: duration
      })
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('Unlock song error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function getUserMusicLibrary(userId: string) {
  try {
    const { data, error } = await supabase
      .from('music_library')
      .select('*')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Get music library error:', error.message);
    return [];
  }
}
