import crypto from 'crypto';

export default async function handler(req, res) {
  console.log('Verify Payment Request Body:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { 
    razorpay_order_id, 
    razorpay_payment_id, 
    razorpay_signature,
    userId 
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    console.error('Missing payment details in request');
    return res.status(400).json({ message: 'Missing payment details' });
  }

  if (!userId) {
    console.error('Missing userId in request');
    return res.status(400).json({ message: 'Missing userId' });
  }

  // 1. Verify Signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body.toString())
    .digest('hex');

  const isAuthentic = expectedSignature === razorpay_signature;

  if (!isAuthentic) {
    console.error('Signature verification failed:', {
      expected: expectedSignature,
      received: razorpay_signature
    });
    return res.status(400).json({ message: 'Payment verification failed (Invalid Signature)' });
  }

  console.log('Signature verified successfully');

  // 2. Update User Subscription
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Use service role key if available to bypass RLS, otherwise fallback to anon key (which might fail if RLS is strict)
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    return res.status(500).json({ message: 'Server config error: missing Supabase credentials' });
  }

  try {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log(`Updating subscription for user ${userId} to active until ${expiresAt}`);

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        subscription_status: 'active',
        subscription_expires_at: expiresAt,
      }),
    });

    const updateData = await updateRes.json();

    if (!updateRes.ok) {
      console.error('Supabase update failed:', updateData);
      return res.status(500).json({ 
        message: 'Payment verified but database update failed', 
        error: updateData 
      });
    }

    console.log('Database updated successfully:', updateData);

    return res.status(200).json({ 
      success: true, 
      message: 'Payment verified and subscription activated',
      data: updateData
    });
  } catch (error) {
    console.error('Unexpected error during verification:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
