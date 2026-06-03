import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import ListingDetail from './pages/ListingDetail';
import OwnerDashboard from './pages/OwnerDashboard';
import AddListing from './pages/AddListing';
import AdminDashboard from './pages/AdminDashboard';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import './App.css';
import {
  Menu, X, Building2, Search as SearchIcon,
  Shield, Star, Users, MapPin, Zap, Heart,
  ArrowRight, Home, LogIn, ChevronRight,
  CheckCircle2, PhoneCall, Crown,
  Instagram, Twitter, Linkedin, Facebook, Mail, Globe
} from 'lucide-react';
import { supabase } from './supabase';
import ListingCard from './components/ListingCard';
import { Navigate } from 'react-router-dom';
import AdSlot from './components/AdSlot';

// ─── Scroll To Top ──────────────────────────────────────────────────────────
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// ─── Theme Purge (Fix for Cached Dark Mode) ────────────────────────────────
const ThemePurge = () => {
  useEffect(() => {
    // Force removal of dark classes that might be residual
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    
    // Clear theme settings only once, don't clear entire browser cache
    localStorage.removeItem('theme');
  }, []);
  return null;
};

// ─── Login Redirector (Auto-dash for Owners) ────────────────────────────────
const LoginRedirector = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    // Only redirect if on login/register/home pages
    const isAuthPage = ['/login', '/register'].includes(pathname);
    const isHome = pathname === '/';
    
    if (!loading && user && (isAuthPage || (isHome && user.role === 'owner'))) {
      if (user.role === 'admin') navigate('/admin');
      else navigate('/owner');
    }
  }, [user, loading, pathname, navigate]);

  return null;
};

// ─── Protected Route ────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return (
    <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-xl flex items-center justify-center mb-4">
        <Shield className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
      <p className="text-gray-500 max-w-xs mb-6">Your account (Role: {user.role || 'none'}) does not have permission to access this page.</p>
      
      {user.dbError && (
        <div className="bg-red-50 text-red-600 text-xs p-4 rounded-xl mb-6 max-w-md text-left w-full border border-red-100 overflow-auto">
          <p className="font-bold mb-1">Database Error Details:</p>
          <pre>{JSON.stringify(user.dbError, null, 2)}</pre>
          <p className="mt-2 font-medium">Please send this error to your developer.</p>
        </div>
      )}

      <button
        onClick={() => { logout(); navigate('/login'); }}
        className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
      >
        Sign in with another account
      </button>
      <Link to="/" className="mt-4 text-sm font-bold text-gray-400 hover:text-orange-600">Back to Home</Link>
    </div>
  );
  return children;
};

// ─── Hero Landing Page ─────────────────────────────────────────────────────
const HeroLanding = () => {
  const [listings, setListings] = useState(() => {
    const cached = localStorage.getItem('featured_listings');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(!listings.length);
  const [searchCity, setSearchCity] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('is_verified', true)
          .order('created_at', { ascending: false })
          .limit(3);
          
        if (error) throw error;
        setListings(data);
        localStorage.setItem('featured_listings', JSON.stringify(data));
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();

    const subscription = supabase
      .channel('public:listings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, fetchListings)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleQuickSearch = (e) => {
    e.preventDefault();
    if (searchCity.trim()) {
      navigate(`/search?city=${encodeURIComponent(searchCity.trim())}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <div className="relative overflow-hidden bg-white">
      {/* ── HERO SECTION ── */}
      <section className="relative min-h-[60vh] md:min-h-[75vh] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-white" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,_rgba(232,97,45,0.05)_0%,_transparent_70%)] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 text-center animate-fade-in">
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-orange-100 text-orange-700 px-4 py-2 rounded-full text-xs font-bold mb-8 shadow-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
            </span>
            Join 100+ students finding PGs daily
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.05] mb-6 tracking-tight">
            Perfect PG.<br />
            <span className="gradient-text">Zero Commission.</span>
          </h1>

          <p className="text-lg text-gray-500 leading-relaxed mb-10 max-w-2xl mx-auto font-medium">
            Direct contact with verified owners on <strong>PGHub Puttur</strong> (also known as <strong>pughubputtur</strong>). No agents, no hidden fees. <span className="text-gray-900 font-bold">Search, Call, Move in.</span>
          </p>

          {/* Quick Search Box */}
          <form onSubmit={handleQuickSearch} className="relative max-w-2xl mx-auto mb-8">
            <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white rounded-xl shadow-2xl shadow-orange-100 border border-orange-100">
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-400" />
                <input
                  type="text"
                  placeholder="City or Landmark (e.g. Puttur)"
                  className="w-full pl-12 pr-4 py-4 rounded-xl outline-none text-gray-800 font-semibold"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                />
              </div>
              <button type="submit" className="bg-orange-600 text-white px-8 py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-orange-700 transition-all btn-glow shadow-lg shadow-orange-200">
                <SearchIcon className="h-5 w-5" /> Search PGs
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-5">
              {['Male Only', 'Female Only', 'Co-ed'].map(f => (
                <span key={f} className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {f}
                </span>
              ))}
            </div>
          </form>
        </div>
      </section>

      {/* ── FEATURED LISTINGS ── */}
      <section className="bg-white py-8 md:py-12 border-t border-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-end gap-4 mb-10">
            <div>
              <p className="text-orange-600 font-semibold text-sm mb-1">Recent Listings</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Featured Stays</h2>
            </div>
            <Link to="/search" className="flex items-center gap-1.5 text-orange-600 font-medium hover:text-orange-700 transition-colors text-sm">
              View all PGs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-gray-50 h-80 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {listings.map((l, i) => (
                <ListingCard key={l.id} listing={l} idx={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-bold">New listings coming soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section className="bg-gray-50 py-10 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-6 leading-tight">
                Built for <span className="gradient-text">Students</span>,<br />
                Powered by Trust.
              </h2>
              <p className="text-gray-500 text-lg leading-relaxed mb-8">
                pghub eliminates the middleman. We provide the tools for you to find a home without paying a single rupee in commission.
              </p>
              <div className="space-y-6">
                {[
                  { icon: Shield, title: 'Verified Owners', desc: 'We manually check every listing to protect you from scams.' },
                  { icon: PhoneCall, title: 'Instant Contact', desc: 'WhatsApp or Call owners directly from the page.' },
                  { icon: Zap, title: 'Real-time Availability', desc: 'Owners update bed status daily so you always see what\'s open.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
                      <item.icon className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{item.title}</h4>
                      <p className="text-gray-500 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-orange-600 rounded-[2rem] blur-2xl opacity-10" />
              <div className="relative bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Heart className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">100% Free for Students</p>
                    <p className="text-xs text-gray-400">Join our growing community today</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-orange-500 rounded-full" />
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                    <span>BROWSE</span>
                    <span>CALL OWNER</span>
                    <span>MOVE IN</span>
                  </div>
                </div>
                <Link to="/search" className="mt-8 flex items-center justify-center gap-2 w-full bg-gray-900 text-white py-4 rounded-xl font-black text-sm hover:bg-black transition-all">
                  Find My PG Now <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sponsored Ad Banner */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <AdSlot slot="9382048591" />
      </div>

      {/* ── OWNER SECTION ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-20">
        <div className="bg-orange-600 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-16 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <Crown className="h-10 w-10 text-yellow-300 mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-black mb-4">List Your PG on pghub</h2>
            <p className="text-orange-100 mb-10 font-medium">Get direct inquiries from thousands of students. Only ₹299/month for unlimited listings.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="bg-white text-orange-600 px-10 py-4 rounded-xl font-black text-lg hover:bg-orange-50 transition-all shadow-xl">
                Become a Partner
              </Link>
              <Link to="/login" className="bg-orange-700/50 backdrop-blur border border-orange-400 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-orange-700 transition-all">
                Owner Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// ─── Navbar ────────────────────────────────────────────────────────────────
const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardPath = user?.role === 'admin' ? '/admin' : '/owner';
  const dashboardLabel = user?.role === 'admin' ? 'Admin Console' : 'My Dashboard';
  const initial = user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?';
  const isActive = (path) => location.pathname === path;

  // eslint-disable-next-line no-unused-vars
  const navLink = (to, label, Icon) => (
    <Link
      to={to}
      onClick={() => setMobileOpen(false)}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold transition-all text-sm ${isActive(to)
        ? 'bg-orange-50 text-orange-700'
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
    >
      <span className={`p-1.5 rounded-xl ${isActive(to) ? 'bg-orange-100' : 'bg-gray-100'}`}>
        <Icon className={`h-4 w-4 ${isActive(to) ? 'text-orange-600' : 'text-gray-500'}`} />
      </span>
      {label}
      {isActive(to) && <span className="ml-auto w-1.5 h-1.5 bg-orange-500 rounded-full" />}
    </Link>
  );

  return (
    <>
      <ScrollToTop />
      <ThemePurge />
      <LoginRedirector />
      <nav className="bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50 shadow-sm shadow-gray-100/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-orange-200/50">
                <img src="/logo.png" alt="PGHub Logo" className="w-full h-full object-cover scale-150" />
              </div>
              <span className="text-xl font-black text-gray-900 tracking-tight">
                PG<span className="text-orange-600">Hub</span> Puttur
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/search"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isActive('/search') ? 'text-orange-600 bg-orange-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <SearchIcon className="h-4 w-4" /> Search PGs
              </Link>

              {user ? (
                <div className="flex items-center gap-2 ml-3">
                  <Link
                    to={dashboardPath}
                    className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-200/50 btn-glow"
                  >
                    <Building2 className="h-4 w-4" /> {dashboardLabel}
                  </Link>
                  <div className="flex items-center gap-2 ml-1 pl-3 border-l border-gray-100">
                    <div className="w-9 h-9 bg-orange-600 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-100 flex-shrink-0">
                      {initial}
                    </div>
                    <button
                      onClick={() => { logout(); navigate('/'); }}
                      className="text-xs text-gray-400 hover:text-red-500 font-semibold transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 ml-3">
                  <Link to="/login" className="px-4 py-2 text-gray-600 hover:text-orange-600 font-semibold text-sm rounded-xl hover:bg-orange-50 transition-all">Login</Link>
                  <Link to="/register" className="bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-200/50 btn-glow">
                    List Your PG
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile: hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all text-gray-600"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Drawer Overlay + Panel ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[999] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Sliding panel */}
          <div className="absolute right-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-white shadow-2xl flex flex-col mobile-menu-enter">

            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-white rounded-xl overflow-hidden flex items-center justify-center">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-150" />
                </div>
                <span className="font-black text-gray-900">PGHub Puttur</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User info (if logged in) */}
            {user && (
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-orange-600 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-lg shadow-orange-100">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{user.name || user.email}</p>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold capitalize px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-orange-100 text-orange-700'}`}>
                      <span className="w-1.5 h-1.5 bg-current rounded-full" />
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Nav links */}
            <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navLink('/', 'Home', Home)}
              {navLink('/search', 'Search PGs', SearchIcon)}
              {user ? (
                <>
                  {navLink(dashboardPath, dashboardLabel, Building2)}
                  <button
                    onClick={() => { logout(); navigate('/'); setMobileOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-red-500 hover:bg-red-50 transition-all text-sm mt-2"
                  >
                    <span className="p-1.5 rounded-xl bg-red-50">
                      <X className="h-4 w-4 text-red-500" />
                    </span>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  {navLink('/login', 'Owner Login', LogIn)}
                </>
              )}
            </div>

            {/* Drawer footer CTA */}
            {!user && (
              <div className="px-4 py-5 border-t border-gray-100 bg-gradient-to-b from-transparent to-orange-50/40">
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 w-full bg-orange-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
                >
                  <Building2 className="h-4 w-4" /> List Your PG — Free
                </Link>
                <p className="text-center text-[11px] text-gray-400 mt-2">No card required · Cancel anytime</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};


// ─── Footer ────────────────────────────────────────────────────────────────
const Footer = () => (
  <footer className="bg-white border-t border-gray-100 text-gray-600 pt-16 pb-8 overflow-hidden relative">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
        {/* Brand Section */}
        <div className="col-span-1 lg:col-span-1">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-orange-100">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-150" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">PG<span className="text-orange-600">Hub</span> Puttur</span>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            The most trusted platform for students to find verified PGs and Hostels. Zero commission, direct owner contact.
          </p>
          <div className="flex gap-3">
            {[
              { Icon: Instagram, href: "https://instagram.com/pghub" },
              { Icon: Twitter, href: "https://twitter.com/pghub" },
              { Icon: Facebook, href: "https://facebook.com/pghub" },
              { Icon: Linkedin, href: "https://linkedin.com/company/pghub" }
            ].map((item, i) => {
              const Icon = item.Icon;
              return (
                <a key={i} href={item.href} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-all text-gray-400">
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div>
          <h4 className="text-gray-900 font-bold mb-6 text-xs uppercase tracking-[0.2em]">Explore</h4>
          <ul className="space-y-3">
            <li><Link to="/search" className="text-sm hover:text-orange-600 transition-colors">Find PGs</Link></li>
            <li><Link to="/search" className="text-sm hover:text-orange-600 transition-colors">Recently Added</Link></li>
            <li><Link to="/" className="text-sm hover:text-orange-600 transition-colors">How it Works</Link></li>
          </ul>
        </div>

        {/* Partners */}
        <div>
          <h4 className="text-gray-900 font-bold mb-6 text-xs uppercase tracking-[0.2em]">Owners</h4>
          <ul className="space-y-3">
            <li><Link to="/register" className="text-sm hover:text-orange-600 transition-colors font-bold text-orange-600">List Your PG</Link></li>
            <li><Link to="/login" className="text-sm hover:text-orange-600 transition-colors">Partner Dashboard</Link></li>
            <li><Link to="/login" className="text-sm hover:text-orange-600 transition-colors">Subscription Plans</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-gray-900 font-bold mb-6 text-xs uppercase tracking-[0.2em]">Support</h4>
          <ul className="space-y-4">
            <li className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Mail className="h-4 w-4 text-orange-600" />
              </div>
              <a href="mailto:pghubputtur@gmail.com" className="hover:text-orange-600 transition-colors font-medium">pghubputtur@gmail.com</a>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-orange-50 rounded-lg">
                <PhoneCall className="h-4 w-4 text-orange-600" />
              </div>
              <a href="tel:7569441767" className="hover:text-orange-600 transition-colors font-medium">+91 7569441767</a>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Globe className="h-4 w-4 text-gray-400" />
              </div>
              <span className="font-medium">
                Made with ❤️ by <a href="https://wa.me/917569441767" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">yashu</a>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-xs text-gray-400 font-medium">
          © 2026 PGHub Puttur India. All rights reserved.
        </p>
        <div className="flex gap-8">
          <Link to="/privacy" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-orange-600 transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-orange-600 transition-colors">Terms of Service</Link>
        </div>
      </div>
    </div>
  </footer>
);

// ─── App ───────────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <ThemePurge />
        <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HeroLanding />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/search" element={<Search />} />
              <Route path="/listing/:id" element={<ListingDetail />} />
              <Route path="/owner" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><OwnerDashboard /></ProtectedRoute>} />
              <Route path="/owner/add-listing" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><AddListing /></ProtectedRoute>} />
              <Route path="/owner/edit-listing/:id" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><AddListing /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
