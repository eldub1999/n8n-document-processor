import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw new Error(`Error signing in: ${error.message}`);
  }
  
  return data;
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    throw new Error(`Error signing up: ${error.message}`);
  }
  
  return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(`Error signing out: ${error.message}`);
  }
}

/**
 * Get the current session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    throw new Error(`Error getting session: ${error.message}`);
  }
  
  return data.session;
}

/**
 * Get the current user
 */
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  
  if (error) {
    throw new Error(`Error getting user: ${error.message}`);
  }
  
  return data.user;
}

/**
 * Request a password reset for the given email
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  
  if (error) {
    throw new Error(`Error requesting password reset: ${error.message}`);
  }
}

/**
 * Update the password for the current user
 */
export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({
    password,
  });
  
  if (error) {
    throw new Error(`Error updating password: ${error.message}`);
  }
} 