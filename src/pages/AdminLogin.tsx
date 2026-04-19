import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordInput } from '@/components/PasswordInput';
import { motion } from 'framer-motion';
import logo from '@/assets/cossinfo-logo-new.png';
import { Shield, Lock, Loader2, AlertTriangle } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const [lockCountdown, setLockCountdown] = useState('');

  // MFA state
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaChallengeId, setMfaChallengeId] = useState('');

  // If already logged in as admin, redirect immediately
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: isAdm } = await supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' });
        if (isAdm) navigate('/backend', { replace: true });
      }
    })();
  }, [navigate]);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockedUntil) { setLockCountdown(''); return; }
    const interval = setInterval(() => {
      const remaining = lockedUntil.getTime() - Date.now();
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setLockCountdown('');
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setLockCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  // Check lockout from stored attempts
  useEffect(() => {
    const stored = localStorage.getItem('admin_login_lockout');
    if (stored) {
      const lockTime = new Date(stored);
      if (lockTime.getTime() > Date.now()) {
        setLockedUntil(lockTime);
      } else {
        localStorage.removeItem('admin_login_lockout');
      }
    }
    const storedAttempts = localStorage.getItem('admin_login_attempts');
    if (storedAttempts) setAttempts(parseInt(storedAttempts) || 0);
  }, []);

  const recordAttempt = (success: boolean) => {
    if (success) {
      setAttempts(0);
      localStorage.removeItem('admin_login_attempts');
      localStorage.removeItem('admin_login_lockout');
      return;
    }
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    localStorage.setItem('admin_login_attempts', String(newAttempts));

    if (newAttempts >= MAX_ATTEMPTS) {
      const lockTime = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      setLockedUntil(lockTime);
      localStorage.setItem('admin_login_lockout', lockTime.toISOString());
    }

  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (lockedUntil && lockedUntil.getTime() > Date.now()) {
      setError(`Account locked. Try again in ${lockCountdown}`);
      return;
    }

    if (!email.trim() || !password) { setError('Please enter email and password'); return; }

    setLoading(true);
    await supabase.auth.signOut();

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      recordAttempt(false);
      const remaining = MAX_ATTEMPTS - (attempts + 1);
      setError(remaining > 0
        ? `${authError.message} (${remaining} attempt${remaining !== 1 ? 's' : ''} remaining)`
        : `Too many failed attempts. Locked for ${LOCKOUT_MINUTES} minutes.`
      );
      setLoading(false);
      return;
    }

    // Check admin role
    const { data: roleData } = await supabase.rpc('has_role', { _user_id: data.user.id, _role: 'admin' });
    if (!roleData) {
      await supabase.auth.signOut();
      recordAttempt(false);
      setError('You do not have developer access');
      setLoading(false);
      return;
    }

    // Check for MFA enrollment
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactors = factorsData?.totp || [];
    const verifiedFactor = totpFactors.find(f => f.status === 'verified');

    if (verifiedFactor) {
      // MFA is enrolled — challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id });
      if (challengeError) {
        setError('Failed to initiate 2FA challenge');
        setLoading(false);
        return;
      }
      setMfaFactorId(verifiedFactor.id);
      setMfaChallengeId(challengeData.id);
      setMfaStep(true);
      setLoading(false);
      return;
    }

    // No MFA — proceed
    recordAttempt(true);
    // Log to audit
    // Login attempt logging removed — handled server-side only
    setLoading(false);
    navigate('/backend', { replace: true });
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode.trim()) { setError('Please enter 2FA code'); return; }

    setLoading(true);
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code: mfaCode.trim(),
    });

    if (verifyError) {
      setError('Invalid 2FA code. Please try again.');
      setLoading(false);
      return;
    }

    recordAttempt(true);
    // Login attempt logging removed — handled server-side only
    setLoading(false);
    toast.success('2FA verified successfully');
    navigate('/backend', { replace: true });
  };

  const isLocked = lockedUntil && lockedUntil.getTime() > Date.now();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logo} alt="CossInfo Logo" className="h-20 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Developer Panel</h1>
            <p className="text-muted-foreground text-sm mt-1">Developer Management System</p>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                {mfaStep ? '2FA Verification' : 'Developer Login'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLocked && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Account Locked</p>
                    <p className="text-xs text-destructive/80">Too many failed attempts. Try again in {lockCountdown}</p>
                  </div>
                </div>
              )}

              {!mfaStep ? (
                <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                    <Input type="email" placeholder="developer@cossinfo.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="off" disabled={!!isLocked} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1"><Lock className="h-3 w-3 text-primary" /> Password</label>
                    <PasswordInput placeholder="Enter developer password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="off" disabled={!!isLocked} />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  {attempts > 0 && attempts < MAX_ATTEMPTS && !isLocked && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      ⚠️ {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining before lockout
                    </p>
                  )}
                  <Button type="submit" className="w-full gap-2" disabled={loading || !!isLocked}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                    {loading ? 'Signing In...' : 'Login as Developer'}
                  </Button>
                  <Button type="button" variant="link" className="w-full text-sm text-primary" onClick={() => navigate('/forgot-password')}>
                    Forgot Password?
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/')}>Back to Home</Button>
                </form>
              ) : (
                <form onSubmit={handleMfaVerify} className="space-y-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                    <p className="text-sm text-foreground">Enter the 6-digit code from your authenticator app</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                      <Shield className="h-3 w-3 text-primary" /> 2FA Code
                    </label>
                    <Input
                      type="text"
                      placeholder="000000"
                      value={mfaCode}
                      onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="text-center text-2xl tracking-[0.3em] font-mono"
                      maxLength={6}
                      autoFocus
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full gap-2" disabled={loading || mfaCode.length < 6}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => { setMfaStep(false); setMfaCode(''); setError(''); }}>
                    Back to Login
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
