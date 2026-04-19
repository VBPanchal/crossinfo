import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Send, Hash, MessageSquare, Loader2, Trash2 } from 'lucide-react';

type Channel = { id: string; name: string; description: string };
type Message = { id: string; channel_id: string; store_id: string; message: string; created_at: string };

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
};

export function CommunityChat({ storeId, storeName }: { storeId: string; storeName?: string }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatMode, setChatMode] = useState<'anonymous' | 'named'>('anonymous');
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load channels + chat mode
  useEffect(() => {
    (async () => {
      const [{ data: channelsData }, { data: storeData }] = await Promise.all([
        supabase.from('community_channels').select('*').order('created_at'),
        supabase.from('stores').select('id, community_chat_mode').eq('id', storeId).maybeSingle(),
      ]);
      if (channelsData && channelsData.length > 0) {
        setChannels(channelsData as Channel[]);
        setActiveChannel(channelsData[0].id);
      }
      if (storeData) {
        setChatMode(storeData.community_chat_mode === 'named' ? 'named' : 'anonymous');
      }
      setLoading(false);
    })();
  }, [storeId]);

  // Load store names for named mode
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('stores').select('id, name');
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((s: any) => { map[s.id] = s.name; });
        setStoreNames(map);
      }
    })();
  }, []);

  // Load messages for active channel + realtime
  useEffect(() => {
    if (!activeChannel) return;
    let isMounted = true;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('community_messages')
        .select('*')
        .eq('channel_id', activeChannel)
        .order('created_at', { ascending: true })
        .limit(200);
      if (isMounted) {
        setMessages((data as Message[]) || []);
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
      }
    };
    loadMessages();

    const channel = supabase
      .channel(`community-${activeChannel}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_messages',
        filter: `channel_id=eq.${activeChannel}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.store_id !== storeId) {
          playNotificationSound();
          toast.info('New community message!', { icon: '💬' });
        }
        setMessages(prev => [...prev, msg]);
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'community_messages',
        filter: `channel_id=eq.${activeChannel}`,
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
      })
      .subscribe();

    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, [activeChannel, storeId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel || !storeId) return;
    setSending(true);
    try {
      const { error } = await supabase.from('community_messages').insert({
        channel_id: activeChannel,
        store_id: storeId,
        message: newMessage.trim(),
      });
      if (error) throw error;
      setNewMessage('');
    } catch {
      toast.error('Failed to send message');
    }
    setSending(false);
  };

  const handleDelete = async (msgId: string) => {
    await supabase.from('community_messages').delete().eq('id', msgId);
  };

  const toggleChatMode = async () => {
    const newMode = chatMode === 'anonymous' ? 'named' : 'anonymous';
    const { error } = await supabase.from('stores').update({ community_chat_mode: newMode }).eq('id', storeId);
    if (error) {
      toast.error('Failed to update chat mode');
      return;
    }
    setChatMode(newMode);
    toast.success(`Chat mode: ${newMode === 'anonymous' ? 'Anonymous' : 'Show Store Name'}`);
  };

  const getSenderLabel = (msg: Message) => {
    if (msg.store_id === storeId) return 'You';
    return 'Store Member';
  };

  const activeChannelName = channels.find(c => c.id === activeChannel)?.name || '';

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Community <span className="text-[10px] text-muted-foreground font-normal">👤 Anonymous</span></h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Channels sidebar */}
        <Card className="md:col-span-1">
          <CardHeader className="p-3">
            <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Channels</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {channels.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${activeChannel === ch.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}
              >
                <Hash className="h-3 w-3" /> {ch.name}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="md:col-span-3 flex flex-col" style={{ minHeight: '400px' }}>
          <CardHeader className="p-3 border-b">
            <CardTitle className="text-sm flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" /> {activeChannelName}
            </CardTitle>
          </CardHeader>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3" style={{ maxHeight: '350px' }}>
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Start the conversation!</p>
            ) : (
              messages.map(msg => {
                const isOwn = msg.store_id === storeId;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-semibold opacity-70">
                          {getSenderLabel(msg)}
                        </span>
                        <span className="text-[9px] opacity-50">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isOwn && (
                          <button onClick={() => handleDelete(msg.id)} className="opacity-50 hover:opacity-100 ml-auto">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="p-3 border-t">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder={`Message #${activeChannelName}...`}
                className="flex-1"
                disabled={sending}
              />
              <Button type="submit" size="sm" disabled={sending || !newMessage.trim()} className="gap-1">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
