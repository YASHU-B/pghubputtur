import { useEffect } from 'react';
import { supabase } from '../supabase';

const SupabaseSeeder = () => {
    useEffect(() => {
        const seed = async () => {
            const { data: snapshot, error } = await supabase
                .from('listings')
                .select('id')
                .limit(1);

            if (error) {
                console.error("Error checking listings for seed:", error);
                return;
            }

            if (!snapshot || snapshot.length === 0) {
                console.log('Seeding Supabase...');
                
                // First need a mock owner in the users table, or we just rely on an existing UUID
                // In Supabase, owner_id must be a valid UUID in the auth.users table.
                // Since we can't insert a fake user without auth setup, we should skip seeding
                // unless an admin user exists, or we just insert it and let it fail if foreign keys are strict.
                // Given strict RLS, we will just log a message that seeding needs a valid user ID.
                console.warn('Skipping automatic seed: Supabase requires valid UUIDs for owner_id referencing auth.users. Please add listings manually through the UI or create a user first and update the seeder.');
            } else {
                console.log('Supabase already has data, skipping seed.');
            }
        };
        seed();
    }, []);

    return null;
};

export default SupabaseSeeder;
