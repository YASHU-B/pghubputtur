-- 1. Ensure 'listings' bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage RLS Policies for 'listings' bucket
-- Drop existing policies if they exist to avoid errors
DROP POLICY IF EXISTS "Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Owner Upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;

-- Allow public read access to all objects in 'listings' bucket
CREATE POLICY "Public Read" ON storage.objects FOR SELECT USING (bucket_id = 'listings');

-- Allow authenticated users to upload to their own folder in 'listings' bucket
-- The folder name matches the user's UID (auth.uid())
CREATE POLICY "Owner Upload" ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'listings' AND 
  (name LIKE (auth.uid()::text || '/%'))
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Owner Delete" ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'listings' AND 
  (name LIKE (auth.uid()::text || '/%'))
);

-- 3. Users Table Config
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'owner';

-- 4. Ensure all necessary columns exist in 'listings'
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS landmarks TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS coordinates JSONB,
ADD COLUMN IF NOT EXISTS rules TEXT[] DEFAULT '{}';

-- 6. Listings RLS
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Only show listings in public search if:
-- 1. Owner's subscription is 'active' 
-- 2. OR Owner is within their 30-day free trial period
DROP POLICY IF EXISTS "Public Select Listings" ON public.listings;
CREATE POLICY "Public Select Listings" ON public.listings FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = listings.owner_id 
        AND (
            users.subscription_status = 'active' 
            OR (users.created_at > (NOW() - INTERVAL '30 days'))
        )
    )
);

DROP POLICY IF EXISTS "Owner Manage Listings" ON public.listings;
CREATE POLICY "Owner Manage Listings" ON public.listings FOR ALL 
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 7. Review Policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert reviews (Guest reviews)
DROP POLICY IF EXISTS "Allow anyone to insert reviews" ON public.reviews;
CREATE POLICY "Allow anyone to insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- Allow public to see approved reviews
DROP POLICY IF EXISTS "Allow public to see approved reviews" ON public.reviews;
CREATE POLICY "Allow public to see approved reviews" ON public.reviews FOR SELECT USING (status = 'approved');

-- Allow owners to manage reviews for their own listings
DROP POLICY IF EXISTS "Allow owners to manage reviews" ON public.reviews;
CREATE POLICY "Allow owners to manage reviews" ON public.reviews FOR ALL
TO authenticated
USING (
    auth.uid() IN (
        SELECT owner_id FROM public.listings WHERE id = reviews.listing_id
    )
);
