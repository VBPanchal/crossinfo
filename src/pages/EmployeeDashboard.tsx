import { useState, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getProducts, getStockEntries, saveStockEntry, sendToWebhook, getProductByBarcode, getGlobalProductByBarcode, searchGlobalProducts, saveProduct, getGlobalProducts, getStorePortfolio, deleteStockEntry, deleteStockEntriesByWeek, createOrder, calculateSuggestedOrder } from '@/lib/supabase-store';
import type { DbStoreProduct, DbStockEntry, DbGlobalProduct, UnitSuggestionRules } from '@/lib/supabase-store';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { ScanHistoryPanel } from '@/components/ScanHistoryPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { LogOut, FileDown, LayoutGrid, ArrowLeftRight, Save, Settings, Search, Pencil, Trash2, History, ChevronDown, ChevronUp, ChevronRight, Loader2, Bell, ShoppingBag, Check, X, MessageSquare, Share2, Filter, Menu, Download, Mail, Printer } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import logo from '@/assets/cossinfo-logo-new.png';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { CommunityChat } from '@/components/CommunityChat';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { TermsAndConditions } from '@/components/TermsAndConditions';

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

type StockSide = 'front' | 'back';

interface ScanItem {
  barcode: string;
  brandName: string;
  timestamp: string;
  action: string;
}

interface GroupedEntry {
  brandName: string;
  manufacturerName: string;
  unitName: string;
  avgCartons: number;
  avgSalesUnit: 'carton' | 'packet';
  frontStockPkt: number;
  backStockCartons: number;
  packetsPerCarton: number;
  suggestOrder: number;
  suggestOrderUnit: 'carton' | 'packet';
  entryIds: string[];
}

export default function EmployeeDashboard() {
  const { user, storeId, storeName, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<DbStockEntry[]>([]);
  const [stockSide, setStockSide] = useState<StockSide>('front');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanItem[]>(() => {
    try {
      const saved = localStorage.getItem(`scanHistory_employee_${storeId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DbStoreProduct[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allProducts, setAllProducts] = useState<DbStoreProduct[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const [savingStock, setSavingStock] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [qrServiceActive, setQrServiceActive] = useState(false);
  const [storePlanType, setStorePlanType] = useState('starter');
  const [unitSuggestionRules, setUnitSuggestionRules] = useState<UnitSuggestionRules>({});

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editBrand, setEditBrand] = useState('');
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');
  const [editAvg, setEditAvg] = useState('');
  const [editOrder, setEditOrder] = useState('');
  const [editEntryIds, setEditEntryIds] = useState<string[]>([]);

  const [showHistory, setShowHistory] = useState(false);
  const [showScans, setShowScans] = useState(false);
  const [showStockTable, setShowStockTable] = useState(false);
   const [stockFilter, setStockFilter] = useState('');
   const [manufacturerFilter, setManufacturerFilter] = useState('all');
   const [brandFilter, setBrandFilter] = useState('all');
  const [thisWeekPage, setThisWeekPage] = useState(1);
  const SKUS_PER_PAGE = 30;

  // Add-from-library dialog state
  const UNIT_NAME_OPTIONS = ['Stick', 'Gram', 'Book', 'Box', 'Each', 'Pack', 'Unit', 'Cigar'];
  const [addLibOpen, setAddLibOpen] = useState(false);
  const [addLibProduct, setAddLibProduct] = useState<DbGlobalProduct | DbStoreProduct | null>(null);
  const [addLibAvg, setAddLibAvg] = useState('');
  const [addLibAvgUnit, setAddLibAvgUnit] = useState<'carton' | 'packet'>('carton');
  const [addLibUnit, setAddLibUnit] = useState('Unit');
  const [addLibBarcode, setAddLibBarcode] = useState(''); // barcode that triggered the add

  // Confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmWeek, setConfirmWeek] = useState('');
  const [confirmGrouped, setConfirmGrouped] = useState<GroupedEntry[]>([]);
  const [pdfType, setPdfType] = useState<'simple' | 'full'>('full');

  // Customer orders
  type CustomerOrder = { id: string; customer_name: string; customer_email: string; customer_contact: string; order_type: string; preferred_time: string; order_details: string; status: string; created_at: string; admin_notes: string; collection_number: string | null; };
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; is_read: boolean; created_at: string; }[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'pickup' | 'delivery'>('all');
  const [orderDateFilter, setOrderDateFilter] = useState<string>('all');
  const [orderSlotFilter, setOrderSlotFilter] = useState<string>('all');
  const [collectionLookup, setCollectionLookup] = useState('');
  const [lookupResult, setLookupResult] = useState<CustomerOrder | null>(null);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsOrderId, setSmsOrderId] = useState('');
  const [smsStatus, setSmsStatus] = useState<'approved' | 'rejected'>('approved');
  const [smsNotes, setSmsNotes] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  // Persist scan history to localStorage
  useEffect(() => {
    if (storeId) {
      try { localStorage.setItem(`scanHistory_employee_${storeId}`, JSON.stringify(scanHistory)); } catch {}
    }
  }, [scanHistory, storeId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !storeId) { navigate('/login'); return; }
    loadData();
  }, [user, storeId, authLoading, navigate]);

  // Realtime: listen for new customer orders and play sound
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`store-orders-${storeId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'customer_orders',
        filter: `store_id=eq.${storeId}`,
      }, async (payload) => {
        playNotificationSound();
        const newOrder = payload.new as any;
        // Fetch customer details
        const { data: customer } = await supabase.from('store_customers').select('name, email, contact_no').eq('id', newOrder.customer_id).maybeSingle();
        setCustomerOrders(prev => [{
          id: newOrder.id, customer_name: customer?.name || '', customer_email: customer?.email || '',
          customer_contact: customer?.contact_no || '', order_type: newOrder.order_type, preferred_time: newOrder.preferred_time,
          order_details: newOrder.order_details, status: newOrder.status, created_at: newOrder.created_at, admin_notes: newOrder.admin_notes || '', collection_number: newOrder.collection_number || null,
        }, ...prev]);
        toast.info('New order received!', { icon: '🔔' });
        // Reload notifications
        const { data: notifs } = await supabase.from('store_notifications').select('*').eq('store_id', storeId).eq('is_read', false).order('created_at', { ascending: false }).limit(20);
        setNotifications(notifs || []);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [storeId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    if (!storeId) return;
    setPageLoading(true);
    try {
      const [entriesData, productsData, { data: storeData }] = await Promise.all([
        getStockEntries(storeId),
        getProducts(storeId),
        supabase.from('stores').select('qr_service_enabled, qr_service_expires_at, terms_accepted_at, plan_type, unit_suggestion_rules').eq('id', storeId).maybeSingle(),
      ]);
      setEntries(entriesData);
      setAllProducts(productsData);
      // Check QR service
      if (storeData) {
        const qrOn = (storeData as any).qr_service_enabled === true;
        const exp = (storeData as any).qr_service_expires_at;
        setQrServiceActive(qrOn && (!exp || new Date(exp) > new Date()));
        setStorePlanType((storeData as any).plan_type || 'starter');
        setUnitSuggestionRules((storeData as any).unit_suggestion_rules || {});
        if (!(storeData as any).terms_accepted_at && !termsChecked) {
          setShowTermsDialog(true);
        }
      }
      // Load customer orders with customer details
      const { data: orders } = await supabase
        .from('customer_orders')
        .select('*, store_customers(name, email, contact_no)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });
      if (orders) {
        setCustomerOrders(orders.map((o: any) => ({
          id: o.id, customer_name: o.store_customers?.name || '', customer_email: o.store_customers?.email || '',
          customer_contact: o.store_customers?.contact_no || '', order_type: o.order_type, preferred_time: o.preferred_time,
          order_details: o.order_details, status: o.status, created_at: o.created_at, admin_notes: o.admin_notes || '', collection_number: o.collection_number || null,
        })));
      }
      // Load notifications
      const { data: notifs } = await supabase.from('store_notifications').select('*').eq('store_id', storeId).eq('is_read', false).order('created_at', { ascending: false }).limit(20);
      setNotifications(notifs || []);
    } catch (err) {
      toast.error('Failed to load data');
    }
    setPageLoading(false);
  };

  // --- Order management ---
  const handleUpdateOrderStatus = async (orderId: string, status: 'approved' | 'rejected', adminNotes?: string) => {
    try {
      const collectionNumber = status === 'approved' ? String(Math.floor(1000 + Math.random() * 9000)) : null;
      await supabase.from('customer_orders').update({ status, collection_number: collectionNumber, admin_notes: adminNotes || '', updated_at: new Date().toISOString() } as any).eq('id', orderId);
      setCustomerOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, collection_number: collectionNumber, admin_notes: adminNotes || '' } : o));
      // Create notification for the customer (stored as store_notification with order reference)
      const order = customerOrders.find(o => o.id === orderId);
      if (order && storeId) {
        await supabase.from('store_notifications').insert({
          store_id: storeId,
          title: status === 'approved' ? 'Order Approved' : 'Order Rejected',
          message: status === 'approved'
            ? `Order from ${order.customer_name} has been approved and is being processed.`
            : `Order from ${order.customer_name} has been rejected.`,
          type: `order_${status}`,
          related_order_id: orderId,
        });

        // Send SMS notification via Twilio
        try {
          await supabase.functions.invoke('send-order-sms', {
            body: {
              to: order.customer_contact,
              status,
              customerName: order.customer_name,
              collectionNumber,
              adminNotes: adminNotes || '',
              storeName: storeName || '',
            },
          });
        } catch (smsError) {
          console.error('SMS send failed:', smsError);
        }

        // Send email notification to customer on approval
        if (status === 'approved' && order.customer_email) {
          try {
            await supabase.functions.invoke('send-transactional-email', {
              body: {
                templateName: 'order-confirmation',
                recipientEmail: order.customer_email,
                idempotencyKey: `order-confirm-${orderId}`,
                templateData: {
                  customerName: order.customer_name,
                  collectionNumber,
                  orderType: order.order_type,
                  storeName: storeName || '',
                },
              },
            });
          } catch (emailError) {
            console.error('Order email send failed:', emailError);
          }
        }
      }
      toast.success(`Order ${status}!`);
    } catch { toast.error('Failed to update order'); }
  };

  const handleMarkNotificationsRead = async () => {
    if (!storeId || notifications.length === 0) return;
    const ids = notifications.map(n => n.id);
    await supabase.from('store_notifications').update({ is_read: true }).in('id', ids);
    setNotifications([]);
  };

  const pendingOrders = customerOrders.filter(o => o.status === 'pending');
  const filteredOrders = customerOrders.filter(o => {
    if (orderFilter !== 'all' && o.status !== orderFilter) return false;
    if (orderTypeFilter !== 'all' && (o.order_type || '').toLowerCase() !== orderTypeFilter) return false;
    if (orderDateFilter !== 'all') {
      const d = new Date(o.created_at).toISOString().slice(0, 10);
      if (d !== orderDateFilter) return false;
    }
    if (orderSlotFilter !== 'all' && (o.preferred_time || '(none)') !== orderSlotFilter) return false;
    return true;
  });
  const orderDates = Array.from(new Set(customerOrders.map(o => new Date(o.created_at).toISOString().slice(0, 10)))).sort().reverse();
  const orderSlots = Array.from(new Set(customerOrders.map(o => o.preferred_time || '(none)'))).sort();

  const buildOrdersPDF = () => {
    const doc = new jsPDF();
    const title = `Customer Orders Report`;
    doc.setFontSize(14);
    doc.text(title, 14, 14);
    doc.setFontSize(9);
    const filterText = [
      `Status: ${orderFilter}`,
      `Type: ${orderTypeFilter}`,
      `Date: ${orderDateFilter}`,
      `Slot: ${orderSlotFilter}`,
      `Total: ${filteredOrders.length}`,
    ].join('  •  ');
    doc.text(filterText, 14, 20);
    doc.text(`Store: ${storeName || storeId || ''}  •  Generated: ${new Date().toLocaleString()}`, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [['#', 'Customer', 'Contact', 'Type', 'Slot', 'Order', 'Status', 'Coll #', 'Created']],
      body: filteredOrders.map((o, i) => [
        String(i + 1),
        o.customer_name,
        o.customer_contact,
        o.order_type,
        o.preferred_time || '-',
        o.order_details,
        o.status,
        o.collection_number || '-',
        new Date(o.created_at).toLocaleString(),
      ]),
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 41, 59] },
      columnStyles: { 5: { cellWidth: 50 } },
    });
    return doc;
  };

  const handleDownloadOrdersPDF = () => {
    if (filteredOrders.length === 0) { toast.error('No orders to export'); return; }
    const doc = buildOrdersPDF();
    doc.save(`customer-orders-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handlePrintOrdersPDF = () => {
    if (filteredOrders.length === 0) { toast.error('No orders to print'); return; }
    const doc = buildOrdersPDF();
    const url = doc.output('bloburl');
    const win = window.open(url as any, '_blank');
    if (win) setTimeout(() => { try { win.print(); } catch {} }, 500);
  };

  const handleShareOrdersPDF = async () => {
    if (filteredOrders.length === 0) { toast.error('No orders to share'); return; }
    const doc = buildOrdersPDF();
    const blob = doc.output('blob');
    const file = new File([blob], `customer-orders-${new Date().toISOString().slice(0, 10)}.pdf`, { type: 'application/pdf' });
    if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
      try {
        await (navigator as any).share({ files: [file], title: 'Customer Orders', text: 'Customer orders report' });
      } catch {}
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; a.click();
      URL.revokeObjectURL(url);
      toast.info('Sharing not supported — downloaded instead');
    }
  };


  const handleCollectionLookup = () => {
    if (!collectionLookup.trim()) return;
    const found = customerOrders.find(o => o.collection_number === collectionLookup.trim());
    setLookupResult(found || null);
    if (!found) toast.error('No order found with that collection number');
  };

  const getPacketsPerCarton = (ppc: number) => (ppc > 0 ? ppc : 1);

  const detectStockSide = (barcode: string, product: DbStoreProduct): StockSide => {
    if (product.carton_barcode && barcode === product.carton_barcode) return 'back';
    if (product.packet_barcode && barcode === product.packet_barcode) return 'front';
    return stockSide;
  };

  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length === 0) { setSearchResults([]); setShowDropdown(false); return; }
    const storeMatches = allProducts.filter(p => p.brand_name.toLowerCase().includes(query.toLowerCase()));
    if (storeMatches.length > 0) {
      setSearchResults(storeMatches.slice(0, 5));
    } else {
      const globalMatches = await searchGlobalProducts(query);
      const asProducts: DbStoreProduct[] = globalMatches.map(gp => ({
        id: gp.id,
        store_id: storeId!,
        barcode: gp.carton_barcode || gp.packet_barcode || '',
        carton_barcode: gp.carton_barcode,
        packet_barcode: gp.packet_barcode,
        brand_name: gp.brand_name,
        manufacturer_name: gp.manufacturer_name || '',
        avg_sales_last_three_weeks: 0,
        quantity_of_order: 0,
        unit_type: 'carton',
        unit_name: gp.unit_name || 'unit',
        created_at: '',
        updated_at: '',
        _isGlobal: true, // marker for global products
      } as DbStoreProduct & { _isGlobal?: boolean }));
      setSearchResults(asProducts);
    }
    setShowDropdown(true);
  };

  const handleSelectProduct = (product: DbStoreProduct & { _isGlobal?: boolean }) => {
    const isFromGlobal = (product as any)._isGlobal === true || !allProducts.some(p => p.id === product.id);
    if (isFromGlobal) {
      // Product not yet in store — show dialog to ask avg & unit
      setAddLibProduct(product);
      setAddLibAvg('');
      setAddLibUnit(product.unit_name || 'Unit');
      setAddLibBarcode(product.carton_barcode || product.barcode || '');
      setAddLibOpen(true);
      return;
    }
    setScannedBarcode(product.carton_barcode || product.barcode || '');
    setQuantity('');
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    toast.info(`Selected: ${product.brand_name} — Enter ${stockSide} stock quantity`);
    setScanHistory(prev => [...prev, { barcode: product.carton_barcode || product.barcode || '', brandName: product.brand_name, timestamp: new Date().toLocaleTimeString(), action: 'Searched' }]);
  };

  const handleBarcodeScan = async (barcode: string) => {
    const normalizedBarcode = barcode.trim();
    setScannedBarcode(normalizedBarcode);
    setQuantity('');
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    if (!storeId) return;
    let product = await getProductByBarcode(storeId, normalizedBarcode);

    if (!product) {
      const globalMatch = await getGlobalProductByBarcode(normalizedBarcode);
      if (globalMatch) {
        // Show dialog to ask for avg & unit before saving
        setAddLibProduct(globalMatch as any);
        setAddLibAvg('');
        setAddLibUnit(globalMatch.unit_name || 'Unit');
        setAddLibBarcode(normalizedBarcode);
        setAddLibOpen(true);
        setScanHistory(prev => [...prev, { barcode: normalizedBarcode, brandName: globalMatch.brand_name, timestamp: new Date().toLocaleTimeString(), action: 'Found in library' }]);
        return;
      }
    }

    if (product) {
      const detectedSide = detectStockSide(normalizedBarcode, product);
      setStockSide(detectedSide);
      toast.info(`Found: ${product.brand_name} — ${detectedSide === 'front' ? 'Front (Packets)' : 'Back (Cartons)'}`);
      setScanHistory(prev => [...prev, { barcode: normalizedBarcode, brandName: product!.brand_name, timestamp: new Date().toLocaleTimeString(), action: `Scanned (${detectedSide === 'front' ? 'Packet' : 'Carton'})` }]);
    } else {
      toast.warning('Product not found. Add it in Settings first.');
      setScanHistory(prev => [...prev, { barcode: normalizedBarcode, brandName: 'Not Found', timestamp: new Date().toLocaleTimeString(), action: 'Not Found' }]);
    }
  };

  const handleAddLibSave = async () => {
    if (!storeId || !addLibProduct) return;
    // SKU cap enforcement
    const skuCap = storePlanType === 'enterprise' ? Infinity : (storePlanType === 'business') ? 2000 : 500;
    if (allProducts.length >= skuCap) {
      toast.error(`SKU limit reached (${skuCap}). Upgrade your plan to add more products.`);
      return;
    }
    const avgVal = Number(addLibAvg) || 0;
    const product = await saveProduct(storeId, {
      barcode: (addLibProduct as any).carton_barcode || (addLibProduct as any).packet_barcode || '',
      carton_barcode: (addLibProduct as any).carton_barcode || '',
      packet_barcode: (addLibProduct as any).packet_barcode || '',
      brand_name: (addLibProduct as any).brand_name,
      manufacturer_name: (addLibProduct as any).manufacturer_name || '',
      avg_sales_last_three_weeks: avgVal,
      quantity_of_order: 0,
      unit_type: 'carton',
      unit_name: addLibUnit.toLowerCase(),
      avg_sales_unit: addLibAvgUnit,
    } as any);
    setAllProducts(await getProducts(storeId));
    setAddLibOpen(false);
    setScannedBarcode(addLibBarcode);
    setQuantity('');
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    toast.success(`Added "${(addLibProduct as any).brand_name}" to store with avg ${avgVal} (${addLibUnit})`);
    setScanHistory(prev => [...prev, { barcode: addLibBarcode, brandName: (addLibProduct as any).brand_name, timestamp: new Date().toLocaleTimeString(), action: `Added from library` }]);
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !user || !scannedBarcode || savingStock) return;
    if (!quantity || quantity.trim() === '') { toast.error('Please enter quantity'); return; }
    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) { toast.error('Invalid quantity'); return; }

    const barcodeToSave = scannedBarcode.trim();
    const stockSideToSave = stockSide;

    setSavingStock(true);
    try {
      const product = await getProductByBarcode(storeId, barcodeToSave);
      if (!product) { toast.error('Product not found'); return; }

      const weekDate = getWeekString();
      const dynamicAvg = product.avg_sales_last_three_weeks;
      const packetsPerCarton = getPacketsPerCarton(product.quantity_of_order);
      const canonicalBarcode = product.barcode || product.carton_barcode || product.packet_barcode || barcodeToSave;
      const productBarcodes = Array.from(new Set(
        [product.barcode, product.carton_barcode, product.packet_barcode, barcodeToSave]
          .filter((value): value is string => Boolean(value && value.trim()))
      ));

      const matchingEntries = entries.filter(entry => entry.week_date === weekDate && !!entry.barcode && productBarcodes.includes(entry.barcode));
      const [existingEntry, ...duplicateEntries] = matchingEntries;

      let entryData: any;
      if (existingEntry) {
        entryData = { ...existingEntry, barcode: canonicalBarcode };
        if (stockSideToSave === 'front') entryData.front_stock = qty;
        else entryData.back_stock = qty;
        entryData.avg_sales_last_three_weeks = dynamicAvg;
        entryData.quantity_of_order = packetsPerCarton;
        const avgUnit = ((product as any).avg_sales_unit as 'carton' | 'packet') || 'carton';
        const unitOverride = unitSuggestionRules[(product.unit_name || 'unit').toLowerCase()];
        entryData.next_week_need = calculateSuggestedOrder(dynamicAvg, entryData.front_stock, entryData.back_stock, packetsPerCarton, avgUnit, unitOverride).value;
      } else {
        entryData = {
          product_id: product.id,
          barcode: canonicalBarcode,
          brand_name: product.brand_name,
          avg_sales_last_three_weeks: dynamicAvg,
          quantity_of_order: packetsPerCarton,
          front_stock: stockSideToSave === 'front' ? qty : 0,
          back_stock: stockSideToSave === 'back' ? qty : 0,
          next_week_need: 0,
          week_date: weekDate,
          employee_id: user.id,
        };
        const avgUnit = ((product as any).avg_sales_unit as 'carton' | 'packet') || 'carton';
        const unitOverride = unitSuggestionRules[(product.unit_name || 'unit').toLowerCase()];
        entryData.next_week_need = calculateSuggestedOrder(dynamicAvg, entryData.front_stock, entryData.back_stock, packetsPerCarton, avgUnit, unitOverride).value;
      }

      await saveStockEntry(storeId, entryData);
      if (duplicateEntries.length > 0) {
        await Promise.all(duplicateEntries.map(entry => deleteStockEntry(storeId, entry.id)));
      }
      await loadData();
      void sendToWebhook(storeId, { action: 'stock_updated', entry: entryData });

      setScanHistory(prev => [...prev, { barcode: barcodeToSave, brandName: product.brand_name, timestamp: new Date().toLocaleTimeString(), action: `${stockSideToSave} stock: ${qty}` }]);
      setScannedBarcode('');
      setQuantity('');
      toast.success(`${stockSideToSave === 'front' ? 'Front' : 'Back'} stock updated for ${product.brand_name}`);
    } catch (error) {
      console.error('Failed to save stock entry:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save stock');
    } finally {
      setSavingStock(false);
    }
  };

  const getWeekString = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${weekNo}`;
  };

  const buildGroupedEntries = async (weekEntries: DbStockEntry[], includePortfolio: boolean = false): Promise<GroupedEntry[]> => {
    const globalProductsList = await getGlobalProducts();
    const brandToMfr = new Map<string, string>();
    const brandToUnit = new Map<string, string>();
    const brandToAvgUnit = new Map<string, 'carton' | 'packet'>();
    globalProductsList.forEach(gp => {
      if (gp.brand_name && gp.manufacturer_name) brandToMfr.set(gp.brand_name.toLowerCase(), gp.manufacturer_name);
      if (gp.brand_name && gp.unit_name) brandToUnit.set(gp.brand_name.toLowerCase(), gp.unit_name);
    });

    // Also get unit and avg_sales_unit from store products
    const storeProds = storeId ? await getProducts(storeId) : [];
    storeProds.forEach(sp => {
      if (sp.brand_name && sp.unit_name) brandToUnit.set(sp.brand_name.toLowerCase(), sp.unit_name);
      if (sp.brand_name) brandToAvgUnit.set(sp.brand_name.toLowerCase(), ((sp as any).avg_sales_unit as 'carton' | 'packet') || 'carton');
    });

    const map = new Map<string, GroupedEntry>();
    weekEntries.forEach(e => {
      const existing = map.get(e.brand_name);
      if (existing) {
        existing.frontStockPkt += e.front_stock;
        existing.backStockCartons += e.back_stock;
        existing.avgCartons = Math.max(existing.avgCartons, e.avg_sales_last_three_weeks);
        existing.packetsPerCarton = Math.max(existing.packetsPerCarton, e.quantity_of_order);
        existing.entryIds.push(e.id);
      } else {
        map.set(e.brand_name, {
          brandName: e.brand_name,
          manufacturerName: brandToMfr.get(e.brand_name.toLowerCase()) || 'Other',
          unitName: brandToUnit.get(e.brand_name.toLowerCase()) || 'unit',
          avgCartons: e.avg_sales_last_three_weeks,
          avgSalesUnit: brandToAvgUnit.get(e.brand_name.toLowerCase()) || 'carton',
          frontStockPkt: e.front_stock,
          backStockCartons: e.back_stock,
          packetsPerCarton: getPacketsPerCarton(e.quantity_of_order),
          suggestOrder: 0,
          suggestOrderUnit: 'carton',
          entryIds: [e.id],
        });
      }
    });

    if (includePortfolio && storeId) {
      const portfolioProductIds = await getStorePortfolio(storeId);
      portfolioProductIds.forEach(gpId => {
        const gp = globalProductsList.find(p => p.id === gpId);
        if (!gp || map.has(gp.brand_name)) return;
        map.set(gp.brand_name, {
          brandName: gp.brand_name,
          manufacturerName: gp.manufacturer_name || 'Other',
          unitName: gp.unit_name || 'unit',
          avgCartons: 0, avgSalesUnit: 'carton', frontStockPkt: 0, backStockCartons: 0,
          packetsPerCarton: gp.packets_per_carton || 1,
          suggestOrder: 0, suggestOrderUnit: 'carton', entryIds: [],
        });
      });
    }

    map.forEach(g => {
      const unitOverride = unitSuggestionRules[(g.unitName || 'unit').toLowerCase()];
      const result = calculateSuggestedOrder(g.avgCartons, g.frontStockPkt, g.backStockCartons, g.packetsPerCarton, g.avgSalesUnit, unitOverride);
      g.suggestOrder = result.value;
      g.suggestOrderUnit = result.unit;
    });
    return Array.from(map.values());
  };

  const [groupedEntries, setGroupedEntries] = useState<GroupedEntry[]>([]);

  useEffect(() => {
    const currentWeekEntries = entries.filter(e => e.week_date === getWeekString());
    buildGroupedEntries(currentWeekEntries, true).then(setGroupedEntries);
  }, [entries, unitSuggestionRules]);

   const allManufacturers = [...new Set(groupedEntries.map(g => g.manufacturerName))].sort((a, b) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b));
   const allBrands = [...new Set(groupedEntries.map(g => g.brandName))].sort((a, b) => a.localeCompare(b));

   const filteredGrouped = groupedEntries.filter(g => {
     const textMatch = !stockFilter.trim() || g.brandName.toLowerCase().includes(stockFilter.toLowerCase()) || g.manufacturerName.toLowerCase().includes(stockFilter.toLowerCase());
     const mfrMatch = manufacturerFilter === 'all' || g.manufacturerName === manufacturerFilter;
     const brandMatch = brandFilter === 'all' || g.brandName === brandFilter;
     return textMatch && mfrMatch && brandMatch;
   });

  const currentWeek = getWeekString();
  const currentWeekEntries = entries.filter(e => e.week_date === currentWeek);
  const pastWeeks = [...new Set(entries.map(e => e.week_date))].filter(w => w !== currentWeek).sort().reverse();

  const handleEditOpen = (g: GroupedEntry) => {
    setEditBrand(g.brandName); setEditFront(String(g.frontStockPkt)); setEditBack(String(g.backStockCartons));
    setEditAvg(String(g.avgCartons)); setEditOrder(String(g.suggestOrder)); setEditEntryIds(g.entryIds); setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!storeId) return;
    const allEntries = entries.filter(e => editEntryIds.includes(e.id));
    if (allEntries.length === 0) return;
    const primary = { ...allEntries[0], front_stock: Number(editFront) || 0, back_stock: Number(editBack) || 0, avg_sales_last_three_weeks: Number(editAvg) || 0, next_week_need: Number(editOrder) || 0 };
    await saveStockEntry(storeId, primary);
    for (const e of allEntries.slice(1)) await deleteStockEntry(storeId, e.id);
    await loadData();
    setEditOpen(false);
    toast.success(`Updated ${editBrand}`);
  };

  const handleDeleteGroup = async (g: GroupedEntry) => {
    if (!storeId) return;
    if (!window.confirm(`Delete all entries for "${g.brandName}"?`)) return;
    try {
      for (const id of g.entryIds) await deleteStockEntry(storeId, id);
      await loadData();
      toast.success(`Deleted ${g.brandName}`);
    } catch (err) {
      toast.error('Failed to delete entries');
    }
  };

  const handleDeleteWeek = async (weekDate: string) => {
    if (!storeId) return;
    if (!window.confirm(`Delete all data for week "${weekDate}"? This cannot be undone.`)) return;
    try {
      await deleteStockEntriesByWeek(storeId, weekDate);
      await loadData();
      toast.success(`Deleted week ${weekDate}`);
    } catch (err) {
      toast.error('Failed to delete week data');
    }
  };

  const generatePDFForWeek = async (weekDate: string, grouped: GroupedEntry[], type: 'simple' | 'full' = 'full'): Promise<jsPDF> => {
    const doc = new jsPDF();
    const globalProducts = await getGlobalProducts();
    const brandToManufacturer = new Map<string, string>();
    globalProducts.forEach(gp => { if (gp.brand_name && gp.manufacturer_name) brandToManufacturer.set(gp.brand_name.toLowerCase(), gp.manufacturer_name); });

    const byManufacturer = new Map<string, GroupedEntry[]>();
    grouped.forEach(g => {
      const mfr = brandToManufacturer.get(g.brandName.toLowerCase()) || 'Other';
      if (!byManufacturer.has(mfr)) byManufacturer.set(mfr, []);
      byManufacturer.get(mfr)!.push(g);
    });

    const sortedManufacturers = Array.from(byManufacturer.keys()).sort((a, b) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b));

    // Fetch store details for PDF header
    let pdfStoreName = storeName || storeId || '';
    let pdfStoreContact = '';
    try {
      const { data: storeRow } = await supabase.from('stores').select('name, contact_no').eq('id', storeId).maybeSingle();
      if (storeRow) { pdfStoreName = storeRow.name || pdfStoreName; pdfStoreContact = storeRow.contact_no || ''; }
    } catch {}

    doc.setFontSize(18); doc.setTextColor(45, 43, 127);
    doc.text(`CossInfo - ${type === 'simple' ? 'Order Summary' : 'Stock Report'}`, 14, 22);
    doc.setFontSize(11); doc.setTextColor(30);
    doc.text(`Store: ${pdfStoreName}${pdfStoreContact ? ' | Ph: ' + pdfStoreContact : ''}`, 14, 30);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Store ID: ${storeId} | Week: ${weekDate} | User: ${user?.email}`, 14, 37);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 43);

    let startY = 51;
    sortedManufacturers.forEach(mfr => {
      // For simple type, skip manufacturer entirely if no items need ordering
      if (type === 'simple') {
        const filteredItems = byManufacturer.get(mfr)!.filter(g => g.suggestOrder > 0);
        if (filteredItems.length === 0) return;

        if (startY > 240) { doc.addPage(); startY = 20; }
        doc.setFontSize(12); doc.setTextColor(45, 43, 127);
        doc.text(mfr, 14, startY); startY += 8;

        autoTable(doc, {
          startY,
          head: [['Manufacturer', 'Brand Name', 'Suggest Order']],
          body: filteredItems.map(g => [mfr, g.brandName, `${g.suggestOrder} ${g.suggestOrderUnit === 'packet' ? 'Pkt' : 'Ctn'}`]),
          headStyles: { fillColor: [45, 43, 127], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [245, 245, 250] },
          margin: { left: 14 },
        });
      } else {
        if (startY > 240) { doc.addPage(); startY = 20; }
        doc.setFontSize(12); doc.setTextColor(45, 43, 127);
        doc.text(mfr, 14, startY); startY += 8;

        autoTable(doc, {
          startY,
          head: [['Brand Name', 'Avg Sales', 'Avg Unit', 'Front (Pkt)', 'Back (Ctns)', 'Order', 'Status']],
          body: byManufacturer.get(mfr)!.map(g => {
            const isUnscanned = g.entryIds.length === 0 && g.frontStockPkt === 0 && g.backStockCartons === 0;
            return [g.brandName, String(g.avgCartons), g.avgSalesUnit === 'packet' ? 'Pkt' : 'Ctn', String(g.frontStockPkt), String(g.backStockCartons), `${g.suggestOrder} ${g.suggestOrderUnit === 'packet' ? 'Pkt' : 'Ctn'}`, isUnscanned ? 'NOT SCANNED' : 'OK'];
          }),
          headStyles: { fillColor: [45, 43, 127], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [245, 245, 250] },
          margin: { left: 14 },
        });
      }
      startY = (doc as any).lastAutoTable.finalY + 10;
    });

    return doc;
  };

  const handleSharePDF = async (doc: jsPDF, weekDate: string) => {
    const blob = doc.output('blob');
    const file = new File([blob], `stock-report-${storeId}-${weekDate}.pdf`, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ title: `Stock Report - ${weekDate}`, files: [file] });
        toast.success('Shared successfully!');
      } catch (e: any) {
        if (e.name !== 'AbortError') toast.error('Share failed');
      }
    } else {
      // Fallback: download
      doc.save(file.name);
      toast.info('Share not supported on this device — PDF downloaded instead.');
    }
  };

  const handleRequestPDF = (weekDate: string, grouped: GroupedEntry[]) => {
    setConfirmWeek(weekDate); setConfirmGrouped(grouped); setConfirmOpen(true);
  };

  const handleConfirmPDF = async (action: 'download' | 'share' | 'email' = 'download') => {
    setConfirmOpen(false);
    const doc = await generatePDFForWeek(confirmWeek, confirmGrouped, pdfType);

    if (action === 'email') {
      await handleEmailPDF(doc, confirmWeek);
    } else if (action === 'share') {
      await handleSharePDF(doc, confirmWeek);
    } else {
      doc.save(`stock-report-${storeId}-${confirmWeek}.pdf`);
      toast.success('PDF downloaded!');
    }

    // Save order
    if (storeId) {
      await createOrder({
        store_id: storeId,
        week_date: confirmWeek,
        products: confirmGrouped as any,
        total_items: confirmGrouped.reduce((sum, g) => sum + g.suggestOrder, 0),
        confirmed_by: user?.email || '',
        pdf_generated: true,
      });

      const weekEntries = entries.filter(e => e.week_date === confirmWeek);
      const result = await sendToWebhook(storeId, { action: 'stock_confirmed', user: user?.email, weekDate: confirmWeek, entries: weekEntries, grouped: confirmGrouped });
      if (result.success) toast.success('Data sent to webhook!');
      else if (result.error !== 'No webhook URL configured') toast.error(`Webhook failed: ${result.error}`);
    }
  };

  const handleEmailPDF = async (doc: jsPDF, weekDate: string) => {
    if (!storeId) { toast.error('No store ID'); return; }
    const loadingToast = toast.loading('Uploading report & sending email…');
    try {
      // Upload PDF to storage
      const blob = doc.output('blob');
      const fileName = `${storeId}/reports/${weekDate}-${pdfType}-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('store-profiles')
        .upload(fileName, blob, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from('store-profiles').getPublicUrl(fileName);
      const downloadUrl = urlData.publicUrl;

      // Get store email
      const { data: storeRow } = await supabase.from('stores').select('email, name').eq('id', storeId).maybeSingle();
      if (!storeRow?.email) { toast.dismiss(loadingToast); toast.error('Store email not found'); return; }

      // Send email
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'stock-report',
          recipientEmail: storeRow.email,
          idempotencyKey: `stock-report-${storeId}-${weekDate}-${pdfType}-${Date.now()}`,
          templateData: {
            storeName: storeRow.name,
            storeId,
            weekDate,
            reportType: pdfType,
            totalItems: confirmGrouped.reduce((sum, g) => sum + g.suggestOrder, 0),
            downloadUrl,
            generatedBy: user?.email || '',
          },
        },
      });
      toast.dismiss(loadingToast);
      toast.success(`Report emailed to ${storeRow.email}`);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(`Email failed: ${err.message || err}`);
    }
  };

  const generatePDF = () => handleRequestPDF(getWeekString(), filteredGrouped);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const handleAcceptTerms = async () => {
    if (!storeId) return;
    await supabase.from('stores').update({ terms_accepted_at: new Date().toISOString() } as any).eq('id', storeId);
    setShowTermsDialog(false);
    setTermsChecked(true);
    toast.success('Terms and Conditions accepted');
  };

  if (authLoading || pageLoading) {
    return <DashboardSkeleton variant="employee" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        leftContent={
          <div className="flex items-center gap-3">
            <img src={logo} alt="CossInfo" className="h-10 sm:h-12" />
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground">Stock Counter</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Store: {storeId} | {storeName}</p>
            </div>
          </div>
        }
        rightContent={
          <div className="flex items-center gap-1.5">
            {qrServiceActive && pendingOrders.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => { setShowOrders(prev => !prev); if (!showOrders) setTimeout(() => document.getElementById('orders-panel')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="gap-1 h-8 text-xs relative">
                <ShoppingBag className="h-3 w-3" />
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{pendingOrders.length}</span>
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkNotificationsRead} className="gap-1 h-8 text-xs relative">
                <Bell className="h-3 w-3" />
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{notifications.length}</span>
              </Button>
            )}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <Menu className="h-4 w-4" /> <span className="hidden sm:inline">Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground">Menu</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{storeName}</p>
                  </div>
                    <div className="flex-1 p-2 space-y-1">
                     {qrServiceActive && (
                      <Button variant={showOrders ? 'secondary' : 'ghost'} className={`w-full justify-start gap-2.5 h-10 ${showOrders ? 'bg-primary/10 text-primary' : ''}`} onClick={() => { setShowOrders(prev => !prev); setMenuOpen(false); if (!showOrders) setTimeout(() => document.getElementById('orders-panel')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${showOrders ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><ShoppingBag className="h-3.5 w-3.5" /></div> Orders
                        {pendingOrders.length > 0 && <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{pendingOrders.length}</span>}
                      </Button>
                    )}
                    <Button variant={showCommunity ? 'secondary' : 'ghost'} className={`w-full justify-start gap-2.5 h-10 ${showCommunity ? 'bg-primary/10 text-primary' : ''}`} onClick={() => { setShowCommunity(prev => !prev); setMenuOpen(false); if (!showCommunity) setTimeout(() => document.getElementById('community-panel')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${showCommunity ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><MessageSquare className="h-3.5 w-3.5" /></div> Community Chat
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2.5 h-10" onClick={() => { setMenuOpen(false); navigate('/settings'); }}>
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0"><Settings className="h-3.5 w-3.5 text-muted-foreground" /></div> Settings
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2.5 h-10" onClick={() => { setMenuOpen(false); generatePDF(); }} disabled={currentWeekEntries.length === 0}>
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0"><FileDown className="h-3.5 w-3.5 text-muted-foreground" /></div> Generate PDF
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2.5 h-10" onClick={() => { setMenuOpen(false); navigate('/install'); }}>
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0"><Download className="h-3.5 w-3.5 text-muted-foreground" /></div> Install App
                    </Button>
                  </div>
                  <div className="p-2 border-t border-border">
                    <Button variant="ghost" className="w-full justify-start gap-2.5 h-10 text-destructive hover:text-destructive" onClick={() => { setMenuOpen(false); handleLogout(); }}>
                      <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0"><LogOut className="h-3.5 w-3.5" /></div> Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        }
      />

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Stock Side Toggle */}
        <Card className="glass-card border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <ArrowLeftRight className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <div>
                  <Label className="text-xs sm:text-sm font-semibold">Counting: <span className="text-primary">{stockSide === 'front' ? 'Front (Packets)' : 'Back (Cartons)'}</span></Label>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Toggle to switch sides</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className={`text-[10px] sm:text-xs font-medium ${stockSide === 'front' ? 'text-primary' : 'text-muted-foreground'}`}>Front</span>
                <Switch checked={stockSide === 'back'} onCheckedChange={(checked) => setStockSide(checked ? 'back' : 'front')} />
                <span className={`text-[10px] sm:text-xs font-medium ${stockSide === 'back' ? 'text-primary' : 'text-muted-foreground'}`}>Back</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scanner */}
        <Card className="glass-card border-border/50 relative z-10" style={{ overflow: 'visible' }}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-primary" /> Scan Product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4" style={{ overflow: 'visible' }}>
            <BarcodeScanner onScan={handleBarcodeScan} />
            <div ref={searchRef} className="relative">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search product by brand name..." value={searchQuery} onChange={e => handleSearchChange(e.target.value)} className="flex-1" />
              </div>
              {showDropdown && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map(p => (
                    <button key={p.id} type="button" onClick={() => handleSelectProduct(p)} className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between items-center border-b border-border last:border-0">
                      <span className="font-medium text-foreground">{p.brand_name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{p.barcode}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {scannedBarcode && (
              <form onSubmit={handleAddStock} className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Barcode: {scannedBarcode} | Side: {stockSide === 'front' ? 'Front (Packets)' : 'Back (Cartons)'}</p>
                  <Input type="number" placeholder={`Enter ${stockSide === 'front' ? 'front packets' : 'back cartons'} quantity *`} value={quantity} onChange={e => setQuantity(e.target.value)} required autoFocus />
                </div>
                <Button type="submit" className="w-full sm:w-auto self-end gap-1 min-w-28" disabled={savingStock || quantity.trim() === ''}>
                  {savingStock ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {savingStock ? 'Saving...' : 'Save'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Collapsible open={showScans} onOpenChange={setShowScans}>
          <Card className="glass-card border-border/50">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer py-3 hover:bg-muted/30 transition-colors">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    Recent Scans ({scanHistory.length})
                  </span>
                  {showScans ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {scanHistory.length > 0 && (
                  <div className="flex justify-end mb-2">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setScanHistory([])}>
                      Clear History
                    </Button>
                  </div>
                )}
                {scanHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No scans yet</p>
                ) : (
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Brand</TableHead>
                          <TableHead className="text-xs">Barcode</TableHead>
                          <TableHead className="text-xs">Action</TableHead>
                          <TableHead className="text-xs">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scanHistory.slice().reverse().map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs font-medium">{item.brandName}</TableCell>
                            <TableCell className="text-xs font-mono">{item.barcode}</TableCell>
                            <TableCell className="text-xs">{item.action}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{item.timestamp}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={showStockTable} onOpenChange={setShowStockTable}>
          <Card className="glass-card border-border/50">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm flex items-center gap-2 w-full justify-between">
                  <span className="flex items-center gap-2"><FileDown className="h-4 w-4 text-primary" /> This Week ({getWeekString()})</span>
                  {showStockTable ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex items-center gap-2 flex-wrap px-3 sm:px-6 pb-2">
                <div className="relative">
                  <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Filter..." value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="h-8 text-xs pl-7 w-36 sm:w-48 border-border/50" />
                </div>
                <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
                  <SelectTrigger className="h-8 text-xs w-36 sm:w-44 border-border/50">
                    <Filter className="h-3 w-3 mr-1 text-primary" /><SelectValue placeholder="Manufacturer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Manufacturers</SelectItem>
                    {allManufacturers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="h-8 text-xs w-36 sm:w-44 border-border/50">
                    <Filter className="h-3 w-3 mr-1 text-primary" /><SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {allBrands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
                {groupedEntries.length > 0 && (
                  <Button variant="outline" size="sm" onClick={generatePDF} className="gap-1 border-border/50"><FileDown className="h-3 w-3 text-primary" /> PDF</Button>
                )}
              </div>
              <CardContent className="p-2 sm:p-6">
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <Table className="text-xs sm:text-sm">
                    <TableHeader>
                       <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="text-xs text-muted-foreground font-medium">Brand</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium hidden sm:table-cell">Manufacturer</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium hidden sm:table-cell">Unit</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium text-right hidden sm:table-cell">Avg</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium text-right">Front</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium text-right">Back</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium text-right">Order</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium text-right w-16 sm:w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const totalPages = Math.max(1, Math.ceil(filteredGrouped.length / SKUS_PER_PAGE));
                        const safePage = Math.min(thisWeekPage, totalPages);
                        const paginated = filteredGrouped.slice((safePage - 1) * SKUS_PER_PAGE, safePage * SKUS_PER_PAGE);
                        return (
                          <>
                            {paginated.length === 0 ? (
                              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">{groupedEntries.length === 0 ? 'No stock entries this week.' : 'No matches.'}</TableCell></TableRow>
                            ) : (
                              paginated.map(g => {
                                const isZero = g.entryIds.length === 0 && g.frontStockPkt === 0 && g.backStockCartons === 0;
                                return (
                                  <TableRow key={g.brandName} className={`border-border/30 ${isZero ? 'bg-destructive/5' : ''}`}>
                                    <TableCell className="font-semibold text-foreground text-xs sm:text-sm max-w-[80px] sm:max-w-none truncate">{g.brandName}{isZero && <span className="text-[9px] text-destructive ml-1">(not scanned)</span>}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{g.manufacturerName}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground hidden sm:table-cell capitalize">{g.unitName}</TableCell>
                                    <TableCell className="text-right hidden sm:table-cell">{g.avgCartons} <span className="text-[9px] text-muted-foreground">{g.avgSalesUnit === 'packet' ? 'pkt' : 'ctn'}</span></TableCell>
                                    <TableCell className="text-right">{g.frontStockPkt}</TableCell>
                                    <TableCell className="text-right">{g.backStockCartons}</TableCell>
                                    <TableCell className="text-right font-semibold text-primary">{g.suggestOrder} <span className="text-[9px] text-muted-foreground">{g.suggestOrderUnit === 'packet' ? 'pkt' : 'ctn'}</span></TableCell>
                                    <TableCell className="text-right p-1 sm:p-4">
                                      <div className="flex justify-end gap-0.5 sm:gap-1">
                                        <Button variant="outline" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 border-border/50" onClick={() => handleEditOpen(g)}><Pencil className="h-3 w-3 text-primary" /></Button>
                                        <Button variant="outline" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 border-border/50 hover:bg-destructive/10" onClick={() => handleDeleteGroup(g)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </>
                        );
                      })()}
                    </TableBody>
                  </Table>
                  {filteredGrouped.length > SKUS_PER_PAGE && (() => {
                    const totalPages = Math.ceil(filteredGrouped.length / SKUS_PER_PAGE);
                    const safePage = Math.min(thisWeekPage, totalPages);
                    return (
                      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground px-2">
                        <span>{(safePage - 1) * SKUS_PER_PAGE + 1}–{Math.min(safePage * SKUS_PER_PAGE, filteredGrouped.length)} of {filteredGrouped.length}</span>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={safePage <= 1} onClick={() => setThisWeekPage(safePage - 1)}>Prev</Button>
                          <span className="px-2">Page {safePage}/{totalPages}</span>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={safePage >= totalPages} onClick={() => setThisWeekPage(safePage + 1)}>Next</Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Order History */}
        <Card className="glass-card border-border/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Order History ({pastWeeks.length} weeks)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {pastWeeks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No past history yet.</p>
            ) : (
              pastWeeks.map(week => (
                <PastWeekSection key={week} week={week} weekEntries={entries.filter(e => e.week_date === week)} storeId={storeId!} onRequestPDF={handleRequestPDF} unitSuggestionRules={unitSuggestionRules} />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Stock — {editBrand}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-sm">Avg Qty (Cartons)</Label><Input type="number" value={editAvg} onChange={e => setEditAvg(e.target.value)} /></div>
            <div><Label className="text-sm">Front Stock (Packets)</Label><Input type="number" value={editFront} onChange={e => setEditFront(e.target.value)} /></div>
            <div><Label className="text-sm">Back Stock (Cartons)</Label><Input type="number" value={editBack} onChange={e => setEditBack(e.target.value)} /></div>
            <div><Label className="text-sm">Order (Cartons)</Label><Input type="number" value={editOrder} onChange={e => setEditOrder(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSave} className="gap-1"><Save className="h-4 w-4" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add from Library Dialog */}
      <Dialog open={addLibOpen} onOpenChange={setAddLibOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Product to Store</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{(addLibProduct as any)?.brand_name}</span> — Set average sales and unit name before adding.
          </p>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Avg Sales</Label>
              <div className="flex gap-2">
                <Input type="number" min="0" placeholder="e.g. 3" value={addLibAvg} onChange={e => {
                  const v = Number(e.target.value);
                  if (e.target.value === '' || v >= 0) setAddLibAvg(e.target.value);
                }} autoFocus className="flex-1" />
                <Select value={addLibAvgUnit} onValueChange={(v) => setAddLibAvgUnit(v as 'carton' | 'packet')}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carton">Carton</SelectItem>
                    <SelectItem value="packet">Packet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Choose whether avg is in cartons or packets. Order suggestion uses ≤ condition.</p>
            </div>
            <div>
              <Label className="text-sm">Unit Name</Label>
              <Select value={addLibUnit} onValueChange={setAddLibUnit}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_NAME_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLibOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLibSave} className="gap-1"><Save className="h-4 w-4" /> Add to Store</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm & Generate PDF</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Week: {confirmWeek} — Choose PDF format:</p>
          <div className="flex gap-2">
            <Button variant={pdfType === 'simple' ? 'default' : 'outline'} size="sm" className="flex-1 text-xs" onClick={() => setPdfType('simple')}>
              Simple (Order Summary)
            </Button>
            <Button variant={pdfType === 'full' ? 'default' : 'outline'} size="sm" className="flex-1 text-xs" onClick={() => setPdfType('full')}>
              Full Report
            </Button>
          </div>
          <div className="max-h-48 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {pdfType === 'simple' ? (
                    <><TableHead className="text-xs">Manufacturer</TableHead><TableHead className="text-xs">Brand</TableHead><TableHead className="text-xs text-right">Order</TableHead></>
                  ) : (
                    <><TableHead className="text-xs">Brand</TableHead><TableHead className="text-xs text-right">Avg</TableHead><TableHead className="text-xs text-right">Front</TableHead><TableHead className="text-xs text-right">Back</TableHead><TableHead className="text-xs text-right">Order</TableHead></>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pdfType === 'simple' ? confirmGrouped.filter(g => g.suggestOrder > 0) : confirmGrouped).map(g => (
                  <TableRow key={g.brandName}>
                    {pdfType === 'simple' ? (
                      <><TableCell className="text-xs">{g.manufacturerName}</TableCell><TableCell className="text-xs">{g.brandName}</TableCell><TableCell className="text-xs text-right font-semibold">{g.suggestOrder} {g.suggestOrderUnit === 'packet' ? 'Pkt' : 'Ctn'}</TableCell></>
                    ) : (
                      <><TableCell className="text-xs">{g.brandName}</TableCell><TableCell className="text-xs text-right">{g.avgCartons}</TableCell><TableCell className="text-xs text-right">{g.frontStockPkt}</TableCell><TableCell className="text-xs text-right">{g.backStockCartons}</TableCell><TableCell className="text-xs text-right font-semibold">{g.suggestOrder} {g.suggestOrderUnit === 'packet' ? 'Pkt' : 'Ctn'}</TableCell></>
                    )}
                  </TableRow>
                ))}
                {pdfType === 'simple' && confirmGrouped.filter(g => g.suggestOrder > 0).length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground text-xs py-4">No items need ordering this week.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="outline" className="gap-1" onClick={() => handleConfirmPDF('email')}>
              <Mail className="h-3 w-3" /> Email
            </Button>
            <Button variant="outline" className="gap-1" onClick={() => handleConfirmPDF('share')}>
              <Share2 className="h-3 w-3" /> Share
            </Button>
            <Button className="gap-1" onClick={() => handleConfirmPDF('download')}>
              <FileDown className="h-3 w-3" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Orders Panel */}
      {showOrders && (
        <div id="orders-panel" className="container mx-auto px-3 sm:px-4 pb-6">
          <Card className="glass-card">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" /> Customer Orders ({customerOrders.length})</CardTitle>
              <div className="flex gap-1 flex-wrap">
                {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                  <Button key={f} variant={orderFilter === f ? 'default' : 'outline'} size="sm" className="text-xs h-7 capitalize" onClick={() => setOrderFilter(f)}>
                    {f} {f === 'pending' ? `(${pendingOrders.length})` : ''}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters: type, date, slot + export actions */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Filter className="h-3 w-3" /> Filters:</div>
                <Select value={orderTypeFilter} onValueChange={(v) => setOrderTypeFilter(v as any)}>
                  <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="pickup">Pick-up</SelectItem>
                    <SelectItem value="delivery">Delivery*</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={orderDateFilter} onValueChange={setOrderDateFilter}>
                  <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue placeholder="Date" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All dates</SelectItem>
                    {orderDates.map(d => <SelectItem key={d} value={d}>{new Date(d).toLocaleDateString()}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={orderSlotFilter} onValueChange={setOrderSlotFilter}>
                  <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Time slot" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All slots</SelectItem>
                    {orderSlots.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {(orderTypeFilter !== 'all' || orderDateFilter !== 'all' || orderSlotFilter !== 'all') && (
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setOrderTypeFilter('all'); setOrderDateFilter('all'); setOrderSlotFilter('all'); }}>Clear</Button>
                )}
                <div className="ml-auto flex gap-1">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleDownloadOrdersPDF}><Download className="h-3 w-3" /> PDF</Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handlePrintOrdersPDF}><Printer className="h-3 w-3" /> Print</Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleShareOrdersPDF}><Share2 className="h-3 w-3" /> Share</Button>
                </div>
              </div>
              {/* Collection Number Lookup */}
              <div className="flex gap-2 mb-4">
                <Input placeholder="Enter 4-digit collection #" value={collectionLookup} onChange={e => setCollectionLookup(e.target.value)} className="max-w-[200px] h-8 text-sm" maxLength={4} />
                <Button size="sm" className="h-8 text-xs gap-1" onClick={handleCollectionLookup}><Search className="h-3 w-3" /> Lookup</Button>
                {lookupResult && <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setLookupResult(null); setCollectionLookup(''); }}>Clear</Button>}
              </div>
              {lookupResult && (
                <div className="mb-4 p-3 rounded-lg border-2 border-primary bg-primary/5">
                  <p className="text-xs font-bold text-primary mb-1">Collection #{lookupResult.collection_number}</p>
                  <p className="text-sm font-semibold">{lookupResult.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{lookupResult.customer_email} • {lookupResult.customer_contact}</p>
                  <p className="text-xs"><strong>Type:</strong> <span className="capitalize">{lookupResult.order_type}</span></p>
                  <p className="text-sm mt-1">{lookupResult.order_details}</p>
                  <p className={`text-xs font-medium capitalize mt-1 ${lookupResult.status === 'approved' ? 'text-green-600' : lookupResult.status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>{lookupResult.status}</p>
                </div>
              )}
              {(lookupResult ? [] : filteredOrders).length === 0 && !lookupResult ? (
                <p className="text-center text-muted-foreground py-6 text-sm">No {orderFilter !== 'all' ? orderFilter : ''} orders.</p>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map(order => (
                    <div key={order.id} className={`p-3 rounded-lg border ${order.status === 'pending' ? 'border-amber-300 bg-amber-50/50' : order.status === 'approved' ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{order.customer_name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${order.status === 'pending' ? 'bg-amber-100 text-amber-700' : order.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{order.status}</span>
                            {order.collection_number && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary">#{order.collection_number}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">{order.customer_email} • {order.customer_contact}</p>
                          <p className="text-xs"><strong>Type:</strong> <span className="capitalize">{order.order_type}</span> {order.preferred_time && `• ${order.preferred_time}`}</p>
                          <p className="text-sm text-foreground mt-1">{order.order_details}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        {order.status === 'pending' && (
                          <div className="flex gap-2 self-end sm:self-auto">
                            <Button size="sm" className="gap-1 h-7 text-xs" onClick={() => { setSmsOrderId(order.id); setSmsStatus('approved'); setSmsNotes(''); setSmsDialogOpen(true); }}>
                              <Check className="h-3 w-3" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-1 h-7 text-xs" onClick={() => { setSmsOrderId(order.id); setSmsStatus('rejected'); setSmsNotes(''); setSmsDialogOpen(true); }}>
                              <X className="h-3 w-3" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* SMS Notes Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{smsStatus === 'approved' ? 'Approve Order' : 'Reject Order'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            An SMS will be sent to the customer. Add an optional note:
          </p>
          <Input
            placeholder={smsStatus === 'approved' ? 'e.g. Ready by 3pm' : 'e.g. Out of stock'}
            value={smsNotes}
            onChange={(e) => setSmsNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSmsDialogOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              variant={smsStatus === 'approved' ? 'default' : 'destructive'}
              onClick={() => {
                handleUpdateOrderStatus(smsOrderId, smsStatus, smsNotes);
                setSmsDialogOpen(false);
              }}
            >
              {smsStatus === 'approved' ? 'Approve & Send SMS' : 'Reject & Send SMS'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showCommunity && storeId && (
        <div id="community-panel" className="container mx-auto px-3 sm:px-4 pb-6">
          <CommunityChat storeId={storeId} storeName={storeName} />
        </div>
      )}
      <TermsAndConditions
        open={showTermsDialog}
        onOpenChange={(open) => { if (!open && !termsChecked) return; setShowTermsDialog(open); }}
        onAccept={handleAcceptTerms}
        showAcceptButton
      />
    </div>
  );
}

// Sub-component for past week rendering
function PastWeekSection({ week, weekEntries, storeId, onRequestPDF, unitSuggestionRules }: {
  week: string; weekEntries: DbStockEntry[]; storeId: string;
  onRequestPDF: (week: string, grouped: GroupedEntry[]) => void;
  unitSuggestionRules: UnitSuggestionRules;
}) {
  const [grouped, setGrouped] = useState<GroupedEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 30;

  useEffect(() => {
    const buildGrouped = async () => {
      const globalProductsList = await getGlobalProducts();
      const brandToMfr = new Map<string, string>();
      globalProductsList.forEach(gp => { if (gp.brand_name && gp.manufacturer_name) brandToMfr.set(gp.brand_name.toLowerCase(), gp.manufacturer_name); });

      const map = new Map<string, GroupedEntry>();
      weekEntries.forEach(e => {
        const existing = map.get(e.brand_name);
        if (existing) {
          existing.frontStockPkt += e.front_stock;
          existing.backStockCartons += e.back_stock;
          existing.avgCartons = Math.max(existing.avgCartons, e.avg_sales_last_three_weeks);
          existing.packetsPerCarton = Math.max(existing.packetsPerCarton, e.quantity_of_order);
          existing.entryIds.push(e.id);
        } else {
          map.set(e.brand_name, {
            brandName: e.brand_name, manufacturerName: brandToMfr.get(e.brand_name.toLowerCase()) || 'Other',
            unitName: 'unit', avgSalesUnit: 'carton',
            avgCartons: e.avg_sales_last_three_weeks, frontStockPkt: e.front_stock, backStockCartons: e.back_stock,
            packetsPerCarton: e.quantity_of_order > 0 ? e.quantity_of_order : 1, suggestOrder: 0, suggestOrderUnit: 'carton', entryIds: [e.id],
          });
        }
      });
      map.forEach(g => { const uo = unitSuggestionRules[(g.unitName || 'unit').toLowerCase()]; const r = calculateSuggestedOrder(g.avgCartons, g.frontStockPkt, g.backStockCartons, g.packetsPerCarton, g.avgSalesUnit, uo); g.suggestOrder = r.value; g.suggestOrderUnit = r.unit; });
      setGrouped(Array.from(map.values()));
    };
    buildGrouped();
  }, [weekEntries]);

  const totalPages = Math.max(1, Math.ceil(grouped.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = grouped.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Week: {week}</h3>
        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => onRequestPDF(week, grouped)}>
          <FileDown className="h-3 w-3" /> PDF
        </Button>
      </div>
      <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs text-muted-foreground w-full" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? 'Hide Details' : `See More (${grouped.length} products)`}
      </Button>
      {expanded && (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Brand</TableHead>
                  <TableHead className="text-xs">Manufacturer</TableHead>
                  <TableHead className="text-xs text-right">Avg</TableHead>
                  <TableHead className="text-xs text-right">Front</TableHead>
                  <TableHead className="text-xs text-right">Back</TableHead>
                  <TableHead className="text-xs text-right">Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(g => (
                  <TableRow key={g.brandName}>
                    <TableCell className="text-xs font-medium">{g.brandName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{g.manufacturerName}</TableCell>
                    <TableCell className="text-xs text-right">{g.avgCartons}</TableCell>
                    <TableCell className="text-xs text-right">{g.frontStockPkt}</TableCell>
                    <TableCell className="text-xs text-right">{g.backStockCartons}</TableCell>
                    <TableCell className="text-xs text-right font-semibold text-primary">{g.suggestOrder}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, grouped.length)} of {grouped.length}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-6 px-2 text-xs" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Prev</Button>
                <span className="px-1">{safePage}/{totalPages}</span>
                <Button variant="outline" size="sm" className="h-6 px-2 text-xs" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
