
import Razorpay from 'razorpay';

export default async function handler(req, res) {
  console.log('Create Order Request Body:', req.body);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const key_id = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    console.error('Razorpay keys are missing from environment variables');
    return res.status(500).json({ message: 'Razorpay keys missing' });
  }

  const razorpay = new Razorpay({
    key_id,
    key_secret,
  });

  const { amount, currency = 'INR', receipt = 'receipt_' + Date.now() } = req.body;

  if (!amount || amount < 100) {
    return res.status(400).json({ message: 'Amount must be at least 100 paise (₹1)' });
  }

  try {
    const options = {
      amount: Math.floor(amount), // in paise, must be integer
      currency,
      receipt,
    };

    console.log('Creating order with options:', options);
    const order = await razorpay.orders.create(options);
    console.log('Razorpay Order Created:', order.id);
    res.status(200).json(order);
  } catch (error) {
    console.error('Razorpay Order Error:', error);
    const errorMessage = error.description || error.message || 'Internal Server Error';
    res.status(500).json({ message: errorMessage, error: error });
  }
}
