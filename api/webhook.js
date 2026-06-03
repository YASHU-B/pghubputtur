import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Webhook secret is not configured in environment variables');
    return res.status(500).json({ message: 'Webhook secret missing' });
  }

  // 1. Verify Razorpay Webhook Signature
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    console.error('Missing x-razorpay-signature header');
    return res.status(400).json({ message: 'Missing signature' });
  }

  // Vercel parses req.body automatically. We serialize it to verify the signature.
  const payloadStr = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadStr)
    .digest('hex');

  if (expectedSignature !== signature) {
    console.error('Webhook signature verification failed');
    return res.status(400).json({ message: 'Invalid signature' });
  }

  console.log('Webhook signature verified successfully. Event:', req.body.event);

  const event = req.body.event;
  let userId = null;

  // Extract userId from payment or order notes
  if (event === 'payment.captured' && req.body.payload?.payment?.entity) {
    userId = req.body.payload.payment.entity.notes?.userId;
  } else if (event === 'order.paid' && req.body.payload?.order?.entity) {
    userId = req.body.payload.order.entity.notes?.userId;
  }

  if (!userId) {
    console.log(`No userId found in webhook event notes for event: ${event}. Ignoring event.`);
    return res.status(200).json({ status: 'ok', message: 'No userId associated with event' });
  }

  // 2. Update User Subscription in Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration is missing');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  try {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    console.log(`Webhook: Activating subscription for user ${userId} until ${expiresAt}`);

    const updateRes = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        subscription_status: 'active',
        subscription_expires_at: expiresAt,
      }),
    });

    if (!updateRes.ok) {
      const errorData = await updateRes.json().catch(() => ({}));
      console.error('Supabase update failed via webhook:', errorData);
      return res.status(500).json({ message: 'Failed to update user subscription status' });
    }

    console.log(`Webhook successfully processed subscription for user ${userId}`);
    return res.status(200).json({ status: 'ok', message: 'Subscription activated' });
  } catch (error) {
    console.error('Error handling webhook event update:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
