import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordInput } from '@/components/PasswordInput';
import { motion } from 'framer-motion';
import logo from '@/assets/cossinfo-logo-new.png';
import { Store, Plus, Lock, ArrowLeft, Mail, Loader2, KeyRound, Clock, Users, Database, CreditCard, Settings as SettingsIcon } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { toast } from 'sonner';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!password) { setError('Please enter password'); return; }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.error) {
        setError(result.error);
        return;
      }
      navigate('/employee');
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    if (!email.trim()) { setError('Please enter your email'); return; }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ 
      email: email.trim(),
      options: {
        shouldCreateUser: false,
      }
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setOtpSent(true);
    toast.success('OTP sent to your email! Check your inbox.');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otpCode.trim()) { setError('Please enter the OTP code'); return; }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode.trim(),
      type: 'email',
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    toast.success('Login successful!');
    navigate('/employee');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logo} alt="CossInfo Logo" className="h-24 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Store Login</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your inventory dashboard</p>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Store Login
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Toggle between password and OTP */}
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant={mode === 'password' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => { setMode('password'); setOtpSent(false); setError(''); }}
                >
                  <Lock className="h-3 w-3" /> Password
                </Button>
                <Button
                  type="button"
                  variant={mode === 'otp' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => { setMode('otp'); setError(''); }}
                >
                  <KeyRound className="h-3 w-3" /> Email OTP
                </Button>
              </div>

              {mode === 'password' ? (
                <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                   <div>
                    <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                      <Mail className="h-3 w-3 text-primary" /> Email
                    </label>
                    <Input type="email" placeholder="store@example.com" value={email} onChange={e => setEmail(e.target.value)} className="text-center text-lg" aria-label="Email" autoComplete="off" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                      <Lock className="h-3 w-3 text-primary" /> Password
                    </label>
                    <PasswordInput placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="off" />
                  </div>
                  {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                  <Button type="submit" className="w-full gap-2 h-12 text-base font-semibold" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Store className="h-5 w-5" />}
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Button>
                  <Button type="button" variant="link" className="w-full text-sm text-primary" onClick={() => navigate('/forgot-password')}>
                    Forgot Password?
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                      <Mail className="h-3 w-3 text-primary" /> Email
                    </label>
                    <Input type="email" placeholder="store@example.com" value={email} onChange={e => setEmail(e.target.value)} className="text-center text-lg" aria-label="Email" />
                  </div>

                  {!otpSent ? (
                    <>
                      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                      <Button type="button" className="w-full gap-2 h-12 text-base font-semibold" disabled={loading} onClick={handleSendOtp}>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
                        {loading ? 'Sending OTP...' : 'Send OTP to Email'}
                      </Button>
                    </>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                        <p className="text-sm text-green-700 dark:text-green-400">✓ OTP sent to <strong>{email}</strong></p>
                        <p className="text-xs text-muted-foreground mt-1">Check your inbox and enter the code</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                          <KeyRound className="h-3 w-3 text-primary" /> Enter OTP Code
                        </label>
                         <Input
                          type="text"
                          placeholder="Enter code"
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                          className="text-center text-2xl tracking-[0.3em] font-mono"
                          maxLength={8}
                          aria-label="OTP Code"
                        />
                      </div>
                      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
                       <Button type="submit" className="w-full gap-2 h-12 text-base font-semibold" disabled={loading || otpCode.length < 6}>
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Store className="h-5 w-5" />}
                        {loading ? 'Verifying...' : 'Verify & Sign In'}
                      </Button>
                      <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => { setOtpSent(false); setOtpCode(''); }}>
                        Resend OTP
                      </Button>
                    </form>
                  )}
                </div>
              )}

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
              </div>

              <div className="space-y-2">
                <Button type="button" variant="outline" className="w-full gap-2" onClick={() => navigate('/register')}>
                  <Plus className="h-4 w-4" /> Register New Store
                </Button>
                <Button type="button" variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => navigate('/')}>
                  <ArrowLeft className="h-4 w-4" /> Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feature highlights */}
          <div className="mt-6">
            <p className="text-xs text-muted-foreground text-center mb-3 font-medium uppercase tracking-wider">Manage Everything in One Place</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[
                { icon: Store, label: 'Store Details', color: 'bg-primary text-primary-foreground' },
                { icon: Clock, label: 'Time Slots', color: 'bg-primary text-primary-foreground' },
                { icon: Users, label: 'Customers', color: 'bg-primary text-primary-foreground' },
                { icon: Database, label: 'Data Management', color: 'bg-primary text-primary-foreground' },
                { icon: CreditCard, label: 'Plan & Billing', color: 'bg-primary text-primary-foreground' },
              ].map((feat, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-muted/50 border border-border/50">
                  <div className={`w-8 h-8 rounded-lg ${feat.color} flex items-center justify-center`}>
                    <feat.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">{feat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
