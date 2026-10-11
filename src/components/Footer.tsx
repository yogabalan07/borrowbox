import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Shield, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 mt-20 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center text-white">
                <Package className="w-4 h-4" />
              </div>
              <span>BorrowBox</span>
            </div>
            <p className="text-sm text-stone-400 leading-relaxed">
              The verified collegiate gear and supply lending network. Built for students to save money, share resources, and reduce campus waste.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-stone-400 pt-1">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Campus .edu email verification required</span>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide uppercase mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li><Link to="/marketplace" className="hover:text-white transition-colors">Campus Marketplace</Link></li>
              <li><Link to="/marketplace?category=textbooks" className="hover:text-white transition-colors">Course Textbooks & STEM</Link></li>
              <li><Link to="/marketplace?category=lab_gear" className="hover:text-white transition-colors">Lab Equipment & Kits</Link></li>
              <li><Link to="/marketplace?category=creative" className="hover:text-white transition-colors">Cameras & Audio Gear</Link></li>
              <li><Link to="/marketplace?lendingMode=free" className="hover:text-white transition-colors">Free Student Borrowing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide uppercase mb-3">Community</h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li><Link to="/requests/borrowing" className="hover:text-white transition-colors">My Borrowing Requests</Link></li>
              <li><Link to="/requests/lending" className="hover:text-white transition-colors">My Lending Center</Link></li>
              <li><Link to="/items/new" className="hover:text-white transition-colors">List an Item</Link></li>
              <li><Link to="/profile" className="hover:text-white transition-colors">Student Profile & Trust</Link></li>
              <li><Link to="/admin" className="hover:text-white transition-colors">Admin Moderation</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white tracking-wide uppercase mb-3">Safety & Trust</h4>
            <p className="text-xs text-stone-400 leading-relaxed mb-3">
              Every student account is verified via institutional email. All rentals include item condition logs, designated campus pickup spots, and peer reputation scores.
            </p>
            <div className="text-xs text-stone-500">
              <span>FastAPI Backend Integration Ready</span>
              <span className="mx-1">·</span>
              <span>REST JSON</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© {new Date().getFullYear()} BorrowBox Campus Network. Made for university students.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-stone-400 transition-colors">Campus Guidelines</span>
            <span>·</span>
            <span className="hover:text-stone-400 transition-colors">Damage Protection Policy</span>
            <span>·</span>
            <span className="hover:text-stone-400 transition-colors">Student Code of Conduct</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
