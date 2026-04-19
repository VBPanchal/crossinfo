import React, { useState, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { saveFeedback } from '@/lib/supabase-store';
import logo from '@/assets/cossinfo-logo-new.png';
import { MessageSquare, Mail, ExternalLink, CheckCircle, Bot, Zap, Megaphone, Monitor } from 'lucide-react';

const ContactUsDialog = forwardRef<HTMLDivElement, { open: boolean; onOpenChange: (v: boolean) => void }>(function ContactUsDialog({ open, onOpenChange }, ref) {
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackName.trim() || !feedbackEmail.trim() || !feedbackMessage.trim()) {
      toast.error('Please fill all fields'); return;
    }
    try {
      await saveFeedback({
        name: feedbackName.trim(),
        email: feedbackEmail.trim(),
        message: feedbackMessage.trim(),
      });
      toast.success('Thank you for your feedback!');
      setFeedbackName(''); setFeedbackEmail(''); setFeedbackMessage('');
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch (err) {
      toast.error('Failed to submit feedback');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Contact Us
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="text-center space-y-3">
            <img src={logo} alt="CossInfo" className="h-16 mx-auto" />
            <a href="https://www.cossinfo.com" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center justify-center gap-1">
              <ExternalLink className="h-3 w-3" /> www.cossinfo.com
            </a>
          </div>
          <div>
            <a href="mailto:hello@cossinfo.com" className="flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-accent hover:text-accent-foreground transition-colors">
              <Mail className="h-4 w-4 text-primary" /><span className="text-sm font-medium">hello@cossinfo.com</span>
            </a>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Our Services</h3>
            <div className="grid grid-cols-2 gap-2">
              {[{ icon: Bot, label: 'Agentic AI Solutions' }, { icon: Zap, label: 'AI Automation' }, { icon: Megaphone, label: 'Digital Marketing' }, { icon: Monitor, label: 'Custom CRM / Softwares' }].map(s => (
                <div key={s.label} className="flex items-center gap-2 p-2 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
                  <s.icon className="h-3.5 w-3.5 text-primary flex-shrink-0" /> {s.label}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Send Feedback</h3>
            {feedbackSent ? (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Thanks! We'll get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleFeedback} className="space-y-3">
                <Input placeholder="Your name" value={feedbackName} onChange={e => setFeedbackName(e.target.value)} required />
                <Input type="email" placeholder="Your email" value={feedbackEmail} onChange={e => setFeedbackEmail(e.target.value)} required />
                <Textarea placeholder="Your message..." value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} rows={3} required />
                <Button type="submit" size="sm" className="w-full gap-2"><MessageSquare className="h-3 w-3" /> Send Feedback</Button>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

interface AppHeaderProps {
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export function AppHeader({ leftContent, rightContent }: AppHeaderProps) {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <>
      <header className="border-b border-border bg-card px-3 sm:px-4 py-3">
        <div className="container mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {leftContent || (
              <img src={logo} alt="CossInfo" className="h-14" />
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {rightContent}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setContactOpen(true)}>
              <MessageSquare className="h-4 w-4" /> <span className="hidden sm:inline">Contact Us</span>
            </Button>
          </div>
        </div>
      </header>
      <ContactUsDialog open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
}
