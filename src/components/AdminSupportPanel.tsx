import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Headphones, Send, Loader2, CheckCircle, Clock, AlertCircle, Store, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface Ticket {
  id: string;
  store_id: string;
  store_name: string;
  store_email: string;
  status: string;
  subject: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_type: string;
  message: string;
  created_at: string;
}

export function AdminSupportPanel() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTickets();
    // Realtime for new tickets
    const channel = supabase
      .channel('admin-support-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        loadTickets();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!selectedTicket) return;
    loadMessages(selectedTicket.id);
    const channel = supabase
      .channel(`admin-msgs-${selectedTicket.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${selectedTicket.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const loadTickets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .order('updated_at', { ascending: false });
    setTickets((data as Ticket[]) || []);
    setLoading(false);
  };

  const loadMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) || []);
  };

  const handleReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    setSending(true);
    const { error } = await supabase.from('support_messages').insert({
      ticket_id: selectedTicket.id,
      sender_type: 'admin',
      message: reply.trim(),
    });
    if (error) {
      toast.error('Failed to send reply');
    } else {
      setReply('');
      // Update ticket status to in_progress if open
      if (selectedTicket.status === 'open') {
        await supabase.from('support_tickets').update({ status: 'in_progress' }).eq('id', selectedTicket.id);
        setSelectedTicket(prev => prev ? { ...prev, status: 'in_progress' } : null);
        loadTickets();
      }
    }
    setSending(false);
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    await supabase.from('support_tickets').update({ status: 'closed' }).eq('id', selectedTicket.id);
    setSelectedTicket(prev => prev ? { ...prev, status: 'closed' } : null);
    loadTickets();
    toast.success('Ticket closed');
  };

  const filteredTickets = tickets.filter(t => statusFilter === 'all' || t.status === statusFilter);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-3 w-3 text-warning" />;
      case 'in_progress': return <Clock className="h-3 w-3 text-primary" />;
      case 'closed': return <CheckCircle className="h-3 w-3 text-success" />;
      default: return null;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-warning/10 text-warning border-warning/20';
      case 'in_progress': return 'bg-primary/10 text-primary border-primary/20';
      case 'closed': return 'bg-muted text-muted-foreground border-border';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Headphones className="h-4 w-4 text-primary" />
          Support Tickets ({tickets.filter(t => t.status !== 'closed').length} active)
        </h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: '400px' }}>
        {/* Ticket list */}
        <Card className="glass-card md:col-span-1">
          <CardContent className="p-2">
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : filteredTickets.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No tickets found</p>
              ) : filteredTickets.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${selectedTicket?.id === t.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {statusIcon(t.status)}
                    <span className="text-xs font-medium truncate flex-1">{t.store_name || t.store_id}</span>
                    <Badge variant="outline" className={`text-[9px] ${statusColor(t.status)}`}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </button>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat panel */}
        <Card className="glass-card md:col-span-2">
          {selectedTicket ? (
            <div className="flex flex-col h-[450px]">
              {/* Ticket header */}
              <div className="border-b border-border p-3 flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{selectedTicket.store_name || selectedTicket.store_id}</span>
                    <Badge variant="outline" className={`text-[9px] ${statusColor(selectedTicket.status)}`}>{selectedTicket.status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{selectedTicket.store_email}</span>
                    <span className="text-[10px] text-muted-foreground">ID: {selectedTicket.store_id}</span>
                  </div>
                </div>
                {selectedTicket.status !== 'closed' && (
                  <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleCloseTicket}>
                    <CheckCircle className="h-3 w-3" /> Close
                  </Button>
                )}
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                      msg.sender_type === 'admin'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap text-xs">{msg.message}</p>
                      <p className={`text-[9px] mt-1 ${msg.sender_type === 'admin' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              {selectedTicket.status !== 'closed' && (
                <form onSubmit={e => { e.preventDefault(); handleReply(); }} className="border-t border-border p-3 flex gap-2 shrink-0">
                  <Input
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    placeholder="Type your reply..."
                    className="text-sm h-9"
                    disabled={sending}
                  />
                  <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!reply.trim() || sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              )}
            </div>
          ) : (
            <CardContent className="h-[450px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Headphones className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select a ticket to view the conversation</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
