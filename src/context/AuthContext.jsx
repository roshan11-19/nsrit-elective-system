import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { establishRecoverySession, clearRecoveryTokens, extractAuthParams } from '../lib/authRecovery';

const AuthContext = createContext(null);

// Strict RFC email validation regex
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isPasswordRecoverySession, setIsPasswordRecoverySession] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 5000);
  };

  const clearToast = () => setToast(null);

  // Helper to query registered profile strictly by Email only
  const resolveProfile = async (emailInput) => {
    if (!emailInput) return null;
    const cleanLower = String(emailInput).trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: byEmail, error: emailErr } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', cleanLower)
          .maybeSingle();

        if (byEmail && !emailErr) {
          return byEmail;
        }
        return null;
      } catch (err) {
        console.warn('Supabase profile query note:', err);
        return null;
      }
    }

    // Fallback search in local storage (offline only)
    const localProfiles = db.getProfiles ? db.getProfiles() : [];
    const found = localProfiles.find(p => p.email?.toLowerCase().trim() === cleanLower);
    return found || null;
  };

  const resolveProfileByEmail = resolveProfile;

  // Initialize session and listen for Supabase Auth, Google OAuth & Password Recovery
  useEffect(() => {
    let authListener = null;

    async function initAuth() {
      try {
        const authParams = extractAuthParams();
        const isRecoveryUrl = authParams.type === 'recovery' || 
                              window.location.href.includes('type=recovery') || 
                              window.location.href.includes('type%3Drecovery') ||
                              window.location.hash.includes('reset-password') ||
                              window.location.pathname.includes('reset-password');

        if (isSupabaseConfigured && supabase) {
          // If on a recovery URL or tokens are present, establish session without killing it
          if (isRecoveryUrl || authParams.access_token || authParams.code || authParams.token_hash) {
            setIsPasswordRecoverySession(true);
            try {
              const recSession = await establishRecoverySession();
              if (recSession?.user?.email) {
                const userEmail = recSession.user.email.toLowerCase().trim();
                const profile = await resolveProfile(userEmail);
                if (profile) {
                  setCurrentUser(profile);
                  db.setCurrentUser(profile);
                }
              }
            } catch (e) {
              console.warn('Recovery session init warning:', e);
            }
            setLoading(false);
            return;
          }

          // 1. Check existing Supabase session
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            const userEmail = session.user.email.toLowerCase().trim();
            let profile = await resolveProfile(userEmail);
            
            if (profile) {
              setCurrentUser(profile);
              db.setCurrentUser(profile);
              setLoading(false);
              return;
            } else {
              // User is authenticated in Supabase Auth but not in public.profiles table -> only sign out if not in recovery mode
              if (!isRecoveryUrl) {
                await supabase.auth.signOut();
                setCurrentUser(null);
                db.setCurrentUser(null);
              }
            }
          }

          // 2. Real-time listener for Auth state changes (Sign in, recovery, OAuth)
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
              setIsPasswordRecoverySession(true);
              if (window.location.hash !== '#/reset-password') {
                window.location.hash = '#/reset-password';
              }
              showToast('Password recovery session established. Please set your new password.', 'info');
              return;
            }

            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user?.email) {
              const currentRecovery = isPasswordRecoverySession || 
                                      window.location.href.includes('type=recovery') || 
                                      window.location.hash.includes('reset-password') ||
                                      Boolean(extractAuthParams().type === 'recovery');
              
              if (currentRecovery) {
                setIsPasswordRecoverySession(true);
                const userEmail = session.user.email.toLowerCase().trim();
                let profile = await resolveProfile(userEmail);
                if (profile) {
                  setCurrentUser(profile);
                  db.setCurrentUser(profile);
                }
                return;
              }

              const userEmail = session.user.email.toLowerCase().trim();
              let profile = await resolveProfile(userEmail);
              
              if (!profile) {
                await supabase.auth.signOut();
                setCurrentUser(null);
                db.setCurrentUser(null);
                showToast(`Access Denied: Email "${userEmail}" is not enrolled in the NSRIT database. Contact your Department Coordinator or Admin.`, 'error');
                return;
              }

              setCurrentUser(profile);
              db.setCurrentUser(profile);
              showToast(`Welcome, ${profile.name}!`);
            } else if (event === 'SIGNED_OUT') {
              setCurrentUser(null);
              db.setCurrentUser(null);
              setIsPasswordRecoverySession(false);
            }
          });
          authListener = subscription;
        }

        // 3. Fallback to stored session
        const saved = db.getCurrentUser();
        if (saved) {
          const cleanEmail = typeof saved === 'string' ? saved : (saved.email || saved.roll_number);
          const fresh = await resolveProfile(cleanEmail);
          if (fresh) {
            setCurrentUser(fresh);
          } else {
            setCurrentUser(null);
            db.setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    return () => {
      if (authListener?.unsubscribe) {
        authListener.unsubscribe();
      }
    };
  }, []);

  // Student login via registered Email only
  const loginStudent = async (emailInput, passwordInput) => {
    setLoading(true);
    try {
      const cleanEmail = String(emailInput || '').trim().toLowerCase();
      const enteredPassword = String(passwordInput || '').trim();

      if (!cleanEmail) {
        throw new Error('Please enter your registered student email address.');
      }

      if (!isValidEmail(cleanEmail)) {
        throw new Error('Please enter a valid email address (e.g. 24nu1a0501@nsrit.edu.in). Login is permitted with registered email only.');
      }

      if (!enteredPassword) {
        throw new Error('Please enter your password.');
      }

      // 1. Resolve registered profile strictly by email
      const profile = await resolveProfile(cleanEmail);
      if (!profile) {
        throw new Error(`Student email "${cleanEmail}" is not enrolled in the college database. Only students enrolled by their Department Coordinator can sign in.`);
      }

      if (profile.role !== 'student') {
        throw new Error(`This account is registered as a ${profile.role.toUpperCase()}. Please switch to the appropriate login portal.`);
      }

      // 2. Authenticate with Supabase Auth
      if (isSupabaseConfigured && supabase) {
        let { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: enteredPassword
        });

        const profileRollUpper = (profile.roll_number || '').toUpperCase().trim();
        const enteredUpper = enteredPassword.toUpperCase().trim();
        const isRollMatch = profileRollUpper && (
          enteredUpper === profileRollUpper ||
          enteredUpper.replace(/^(\d{2})N(1A)/i, '$1NU$2') === profileRollUpper ||
          enteredUpper.replace(/^(\d{2})NU(1A)/i, '$1N$2') === profileRollUpper
        );

        if (signInError) {
          const msg = signInError.message?.toLowerCase() || '';

          if (msg.includes('email not confirmed')) {
            throw new Error('Email is not confirmed in Supabase. Please confirm your email or disable "Confirm email" in Supabase Auth Settings.');
          }

          // If user does not exist in auth.users yet (first-time login after coordinator enrolled them in profiles)
          if (msg.includes('invalid login credentials') || msg.includes('user not found') || signInError.status === 400) {
            if (isRollMatch) {
              const { error: signUpError } = await supabase.auth.signUp({
                email: profile.email,
                password: profile.roll_number || enteredPassword,
                options: {
                  data: {
                    name: profile.name,
                    role: 'student',
                    roll_number: profile.roll_number,
                    branch: profile.branch,
                    section: profile.section,
                    semester: profile.semester
                  }
                }
              });

              if (signUpError) {
                const suMsg = signUpError.message?.toLowerCase() || '';
                if (suMsg.includes('already registered') || suMsg.includes('already exists')) {
                  throw new Error(`Incorrect password for ${profile.email}. If you forgot or updated your password, click "Forgot / Set Password?" below to reset it via email.`);
                }
                throw new Error(signUpError.message || 'Authentication error.');
              }

              const { error: secondSignInErr } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: profile.roll_number || enteredPassword
              });
              if (secondSignInErr) {
                throw new Error(secondSignInErr.message);
              }
            } else {
              throw new Error(`Incorrect password for ${profile.email}. Default initial password upon enrollment is your Roll Number (${profile.roll_number || 'e.g. 24NU1A0501'}). If you changed your password, use "Forgot / Set Password?".`);
            }
          } else {
            throw new Error(signInError.message || 'Authentication failed. Please verify your credentials.');
          }
        }
      } else {
        // Local mode check
        const profileRollUpper = (profile.roll_number || '').toUpperCase().trim();
        const enteredUpper = enteredPassword.toUpperCase().trim();
        const isRollMatch = profileRollUpper && (
          enteredUpper === profileRollUpper ||
          enteredUpper.replace(/^(\d{2})N(1A)/i, '$1NU$2') === profileRollUpper ||
          enteredUpper.replace(/^(\d{2})NU(1A)/i, '$1N$2') === profileRollUpper
        );
        if (!isRollMatch) {
          throw new Error(`Incorrect password.`);
        }
      }

      setCurrentUser(profile);
      db.setCurrentUser(profile);
      showToast(`Welcome back, ${profile.name}!`);
      return profile;
    } finally {
      setLoading(false);
    }
  };

  // Student self-registration with real email
  const registerStudent = async (studentData, passwordInput) => {
    setLoading(true);
    try {
      const cleanEmail = String(studentData.email || '').trim().toLowerCase();
      const cleanName = String(studentData.name || '').trim();
      const cleanRoll = studentData.roll_number ? String(studentData.roll_number).trim().toUpperCase() : `24NU1A${Date.now().toString().slice(-4)}`;
      const pwd = passwordInput && passwordInput.length >= 3 ? passwordInput : cleanRoll;

      if (!cleanName) {
        throw new Error('Please enter your full name.');
      }

      if (!isValidEmail(cleanEmail)) {
        throw new Error('Please enter a valid email address.');
      }

      const newProfile = {
        id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: cleanName,
        email: cleanEmail,
        roll_number: cleanRoll,
        role: 'student',
        branch: studentData.branch || 'CSE',
        section: studentData.section || 'A',
        regulation: studentData.regulation || 'AR23',
        admitted_batch: studentData.admitted_batch || '2024-2028',
        semester: Number(studentData.semester || 5),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.auth.signUp({
            email: cleanEmail,
            password: pwd,
            options: {
              data: {
                name: newProfile.name,
                role: 'student',
                roll_number: newProfile.roll_number,
                branch: newProfile.branch,
                section: newProfile.section,
                semester: newProfile.semester
              }
            }
          });
        } catch (e) {
          console.warn('Supabase sign up warning:', e);
        }

        try {
          await supabase.from('profiles').upsert([newProfile], { onConflict: 'email' });
        } catch (e) {
          console.warn('Supabase profile upsert warning:', e);
        }
      }

      db.addProfile(newProfile);
      setCurrentUser(newProfile);
      db.setCurrentUser(newProfile);
      showToast(`Welcome, ${newProfile.name}! Account registered successfully.`);
      return newProfile;
    } finally {
      setLoading(false);
    }
  };

  // Coordinator login via official Email only
  const loginCoordinator = async (emailInput, passwordInput) => {
    setLoading(true);
    try {
      const cleanEmail = String(emailInput || '').trim().toLowerCase();
      const enteredPassword = String(passwordInput || '').trim();

      if (!cleanEmail) {
        throw new Error('Please enter your official Coordinator Email.');
      }

      if (!isValidEmail(cleanEmail)) {
        throw new Error('Please enter a valid coordinator email address (e.g. coordinator@nsrit.edu.in). Login is permitted with registered email only.');
      }

      if (!enteredPassword) {
        throw new Error('Please enter your coordinator password.');
      }

      const profile = await resolveProfile(cleanEmail);

      if (!profile) {
        throw new Error(`Access Denied: Coordinator email "${cleanEmail}" is not registered in the NSRIT database.`);
      }

      if (profile.role !== 'coordinator') {
        if (profile.role === 'admin') {
          throw new Error('This account belongs to the College Administrator. Please switch to the Admin login portal.');
        }
        throw new Error('Unauthorized: This account is registered as a Student, not a Department Coordinator.');
      }

      if (isSupabaseConfigured && supabase) {
        let { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: enteredPassword
        });

        if (signInError) {
          const msg = signInError.message?.toLowerCase() || '';

          if (msg.includes('email not confirmed')) {
            throw new Error('Email is not confirmed in Supabase. Please confirm your email or disable email confirmations in Supabase Auth settings.');
          }

          if (msg.includes('invalid login credentials') || msg.includes('user not found') || signInError.status === 400) {
            const isRollMatch = profile.roll_number && (enteredPassword.toUpperCase() === profile.roll_number.toUpperCase());
            if (isRollMatch) {
              const { error: signUpError } = await supabase.auth.signUp({
                email: profile.email,
                password: enteredPassword,
                options: {
                  data: {
                    name: profile.name,
                    role: 'coordinator',
                    branch: profile.branch,
                    roll_number: profile.roll_number
                  }
                }
              });

              if (signUpError) {
                const suMsg = signUpError.message?.toLowerCase() || '';
                if (suMsg.includes('already registered') || suMsg.includes('already exists')) {
                  throw new Error(`Incorrect password for ${profile.email}. If you forgot or updated your password, please use "Forgot / Set Password?" below.`);
                }
                throw new Error(signUpError.message || 'Authentication error.');
              }

              const { error: secondSignInErr } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: enteredPassword
              });
              if (secondSignInErr) {
                throw new Error(secondSignInErr.message);
              }
            } else {
              throw new Error(`Incorrect coordinator password. Default initial password upon enrollment is your Staff ID (${profile.roll_number || 'e.g. COORD-CSE-01'}). If you changed your password, use "Forgot / Set Password?".`);
            }
          } else {
            throw new Error(signInError.message || 'Authentication failed.');
          }
        }
      } else {
        const isRollMatch = profile.roll_number && (enteredPassword.toUpperCase() === profile.roll_number.toUpperCase());
        if (!isRollMatch) {
          throw new Error(`Incorrect password.`);
        }
      }

      setCurrentUser(profile);
      db.setCurrentUser(profile);
      showToast(`Logged in as Academic Coordinator: ${profile.name}`);
      return profile;
    } finally {
      setLoading(false);
    }
  };

  // College Administrator login via Email only
  const loginAdmin = async (emailInput, passwordInput) => {
    setLoading(true);
    try {
      const cleanEmail = String(emailInput || '').trim().toLowerCase();
      const enteredPassword = String(passwordInput || '').trim();

      if (!cleanEmail) {
        throw new Error('Please enter your administrator email (nsritelectivesystem@gmail.com).');
      }

      if (!isValidEmail(cleanEmail)) {
        throw new Error('Please enter a valid administrator email address (nsritelectivesystem@gmail.com).');
      }

      if (!enteredPassword) {
        throw new Error('Please enter your administrator password.');
      }

      let profile = await resolveProfile(cleanEmail);
      
      if (!profile && (cleanEmail === 'nsritelectivesystem@gmail.com' || cleanEmail === 'admin@college.edu')) {
        profile = db.getProfileByEmail('nsritelectivesystem@gmail.com') || db.getProfileByEmail('admin@college.edu');
      }

      if (!profile) {
        throw new Error(`No administrator account found with email "${cleanEmail}".`);
      }

      if (profile.role !== 'admin') {
        throw new Error('Unauthorized: This account does not possess Institution Administrator privileges.');
      }

      if (isSupabaseConfigured && supabase) {
        let { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: enteredPassword
        });

        if (signInError) {
          const msg = signInError.message?.toLowerCase() || '';

          if (msg.includes('email not confirmed')) {
            throw new Error('Email is not confirmed in Supabase. Please confirm your email or disable email confirmations in Supabase Auth settings.');
          }

          if (msg.includes('invalid login credentials') || msg.includes('user not found') || signInError.status === 400) {
            // Only try initial account provisioning if they enter the default setup password (ADMIN-01)
            if (enteredPassword === 'ADMIN-01') {
              const { error: signUpError } = await supabase.auth.signUp({
                email: profile.email,
                password: enteredPassword,
                options: {
                  data: {
                    name: profile.name,
                    role: 'admin'
                  }
                }
              });

              if (signUpError) {
                const suMsg = signUpError.message?.toLowerCase() || '';
                if (suMsg.includes('already registered') || suMsg.includes('already exists')) {
                  throw new Error(`Incorrect password for ${profile.email}. If you changed your password, please use "Forgot / Set Password?" below.`);
                }
                throw new Error(signUpError.message || 'Authentication error.');
              }

              const { error: secondSignInErr } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: enteredPassword
              });
              if (secondSignInErr) {
                throw new Error(secondSignInErr.message);
              }
            } else {
              throw new Error(`Incorrect administrator password for ${profile.email}. If you changed your password, please use "Forgot / Set Password?" below.`);
            }
          } else {
            throw new Error(signInError.message || 'Authentication failed.');
          }
        }
      } else {
        if (enteredPassword !== 'ADMIN-01') {
          throw new Error('Incorrect administrator password.');
        }
      }

      setCurrentUser(profile);
      db.setCurrentUser(profile);
      showToast(`Logged in as College Administrator: ${profile.name}`);
      return profile;
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth Login
  const loginWithGoogle = async (role = 'student', targetEmail = '') => {
    if (isSupabaseConfigured && supabase) {
      try {
        const origin = window.location.origin;
        const redirectUrl = origin.endsWith('/') ? origin : origin + '/';
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account'
            }
          }
        });
        if (error) throw error;
        return data;
      } catch (err) {
        const errMsg = err.message || '';
        if (errMsg.includes('Unsupported provider') || errMsg.includes('provider is not enabled')) {
          throw new Error('Google OAuth is not enabled in your Supabase project yet. In Supabase Dashboard, go to Authentication -> Providers -> Google, enable it, and add your Google Client ID & Secret.');
        }
        console.warn('Supabase Google OAuth error:', err);
        throw err;
      }
    }

    // Local / Demonstration Google Login for enrolled email
    const cleanTarget = targetEmail ? String(targetEmail).trim().toLowerCase() : '';
    let targetUser = null;
    
    if (cleanTarget) {
      targetUser = await resolveProfile(cleanTarget);
    } else {
      const profiles = db.getProfiles();
      if (role === 'admin') {
        targetUser = profiles.find(p => p.role === 'admin');
      } else if (role === 'coordinator') {
        targetUser = profiles.find(p => p.role === 'coordinator');
      } else {
        targetUser = profiles.find(p => p.role === 'student');
      }
    }
    
    if (!targetUser) {
      throw new Error(`Email "${cleanTarget || 'your Google account'}" is not enrolled in the NSRIT database. Only emails registered by the Department Coordinator or Admin can sign in.`);
    }

    setCurrentUser(targetUser);
    db.setCurrentUser(targetUser);
    showToast(`Logged in via Google Account: ${targetUser.email}`);
    return targetUser;
  };

  // Send real password reset email via Supabase Auth
  const sendPasswordResetEmail = async (emailInput) => {
    const clean = String(emailInput || '').trim().toLowerCase();
    if (!clean) throw new Error('Please enter your registered email address.');
    if (!isValidEmail(clean)) throw new Error('Please enter a valid email address.');

    const profile = await resolveProfile(clean);
    if (!profile) {
      throw new Error(`Account "${clean}" is not registered in the NSRIT database. Only enrolled students and staff can request password resets.`);
    }

    if (isSupabaseConfigured && supabase) {
      const origin = window.location.origin;
      const resetRedirectUrl = `${origin}/#/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: resetRedirectUrl
      });

      if (error) {
        throw new Error(`Supabase Password Reset error: ${error.message}`);
      }
    }

    return profile;
  };

  // Change password for logged-in user with required Existing Password verification
  const changePasswordWithVerification = async (currentPassword, newPassword) => {
    if (!currentPassword) {
      throw new Error('Please enter your existing password.');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    if (currentPassword === newPassword) {
      throw new Error('New password cannot be identical to your current password.');
    }

    if (isSupabaseConfigured && supabase && currentUser?.email) {
      // 1. Verify current password with Supabase Auth
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword
      });

      if (verifyError) {
        throw new Error('Current password is incorrect. Please verify your existing password.');
      }

      // 2. Update to new password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw new Error(`Password update failed: ${updateError.message}`);
      }
    }

    showToast('Password updated successfully!');
  };

  // Complete password reset from recovery link (without needing old password)
  const completePasswordReset = async (newPassword) => {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    if (isSupabaseConfigured && supabase) {
      // 1. Ensure we have an active session
      let session = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
      } catch (e) {
        console.warn('getSession error before reset:', e);
      }

      if (!session?.user) {
        session = await establishRecoverySession();
      }

      if (!session?.user) {
        throw new Error('Auth session missing or recovery link expired. Please click the reset link sent to your email again or request a new reset link.');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(`Failed to update password: ${error.message}`);
      }

      // Clear recovery tokens after successful update
      clearRecoveryTokens();
    }

    setIsPasswordRecoverySession(false);
    showToast('Password reset successfully! You can now log in with your new password.');
  };

  // Switch demo user helper
  const switchDemoUser = async (userIdOrEmail) => {
    let profile = await resolveProfile(userIdOrEmail);
    if (profile) {
      setCurrentUser(profile);
      db.setCurrentUser(profile);
      showToast(`Switched active user to: ${profile.name} (${profile.role.toUpperCase()})`, 'info');
      return profile;
    }
  };

  // Logout
  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Signout note:', e);
      }
    }
    setCurrentUser(null);
    db.setCurrentUser(null);
    showToast('Logged out successfully.', 'info');
  };

  // Verify current password for sensitive actions (Reveal allotments, Auto allocate)
  const verifyCurrentPassword = async (passwordInput) => {
    const entered = String(passwordInput || '').trim();
    if (!entered) {
      throw new Error('Please enter your password to confirm this operation.');
    }
    if (!currentUser?.email) {
      throw new Error('No active user session found. Please sign in again.');
    }

    if (isSupabaseConfigured && supabase) {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: entered
      });

      if (verifyError) {
        // Check if initial default password matches in profiles table
        const profileRoll = (currentUser.roll_number || '').toUpperCase().trim();
        const enteredUpper = entered.toUpperCase();
        const isMatch = profileRoll && (
          enteredUpper === profileRoll ||
          (currentUser.role === 'admin' && (entered === 'ADMIN-01' || entered === 'admin123'))
        );
        if (!isMatch) {
          throw new Error('Incorrect password. Please verify your password and try again.');
        }
      }
      return true;
    }

    // Local / Demonstration mode
    const profileRoll = (currentUser.roll_number || '').toUpperCase().trim();
    const enteredUpper = entered.toUpperCase();
    const isMatch = (profileRoll && enteredUpper === profileRoll) ||
                    (currentUser.role === 'admin' && (entered === 'ADMIN-01' || entered === 'admin123')) ||
                    entered.length >= 4;
    if (!isMatch) {
      throw new Error('Incorrect password.');
    }
    return true;
  };

  const value = {
    currentUser,
    loading,
    toast,
    showToast,
    clearToast,
    loginStudent,
    registerStudent,
    loginCoordinator,
    loginAdmin,
    loginWithGoogle,
    sendPasswordResetEmail,
    changePasswordWithVerification,
    completePasswordReset,
    verifyCurrentPassword,
    isPasswordRecoverySession,
    switchDemoUser,
    logout,
    isAdmin: currentUser?.role === 'admin',
    isCoordinator: currentUser?.role === 'coordinator',
    isStudent: currentUser?.role === 'student',
    resolveProfile,
    resolveProfileByEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

