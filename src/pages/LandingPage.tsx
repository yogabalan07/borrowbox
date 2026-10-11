import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  GraduationCap, 
  BookOpen, 
  Camera, 
  Cpu, 
  Tent, 
  Activity,
  Layers,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { itemsService } from '../services/api';
import { Item } from '../types';
import { ItemCard } from '../components/ItemCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

import heroImg from '../assets/images/hero_campus_borrow_1791703412890.jpg';

export const LandingPage: React.FC = () => {
  const [featuredItems, setFeaturedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatured = () => {
    setLoading(true);
    setError(null);
    itemsService.listItems({ sortBy: 'newest' })
      .then((items) => {
        setFeaturedItems(items.slice(0, 4));
      })
      .catch((err: any) => {
        setError(err?.message || 'Failed to connect to backend service.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchFeatured();
  }, []);

  const categories = [
    { name: 'Textbooks & STEM', slug: 'textbooks', icon: BookOpen, desc: 'Calculators, guides, kits' },
    { name: 'Cameras & Audio', slug: 'creative', icon: Camera, desc: 'DSLRs, mics, lenses' },
    { name: 'Lab Gear & Kits', slug: 'lab_gear', icon: Cpu, desc: 'Arduino, breadboards' },
    { name: 'Outdoors & Camping', slug: 'outdoors', icon: Tent, desc: 'Tents, backpacks, sleeping pads' },
    { name: 'Sports & Games', slug: 'sports', icon: Activity, desc: 'Rackets, balls, recreation' },
    { name: 'All Categories', slug: 'all', icon: Layers, desc: 'Explore all campus listings' },
  ];

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Hero Section */}
      <section className="relative pt-6 sm:pt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified College Student Lending Network</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 leading-[1.1] text-balance">
                Borrow what you need. <br />
                <span className="text-emerald-700">Lend what you don't.</span>
              </h1>

              <p className="text-lg text-stone-600 max-w-xl leading-relaxed">
                BorrowBox lets college students borrow graphing calculators, lab gear, cameras, and camping equipment directly from verified peers on campus—free or for modest student rates.
              </p>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  to="/marketplace"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors text-center"
                >
                  <Search className="w-4 h-4" />
                  <span>Browse Campus Marketplace</span>
                </Link>

                <Link
                  to="/items/new"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg text-base font-semibold text-stone-800 bg-white border border-stone-300 hover:bg-stone-50 transition-colors text-center"
                >
                  <span>List Gear for Free</span>
                  <ArrowRight className="w-4 h-4 text-stone-500" />
                </Link>
              </div>

              {/* Key Platform Commitments */}
              <div className="pt-6 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
                <div>
                  <p className="text-sm font-bold text-stone-900">Verified .edu Identity</p>
                  <p className="text-xs text-stone-500 mt-0.5">University email check</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900">Zero Commission</p>
                  <p className="text-xs text-stone-500 mt-0.5">Free student lending</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-900">Landmark Handover</p>
                  <p className="text-xs text-stone-500 mt-0.5">Safe campus meetup spots</p>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-stone-200 shadow-sm aspect-4/3 sm:aspect-16/10 lg:aspect-4/3 bg-stone-100">
                <img
                  src={heroImg}
                  alt="College students sharing academic supplies and equipment on campus"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-transparent to-transparent flex items-end p-6">
                  <div className="text-white">
                    <p className="text-xs font-medium text-emerald-400">Campus Community</p>
                    <p className="text-base font-semibold mt-0.5">Direct handovers at libraries, student unions, and quads</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-stone-50 py-16 border-y border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
              Simple, Safe Campus Lending
            </h2>
            <p className="text-stone-600 text-sm sm:text-base mt-2">
              Three clear steps to borrow or rent gear with peace of mind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                1
              </div>
              <h3 className="font-semibold text-stone-900 text-lg">Find & Request Gear</h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                Search textbooks, graphing calculators, lab gear, or cameras. Pick your exact dates and send a request to the student owner.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                2
              </div>
              <h3 className="font-semibold text-stone-900 text-lg">Campus Landmark Handover</h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                Meet at familiar campus spots like library lobbies, student centers, or dining halls. Inspect condition and confirm in the app.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                3
              </div>
              <h3 className="font-semibold text-stone-900 text-lg">Use & Return On Time</h3>
              <p className="text-stone-600 text-sm leading-relaxed">
                Acknowledge safe return with the owner when finished. Build your verified student reputation score for future campus borrows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Explore Categories</h2>
            <p className="text-sm text-stone-500 mt-1">Browse what fellow students are sharing</p>
          </div>
          <Link
            to="/marketplace"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                to={cat.slug === 'all' ? '/marketplace' : `/marketplace?category=${cat.slug}`}
                className="bg-white p-4 rounded-xl border border-stone-200 hover:border-emerald-500 hover:shadow-xs transition-all group text-left block"
              >
                <div className="w-10 h-10 rounded-lg bg-stone-100 group-hover:bg-emerald-50 text-stone-700 group-hover:text-emerald-700 flex items-center justify-center mb-3 transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-stone-900 text-sm group-hover:text-emerald-700 transition-colors truncate">
                  {cat.name}
                </p>
                <p className="text-xs text-stone-400 mt-0.5 truncate">{cat.desc}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Featured Campus Listings</h2>
            <p className="text-sm text-stone-500 mt-1">
              Items currently listed by students in your campus network
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/marketplace?lendingMode=free"
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              Free Borrowings Only
            </Link>
            <Link
              to="/marketplace"
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
            >
              See All Items
            </Link>
          </div>
        </div>

        {error ? (
          <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchFeatured}
              className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : loading ? (
          <LoadingSkeleton count={4} />
        ) : featuredItems.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-stone-200 text-xs text-stone-500 space-y-3">
            <p className="text-sm font-semibold text-stone-800">No active listings yet</p>
            <p className="max-w-sm mx-auto text-stone-500">
              Be the first student to share books, tech, or sports gear on your campus!
            </p>
            <Link
              to="/items/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 text-xs shadow-xs"
            >
              List an Item Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Trust & Community Guarantee */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-emerald-900 text-white rounded-2xl p-8 sm:p-12 relative overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
              <span>Campus Trust Guarantee</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Only verified university students can borrow and lend.
            </h3>
            <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
              Every member verifies with an active institution email (.edu). Transparent profile ratings, item inspection checklists, and secure campus pickup landmarks protect both owners and borrowers.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs text-emerald-200">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Verified Student Badges
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Handover Inspection Log
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Community Moderation
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
