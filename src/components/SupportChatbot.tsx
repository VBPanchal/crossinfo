import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, X, Send, Bot, User, Loader2, Headphones } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'admin';
  text: string;
  time: Date;
}

const FAQ_DATA: { keywords: string[]; answer: string }[] = [
  { keywords: ['register', 'signup', 'sign up', 'create account', 'new store'], answer: 'To register a new store, go to the Login page and click "Register New Store". Fill in your store details, choose a plan, and verify your email with the OTP sent to you.' },
  { keywords: ['login', 'sign in', 'cannot login', 'forgot password'], answer: 'You can login with your email + password or use Email OTP. If you forgot your password, click "Forgot Password?" on the login page to reset it.' },
  { keywords: ['barcode', 'scan', 'scanner', 'camera'], answer: 'Use the barcode scanner in your dashboard to scan product barcodes. Make sure your browser has camera permissions enabled. The scanner supports both carton and packet barcodes.' },
  { keywords: ['stock', 'inventory', 'order', 'weekly'], answer: 'Navigate to the Stock Entry tab in your dashboard. Enter front stock and back stock for each product. The system calculates your weekly order needs automatically.' },
  { keywords: ['qr', 'customer order', 'pickup', 'delivery', 'collection'], answer: 'QR ordering lets your customers place orders by scanning a QR code. Enable it in Settings > QR Order Service. You can manage pickup/delivery settings and time slots there.' },
  { keywords: ['plan', 'pricing', 'upgrade', 'popular', 'business', 'enterprise', 'starter', 'billing', 'paypal'], answer: 'Starter plan ($29.99/mo): 500 SKUs. Popular plan ($49.99/mo): 500 SKUs + QR ordering (5 items). Business plan ($79.99/mo): 2,000 SKUs + QR ordering (20 items). Enterprise: unlimited + custom support. Upgrade in Settings > Plan & Billing. 5% off for 6-month, 10% off for yearly billing.' },
  { keywords: ['product', 'add product', 'sku', 'brand'], answer: 'Add products in the Products tab. Each product needs a brand name, unit type, and optional barcode. Free/Popular plans allow 500 SKUs, Business allows 2,000 SKUs.' },
  { keywords: ['time slot', 'schedule', 'hours'], answer: 'Set up time slots in Settings > QR Order Service. You can create pickup and delivery time slots for weekdays and weekends separately.' },
  { keywords: ['customer', 'directory', 'otp'], answer: 'Manage customers in Settings > Customer Directory. Adding a customer requires OTP verification via email and SMS for security.' },
  { keywords: ['community', 'chat', 'message'], answer: 'Community Chat is available for Popular and Enterprise plans. It provides anonymous multi-channel communication between store owners. Enable it in Settings.' },
  { keywords: ['password', 'change password', 'reset'], answer: 'To change your password, go to Settings > Profile & Security. To reset a forgotten password, use the "Forgot Password" link on the login page.' },
  { keywords: ['notification', 'alert', 'bell'], answer: 'You receive notifications for new customer registrations and orders. Check the bell icon in your dashboard header to view them.' },
  { keywords: ['pdf', 'report', 'export', 'download'], answer: 'You can generate PDF reports and CSV exports from your stock data and order history in the respective dashboard tabs.' },
  { keywords: ['install', 'app', 'pwa', 'mobile'], answer: 'CossInfo can be installed as an app on your phone! Visit /install for step-by-step instructions for iOS and Android.' },
];

function findFaqAnswer(query: string): string | null {
  const q = query.toLowerCase();
  let bestMatch: { answer: string; score: number } | null = null;
  for (const faq of FAQ_DATA) {
    const score = faq.keywords.filter(kw => q.includes(kw)).length;
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { answer: faq.answer, score };
    }
  }
  return bestMatch?.answer || null;
}

export function SupportChatbot() {
  const { user, storeId, storeName } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [humanMode, setHumanMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Add welcome message on open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        sender: 'bot',
        text: '👋 Hi! I\'m the CossInfo support bot. Ask me anything about the platform — registration, products, QR ordering, billing, and more. If I can\'t help, I\'ll connect you with our team!',
        time: new Date(),
      }]);
    }
  }, [open]);

  // Subscribe to realtime messages when in human mode
  useEffect(() => {
    if (!ticketId || !humanMode) return;
    const channel = supabase
      .channel(`support-${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${ticketId}`,
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_type === 'admin') {
          setMessages(prev => [...prev, {
            id: msg.id,
            sender: 'admin',
            text: msg.message,
            time: new Date(msg.created_at),
          }]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId, humanMode]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), sender: 'user', text: input.trim(), time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const query = input.trim();
    setInput('');

    if (humanMode && ticketId) {
      setSending(true);
      await supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_type: 'customer',
        message: query,
      });
      setSending(false);
      return;
    }

    // Check for escalation keywords
    const escalationKeywords = ['human', 'agent', 'support', 'person', 'help me', 'talk to someone', 'real person', 'not helpful'];
    const wantsHuman = escalationKeywords.some(kw => query.toLowerCase().includes(kw));

    if (wantsHuman || failedAttempts >= 2) {
      await escalateToHuman();
      return;
    }

    // Try FAQ matching
    const answer = findFaqAnswer(query);
    if (answer) {
      setFailedAttempts(0);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: answer,
          time: new Date(),
        }]);
      }, 500);
    } else {
      setFailedAttempts(prev => prev + 1);
      const attempts = failedAttempts + 1;
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          sender: 'bot',
          text: attempts >= 2
            ? "I'm sorry, I couldn't find an answer. Let me connect you with our support team. Type anything to create a support ticket, or click the button below."
            : "I'm not sure about that. Could you rephrase your question? Try asking about registration, products, billing, QR ordering, or other features.",
          time: new Date(),
        }]);
      }, 500);
    }
  };

  const escalateToHuman = async () => {
    if (!user || !storeId) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        sender: 'bot',
        text: '⚠️ Please log in to your store account first to create a support ticket.',
        time: new Date(),
      }]);
      return;
    }

    setSending(true);
    try {
      // Get store email
      const { data: store } = await supabase.from('stores').select('email, name').eq('id', storeId).single();

      // Create ticket
      const { data: ticket, error } = await supabase.from('support_tickets').insert({
        store_id: storeId,
        store_name: store?.name || storeName || '',
        store_email: store?.email || '',
        subject: 'Support Request',
      }).select().single();

      if (error) throw error;

      setTicketId(ticket.id);
      setHumanMode(true);

      // Insert chat history as first message
      const chatHistory = messages
        .filter(m => m.sender === 'user')
        .map(m => m.text)
        .join('\n');

      if (chatHistory) {
        await supabase.from('support_messages').insert({
          ticket_id: ticket.id,
          sender_type: 'customer',
          message: `[Chat history]\n${chatHistory}`,
        });
      }

      // Send email notification to developer
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'support-escalation',
          recipientEmail: 'dev@cossinfo.com',
          idempotencyKey: `support-escalation-${ticket.id}`,
          templateData: {
            storeName: store?.name || storeName || 'Unknown Store',
            storeId: storeId,
            storeEmail: store?.email || '',
            chatHistory: chatHistory || 'No prior messages',
          },
        },
      }).catch(() => {
        // Email sending is optional — don't block the flow
        console.warn('Email notification failed — continuing');
      });

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        sender: 'bot',
        text: '✅ You\'re now connected with our support team! A developer has been notified and will respond here shortly. Feel free to describe your issue in detail.',
        time: new Date(),
      }]);
    } catch (err) {
      console.error('Escalation error:', err);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        sender: 'bot',
        text: '❌ Something went wrong creating a support ticket. Please try again.',
        time: new Date(),
      }]);
    }
    setSending(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
            aria-label="Open support chat"
          >
            <MessageCircle className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-6rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {humanMode ? <Headphones className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                <div>
                  <p className="text-sm font-semibold">{humanMode ? 'Live Support' : 'CossInfo Support'}</p>
                  <p className="text-[10px] opacity-80">{humanMode ? 'Connected with our team' : 'Ask me anything'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {humanMode && <Badge variant="secondary" className="text-[9px] bg-white/20 text-white border-0">Live</Badge>}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-white/20" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : msg.sender === 'admin'
                        ? 'bg-accent/10 border border-accent/20 text-foreground rounded-bl-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                  }`}>
                    {msg.sender !== 'user' && (
                      <div className="flex items-center gap-1 mb-1">
                        {msg.sender === 'admin' ? <User className="h-3 w-3 text-primary" /> : <Bot className="h-3 w-3 text-muted-foreground" />}
                        <span className="text-[10px] font-medium text-muted-foreground">{msg.sender === 'admin' ? 'Support Team' : 'Bot'}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-[9px] mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {/* Escalation button */}
            {!humanMode && failedAttempts >= 2 && (
              <div className="px-3 pb-2">
                <Button size="sm" variant="outline" className="w-full gap-2 text-xs" onClick={escalateToHuman} disabled={sending}>
                  <Headphones className="h-3 w-3" /> Connect with Support Team
                </Button>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={e => { e.preventDefault(); handleSend(); }}
              className="border-t border-border p-3 flex gap-2 shrink-0"
            >
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={humanMode ? 'Type your message...' : 'Ask a question...'}
                className="text-sm h-9"
                disabled={sending}
              />
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!input.trim() || sending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
