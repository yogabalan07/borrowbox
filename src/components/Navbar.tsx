import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Package, 
  PlusCircle, 
  Menu, 
  X, 
  Bell, 
  ShieldCheck, 
  LogOut, 
  User as UserIcon,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Marketplace', path: '/marketplace' },
    { name: 'My Requests', path: '/requests/borrowing' },
    { name: 'Lending', path: '/requests/lending' },
    { name: 'Messages', path: '/messages' },
    { name: 'Dashboard', path: '/dashboard' },
  ];

  const isActive = (path: string) => {
    if (path === '/requests/borrowing') {
      return location.pathname.startsWith('/requests');
    }
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-stone-200">
      {/* Main Top Bar Contract: Brand - 4-5 Links - 1 Primary Action */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <Link 
          to="/" 
          className="flex items-center gap-2 text-stone-900 font-bold text-xl tracking-tight whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span>BorrowBox</span>
        </Link>

        {/* Zone 2: Navigation Links (Single-line, concise) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                isActive(link.path)
                  ? 'text-emerald-700 font-semibold border-b-2 border-emerald-600'
                  : 'hover:text-stone-900'
              }`}
            >
              {link.name}
            </Link>
          ))}
          {currentUser?.isAdmin && (
            <Link
              to="/admin"
              className={`whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors py-1 ${
                location.pathname === '/admin'
                  ? 'text-emerald-700 font-semibold border-b-2 border-emerald-600'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Admin</span>
            </Link>
          )}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/items/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List an Item</span>
          </Link>

          {isAuthenticated && currentUser ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-emerald-200 transition"
                aria-expanded={userDropdownOpen}
                aria-label="User profile menu"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-stone-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center justify-center border border-emerald-200">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {userDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-50"
                  onMouseLeave={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-stone-100">
                    <p className="text-sm font-semibold text-stone-900">{currentUser.name}</p>
                    <p className="text-xs text-stone-500 truncate">{currentUser.college}</p>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 mt-1">
                      <span>{currentUser.department}</span>
                      <span>·</span>
                      <span>{currentUser.yearOfStudy}</span>
                    </div>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-stone-400" />
                    <span>My Profile & History</span>
                  </Link>

                  <Link
                    to="/my-listings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    <Package className="w-4 h-4 text-stone-400" />
                    <span>My Listings</span>
                  </Link>

                  <Link
                    to="/notifications"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    <Bell className="w-4 h-4 text-stone-400" />
                    <span>Notifications</span>
                  </Link>

                  <Link
                    to="/requests/lending"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-stone-400" />
                    <span>Lending Requests</span>
                  </Link>

                  {currentUser.isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Admin Moderation</span>
                    </Link>
                  )}

                  <div className="border-t border-stone-100 my-1" />

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
              >
                Join
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-5 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-base font-medium ${
                isActive(link.path) ? 'bg-emerald-50 text-emerald-700' : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              {link.name}
            </Link>
          ))}
          {currentUser?.isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-stone-700 hover:bg-stone-50"
            >
              Admin Moderation
            </Link>
          )}
          {isAuthenticated && (
            <Link
              to="/my-listings"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-base font-medium ${
                location.pathname === '/my-listings'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              My Listings
            </Link>
          )}
          <Link
            to="/items/new"
            onClick={() => setMobileMenuOpen(false)}
            className="block w-full text-center px-4 py-2.5 text-base font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
          >
            + List an Item
          </Link>
          {!isAuthenticated && (
            <div className="pt-2 border-t border-stone-100 flex gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-sm font-medium border border-stone-300 rounded-lg text-stone-700"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg"
              >
                Join
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
