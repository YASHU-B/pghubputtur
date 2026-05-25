// This is a serverless function for Vercel/Supabase to send trial expiration emails
// You will need to add an API key from an email service like Resend.com to your .env
// npm install resend

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { ownerEmail, ownerName, daysLeft } = req.body;

  try {
    const { data, error } = await resend.emails.send({
      from: 'StayBook <onboarding@resend.dev>',
      to: [ownerEmail],
      subject: daysLeft <= 0 ? 'Your StayBook Trial has Expired' : 'Action Required: Your StayBook Trial is Ending Soon',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
          <h1 style="color: #ea580c;">Hi ${ownerName},</h1>
          <p style="font-size: 16px; color: #4b5563;">
            ${daysLeft <= 0 
              ? 'Your 30-day free trial on StayBook has expired. Your listings are now hidden from the public search results.' 
              : `Your free trial on StayBook has only ${daysLeft} days remaining.`
            }
          </p>
          <div style="background-color: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #9a3412;">What happens next?</p>
            <ul style="color: #9a3412; font-size: 14px;">
              <li>Upgrade to Pro for just ₹299/month</li>
              <li>Keep your PG visible to thousands of students</li>
              <li>Receive direct inquiries via WhatsApp and Phone</li>
            </ul>
          </div>
          <a href="https://pghubputtur.vercel.app/#/owner" style="display: inline-block; background-color: #ea580c; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Upgrade to Pro Now</a>
          <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">If you have any questions, just reply to this email.</p>
        </div>
      `,
    });

    if (error) return res.status(400).json(error);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
