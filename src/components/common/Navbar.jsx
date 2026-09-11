import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck,
  ChevronDown,
  User,
  Sparkles,
  HelpCircle,
  Award,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { currentUser, logout, isAdmin, isCoordinator, isStudent } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    ...(isAdmin ? [
      { name: 'College Admin Portal', path: '/admin' },
    ] : []),
    ...(isStudent ? [
      { name: 'Elective Selection', path: '/student/select' },
      { name: 'My Allotment', path: '/student/allotment' },
    ] : []),
    ...(isCoordinator ? [
      { name: 'Coordinator Portal', path: '/coordinator' },
    ] : []),
    { name: 'Help & FAQ', path: '/help' },
  ];

  const handleLogout = async () => {
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-12 px-2.5 py-1 rounded-xl bg-white border border-gray-200 shadow-xs flex items-center justify-center group-hover:scale-105 transition-all">
              <img 
                src="/nsrit-logo.png" 
                alt="NSRIT Logo" 
                className="h-9 w-auto object-contain"
              />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-black tracking-tight text-gray-900 font-display flex items-center gap-1.5">
                NSRIT <span className="text-crimson-700">Autonomous Electives</span>
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Nadimpalli Satyanarayana Raju Institute of Technology
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'text-crimson-700 bg-crimson-50 font-extrabold shadow-2xs'
                      : 'text-gray-600 hover:text-crimson-700 hover:bg-gray-50'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Right Corner Profile Avatar Dropdown */}
          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                
                {/* Avatar Button */}
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-gray-100 border border-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-crimson-600/20"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-crimson-700 via-crimson-800 to-crimson-900 text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
                    {isAdmin ? (
                      <Building2 className="w-4 h-4 text-white" />
                    ) : isCoordinator ? (
                      <ShieldCheck className="w-4 h-4 text-white" />
                    ) : (
                      getInitials(currentUser.name)
                    )}
                  </div>
                  <div className="text-left hidden lg:block">
                    <div className="text-xs font-bold text-gray-900 leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium">
                      {isAdmin ? 'College Admin' : isCoordinator ? `${currentUser.branch} Coordinator` : `${currentUser.branch || 'Student'} - Sec ${currentUser.section || 'A'}`}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {/* Modern Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    
                    {/* Header Details */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-surface-50/50">
                      <div className="text-xs font-black text-gray-900 font-display">
                        {currentUser.name}
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                        {currentUser.email}
                      </div>
                      <div className="mt-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          isAdmin ? 'bg-gray-900 text-white' : isCoordinator ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isAdmin ? 'Institution Administrator' : isCoordinator ? `${currentUser.branch} Coordinator` : 'Verified Student'}
                        </span>
                      </div>
                    </div>

                    {/* Navigation Items */}
                    <div className="p-1 space-y-0.5">
                      {isAdmin && (
                        <>
                          <Link
                            to="/admin"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-crimson-700 hover:bg-crimson-50/70 rounded-xl transition-colors"
                          >
                            <Building2 className="w-4 h-4 text-crimson-700" />
                            <span>Admin Control Center</span>
                          </Link>
                          <Link
                            to="/admin/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-crimson-700 hover:bg-crimson-50/70 rounded-xl transition-colors"
                          >
                            <User className="w-4 h-4 text-crimson-700" />
                            <span>Admin Profile & Security</span>
                          </Link>
                        </>
                      )}

                      {isCoordinator && (
                        <>
                          <Link
                            to="/coordinator"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-crimson-700 hover:bg-crimson-50/70 rounded-xl transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4 text-crimson-700" />
                            <span>Coordinator Control Panel</span>
                          </Link>
                          <Link
                            to="/coordinator/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-crimson-700 hover:bg-crimson-50/70 rounded-xl transition-colors"
                          >
                            <User className="w-4 h-4 text-crimson-700" />
                            <span>View My Profile & Account</span>
                          </Link>
                        </>
                      )}

                      {isStudent && (
                        <>
                          <Link
                            to="/student"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-crimson-700 hover:bg-crimson-50/70 rounded-xl transition-colors"
                          >
                            <User className="w-4 h-4 text-crimson-700" />
                            <span>Student Dashboard</span>
                          </Link>
                          <Link
                            to="/student/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-crimson-700 hover:bg-crimson-50/70 rounded-xl transition-colors"
                          >
                            <User className="w-4 h-4 text-crimson-700" />
                            <span>View My Profile & Account</span>
                          </Link>
                          <Link
                            to="/student/allotment"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-gray-700 hover:text-crimson-700 hover:bg-crimson-50/70 rounded-xl transition-colors"
                          >
                            <Award className="w-4 h-4 text-gray-500" />
                            <span>My Allotment Status</span>
                          </Link>
                        </>
                      )}
                    </div>

                    {/* Sign Out Button */}
                    <div className="p-1 pt-1 border-t border-gray-100">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out / Logout</span>
                      </button>
                    </div>

                  </div>
                )}

              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login?role=student"
                  className="px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-crimson-700 hover:bg-gray-100 transition-all"
                >
                  Student Login
                </Link>
                <Link
                  to="/login?role=coordinator"
                  className="px-3 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-all"
                >
                  Coordinator
                </Link>
                <Link
                  to="/login?role=admin"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white crimson-gradient-btn shadow-sm"
                >
                  College Admin
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 space-y-3 shadow-lg">
          {currentUser && (
            <div className="p-3 bg-surface-50 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-crimson-700 text-white font-bold text-xs flex items-center justify-center">
                  {getInitials(currentUser.name)}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-xs">{currentUser.name}</div>
                  <div className="text-[11px] text-gray-500">{currentUser.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                <Link 
                  to={isAdmin ? '/admin/profile' : isCoordinator ? '/coordinator/profile' : '/student/profile'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-1.5 rounded-lg text-xs font-bold text-crimson-700 bg-crimson-50"
                >
                  My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-center py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50"
                >
                  Logout
                </button>
              </div>
            </div>
          )}

          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-crimson-50 hover:text-crimson-700"
            >
              {link.name}
            </Link>
          ))}

          {!currentUser && (
            <div className="pt-4 border-t border-gray-100 grid grid-cols-3 gap-2">
              <Link
                to="/login?role=student"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800"
              >
                Student
              </Link>
              <Link
                to="/login?role=coordinator"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 rounded-xl border border-purple-200 text-purple-700 bg-purple-50 text-xs font-bold"
              >
                Coordinator
              </Link>
              <Link
                to="/login?role=admin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 rounded-xl text-xs font-bold text-white bg-crimson-700"
              >
                Admin
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
