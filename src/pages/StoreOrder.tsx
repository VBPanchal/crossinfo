import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShoppingBag, User, Phone, Clock, Package, CheckCircle, Loader2, Truck, Store as StoreIcon, X, MapPin, CalendarDays } from 'lucide-react';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import logo from '@/assets/cossinfo-logo-new.png';

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

type TimeSlot = { id: string; slot_label: string; slot_type: string; day_type: string };

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1100;
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.6);
  } catch {}
};

function OrderConfirmationCard({ orderConfirmation, storeName, orderType, onPlaceAnother }: {
  orderConfirmation: { id: string; status: string };
  storeName: string;
  orderType: string;
  onPlaceAnother: () => void;
}) {
  const [liveStatus, setLiveStatus] = useState(orderConfirmation.status);
  const [collectionNumber, setCollectionNumber] = useState<string | null>(null);

  useEffect(() => {
    const poll = setInterval(async () => {
      const { data } = await supabase.rpc('get_order_status_by_id', { _order_id: orderConfirmation.id });
      if (data && data.length > 0) {
        const row = data[0];
        if (row.status !== liveStatus) {
          setLiveStatus(row.status);
          if (row.status !== 'pending') playNotificationSound();
        }
        if (row.collection_number) setCollectionNumber(row.collection_number);
      }
    }, 5000);

    const channel = supabase
      .channel(`order-${orderConfirmation.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'customer_orders',
        filter: `id=eq.${orderConfirmation.id}`,
      }, (payload) => {
        const newData = payload.new as any;
        if (newData.status !== 'pending') playNotificationSound();
        setLiveStatus(newData.status);
        if (newData.collection_number) setCollectionNumber(newData.collection_number);
      })
      .subscribe();

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [orderConfirmation.id]);

  const statusConfig = liveStatus === 'approved'
    ? { color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200', cardBg: 'bg-green-50/50', label: 'Approved ✓', icon: <CheckCircle className="h-8 w-8 text-green-600" /> }
    : liveStatus === 'rejected'
    ? { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200', cardBg: 'bg-red-50/50', label: 'Rejected ✗', icon: <X className="h-8 w-8 text-red-600" /> }
    : { color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-green-200', cardBg: 'bg-green-50/50', label: 'Pending Review', icon: <CheckCircle className="h-8 w-8 text-green-600" /> };

  return (
    <Card className={`${statusConfig.border} ${statusConfig.cardBg}`}>
      <CardContent className="pt-8 pb-8 text-center space-y-4">
        <div className={`w-16 h-16 ${statusConfig.bg} rounded-full flex items-center justify-center mx-auto`}>
          {statusConfig.icon}
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {liveStatus === 'approved' ? 'Order Approved!' : liveStatus === 'rejected' ? 'Order Rejected' : 'Order Placed!'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {liveStatus === 'approved'
            ? `Your order at ${storeName} has been approved and is being processed.`
            : liveStatus === 'rejected'
            ? `Unfortunately, your order at ${storeName} was not accepted. Please contact the store for details.`
            : `Your order has been submitted to ${storeName}. This page will update automatically once reviewed.`}
        </p>
        {collectionNumber && liveStatus === 'approved' && (
          <div className="bg-primary/10 border-2 border-primary rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Your Collection Number</p>
            <p className="text-4xl font-black tracking-widest text-primary">{collectionNumber}</p>
            <p className="text-xs text-muted-foreground mt-1">Show this number at the store to collect your order</p>
          </div>
        )}
        <div className="bg-background rounded-lg p-4 text-left space-y-2 text-sm">
          <p><strong>Order ID:</strong> <span className="font-mono text-xs">{orderConfirmation.id.slice(0, 8)}...</span></p>
          <p><strong>Type:</strong> {orderType === 'pickup' ? 'Pickup' : 'Delivery'}</p>
          <p><strong>Status:</strong> <span className={`${statusConfig.color} font-medium`}>{statusConfig.label}</span></p>
        </div>
        <Button variant="outline" onClick={onPlaceAnother} className="gap-2">
          <ShoppingBag className="h-4 w-4" /> Place Another Order
        </Button>
      </CardContent>
    </Card>
  );
}

export default function StoreOrder() {
  const { slug } = useParams<{ slug: string }>();
  const [storeName, setStoreName] = useState('');
  const [showStoreName, setShowStoreName] = useState(true);
  const [storeFound, setStoreFound] = useState<boolean | null>(null);
  const [deliveryMode, setDeliveryMode] = useState('both');
  const [step, setStep] = useState<'login' | 'order' | 'done'>('login');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // login
  const [loginName, setLoginName] = useState('');
  const [loginContact, setLoginContact] = useState('');

  // order
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('pickup');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [orderDetails, setOrderDetails] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderConfirmation, setOrderConfirmation] = useState<{ id: string; status: string } | null>(null);

  const [resolvedStoreId, setResolvedStoreId] = useState('');
  
  // QR menu products
  type QrProduct = { id: string; display_name: string; display_order: number };
  const [qrProducts, setQrProducts] = useState<QrProduct[]>([]);
  const [productQtys, setProductQtys] = useState<Record<string, number>>({});
  const [qrOrderInputMode, setQrOrderInputMode] = useState<'products' | 'notes' | 'both'>('both');

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const { data: storeRows } = await supabase.rpc('get_public_store_by_slug', { _slug: slug });
        const store = storeRows && storeRows.length > 0 ? storeRows[0] : null;
        if (store && store.status === 'active') {
          const qrEnabled = (store as any).qr_service_enabled === true;
          const expiresAt = (store as any).qr_service_expires_at;
          const notExpired = !expiresAt || new Date(expiresAt) > new Date();
          if (!qrEnabled || !notExpired) {
            setStoreFound(false);
            setLoading(false);
            return;
          }
          setResolvedStoreId(store.id);
          setStoreName(store.name);
          setShowStoreName(store.show_store_name !== false);
          setDeliveryMode((store as any).delivery_mode || 'both');
          setQrOrderInputMode((store as any).qr_order_input_mode || 'both');
          setStoreFound(true);
          const [{ data: slots }, { data: qrProds }] = await Promise.all([
            supabase.rpc('get_active_time_slots_for_store', { _store_id: store.id }),
            supabase.rpc('get_qr_products_for_store', { _store_id: store.id }),
          ]);
          setTimeSlots(slots || []);
          setQrProducts((qrProds as QrProduct[]) || []);
        } else {
          setStoreFound(false);
        }
      } catch { setStoreFound(false); }
      setLoading(false);
    })();
  }, [slug]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedStoreId || !loginName.trim() || !loginContact.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('validate_store_customer' as any, {
        _store_id: resolvedStoreId,
        _name: loginName.trim(),
        _contact_no: loginContact.trim(),
      });
      if (error) throw error;
      const rows = data as any[];
      if (!rows || rows.length === 0) {
        toast.error('Customer not registered. Please contact store.');
        setSubmitting(false);
        return;
      }
      setCustomerId(rows[0].id);
      setCustomerName(rows[0].name);
      // Set default order type based on delivery mode
      if (deliveryMode === 'pickup_only') setOrderType('pickup');
      else if (deliveryMode === 'delivery_only') setOrderType('delivery');
      setStep('order');
      toast.success(`Welcome back, ${data[0].name}!`);
    } catch (err) {
      toast.error('Validation failed. Please try again.');
    }
    setSubmitting(false);
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    // Build order details from product quantities and/or free text based on input mode
    const showProducts = qrOrderInputMode !== 'notes' && qrProducts.length > 0;
    const showNotes = qrOrderInputMode !== 'products';
    const productPart = showProducts
      ? qrProducts.filter(p => (productQtys[p.id] || 0) > 0).map(p => `${p.display_name} x${productQtys[p.id]}`).join(', ')
      : '';
    const notesPart = showNotes ? orderDetails.trim() : '';
    const finalOrderDetails = [productPart, notesPart].filter(Boolean).join(' | ');
    if (!resolvedStoreId || !customerId || !finalOrderDetails) {
      if (showProducts && !productPart) toast.error('Please select at least one product.');
      else if (showNotes && !notesPart) toast.error('Please enter order details.');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      toast.error('Please enter a delivery address.');
      return;
    }
    setSubmitting(true);
    try {
      const slot = timeSlots.find(s => s.id === selectedSlot);
      const dayLabel = DAYS_OF_WEEK.find(d => d.value === selectedDay)?.label || selectedDay;
      let preferredTime = '';
      if (orderType === 'delivery') {
        preferredTime = dayLabel;
      } else {
        preferredTime = slot ? `${dayLabel} - ${slot.slot_label}` : dayLabel;
      }
      const newOrderId = crypto.randomUUID();
      const { error } = await supabase.from('customer_orders').insert({
        id: newOrderId,
        store_id: resolvedStoreId,
        customer_id: customerId,
        order_type: orderType,
        time_slot_id: selectedSlot || null,
        preferred_time: preferredTime,
        order_details: finalOrderDetails,
        status: 'pending',
        delivery_address: orderType === 'delivery' ? deliveryAddress : '',
      } as any);
      if (error) throw error;
      setOrderConfirmation({ id: newOrderId, status: 'pending' });
      toast.success('Order placed successfully!');
      setStep('done');

      // Notify store owner (fire and forget)
      supabase.functions.invoke('notify-store-order', {
        body: {
          storeId: resolvedStoreId,
          customerName: customerName,
          orderType,
          orderDetails: finalOrderDetails.substring(0, 200),
        },
      }).catch(err => console.error('Notification error:', err));
    } catch (err) {
      toast.error('Failed to place order.');
    }
    setSubmitting(false);
  };

  const isWeekday = ['monday','tuesday','wednesday','thursday','friday'].includes(selectedDay);
  const filteredSlots = selectedDay ? timeSlots.filter(s => {
    const typeMatch = s.slot_type === 'both' || s.slot_type === orderType;
    const dayMatch = s.day_type === 'all' || s.day_type === selectedDay || (s.day_type === 'weekday' && isWeekday) || (s.day_type === 'weekend' && !isWeekday);
    return typeMatch && dayMatch;
  }) : [];

  const showPickup = deliveryMode === 'pickup_only' || deliveryMode === 'both';
  const showDelivery = deliveryMode === 'delivery_only' || deliveryMode === 'both';

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (storeFound === false) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <StoreIcon className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold text-foreground">Store Not Found</h2>
          <p className="text-muted-foreground">This store link is invalid or the store is no longer active.</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-primary text-primary-foreground py-4 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src={logo} alt="CossInfo" className="h-12" />
          {showStoreName && (
            <div>
              <h1 className="text-lg font-bold">{storeName}</h1>
              <p className="text-xs opacity-80">Order Online</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 text-xs font-medium">
          {['Login', 'Order', 'Confirmed'].map((label, i) => {
            const stepMap = ['login', 'order', 'done'];
            const stepIdx = stepMap[i];
            const currentIdx = stepMap.indexOf(step);
            const isActive = step === stepIdx;
            const isDone = currentIdx > i;
            return (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={isDone || isActive ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
                {i < 2 && <div className="w-6 h-px bg-border mx-1" />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Login */}
        {step === 'login' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Customer Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                  <p className="text-sm text-foreground font-medium">Enter your registered details</p>
                  <p className="text-xs text-muted-foreground mt-1">Use the name and contact number registered with the store</p>
                </div>
                <div>
                  <Label className="flex items-center gap-1 mb-1"><User className="h-3 w-3" /> Name *</Label>
                  <Input value={loginName} onChange={e => setLoginName(e.target.value)} required placeholder="Your registered name" />
                </div>
                <div>
                  <Label className="flex items-center gap-1 mb-1"><Phone className="h-3 w-3" /> Contact Number *</Label>
                  <Input value={loginContact} onChange={e => setLoginContact(e.target.value)} required placeholder="04XX XXX XXX" />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Continue
                </Button>
                <p className="text-xs text-muted-foreground text-center">Not registered? Please contact the store to register.</p>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Order */}
        {step === 'order' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> Place Your Order</CardTitle>
              <p className="text-xs text-muted-foreground">Hi {customerName}! What would you like to order?</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOrder} className="space-y-4">
                {/* Order Type Selection - only show if both options available */}
                {showPickup && showDelivery && (
                  <div>
                    <Label className="mb-2 block">Order Type *</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => { setOrderType('pickup'); setSelectedSlot(''); setSelectedDay(''); }}
                        className={`p-4 rounded-lg border-2 text-center transition-all ${orderType === 'pickup' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <StoreIcon className={`h-6 w-6 mx-auto mb-1 ${orderType === 'pickup' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-medium ${orderType === 'pickup' ? 'text-primary' : 'text-foreground'}`}>Pickup</span>
                      </button>
                      <button type="button" onClick={() => { setOrderType('delivery'); setSelectedSlot(''); setSelectedDay(''); }}
                        className={`p-4 rounded-lg border-2 text-center transition-all ${orderType === 'delivery' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <Truck className={`h-6 w-6 mx-auto mb-1 ${orderType === 'delivery' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-medium ${orderType === 'delivery' ? 'text-primary' : 'text-foreground'}`}>Delivery*</span>
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">*Delivery availability depends on store settings and service area</p>
                  </div>
                )}

                {/* Show label for single mode */}
                {!showPickup || !showDelivery ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    {deliveryMode === 'pickup_only' ? <StoreIcon className="h-5 w-5 text-primary" /> : <Truck className="h-5 w-5 text-primary" />}
                    <span className="text-sm font-medium text-foreground">{deliveryMode === 'pickup_only' ? 'Pickup Only' : 'Delivery Only'}</span>
                  </div>
                ) : null}

                {/* Day Selection */}
                <div>
                  <Label className="flex items-center gap-1 mb-2"><CalendarDays className="h-3 w-3" /> Preferred Day *</Label>
                  <Select value={selectedDay} onValueChange={(val) => { setSelectedDay(val); setSelectedSlot(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a day" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Delivery Address */}
                {orderType === 'delivery' && showDelivery && (
                  <div>
                    <Label className="flex items-center gap-1 mb-1"><MapPin className="h-3 w-3" /> Delivery Address *</Label>
                    <AddressAutocomplete
                      value={deliveryAddress}
                      onChange={setDeliveryAddress}
                      onSelect={(addr) => {
                        setDeliveryAddress(`${addr.streetAddress}, ${addr.suburb}, ${addr.city} ${addr.pinCode}`.replace(/, ,/g, ',').trim());
                      }}
                      placeholder="Start typing your delivery address..."
                    />
                  </div>
                )}

                {orderType === 'pickup' && selectedDay && filteredSlots.length > 0 && (
                  <div>
                    <Label className="flex items-center gap-1 mb-2"><Clock className="h-3 w-3" /> Preferred Time Slot *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {filteredSlots.map(slot => (
                        <button key={slot.id} type="button" onClick={() => setSelectedSlot(slot.id)}
                          className={`p-2 rounded-md border text-xs font-medium transition-all ${selectedSlot === slot.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50 text-foreground'}`}>
                          {slot.slot_label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order Details — Product selection and/or free text based on store setting */}
                {qrOrderInputMode !== 'notes' && qrProducts.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Select Products {qrOrderInputMode === 'products' ? '*' : ''}</Label>
                    <div className="space-y-2">
                      {qrProducts.map(p => {
                        const qty = productQtys[p.id] || 0;
                        return (
                          <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                            <span className="text-sm font-medium text-foreground">{p.display_name}</span>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setProductQtys(prev => ({ ...prev, [p.id]: Math.max(0, qty - 1) }))}
                                className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-foreground hover:bg-muted">−</button>
                              <span className="w-8 text-center text-sm font-bold text-foreground">{qty}</span>
                              <button type="button" onClick={() => setProductQtys(prev => ({ ...prev, [p.id]: qty + 1 }))}
                                className="w-8 h-8 rounded-md border border-primary bg-primary/5 flex items-center justify-center text-primary hover:bg-primary/10">+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {Object.values(productQtys).some(q => q > 0) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {qrProducts.filter(p => (productQtys[p.id] || 0) > 0).map(p => `${p.display_name} x${productQtys[p.id]}`).join(', ')}
                      </p>
                    )}
                  </div>
                )}

                {qrOrderInputMode !== 'products' && (
                  <div>
                    <Label className="mb-1 block">Order Details {qrOrderInputMode === 'notes' ? '*' : '(optional)'}</Label>
                    <textarea value={orderDetails} onChange={e => setOrderDetails(e.target.value)}
                      placeholder="Describe what you'd like to order or add notes..."
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" />
                  </div>
                )}

                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Submit Order
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirmation */}
        {step === 'done' && orderConfirmation && (
          <OrderConfirmationCard
            orderConfirmation={orderConfirmation}
            storeName={storeName}
            orderType={orderType}
            onPlaceAnother={() => { setStep('order'); setOrderDetails(''); setSelectedSlot(''); setSelectedDay(''); setDeliveryAddress(''); setProductQtys({}); }}
          />
        )}

        <p className="text-center text-xs text-muted-foreground">Powered by <a href="https://www.cossinfo.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">CossInfo</a></p>
      </div>
    </div>
  );
}
