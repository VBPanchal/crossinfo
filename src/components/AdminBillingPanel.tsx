import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Tag, CreditCard, FileText, Loader2, Search } from 'lucide-react';

type Coupon = {
  id: string; code: string; description: string; discount_type: string;
  discount_value: number; max_uses: number | null; used_count: number;
  valid_from: string; valid_until: string | null; applicable_plans: string[];
  is_active: boolean; created_at: string;
};

export function AdminBillingPanel() {
  const [tab, setTab] = useState('coupons');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Coupon form
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponDesc, setCouponDesc] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState('');
  const [couponMaxUses, setCouponMaxUses] = useState('');
  const [couponValidUntil, setCouponValidUntil] = useState('');
  const [couponPlans, setCouponPlans] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [couponsRes, subsRes, logsRes, invoicesRes] = await Promise.all([
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      supabase.from('store_subscriptions').select('*, stores:store_id(name)').order('created_at', { ascending: false }).limit(100),
      supabase.from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setCoupons((couponsRes.data as any[]) || []);
    setSubscriptions(subsRes.data || []);
    setWebhookLogs(logsRes.data || []);
    setInvoices(invoicesRes.data || []);
    setLoading(false);
  };

  const handleSaveCoupon = async () => {
    if (!couponCode.trim() || !couponValue) { toast.error('Code and value are required'); return; }
    setSaving(true);
    const { error } = await supabase.from('coupons').insert({
      code: couponCode.toUpperCase().trim(),
      description: couponDesc,
      discount_type: couponType,
      discount_value: parseFloat(couponValue),
      max_uses: couponMaxUses ? parseInt(couponMaxUses) : null,
      valid_until: couponValidUntil || null,
      applicable_plans: couponPlans,
      is_active: true,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success('Coupon created!'); setCouponOpen(false); loadData(); }
    setSaving(false);
  };

  const toggleCoupon = async (id: string, active: boolean) => {
    await supabase.from('coupons').update({ is_active: !active } as any).eq('id', id);
    loadData();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from('coupons').delete().eq('id', id);
    toast.success('Coupon deleted');
    loadData();
  };

  if (loading) return <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading billing data...</div>;

  const filteredSubs = subscriptions.filter((s: any) =>
    !search || s.store_id?.toLowerCase().includes(search.toLowerCase()) || s.plan_type?.toLowerCase().includes(search.toLowerCase()) || s.status?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="coupons" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"><Tag className="h-3.5 w-3.5" /> Coupons</TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"><CreditCard className="h-3.5 w-3.5" /> Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"><FileText className="h-3.5 w-3.5" /> Invoices</TabsTrigger>
          <TabsTrigger value="events" className="text-xs gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"><Search className="h-3.5 w-3.5" /> Events</TabsTrigger>
        </TabsList>

        {/* Coupons Tab */}
        <TabsContent value="coupons" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Coupons ({coupons.length})</CardTitle>
              <Button size="sm" className="gap-1.5 text-xs bg-primary hover:bg-primary/90" onClick={() => { setCouponOpen(true); setCouponCode(''); setCouponDesc(''); setCouponValue(''); setCouponMaxUses(''); setCouponValidUntil(''); setCouponPlans([]); setCouponType('percentage'); }}>
                <Plus className="h-3.5 w-3.5" /> Create Coupon
              </Button>
            </CardHeader>
            <CardContent>
          {coupons.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No coupons created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground font-medium">Code</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Discount</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Uses</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Plans</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead><TableHead className="text-right text-xs text-muted-foreground font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map(c => (
                  <TableRow key={c.id} className="border-border/30">
                    <TableCell className="font-mono font-semibold text-primary">{c.code}</TableCell>
                    <TableCell className="font-medium">{c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`}</TableCell>
                    <TableCell className="text-muted-foreground">{c.used_count}{c.max_uses ? `/${c.max_uses}` : ''}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.applicable_plans?.length ? c.applicable_plans.join(', ') : 'All'}</TableCell>
                    <TableCell>
                      <Badge variant={c.is_active ? 'default' : 'secondary'} className={`text-[10px] ${c.is_active ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-muted text-muted-foreground'}`}>{c.is_active ? '● Active' : '○ Inactive'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="outline" size="sm" className="text-xs h-7 border-border/50" onClick={() => toggleCoupon(c.id, c.is_active)}>
                          {c.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => deleteCoupon(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by store ID, plan, status..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 border-border/50" />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs text-muted-foreground font-medium">Store</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Plan</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Mode</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Amount</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubs.map((s: any) => {
                    const statusColors: Record<string, string> = { active: 'bg-green-600/10 text-green-700 border-green-200', paused: 'bg-yellow-500/10 text-yellow-700 border-yellow-200', grace_period: 'bg-orange-500/10 text-orange-700 border-orange-200', expired: 'bg-muted text-muted-foreground border-border', cancelled: 'bg-destructive/10 text-destructive border-destructive/20' };
                    return (
                      <TableRow key={s.id} className="border-border/30">
                        <TableCell className="text-xs font-mono text-foreground">{s.store_id}</TableCell>
                        <TableCell className="capitalize text-xs font-medium">{s.plan_type}</TableCell>
                        <TableCell><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${statusColors[s.status] || 'bg-muted text-muted-foreground border-border'}`}>{s.status}</span></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.payment_mode}</TableCell>
                        <TableCell className="text-xs font-semibold">${Number(s.amount).toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Invoices ({invoices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs text-muted-foreground font-medium">Invoice #</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Store</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Plan</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Amount</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv: any) => (
                    <TableRow key={inv.id} className="border-border/30">
                      <TableCell className="font-mono text-xs text-primary font-semibold">{inv.invoice_number}</TableCell>
                      <TableCell className="text-xs font-mono text-foreground">{inv.store_id}</TableCell>
                      <TableCell className="capitalize text-xs text-muted-foreground">{inv.plan_type} — {inv.billing_cycle}</TableCell>
                      <TableCell className="text-xs font-semibold">${Number(inv.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(inv.issued_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Events Tab */}
        <TabsContent value="events" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Payment Events ({webhookLogs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs text-muted-foreground font-medium">Event</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Store</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhookLogs.map((log: any) => (
                    <TableRow key={log.id} className="border-border/30">
                      <TableCell className="text-xs font-medium text-foreground">{log.event_type}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{log.store_id || '—'}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] border-border/50">{log.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Coupon Dialog */}
      <Dialog open={couponOpen} onOpenChange={setCouponOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-primary" /> Create Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Coupon Code *</Label><Input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="WELCOME20" /></div>
            <div><Label className="text-xs">Description</Label><Input value={couponDesc} onChange={e => setCouponDesc(e.target.value)} placeholder="20% off first month" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Discount Type</Label>
                <Select value={couponType} onValueChange={(v) => setCouponType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Value *</Label><Input type="number" value={couponValue} onChange={e => setCouponValue(e.target.value)} placeholder={couponType === 'percentage' ? '20' : '10.00'} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Max Uses (empty = unlimited)</Label><Input type="number" value={couponMaxUses} onChange={e => setCouponMaxUses(e.target.value)} placeholder="100" /></div>
              <div><Label className="text-xs">Valid Until</Label><Input type="date" value={couponValidUntil} onChange={e => setCouponValidUntil(e.target.value)} /></div>
            </div>
            <div>
              <Label className="text-xs">Applicable Plans (empty = all)</Label>
              <div className="flex gap-2 mt-1">
                {['popular', 'enterprise'].map(p => (
                  <Button key={p} size="sm" variant={couponPlans.includes(p) ? 'default' : 'outline'} className="text-xs capitalize" onClick={() => setCouponPlans(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}>
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCouponOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCoupon} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
