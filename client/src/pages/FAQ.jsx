import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, BookOpen, User, Building } from 'lucide-react';

export default function FAQ() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('students');
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    document.title = 'Frequently Asked Questions | PGHub Puttur';
  }, []);

  const studentFaqs = [
    {
      q: "Is PGHub Puttur free to use?",
      a: "Yes, it is 100% free for students! You can browse all listed hostels and PGs, filter by gender/budget, and contact owners directly without paying a single rupee in commission or brokerage."
    },
    {
      q: "How do I contact a PG or hostel owner?",
      a: "Click on any PG listing card from the Search page to open its detailed page. You will find a contact card displaying direct options to 'Call Owner' or send an instant chat via WhatsApp. You connect directly with the landlord."
    },
    {
      q: "Are the PG listings on PGHub verified?",
      a: "Yes! We manually verify listings to prevent scams and ensure high quality. We check property details and owner information. However, we always recommend visiting the PG in person and verifying all details before making any payment or advance security deposit."
    },
    {
      q: "What amenities are typically included in Puttur PGs?",
      a: "Most PGs offer high-speed Wi-Fi, 24/7 water supply, electricity backup, student study desks, and CCTV security. Food options (North/South Indian menu) are also available. You can view the list of verified amenities for each stay on its listing page."
    }
  ];

  const ownerFaqs = [
    {
      q: "How do I list my PG on PGHub Puttur?",
      a: "Simply click 'List Your PG' in the navigation menu or footer. Create an owner account, set up your profile, and then access your Owner Dashboard to add listings. You can easily manage descriptions, room photos, and pricing."
    },
    {
      q: "What is the listing subscription fee?",
      a: "To keep our platform 100% free for students and run verified services, we charge a flat fee of ₹99/month for PG owners. This gives you unlimited listings, direct user calls, and prominent placement. We never charge commission on bookings."
    },
    {
      q: "How does Razorpay payment verification work?",
      a: "All subscription transactions are secured and processed instantly using Razorpay. Once your payment succeeds, your dashboard and listings will be activated instantly. If you run into payment verification issues, contact support."
    },
    {
      q: "How do I update room availability or bed counts?",
      a: "Log into your Owner Dashboard. You can edit any listed PG, click details, and modify the available vacancy numbers in real-time. This helps ensure students see active and correct room statuses."
    }
  ];

  const toggleFaq = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const currentFaqs = activeTab === 'students' ? studentFaqs : ownerFaqs;

  return (
    <div className="relative overflow-hidden bg-white">
      {/* Background Decorative Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_center,_rgba(232,97,45,0.03)_0%,_transparent_70%)] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-20 relative z-10 animate-fade-in">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-500 hover:text-orange-600 font-bold mb-8 transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-700 px-4 py-2 rounded-full text-xs font-black mb-6 uppercase tracking-wider">
            <HelpCircle className="h-3.5 w-3.5" /> Questions & Answers
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight mb-4">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto font-medium">
            Got questions? We've got answers. Explore resources for students looking for a room or landlords listing a property.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex justify-center gap-4 mb-10">
          <button
            onClick={() => { setActiveTab('students'); setExpandedIndex(null); }}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-black transition-all ${
              activeTab === 'students'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-200'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
            }`}
          >
            <User className="h-4 w-4" /> For Students
          </button>
          <button
            onClick={() => { setActiveTab('owners'); setExpandedIndex(null); }}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-black transition-all ${
              activeTab === 'owners'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-200'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
            }`}
          >
            <Building className="h-4 w-4" /> For PG Owners
          </button>
        </div>

        {/* Collapsible Accordion Questions */}
        <div className="space-y-4 mb-16">
          {currentFaqs.map((faq, idx) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div 
                key={idx} 
                className={`bg-white rounded-2xl border border-gray-100/90 overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'shadow-md border-orange-100' : 'hover:shadow-sm'
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex justify-between items-center px-6 py-5 text-left font-bold text-gray-950 hover:text-orange-600 transition-colors focus:outline-none"
                >
                  <span className="text-base leading-snug pr-4">{faq.q}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isExpanded ? 'max-h-[300px] border-t border-gray-50' : 'max-h-0'
                  }`}
                >
                  <p className="px-6 py-5 text-sm text-gray-500 leading-relaxed font-medium">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Need More Help Banner */}
        <div className="bg-orange-50/50 rounded-3xl border border-orange-100/60 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-orange-100/40 flex items-center justify-center text-orange-600 flex-shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-lg mb-1">Still have questions?</h3>
              <p className="text-gray-500 text-sm font-medium">Contact our support team anytime. We are happy to help you find your stay or manage listings.</p>
            </div>
          </div>
          <a 
            href="mailto:pghubputtur@gmail.com" 
            className="bg-gray-950 hover:bg-black text-white px-6 py-3.5 rounded-xl font-black text-sm transition-all whitespace-nowrap shadow-md"
          >
            Email Support
          </a>
        </div>
      </div>
    </div>
  );
}
