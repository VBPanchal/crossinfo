import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordInput } from '@/components/PasswordInput';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/cossinfo-logo-new.png';
import { Store as StoreIcon, Copy, CheckCircle, Phone, Mail, MapPin, Tag, User, Lock, Loader2, Crown, KeyRound, ArrowLeft } from 'lucide-react';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AppHeader } from '@/components/AppHeader';
import { TermsAndConditions } from '@/components/TermsAndConditions';

type Step = 'form' | 'verify-email' | 'success';

export default function StoreRegistration() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planFromUrl = searchParams.get('plan') || 'starter';

  const planLabels: Record<string, { label: string; color: string; price: string }> = {
    starter: { label: 'Starter', color: 'secondary', price: '$29.99/mo' },
    popular: { label: 'Popular', color: 'default', price: '$49.99/mo' },
    business: { label: 'Business', color: 'default', price: '$79.99/mo' },
    enterprise: { label: 'Enterprise', color: 'default', price: 'Custom' },
  };
  const currentPlan = planLabels[planFromUrl] || planLabels.starter;

  const [step, setStep] = useState<Step>('form');
  const [selectedPlan, setSelectedPlan] = useState(planFromUrl);
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [refCodeDiscount, setRefCodeDiscount] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [generatedId, setGeneratedId] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Email OTP state
  const [emailOtp, setEmailOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  const validatePhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    return (digits.length === 10 && digits.startsWith('0')) || (digits.length === 11 && digits.startsWith('61'));
  };

  const validateEmail = (em: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);

  const handleContactChange = (value: string) => {
    const sanitized = value.replace(/[^0-9+\-() ]/g, '');
    setContactNo(sanitized);
    if (errors.contactNo) setErrors(prev => ({ ...prev, contactNo: '' }));
  };

  const clearError = (field: string) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Step 1: Validate form and send email OTP via Supabase Auth
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!storeName.trim()) newErrors.storeName = 'Store name is required';
    if (!ownerName.trim()) newErrors.ownerName = 'Owner/Manager name is required';
    if (!contactNo.trim()) newErrors.contactNo = 'Contact number is required';
    else if (!validatePhone(contactNo)) newErrors.contactNo = 'Enter a valid Australian number (e.g. 0412 345 678)';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!validateEmail(email)) newErrors.email = 'Enter a valid email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(password)) newErrors.password = 'Must include at least one uppercase letter';
    else if (!/[0-9]/.test(password)) newErrors.password = 'Must include at least one number';
    else if (!/[^A-Za-z0-9]/.test(password)) newErrors.password = 'Must include at least one special character';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!streetAddress.trim()) newErrors.streetAddress = 'Street address is required';
    if (!suburb.trim()) newErrors.suburb = 'Suburb is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!pinCode.trim()) newErrors.pinCode = 'Pin/Postal code is required';
    if (!termsAccepted) newErrors.terms = 'You must accept the Terms and Conditions';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fill all required fields correctly');
      return;
    }

    setErrors({});
    setLoading(true);

    // Check if email or contact already exists using security-definer function
    const { data: dupCheck, error: dupError } = await supabase.rpc('check_store_duplicate', {
      _email: email.trim(),
      _contact_no: contactNo.trim(),
    });

    if (!dupError && dupCheck && dupCheck.length > 0) {
      const { email_taken, contact_taken } = dupCheck[0];
      if (email_taken || contact_taken) {
        const newErrors: Record<string, string> = {};
        if (email_taken) newErrors.email = 'This email is already registered';
        if (contact_taken) newErrors.contactNo = 'This contact number is already registered';
        setErrors(newErrors);
        setLoading(false);
        toast.error(email_taken && contact_taken
          ? 'Both email and contact number are already registered'
          : email_taken ? 'This email is already registered' : 'This contact number is already registered');
        return;
      }
    }

    // Send email OTP using Supabase Auth signInWithOtp
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          data: {
            pending_registration: true,
          },
        },
      });
      if (error) {
        toast.error(error.message || 'Failed to send email OTP');
        setLoading(false);
        return;
      }
      setStep('verify-email');
      toast.success('Verification code sent to your email!');
    } catch {
      toast.error('Failed to send verification code');
    }
    setLoading(false);
  };

  // Step 2: Verify email OTP then register store
  const handleVerifyEmail = async () => {
    setOtpError('');
    if (emailOtp.length < 6) {
      setOtpError('Please enter the verification code');
      return;
    }
    setOtpLoading(true);

    try {
      // Verify the email OTP
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: emailOtp.trim(),
        type: 'email',
      });

      if (verifyError) {
        setOtpError(verifyError.message || 'Invalid code. Please try again.');
        setOtpLoading(false);
        return;
      }

      if (!verifyData.user) {
        setOtpError('Verification failed. Please try again.');
        setOtpLoading(false);
        return;
      }

      // Now update the user's password since they signed up via OTP
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        console.error('Failed to set password:', updateError);
      }

      // Create store
      const { data: newStoreId, error: idError } = await supabase.rpc('generate_store_id');
      if (idError || !newStoreId) throw idError ?? new Error('Failed to generate store ID');

      const combinedAddress = `${streetAddress.trim()}, ${suburb.trim()}, ${city.trim()} ${pinCode.trim()}`;
      const trialStartedAt = new Date().toISOString();
      const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const { error: storeError } = await supabase.from('stores').insert({
        id: newStoreId,
        user_id: verifyData.user.id,
        name: storeName.trim(),
        owner_name: ownerName.trim(),
        contact_no: contactNo.trim(),
        email: email.trim(),
        street_address: streetAddress.trim(),
        suburb: suburb.trim(),
        city: city.trim(),
        pin_code: pinCode.trim(),
        address: combinedAddress,
        ref_code_discount: refCodeDiscount.trim(),
        plan_type: selectedPlan,
        trial_started_at: trialStartedAt,
        trial_ends_at: trialEndsAt,
      } as any);

      if (storeError) throw storeError;

      // Notify backend admin of new registration (fire and forget)
      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'new-store-registration',
          recipientEmail: 'admin@cossinfo.com',
          idempotencyKey: `new-store-${newStoreId}-${Date.now()}`,
          templateData: {
            storeName: storeName.trim(),
            ownerName: ownerName.trim(),
            storeId: newStoreId,
            email: email.trim(),
            contactNo: contactNo.trim(),
            plan: selectedPlan,
            address: combinedAddress,
          },
        },
      }).catch(() => {});

      // Send welcome email to the new store owner
      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'welcome-store',
          recipientEmail: email.trim(),
          idempotencyKey: `welcome-store-${newStoreId}`,
          templateData: {
            storeName: storeName.trim(),
            ownerName: ownerName.trim(),
            storeId: newStoreId,
            plan: selectedPlan,
          },
        },
      }).catch(() => {});

      setGeneratedId(newStoreId);
      setStep('success');
      toast.success('Registration successful!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      toast.error(message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendEmailOtp = async () => {
    setOtpLoading(true);
    setOtpError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) {
        toast.error(error.message || 'Failed to resend');
      } else {
        toast.success('New code sent to your email!');
      }
    } catch {
      toast.error('Failed to resend code');
    }
    setOtpLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedId);
    setCopied(true);
    toast.success('Store ID copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          <div className="text-center mb-6">
            <img src={logo} alt="CossInfo Logo" className="h-20 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Register New Store</h1>
            <p className="text-muted-foreground text-sm mt-1">Create your account with email verification</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Badge variant={currentPlan.color as any} className="text-xs">{currentPlan.label} Plan — {currentPlan.price}</Badge>
              <Badge variant="outline" className="text-xs text-primary border-primary">14-day Free Trial</Badge>
            </div>
          </div>

          {/* Progress indicator */}
          {step !== 'success' && (
            <div className="flex items-center justify-center gap-2 mb-4">
              {['form', 'verify-email'].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s ? 'bg-primary text-primary-foreground' :
                    ['form', 'verify-email'].indexOf(step) > i ? 'bg-primary/20 text-primary' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {['form', 'verify-email'].indexOf(step) > i ? '✓' : i + 1}
                  </div>
                  {i < 1 && <div className={`w-8 h-0.5 ${['form', 'verify-email'].indexOf(step) > i ? 'bg-primary/40' : 'bg-muted'}`} />}
                </div>
              ))}
            </div>
          )}

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <StoreIcon className="h-5 w-5 text-primary" />
                {step === 'form' && 'Store Registration'}
                {step === 'verify-email' && 'Verify Email'}
                {step === 'success' && 'Registration Complete'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step === 'form' && (
                <form onSubmit={handleFormSubmit} className="space-y-4" autoComplete="off">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <StoreIcon className="h-3 w-3" /> Store Name *
                      </label>
                      <Input placeholder="e.g., My Grocery Store" value={storeName} onChange={e => { setStoreName(e.target.value); clearError('storeName'); }} className={errors.storeName ? 'border-destructive' : ''} />
                      {errors.storeName && <p className="text-xs text-destructive mt-1">{errors.storeName}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <User className="h-3 w-3" /> Owner / Manager Name *
                      </label>
                      <Input placeholder="e.g., John Smith" value={ownerName} onChange={e => { setOwnerName(e.target.value); clearError('ownerName'); }} className={errors.ownerName ? 'border-destructive' : ''} />
                      {errors.ownerName && <p className="text-xs text-destructive mt-1">{errors.ownerName}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Contact No *
                      </label>
                      <Input type="tel" placeholder="e.g., 0412 345 678" value={contactNo} onChange={e => handleContactChange(e.target.value)} className={errors.contactNo ? 'border-destructive' : ''} />
                      {errors.contactNo && <p className="text-xs text-destructive mt-1">{errors.contactNo}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email *
                      </label>
                      <Input type="email" placeholder="e.g., store@example.com" value={email} onChange={e => { setEmail(e.target.value); clearError('email'); }} className={errors.email ? 'border-destructive' : ''} />
                      {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Password *
                      </label>
                      <PasswordInput placeholder="Min 8 chars, 1 upper, 1 number, 1 special" value={password} onChange={e => { setPassword(e.target.value); clearError('password'); }} className={errors.password ? 'border-destructive' : ''} />
                      {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Confirm Password *
                      </label>
                      <PasswordInput placeholder="Re-enter password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }} className={errors.confirmPassword ? 'border-destructive' : ''} />
                      {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Street Address *
                    </label>
                    <AddressAutocomplete
                      value={streetAddress}
                      onChange={(val) => { setStreetAddress(val); clearError('streetAddress'); }}
                      onSelect={(addr) => {
                        setStreetAddress(addr.streetAddress);
                        setSuburb(addr.suburb);
                        setCity(addr.city);
                        setPinCode(addr.pinCode);
                        clearError('streetAddress');
                        clearError('suburb');
                        clearError('city');
                        clearError('pinCode');
                      }}
                      placeholder="Start typing your address..."
                      error={!!errors.streetAddress}
                      className={errors.streetAddress ? 'border-destructive' : ''}
                    />
                    {errors.streetAddress && <p className="text-xs text-destructive mt-1">{errors.streetAddress}</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1">Suburb *</label>
                      <Input placeholder="e.g., Richmond" value={suburb} onChange={e => { setSuburb(e.target.value); clearError('suburb'); }} className={errors.suburb ? 'border-destructive' : ''} />
                      {errors.suburb && <p className="text-xs text-destructive mt-1">{errors.suburb}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1">City *</label>
                      <Input placeholder="e.g., Melbourne" value={city} onChange={e => { setCity(e.target.value); clearError('city'); }} className={errors.city ? 'border-destructive' : ''} />
                      {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1">Pin Code *</label>
                      <Input placeholder="e.g., 3121" value={pinCode} onChange={e => { setPinCode(e.target.value.replace(/\D/g, '')); clearError('pinCode'); }} className={errors.pinCode ? 'border-destructive' : ''} />
                      {errors.pinCode && <p className="text-xs text-destructive mt-1">{errors.pinCode}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                      <Crown className="h-3 w-3" /> Select Plan
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['free', 'popular', 'business', 'enterprise'] as const).map(plan => {
                        const info = planLabels[plan];
                        return (
                          <button
                            key={plan}
                            type="button"
                            onClick={() => setSelectedPlan(plan)}
                            className={`rounded-lg border-2 p-3 text-center transition-all ${selectedPlan === plan ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                          >
                            <p className="text-xs font-bold text-foreground">{info.label}</p>
                            <p className="text-xs text-muted-foreground">{info.price}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                      <Tag className="h-3 w-3" /> Referral Code / Discount
                    </label>
                    <Input placeholder="Enter referral code (optional)" value={refCodeDiscount} onChange={e => setRefCodeDiscount(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => { setTermsAccepted(checked === true); clearError('terms'); }}
                        className={errors.terms ? 'border-destructive' : ''}
                      />
                      <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                        I agree to the{' '}
                        <button type="button" className="text-primary underline hover:text-primary/80" onClick={() => setShowTerms(true)}>
                          Terms and Conditions
                        </button>
                      </label>
                    </div>
                    {errors.terms && <p className="text-xs text-destructive ml-6">{errors.terms}</p>}
                  </div>
                  <Button type="submit" className="w-full gap-2 h-12 text-base font-semibold" disabled={loading}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
                    {loading ? 'Sending Verification...' : 'Verify Email & Register'}
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" className="flex-1 gap-1" onClick={() => navigate('/')}>
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button type="button" variant="ghost" className="flex-1" onClick={() => navigate('/login')}>
                      Already have an account? Login
                    </Button>
                  </div>
                </form>
              )}

              {step === 'verify-email' && (
                <div className="space-y-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
                    <Mail className="h-10 w-10 text-primary mx-auto mb-2" />
                    <p className="text-sm text-foreground font-medium">Enter OTP Sent to Your Email</p>
                    <p className="text-xs text-muted-foreground mt-1">Enter the code sent to <strong>{email}</strong></p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                      <KeyRound className="h-3 w-3" /> Enter Email OTP
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter code"
                      value={emailOtp}
                      onChange={e => { setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 8)); setOtpError(''); }}
                      className="text-center text-2xl tracking-[0.3em] font-mono"
                      maxLength={8}
                    />
                  </div>
                  {otpError && <p className="text-sm text-destructive text-center">{otpError}</p>}
                  <Button className="w-full gap-2 h-12 text-base font-semibold" disabled={otpLoading || emailOtp.length < 6} onClick={handleVerifyEmail}>
                    {otpLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <StoreIcon className="h-5 w-5" />}
                    {otpLoading ? 'Creating Account...' : 'Verify & Create Account'}
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" className="flex-1 text-sm gap-1" onClick={() => { setStep('form'); setOtpError(''); }}>
                      <ArrowLeft className="h-3 w-3" /> Back
                    </Button>
                    <Button type="button" variant="ghost" className="flex-1 text-sm" onClick={handleResendEmailOtp} disabled={otpLoading}>
                      Resend OTP
                    </Button>
                  </div>
                </div>
              )}

              {step === 'success' && (
                <div className="space-y-4 text-center py-4">
                  <CheckCircle className="h-12 w-12 text-primary mx-auto" />
                  <p className="text-lg font-bold text-foreground">Registration Successful!</p>
                  <p className="text-sm text-muted-foreground">Email verified ✓</p>

                  {generatedId && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <p className="text-sm text-muted-foreground">Your Store ID:</p>
                      <div className="flex items-center gap-2 justify-center">
                        <span className="text-2xl font-bold font-mono text-primary">{generatedId}</span>
                        <Button variant="ghost" size="icon" onClick={handleCopy}>
                          {copied ? <CheckCircle className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Save this ID for your records.</p>
                    </div>
                  )}

                  <Button className="w-full" onClick={() => navigate('/login')}>Go to Login</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <TermsAndConditions open={showTerms} onOpenChange={setShowTerms} />
    </div>
  );
}
