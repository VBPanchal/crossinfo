import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordInput } from '@/components/PasswordInput';
import { AppHeader } from '@/components/AppHeader';
import { motion } from 'framer-motion';
import logo from '@/assets/cossinfo-logo-new.png';
import { Mail, ArrowLeft, Loader2, KeyRound, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'otp' | 'newpass' | 'done'>('email');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Please enter your email'); return; }

    setLoading(true);
    // Use Supabase magic link / OTP for password recovery
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
      },
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('An 8-digit code has been sent to your email');
    setStep('otp');
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) { toast.error('Please enter the full code'); return; }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode,
      type: 'email',
    });
    setLoading(false);

    if (error) {
      toast.error('Invalid or expired code. Please try again.');
      return;
    }

    toast.success('Code verified! Set your new password.');
    setStep('newpass');
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/[A-Z]/.test(password)) { toast.error('Must include at least one uppercase letter'); return; }
    if (!/[0-9]/.test(password)) { toast.error('Must include at least one number'); return; }
    if (!/[^A-Za-z0-9]/.test(password)) { toast.error('Must include at least one special character'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    // Sign out so the user logs in with the new password
    await supabase.auth.signOut();
    setStep('done');
    toast.success('Password updated successfully!');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={logo} alt="CossInfo Logo" className="h-20 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {step === 'email' && 'Enter your email to receive a reset code'}
              {step === 'otp' && 'Enter the 8-digit code sent to your email'}
              {step === 'newpass' && 'Set your new password'}
              {step === 'done' && 'Password updated!'}
            </p>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                {step === 'email' && 'Forgot Password'}
                {step === 'otp' && 'Enter Code'}
                {step === 'newpass' && 'New Password'}
                {step === 'done' && 'Success'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Step 1: Email */}
              {step === 'email' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </label>
                    <Input type="email" placeholder="store@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {loading ? 'Sending...' : 'Send Reset Code'}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => navigate('/login')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Login
                  </Button>
                </form>
              )}

              {/* Step 2: OTP */}
              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    We sent a code to <strong>{email}</strong>
                  </p>
                  <div className="flex justify-center">
                    <InputOTP maxLength={8} value={otpCode} onChange={setOtpCode}>
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={loading || otpCode.length < 6}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep('email'); setOtpCode(''); }}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Change Email
                  </Button>
                </form>
              )}

              {/* Step 3: New Password */}
              {step === 'newpass' && (
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> New Password
                    </label>
                    <PasswordInput placeholder="Min 8 chars, 1 upper, 1 number, 1 special" value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Confirm Password
                    </label>
                    <PasswordInput placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              )}

              {/* Step 4: Done */}
              {step === 'done' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-foreground font-medium">Password Updated!</p>
                  <p className="text-sm text-muted-foreground">You can now log in with your new password.</p>
                  <Button className="w-full" onClick={() => navigate('/login')}>
                    Go to Login
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
