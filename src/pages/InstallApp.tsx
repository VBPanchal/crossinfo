import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/AppHeader';
import { Download, CheckCircle, Smartphone, Monitor, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="container mx-auto px-4 py-8 max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <img src="/pwa-icon-192.png" alt="CossInfo" className="h-20 w-20 mx-auto rounded-2xl shadow-md mb-3" />
            <CardTitle className="text-xl">Install CossInfo App</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add to your home screen for a faster, app-like experience
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInstalled ? (
              <div className="text-center py-4 space-y-2">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="font-medium text-foreground">App is installed!</p>
                <p className="text-sm text-muted-foreground">Open it from your home screen.</p>
              </div>
            ) : isIOS ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">To install on iPhone/iPad:</p>
                <div className="space-y-2">
                  {[
                    { icon: Share, text: 'Tap the Share button in Safari' },
                    { icon: Download, text: 'Scroll down and tap "Add to Home Screen"' },
                    { icon: CheckCircle, text: 'Tap "Add" to confirm' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {i + 1}
                      </div>
                      <step.icon className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : deferredPrompt ? (
              <Button onClick={handleInstall} className="w-full gap-2" size="lg">
                <Download className="h-5 w-5" /> Install App
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">To install:</p>
                <div className="space-y-2">
                  {[
                    { icon: Monitor, text: 'Open in Chrome or Edge browser' },
                    { icon: Download, text: 'Click the install icon in the address bar' },
                    { icon: CheckCircle, text: 'Confirm to install' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {i + 1}
                      </div>
                      <step.icon className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-border">
              <h3 className="text-sm font-semibold mb-2">Benefits</h3>
              <div className="grid grid-cols-2 gap-2">
                {['Works offline', 'Loads instantly', 'Home screen access', 'No app store needed'].map(b => (
                  <div key={b} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-green-500" /> {b}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
