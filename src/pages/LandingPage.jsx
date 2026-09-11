import React from 'react';
import { Link } from 'react-router-dom';
import { 
  CheckCircle, 
  ArrowRight, 
  Sliders, 
  Cpu, 
  BarChart3, 
  ShieldCheck,
  Mail,
  Lock,
  Layers,
  Sparkles,
  Building2,
  GraduationCap,
  BookOpen,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { currentUser, isAdmin, isCoordinator, isStudent } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-br from-crimson-100/50 via-coral-light/20 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            
            {/* Official Logo Banner */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-3xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow inline-block">
                <img 
                  src="/nsrit-logo.png" 
                  alt="NSRIT Logo" 
                  className="h-20 sm:h-24 w-auto object-contain max-w-[320px]"
                />
              </div>
            </div>

            {/* Top Emblem Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-crimson-50 border border-crimson-200/80 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-crimson-600 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-crimson-800">
                Nadimpalli Satyanarayana Raju Institute of Technology (Autonomous)
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight font-display leading-[1.15]">
              NSRIT Autonomous <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-crimson-700 via-crimson-600 to-coral bg-clip-text text-transparent">
                Elective System
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-600 font-normal max-w-2xl mx-auto leading-relaxed">
              Smart, transparent and automated elective subject selection and real-time FIFO seat allotment for Professional Electives (PE) and Open Electives (OE).
            </p>

            {/* Action Buttons & Logged-In User Dashboard Hub */}
            <div className="pt-4">
              {currentUser ? (
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-card max-w-2xl mx-auto space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="text-left">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-crimson-700 block">
                        Logged In Account
                      </span>
                      <h3 className="text-lg font-black text-gray-900 font-display">
                        Welcome, {currentUser.name || currentUser.email}!
                      </h3>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-crimson-50 text-crimson-800 border border-crimson-200">
                      {isAdmin ? 'Institution Administrator' : isCoordinator ? `${currentUser.branch || 'CSE'} Department Coordinator` : `Student (${currentUser.branch || 'CSE'} • Sec ${currentUser.section || 'A'})`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="px-6 py-3.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn shadow-md shadow-crimson-700/20 flex items-center gap-2"
                      >
                        <Building2 className="w-4 h-4" />
                        <span>Open College Master Admin Control</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}

                    {isCoordinator && (
                      <Link
                        to="/coordinator"
                        className="px-6 py-3.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn shadow-md shadow-crimson-700/20 flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Open Coordinator Dashboard ({currentUser.branch || 'CSE'})</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}

                    {isStudent && (
                      <>
                        <Link
                          to="/student"
                          className="px-6 py-3.5 rounded-xl text-xs font-bold text-white crimson-gradient-btn shadow-md shadow-crimson-700/20 flex items-center gap-2"
                        >
                          <Sliders className="w-4 h-4" />
                          <span>Elective Preference Selection</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                          to="/student/allotment"
                          className="px-5 py-3.5 rounded-xl text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors flex items-center gap-2"
                        >
                          <BookOpen className="w-4 h-4 text-crimson-700" />
                          <span>My Allotment Memo</span>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to="/login?role=student"
                    className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold text-white crimson-gradient-btn shadow-lg shadow-crimson-700/25 flex items-center justify-center gap-2 group"
                  >
                    <Mail className="w-5 h-5" />
                    <span>Student Login (College Email)</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    to="/login?role=coordinator"
                    className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-5 h-5 text-crimson-700" />
                    <span>Coordinator Login</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Feature Highlights */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Instant Real-Time FIFO Allotment</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Locked Choice Security</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Verified College Email Access</span>
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 2. THREE FEATURE CARDS */}
      <section className="py-16 bg-white border-y border-gray-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-crimson-700">
              Key Capabilities
            </span>
            <h2 className="text-3xl font-bold text-gray-900 font-display mt-1">
              Engineered for Seamless Allotments
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Smart Selection */}
            <div className="p-8 rounded-2xl bg-surface-50 border border-gray-200/80 hover:border-crimson-300 hover:shadow-card-hover transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-crimson-100/70 text-crimson-700 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sliders className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 font-display mb-3">
                Smart Selection
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Students select and prioritize their preferred elective subjects using an intuitive drag-and-drop ranking interface. Once confirmed, preferences are locked securely.
              </p>
            </div>

            {/* Card 2: Automated Allotment */}
            <div className="p-8 rounded-2xl bg-gradient-to-b from-crimson-50/40 via-surface-50 to-white border border-crimson-200/80 hover:border-crimson-400 hover:shadow-card-hover transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-crimson-600 text-white text-[10px] uppercase font-extrabold rounded-bl-xl tracking-wider">
                Real-Time FIFO
              </div>
              <div className="w-14 h-14 rounded-2xl bg-crimson-700 text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-md shadow-crimson-700/20">
                <Cpu className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 font-display mb-3">
                Automated Allotment
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Subjects are automatically allotted according to priority, seat availability, and strict <strong>First-In, First-Out (FIFO)</strong> submission order immediately upon student confirmation.
              </p>
            </div>

            {/* Card 3: Transparent Management */}
            <div className="p-8 rounded-2xl bg-surface-50 border border-gray-200/80 hover:border-crimson-300 hover:shadow-card-hover transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-coral/20 text-crimson-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 font-display mb-3">
                Transparent Management
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Coordinators register students by email, configure PE and OE subjects independently, monitor live vacancy charts, and export separate print reports.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 3. CTA */}
      <section className="py-12 bg-gradient-to-r from-crimson-800 via-crimson-700 to-crimson-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h3 className="text-2xl sm:text-3xl font-bold font-display">
            Ready to access your elective portal?
          </h3>
          <p className="text-sm text-crimson-100 max-w-xl mx-auto">
            Log in with your official college email to prioritize your subjects or manage academic offerings.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/login?role=student"
              className="px-6 py-3 rounded-xl text-sm font-bold bg-white text-crimson-800 hover:bg-crimson-50 shadow-md transition-all"
            >
              Access Student Portal
            </Link>
            <Link
              to="/login?role=coordinator"
              className="px-6 py-3 rounded-xl text-sm font-bold bg-crimson-950/60 hover:bg-crimson-950 text-white border border-crimson-500/40 transition-all"
            >
              Access Coordinator Portal
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
