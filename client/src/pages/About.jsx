import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Users, ShieldCheck, Heart, Sparkles, Navigation } from 'lucide-react';

export default function About() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'About Us | PGHub Puttur';
  }, []);

  return (
    <div className="relative overflow-hidden bg-white">
      {/* Background Decorative Blob */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse_at_center,_rgba(232,97,45,0.03)_0%,_transparent_70%)] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-20 relative z-10 animate-fade-in">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-orange-600 font-bold mb-8 transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-700 px-4 py-2 rounded-full text-xs font-black mb-6 uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" /> Our Mission
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight tracking-tight mb-6">
            Simplifying Student Housing in <span className="gradient-text">Puttur</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto font-medium leading-relaxed">
            PGHub Puttur is a community-first accommodation discovery platform created to solve the housing challenges faced by students and young professionals.
          </p>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            {
              icon: ShieldCheck,
              title: "100% Verified",
              desc: "Every listed PG is physically or digitally verified to protect you from fraudulent owners and misleading pictures."
            },
            {
              icon: Building2,
              title: "Zero Brokerage",
              desc: "Direct contact with landlords. No middlemen, no commissions, and no hidden fees to worry about."
            },
            {
              icon: Users,
              title: "Student-Centric",
              desc: "Tailored filters and categories specifically for students of Siddharth Group of Institutions, GIST, and local colleges."
            }
          ].map((card, i) => (
            <div
              key={i}
              className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-orange-100 flex flex-col items-center text-center group"
            >
              <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 text-orange-600 group-hover:scale-110 transition-transform shadow-sm">
                <card.icon className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-3">{card.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed font-medium">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Detailed Story Section */}
        <div className="bg-orange-50/40 rounded-[2.5rem] border border-orange-100/50 p-8 md:p-12 mb-16">
          <h2 className="text-2xl md:text-3.5xl font-black text-gray-900 mb-6">
            Why PGHub Puttur was created
          </h2>
          <div className="space-y-6 text-gray-600 font-medium text-sm md:text-base leading-relaxed">
            <p>
              Finding suitable, safe, and affordable Paying Guest (PG) accommodations or hostels in Puttur used to mean wandering down streets, looking for flyers, or dealing with expensive local brokers.
            </p>
            <p>
              We wanted to build something better. <strong>PGHub Puttur</strong> (also known as <em>pughubputtur</em>) was born out of a desire to make student housing completely transparent. We allow student hostel seekers to instantly call or message owners over WhatsApp, check active vacancies, and browse verified listings from the comfort of their phones.
            </p>
            <p>
              By giving PG owners direct dashboards to update availability and allowing students to connect for free, we help foster a trusted local renting ecosystem.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-4 items-center border-t border-orange-100 pt-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-black text-sm">
                Y
              </div>
              <div>
                <p className="font-bold text-gray-950 text-sm">Designed & Managed by B Yaswanth</p>
                <p className="text-xs text-gray-400">Puttur, AP, India</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-gray-900 text-white rounded-[2rem] p-8 md:p-12 text-center relative overflow-hidden shadow-xl shadow-gray-200">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10 max-w-xl mx-auto">
            <Heart className="h-10 w-10 text-orange-500 mx-auto mb-6 animate-pulse" />
            <h2 className="text-3xl font-black mb-4">Find your next stay today</h2>
            <p className="text-gray-400 mb-8 font-medium">Browse verified student hostels near Siddharth College and other central locations in Puttur.</p>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 bg-orange-600 text-white px-8 py-4 rounded-xl font-black hover:bg-orange-700 transition-all shadow-lg shadow-orange-700/20"
            >
              Start Searching <Navigation className="h-4 w-4 rotate-45" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
