import { createClient } from '@supabase/supabase-js';
import type {
  DBSession,
  DBRobotModel,
  DBTrack,
  DBCodeSnapshot
} from '@/types';

// Supabase configuration
// Replace these with your actual Supabase project credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============ DATABASE OPERATIONS ============

/**
 * Save a robot model to the database
 */
export async function saveRobotModel(robotModel: Omit<DBRobotModel, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('robot_models')
    .insert([robotModel])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user's robot models
 */
export async function getUserRobotModels(userId: string) {
  const { data, error } = await supabase
    .from('robot_models')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Save a simulation session
 */
export async function saveSession(session: Omit<DBSession, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('sessions')
    .insert([session])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a simulation session
 */
export async function updateSession(sessionId: string, updates: Partial<DBSession>) {
  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user's simulation sessions
 */
export async function getUserSessions(userId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      robot_models (name, thumbnail_url),
      tracks (season)
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Save code snapshot
 */
export async function saveCodeSnapshot(snapshot: Omit<DBCodeSnapshot, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('code_snapshots')
    .insert([snapshot])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get available tracks
 */
export async function getTracks() {
  const { data, error } = await supabase
    .from('tracks')
    .select('*')
    .order('season', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return data;
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}
