import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Privacy = () => {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = 'Privacy Policy | pghub';
    }, []);

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-20 animate-fade-in">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-orange-600 font-medium mb-8 transition-colors text-sm min-h-[auto]">
                <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="bg-white p-8 md:p-12 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-6">Privacy <span className="gradient-text">Policy</span></h1>
                <p className="text-gray-500 mb-8 font-medium">Last updated: April 2026</p>
                
                <div className="space-y-8 text-gray-600 leading-relaxed text-sm md:text-base">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
                        <p>We collect personal information such as your name, email address, phone number, and location preferences when you register as an owner or use our platform to filter searches. We also collect usage data securely to improve platform experience.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
                        <p>Your information is used solely to provide and improve the service, securely handle authentication, and verify listings. Owner contact details are shown conditionally to help facilitate tenant inquiries, and we do not sell your personal data to third parties.</p>
                    </section>
                    
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">3. Data Security</h2>
                        <p>Your data is securely stored using Supabase's encrypted infrastructure. We deploy strict read and write rules (Row Level Security) to ensure only authorized individuals can modify data relevant to them.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">4. Your Rights</h2>
                        <p>You reserve the right to review, update, or completely delete your data from our servers. You may clear your account settings by contacting our support team or navigating to your dashboard settings.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">5. Google AdSense & Third-Party Cookies</h2>
                        <p>We use Google AdSense to serve advertisements on our platform to help cover operational costs. Please note the following disclosures regarding how Google and third parties serve ads on our site:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-2">
                            <li><strong>Cookies & Ad Serving:</strong> Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to our website or other websites on the internet.</li>
                            <li><strong>Personalized Ads:</strong> Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our site and/or other sites on the Internet.</li>
                            <li><strong>Opting Out:</strong> You can opt out of personalized advertising by visiting the <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline font-bold">Google Ads Settings</a> page. Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting the <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline font-bold">AboutAds.info</a> website.</li>
                        </ul>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Privacy;
