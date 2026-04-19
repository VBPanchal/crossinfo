import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppHeader } from '@/components/AppHeader';
import { CheckCircle, XCircle, Loader2, MailX } from 'lucide-react';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error'>('loading');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (!res.ok) { setStatus('invalid'); return; }
        if (data.valid === false && data.reason === 'already_unsubscribed') {
          setStatus('already');
        } else if (data.valid) {
          setStatus('valid');
        } else {
          setStatus('invalid');
        }
      } catch { setStatus('invalid'); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) { setStatus('success'); }
      else if (data?.reason === 'already_unsubscribed') { setStatus('already'); }
      else { setStatus('error'); }
    } catch { setStatus('error'); }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            {status === 'loading' && (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Validating...</p>
              </>
            )}
            {status === 'valid' && (
              <>
                <MailX className="h-10 w-10 text-primary mx-auto" />
                <h2 className="text-xl font-bold text-foreground">Unsubscribe from emails</h2>
                <p className="text-sm text-muted-foreground">
                  You will no longer receive app emails from CossInfo. Auth emails (password reset, etc.) are not affected.
                </p>
                <Button onClick={handleUnsubscribe} disabled={processing} className="w-full">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirm Unsubscribe
                </Button>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="h-10 w-10 text-success mx-auto" />
                <h2 className="text-xl font-bold text-foreground">Unsubscribed</h2>
                <p className="text-sm text-muted-foreground">You've been successfully unsubscribed from app emails.</p>
              </>
            )}
            {status === 'already' && (
              <>
                <CheckCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-bold text-foreground">Already unsubscribed</h2>
                <p className="text-sm text-muted-foreground">This email address has already been unsubscribed.</p>
              </>
            )}
            {(status === 'invalid' || status === 'error') && (
              <>
                <XCircle className="h-10 w-10 text-destructive mx-auto" />
                <h2 className="text-xl font-bold text-foreground">Invalid link</h2>
                <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or has expired.</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
