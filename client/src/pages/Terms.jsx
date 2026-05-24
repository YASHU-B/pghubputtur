import React, { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
    const navigate = useNavigate();

    useEffect(() => {
        document.title = 'Terms of Service | pghub';
    }, []);

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-20 animate-fade-in">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-orange-600 font-medium mb-8 transition-colors text-sm min-h-[auto]">
                <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="bg-white p-8 md:p-12 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-6">Terms of <span className="gradient-text">Service</span></h1>
                <p className="text-gray-500 mb-8 font-medium">Last updated: April 2026</p>
                
                <div className="space-y-8 text-gray-600 leading-relaxed text-sm md:text-base">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
                        <p>By accessing and using pghub, you accept and agree to be bound by the terms and provision of this agreement. Our platform acts strictly as a connecting medium between PG owners and tenants. We are not liable for any transactions occurring outside the purview of our provided matching services.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">2. Description of Service</h2>
                        <p>pghub provides a platform for discovering paying guest accommodations and hostels without any brokerage fees. We do not own, operate, or manage any of the listed properties directly.</p>
                    </section>
                    
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">3. User Obligations</h2>
                        <p>Users are expected to provide accurate information upon registration. Any offensive behavior, falsified listings, or misrepresentation will result in immediate suspension. Owners must keep property availability and details up to date.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">4. Disclaimer of Warranties</h2>
                        <p>We do not guarantee the absolute accuracy of the physical condition or the legal standing of the listed properties. We strongly advise tenants to verify the details physically or virtually before exchanging any financial commitments.</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default Terms;
