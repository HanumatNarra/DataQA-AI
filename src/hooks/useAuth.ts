'use client';
import { useEffect, useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/auth-helpers-nextjs';
import { UserProfile, userProfileService } from '@/lib/userProfile';

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signingOut?: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
    signingOut: false
  });
  const [initialized, setInitialized] = useState(false);
  const signingOutRef = useRef(false);

  // Use the proper Supabase client creation
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Get initial session (authoritative)
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setAuthState(prev => ({ ...prev, error: error.message, loading: false }));
          setInitialized(true);
          return;
        }

        if (session?.user) {
          // Fetch user profile
          let profile = await userProfileService.getUserProfile(session.user.id);
          
          // If profile doesn't exist, create one
          if (!profile) {
            const created = await userProfileService.createUserProfile(session.user.id, {
              full_name: session.user.user_metadata?.full_name || '',
              email: session.user.email || ''
            });
            
            if (created) {
              profile = await userProfileService.getUserProfile(session.user.id);
            }
          }
          
          // Update last login
          await userProfileService.updateLastLogin(session.user.id);
          
          setAuthState({
            user: session.user,
            profile,
            loading: false,
            error: null,
            signingOut: false
          });
        } else {
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            error: null,
            signingOut: false
          });
        }
        setInitialized(true);
      } catch (error) {
        setAuthState(prev => ({ 
          ...prev, 
          error: error instanceof Error ? error.message : 'An error occurred',
          loading: false 
        }));
        setInitialized(true);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          // Don't process auth changes if we're in the middle of signing out
          if (signingOutRef.current && event === 'SIGNED_OUT') {
            return;
          }
          
          if (session?.user) {
            let profile = await userProfileService.getUserProfile(session.user.id);
            
            // If profile doesn't exist, create one
            if (!profile) {
              const created = await userProfileService.createUserProfile(session.user.id, {
                full_name: session.user.user_metadata?.full_name || '',
                email: session.user.email || ''
              });
              
              if (created) {
                profile = await userProfileService.getUserProfile(session.user.id);
              }
            }
            
            if (event === 'SIGNED_IN') {
              await userProfileService.updateLastLogin(session.user.id);
            }
            
            setAuthState({
              user: session.user,
              profile,
              loading: false,
              error: null,
              signingOut: false
            });
          } else {
            setAuthState({
              user: null,
              profile: null,
              loading: false,
              error: null,
              signingOut: false
            });
          }
          if (!initialized) setInitialized(true);
        } catch (error) {
          console.error('[useAuth] Error in auth state change:', error);
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            error: error instanceof Error ? error.message : 'An error occurred'
          });
          if (!initialized) setInitialized(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // Remove dependency to prevent re-running

  // Cleanup signingOut ref on unmount
  useEffect(() => {
    return () => {
      signingOutRef.current = false;
    };
  }, []);

  const signOut = async () => {
    try {
      signingOutRef.current = true;
      setAuthState(prev => ({ ...prev, signingOut: true }))
      
      // Kick off both server and client sign-out in parallel and don't block UI
      const server = fetch('/api/auth/sign-out', { method: 'POST', cache: 'no-store' }).catch(() => {})
      const client = supabase.auth.signOut().catch(() => {})
      Promise.race([
        Promise.allSettled([server, client]),
        new Promise((resolve) => setTimeout(resolve, 800))
      ]).finally(() => {
        signingOutRef.current = false
        setAuthState({ user: null, profile: null, loading: false, error: null, signingOut: false })
        if (typeof window !== 'undefined') {
          // Use replace to avoid back button returning to authed page
          window.location.replace('/sign-in')
        }
      })
    } catch (error) {
      console.error('[useAuth] Unexpected error during sign out:', error);
      signingOutRef.current = false;
      setAuthState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred during sign out',
        signingOut: false
      }));
    }
  };

  const refreshProfile = async () => {
    if (authState.user) {
      const profile = await userProfileService.getUserProfile(authState.user.id);
      setAuthState(prev => ({ ...prev, profile }));
    }
  };

  return {
    ...authState,
    signOut,
    refreshProfile
  };
}
