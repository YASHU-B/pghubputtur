import { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sync auth user with Supabase users table (if additional profile data is needed)
    const syncUserToUsersTable = async (authUser, extraData = {}) => {
        if (!authUser) return null;

        const userData = {
            id: authUser.id,
            email: authUser.email,
            name: extraData.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
            role: extraData.role || 'owner',
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('users')
            .upsert(userData, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error('Error syncing user to Supabase:', error);
            return userData;
        }
        return data;
    };

    const fetchUserProfile = async (authUser) => {
        if (!authUser) return null;
        
        let { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
            
        // If the user doesn't exist in the 'users' table yet
        if (error && error.code === 'PGRST116') {
            profile = await syncUserToUsersTable(authUser);
        }

        // Calculate subscription/trial status
        let isSubscribed = profile?.subscription_status === 'active';
        let trialDaysLeft = 0;
        let isTrial = false;

        if (profile?.created_at) {
            const createdAt = new Date(profile.created_at);
            const now = new Date();
            const diffTime = now - createdAt;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            trialDaysLeft = Math.max(0, 30 - diffDays);
            
            if (isSubscribed) {
                isTrial = false;
            } else if (trialDaysLeft > 0) {
                isTrial = true;
                isSubscribed = true; // Still allow access during trial
            }
        }
            
        return {
            uid: authUser.id,
            email: authUser.email,
            displayName: authUser.user_metadata?.full_name || profile?.name,
            photoURL: authUser.user_metadata?.avatar_url,
            dbError: error && error.code !== 'PGRST116' ? error : null,
            isSubscribed,
            isTrial,
            trialDaysLeft,
            ...profile,
        };
    };

    useEffect(() => {
        let isMounted = true;
        let isInitialized = false;
        console.log("AuthContext: Initializing session...");
        
        // Safety timeout: force loading to false after 5 seconds max if it gets stuck
        const loadingTimeout = setTimeout(() => {
            if (isMounted && !isInitialized) {
                console.warn("AuthContext: Loading timed out, forcing false");
                setLoading(false);
            }
        }, 5000);

        const init = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (session?.user && isMounted) {
                    console.log("AuthContext: Active session found on init, fetching profile...");
                    const profileData = await fetchUserProfile(session.user);
                    if (isMounted) {
                        setUser(profileData);
                    }
                } else if (isMounted) {
                    console.log("AuthContext: No active session found on init");
                    setUser(null);
                }
            } catch (err) {
                console.error("AuthContext: Error during initialization:", err);
            } finally {
                if (isMounted) {
                    isInitialized = true;
                    setLoading(false);
                    clearTimeout(loadingTimeout);
                }
            }
        };

        init();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("AuthContext: onAuthStateChange event:", event, session ? "Session active" : "No session");
            
            // Avoid overriding init()'s state during initial sync race conditions
            if (!isInitialized) return;

            if (session?.user) {
                try {
                    const profileData = await fetchUserProfile(session.user);
                    if (isMounted) {
                        setUser(profileData);
                        setLoading(false);
                    }
                } catch (err) {
                    console.error("AuthContext: Error fetching profile on auth change:", err);
                    if (isMounted) {
                        setUser(null);
                        setLoading(false);
                    }
                }
            } else {
                if (isMounted) {
                    setUser(null);
                    setLoading(false);
                }
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            clearTimeout(loadingTimeout);
        };
    }, []);

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        
        const profileData = await fetchUserProfile(data.user);
        setUser(profileData);
        return profileData;
    };

    const loginWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}`
            }
        });
        
        if (error) throw error;
        // User is redirected; session handled by onAuthStateChange
    };

    const register = async (userData) => {
        const { email, password, name, role } = userData;

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                }
            }
        });

        if (error) throw error;

        if (data?.user) {
            await syncUserToUsersTable(data.user, { name, role: role || 'owner' });
            const profileData = await fetchUserProfile(data.user);
            setUser(profileData);
            return profileData;
        }
        
        return null;
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        loginWithGoogle,
        register,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
