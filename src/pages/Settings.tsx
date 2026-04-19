import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getStoreById, updateStore, getProducts, saveProduct, deleteProduct, sendToWebhook, getGlobalProducts, getGlobalProductByBarcode, searchGlobalProducts } from '@/lib/supabase-store';
import type { DbStore, DbStoreProduct, DbGlobalProduct } from '@/lib/supabase-store';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { PasswordInput } from '@/components/PasswordInput';
import { ScanHistoryPanel } from '@/components/ScanHistoryPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, Trash2, Link2, Package, Store as StoreIcon, Phone, Mail, MapPin, Tag, Search, BookOpen, Loader2, QrCode, Clock, Users, Download, Camera, Menu, Trash, CreditCard, UserPlus, ShieldCheck, KeyRound, Truck, User, Pencil, Lock, ChevronUp, ChevronDown } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import logo from '@/assets/cossinfo-logo-new.png';
import { AppHeader } from '@/components/AppHeader';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { PayPalCheckout } from '@/components/PayPalCheckout';
import { QrMenuProducts } from '@/components/QrMenuProducts';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';

interface ScanItem { barcode: string; brandName: string; timestamp: string; action: string; }
type TimeSlot = { id: string; slot_label: string; slot_type: string; is_active: boolean; day_type: string; };
type Customer = { id: string; name: string; email: string; contact_no: string; address: string; referral_code: string; created_at: string; };

/** Base URL for QR order links; set VITE_PUBLIC_APP_URL at build time for a stable public domain. */
const getPublicAppBase = () =>
  (import.meta.env.VITE_PUBLIC_APP_URL || '').replace(/\/$/, '') || window.location.origin;

export default function Settings() {
  const { user, storeId, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [settingsTab, setSettingsTab] = useState('stocks');
  const [store, setStore] = useState<DbStore | null>(null);
  const [storeName, setStoreName] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [refCodeDiscount, setRefCodeDiscount] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showStoreNameOnQR, setShowStoreNameOnQR] = useState(true);
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [uploadingPic, setUploadingPic] = useState(false);

  const [products, setProducts] = useState<DbStoreProduct[]>([]);
  const [cartonBarcode, setCartonBarcode] = useState('');
  const [packetBarcode, setPacketBarcode] = useState('');
  const [scanTarget, setScanTarget] = useState<'carton' | 'packet'>('carton');
  const [brandName, setBrandName] = useState('');
  const [manufacturerName, setManufacturerName] = useState('');
  const [avgSales, setAvgSales] = useState('');
  const [orderQty, setOrderQty] = useState('');
  const [unitName, setUnitName] = useState('unit');
  const [avgSalesUnit, setAvgSalesUnit] = useState<'carton' | 'packet'>('carton');
  const [scanHistory, setScanHistory] = useState<ScanItem[]>(() => {
    try {
      const saved = localStorage.getItem(`scanHistory_settings_${storeId}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [globalProducts, setGlobalProducts] = useState<DbGlobalProduct[]>([]);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryResults, setLibraryResults] = useState<DbGlobalProduct[]>([]);
  const [showLibraryDropdown, setShowLibraryDropdown] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [productFilter, setProductFilter] = useState('');
  const [productPage, setProductPage] = useState(1);
  const PRODUCTS_PER_PAGE = 30;
  const [productUnitFilter, setProductUnitFilter] = useState('');
  const [showProductsList, setShowProductsList] = useState(false);

  // Time slots
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [newSlotLabel, setNewSlotLabel] = useState('');
  const [newSlotType, setNewSlotType] = useState('both');
  const [newDayType, setNewDayType] = useState('all');

  // Customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [qrServiceEnabled, setQrServiceEnabled] = useState(false);
  const [qrServiceExpiresAt, setQrServiceExpiresAt] = useState<string | null>(null);
  const [qrSlug, setQrSlug] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [orderDataRetention, setOrderDataRetention] = useState('1_month');
  const [deliveryMode, setDeliveryMode] = useState('both');
  const [qrOrderInputMode, setQrOrderInputMode] = useState('both');

  // Add/Edit/Delete Customer
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [deleteCustomerOpen, setDeleteCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustName, setNewCustName] = useState('');
  const [newCustContact, setNewCustContact] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [editCustName, setEditCustName] = useState('');
  const [editCustContact, setEditCustContact] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');
  const [otpGenerated, setOtpGenerated] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpStep, setOtpStep] = useState<'form' | 'verify'>('form');
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [skipVerification, setSkipVerification] = useState(false);
  const [starterBillingCycle, setStarterBillingCycle] = useState<'monthly' | '6months' | 'yearly'>('monthly');
  const [popularBillingCycle, setPopularBillingCycle] = useState<'monthly' | '6months' | 'yearly'>('monthly');
  const [businessBillingCycle, setBusinessBillingCycle] = useState<'monthly' | '6months' | 'yearly'>('monthly');
  const [enterpriseBillingCycle, setEnterpriseBillingCycle] = useState<'monthly' | '6months' | 'yearly'>('monthly');

  // Password gate for protected tabs
  const PROTECTED_TABS = ['details', 'slots', 'products', 'data', 'billing'];
  const [unlockedTabs, setUnlockedTabs] = useState<Set<string>>(new Set());
  const [passwordGateOpen, setPasswordGateOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [gatePassword, setGatePassword] = useState('');
  const [gateError, setGateError] = useState('');
  const [gateLoading, setGateLoading] = useState(false);

  const handleTabChange = (tab: string) => {
    if (PROTECTED_TABS.includes(tab) && !unlockedTabs.has(tab)) {
      setPendingTab(tab);
      setGatePassword('');
      setGateError('');
      setPasswordGateOpen(true);
      return;
    }
    setSettingsTab(tab);
  };

  const handlePasswordVerify = async () => {
    if (!gatePassword || !user?.email) return;
    setGateLoading(true);
    setGateError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: gatePassword,
      });
      if (error) {
        setGateError('Incorrect password. Please try again.');
        setGateLoading(false);
        return;
      }
      setUnlockedTabs(prev => new Set([...prev, pendingTab!]));
      setSettingsTab(pendingTab!);
      setPasswordGateOpen(false);
      setPendingTab(null);
      setGatePassword('');

      const tabLabel = pendingTab === 'details' ? 'Store Details' : pendingTab === 'slots' ? 'Time Slots' : pendingTab === 'customers' ? 'Customers' : pendingTab === 'data' ? 'Data Management' : 'Plan & Billing';
      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'settings-access-notification',
          recipientEmail: user.email,
          idempotencyKey: `settings-access-${storeId}-${pendingTab}-${Date.now()}`,
          templateData: { storeName: storeName || store?.name || '', sectionName: tabLabel, accessTime: new Date().toLocaleString() },
        },
      }).catch(() => console.warn('Settings access notification email failed'));

      toast.success(`Access granted to ${tabLabel}`);
    } catch {
      setGateError('Verification failed. Please try again.');
    }
    setGateLoading(false);
  };

  // Persist scan history to localStorage
  useEffect(() => {
    if (storeId) {
      try { localStorage.setItem(`scanHistory_settings_${storeId}`, JSON.stringify(scanHistory)); } catch {}
    }
  }, [scanHistory, storeId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !storeId) { navigate('/login'); return; }
    loadData();
  }, [user, storeId, authLoading, navigate]);

  const loadData = async () => {
    if (!storeId) return;
    setPageLoading(true);
    try {
      const [storeData, productsData, globalData] = await Promise.all([
        getStoreById(storeId),
        getProducts(storeId),
        getGlobalProducts(),
      ]);
      if (storeData) {
        setStore(storeData);
        setStoreName(storeData.name);
        setContactNo(storeData.contact_no);
        setEmail(storeData.email);
        setAddress(storeData.address || '');
        setRefCodeDiscount(storeData.ref_code_discount || '');
        setWebhookUrl(storeData.webhook_url || '');
        setShowStoreNameOnQR((storeData as any).show_store_name !== false);
        setProfilePicUrl((storeData as any).profile_picture_url || '');
        setQrServiceEnabled((storeData as any).qr_service_enabled === true);
        setQrServiceExpiresAt((storeData as any).qr_service_expires_at || null);
        setQrSlug((storeData as any).qr_slug || '');
        setOrderDataRetention((storeData as any).order_data_retention || '1_month');
        setDeliveryMode((storeData as any).delivery_mode || 'both');
        setQrOrderInputMode((storeData as any).qr_order_input_mode || 'both');
      }
      setProducts(productsData);
      setGlobalProducts(globalData);
      // Load time slots
      const { data: slots } = await supabase.from('store_time_slots').select('*').eq('store_id', storeId).order('created_at');
      setTimeSlots((slots as TimeSlot[]) || []);
      // Load customers
      const { data: custs } = await supabase.from('store_customers').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
      setCustomers((custs as Customer[]) || []);
    } catch (err) {
      toast.error('Failed to load data');
    }
    setPageLoading(false);
  };

  // --- Store details ---
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    try {
      const updated = await updateStore(storeId, {
        name: storeName.trim(), contact_no: contactNo.trim(), email: email.trim(),
        address: address.trim(), ref_code_discount: refCodeDiscount.trim(), webhook_url: webhookUrl.trim(),
        show_store_name: showStoreNameOnQR, delivery_mode: deliveryMode,
      } as any);
      setStore(updated);
      toast.success('Store details updated!');
    } catch (err) { toast.error('Failed to update'); }
  };

  // --- Add Customer with OTP or Direct ---
  const handleGenerateOtp = async () => {
    if (!storeId || !newCustName.trim() || !newCustContact.trim() || !newCustEmail.trim()) {
      toast.error('Please fill all fields'); return;
    }
    const phoneClean = newCustContact.replace(/\s+/g, '');
    if (!/^(04\d{8}|\+614\d{8})$/.test(phoneClean)) {
      toast.error('Enter a valid Australian phone (04XX XXX XXX)'); return;
    }
    // Duplicate check: same contact OR same email within this store
    const existingContact = customers.find(c => c.contact_no.replace(/\s+/g, '') === phoneClean);
    if (existingContact) { toast.error('A customer with this contact number already exists.'); return; }
    const existingEmail = customers.find(c => c.email.toLowerCase() === newCustEmail.trim().toLowerCase());
    if (existingEmail) { toast.error('A customer with this email already exists.'); return; }

    // If skip verification, directly add
    if (skipVerification) {
      setAddingCustomer(true);
      try {
        const newId = crypto.randomUUID();
        const { error: insertErr } = await supabase.from('store_customers').insert({ id: newId, store_id: storeId, name: newCustName.trim(), email: newCustEmail.trim(), contact_no: newCustContact.trim() });
        if (insertErr) throw insertErr;
        const { data: custs } = await supabase.from('store_customers').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
        setCustomers((custs as Customer[]) || []);
        setAddCustomerOpen(false); setNewCustName(''); setNewCustContact(''); setNewCustEmail(''); setOtpGenerated(''); setOtpInput(''); setOtpStep('form'); setSkipVerification(false);
        toast.success('Customer added directly (verification skipped)!');
      } catch { toast.error('Failed to save customer.'); }
      setAddingCustomer(false);
      return;
    }

    setAddingCustomer(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-customer-otp', { body: { email: newCustEmail.trim(), contactNo: newCustContact.trim(), storeId } });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      setOtpStep('verify');
      toast.success('Verification code sent to customer via SMS!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send verification code.';
      toast.error(message);
    }
    setAddingCustomer(false);
  };

  const handleVerifyAndSaveCustomer = async () => {
    if (!storeId || otpInput.length < 6) { toast.error('Enter the 6-digit code'); return; }
    setAddingCustomer(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-customer-otp', { body: { email: newCustEmail.trim(), code: otpInput, storeId } });
      if (error) throw error;
      if (data && !data.success) { toast.error(data.error || 'Invalid or expired code'); setAddingCustomer(false); return; }
      const newId = crypto.randomUUID();
      const { error: insertErr } = await supabase.from('store_customers').insert({ id: newId, store_id: storeId, name: newCustName.trim(), email: newCustEmail.trim(), contact_no: newCustContact.trim() });
      if (insertErr) throw insertErr;
      const { data: custs } = await supabase.from('store_customers').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
      setCustomers((custs as Customer[]) || []);
      setAddCustomerOpen(false); setNewCustName(''); setNewCustContact(''); setNewCustEmail(''); setOtpGenerated(''); setOtpInput(''); setOtpStep('form'); setSkipVerification(false);
      toast.success('Customer added successfully!');
    } catch { toast.error('Failed to save customer.'); }
    setAddingCustomer(false);
  };

  const handleEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setEditCustName(c.name);
    setEditCustContact(c.contact_no);
    setEditCustEmail(c.email);
    setEditCustAddress(c.address || '');
    setEditCustomerOpen(true);
  };

  const handleSaveEditCustomer = async () => {
    if (!storeId || !editingCustomer) return;
    setAddingCustomer(true);
    try {
      const { error } = await supabase.from('store_customers').update({
        name: editCustName.trim(),
        contact_no: editCustContact.trim(),
        email: editCustEmail.trim(),
        address: editCustAddress.trim(),
      }).eq('id', editingCustomer.id);
      if (error) throw error;
      const { data: custs } = await supabase.from('store_customers').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
      setCustomers((custs as Customer[]) || []);
      setEditCustomerOpen(false);
      setEditingCustomer(null);
      toast.success('Customer updated!');
    } catch { toast.error('Failed to update customer.'); }
    setAddingCustomer(false);
  };

  const handleDeleteCustomer = async () => {
    if (!storeId || !editingCustomer) return;
    setAddingCustomer(true);
    try {
      const { error } = await supabase.from('store_customers').delete().eq('id', editingCustomer.id);
      if (error) throw error;
      setCustomers(prev => prev.filter(c => c.id !== editingCustomer.id));
      setDeleteCustomerOpen(false);
      setEditingCustomer(null);
      toast.success('Customer deleted.');
    } catch { toast.error('Failed to delete customer.'); }
    setAddingCustomer(false);
  };

  // --- Barcode scanning ---
  const handleBarcodeScan = async (barcode: string) => {
    const globalMatch = await getGlobalProductByBarcode(barcode);
    if (scanTarget === 'carton') {
      setCartonBarcode(barcode);
      if (globalMatch) {
        setBrandName(globalMatch.brand_name);
        setManufacturerName(globalMatch.manufacturer_name || '');
        setPacketBarcode(globalMatch.packet_barcode || '');
        const storeProduct = products.find(p => p.carton_barcode === globalMatch.carton_barcode || p.packet_barcode === globalMatch.packet_barcode);
        if (storeProduct) { setAvgSales(String(storeProduct.avg_sales_last_three_weeks)); setOrderQty(String(storeProduct.quantity_of_order)); setUnitName(storeProduct.unit_name || 'unit'); setAvgSalesUnit(((storeProduct as any).avg_sales_unit as 'carton' | 'packet') || 'carton'); }
        toast.info(`Found: ${globalMatch.brand_name}`);
      }
      setScanTarget('packet');
    } else {
      setPacketBarcode(barcode);
      if (globalMatch && !brandName) { setBrandName(globalMatch.brand_name); setCartonBarcode(globalMatch.carton_barcode || cartonBarcode); }
      toast.info('Packet barcode scanned.');
      setScanTarget('carton');
    }
    setScanHistory(prev => [...prev, { barcode, brandName: brandName || globalMatch?.brand_name || 'Unknown', timestamp: new Date().toLocaleTimeString(), action: scanTarget === 'carton' ? 'Carton Scan' : 'Packet Scan' }]);
  };

  const handleLibrarySearch = async (query: string) => {
    setLibrarySearch(query);
    if (query.trim().length === 0) { setLibraryResults([]); setShowLibraryDropdown(false); return; }
    const matches = await searchGlobalProducts(query);
    setLibraryResults(matches.slice(0, 8));
    setShowLibraryDropdown(matches.length > 0);
  };

  const handleSelectFromLibrary = (gp: DbGlobalProduct) => {
    // Check if product already exists in store with avg set
    const existingProduct = products.find(p =>
      p.brand_name.toLowerCase() === gp.brand_name.toLowerCase() ||
      (gp.carton_barcode && p.carton_barcode === gp.carton_barcode) ||
      (gp.packet_barcode && p.packet_barcode === gp.packet_barcode)
    );
    if (existingProduct && existingProduct.avg_sales_last_three_weeks > 0) {
      toast.error(`"${gp.brand_name}" already exists in your store with avg sales set. Edit it from the product list instead.`);
      setLibrarySearch(''); setShowLibraryDropdown(false);
      return;
    }
    setCartonBarcode(gp.carton_barcode || ''); setPacketBarcode(gp.packet_barcode || '');
    setBrandName(gp.brand_name); setManufacturerName(gp.manufacturer_name || '');
    if (existingProduct) { setAvgSales(String(existingProduct.avg_sales_last_three_weeks)); setOrderQty(String(existingProduct.quantity_of_order)); setUnitName(existingProduct.unit_name || 'unit'); setAvgSalesUnit(((existingProduct as any).avg_sales_unit as 'carton' | 'packet') || 'carton'); }
    else { setAvgSales(''); setOrderQty(''); setUnitName(gp.unit_name || 'unit'); setAvgSalesUnit('carton'); }
    setLibrarySearch(''); setShowLibraryDropdown(false);
    toast.info(`Selected: ${gp.brand_name}`);
  };

  const getSkuCap = () => {
    if (store?.plan_type === 'enterprise') return Infinity;
    if (store?.plan_type === 'business') return 2000;
    return 500;
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !brandName || (!cartonBarcode && !packetBarcode)) return;
    const existing = products.find(p => (cartonBarcode && (p.carton_barcode === cartonBarcode || p.barcode === cartonBarcode)) || (packetBarcode && p.packet_barcode === packetBarcode));
    // Also check by brand name to prevent duplicates
    const existingByName = !existing ? products.find(p => p.brand_name.toLowerCase() === brandName.trim().toLowerCase()) : null;
    if (existingByName && existingByName.avg_sales_last_three_weeks > 0) {
      toast.error(`"${brandName}" already exists with avg sales set. Edit it from the product list instead.`);
      return;
    }
    const effectiveExisting = existing || existingByName;
    if (!effectiveExisting && products.length >= getSkuCap()) {
      toast.error(`SKU limit reached (${getSkuCap()}). Upgrade your plan to add more products.`);
      return;
    }
    try {
      await saveProduct(storeId, {
        id: effectiveExisting?.id, barcode: cartonBarcode || packetBarcode, carton_barcode: cartonBarcode,
        packet_barcode: packetBarcode, brand_name: brandName, manufacturer_name: manufacturerName,
        avg_sales_last_three_weeks: Number(avgSales) || 0, quantity_of_order: Number(orderQty) || 0, unit_type: 'carton',
        unit_name: unitName, avg_sales_unit: avgSalesUnit,
      } as any);
      setProducts(await getProducts(storeId));
      setScanHistory(prev => [...prev, { barcode: cartonBarcode || packetBarcode, brandName, timestamp: new Date().toLocaleTimeString(), action: effectiveExisting ? 'Updated' : 'Added' }]);
      setCartonBarcode(''); setPacketBarcode(''); setBrandName(''); setManufacturerName(''); setAvgSales(''); setOrderQty(''); setUnitName('unit'); setAvgSalesUnit('carton'); setScanTarget('carton');
      sendToWebhook(storeId, { action: 'product_added', brand_name: brandName });
      toast.success(effectiveExisting ? 'Product updated!' : 'Product added!');
    } catch (err) { toast.error('Failed to save product'); }
  };

  const handleDelete = async (id: string) => {
    if (!storeId) return;
    if (!window.confirm('Delete this product from your store?')) return;
    try { await deleteProduct(storeId, id); setProducts(await getProducts(storeId)); toast.success('Product deleted'); }
    catch (err) { toast.error('Failed to delete product'); }
  };

  // --- Time Slots ---
  const handleAddSlot = async () => {
    if (!storeId || !newSlotLabel.trim()) return;
    try {
      await supabase.from('store_time_slots').insert({ store_id: storeId, slot_label: newSlotLabel.trim(), slot_type: newSlotType, day_type: newDayType });
      setNewSlotLabel(''); setNewSlotType('both'); setNewDayType('all');
      const { data } = await supabase.from('store_time_slots').select('*').eq('store_id', storeId).order('created_at');
      setTimeSlots((data as TimeSlot[]) || []);
      toast.success('Time slot added!');
    } catch { toast.error('Failed to add slot'); }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!window.confirm('Delete this time slot?')) return;
    const { error } = await supabase.from('store_time_slots').delete().eq('id', id);
    if (error) {
      // Foreign key constraint — slot is linked to existing orders
      const deactivate = window.confirm(
        'Cannot delete this time slot — it is linked to existing orders.\n\nWould you like to deactivate it instead? (It will no longer appear to customers.)'
      );
      if (deactivate) {
        await handleToggleSlot(id, false);
        toast.success('Time slot deactivated instead');
      }
      return;
    }
    setTimeSlots(prev => prev.filter(s => s.id !== id));
    toast.success('Time slot deleted');
  };

  const handleToggleSlot = async (id: string, active: boolean) => {
    await supabase.from('store_time_slots').update({ is_active: active }).eq('id', id);
    setTimeSlots(prev => prev.map(s => s.id === id ? { ...s, is_active: active } : s));
  };

  // --- QR Code ---
  const getQrBaseUrl = () => getPublicAppBase();

  const qrUrl = qrSlug ? `${getQrBaseUrl()}/order/${qrSlug}` : '';

  const handleDownloadQR = () => {
    const svg = document.getElementById('store-qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement('a');
      a.download = `QR-${storeId}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Filtered customers
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.contact_no.includes(customerSearch)
  );

  const exportCustomersCSV = () => {
    const header = 'Name,Email,Contact,Address,Referral Code,Joined\n';
    const rows = customers.map(c => `"${c.name}","${c.email}","${c.contact_no}","${c.address}","${c.referral_code}","${new Date(c.created_at).toLocaleDateString()}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `customers-${storeId}.csv`;
    a.click();
  };

  const qrServiceActive = qrServiceEnabled && (!qrServiceExpiresAt || new Date(qrServiceExpiresAt) > new Date());

  if (authLoading || pageLoading) {
    return <DashboardSkeleton variant="settings" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        leftContent={
          <div className="flex items-center gap-3">
            <img src={logo} alt="CossInfo" className="h-12" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Settings</h1>
              <p className="text-xs text-muted-foreground">Store: {storeId}</p>
            </div>
          </div>
        }
        rightContent={
          <div className="flex items-center gap-1.5">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={() => navigate('/employee')} className="gap-1">
              <ArrowLeft className="h-3 w-3" /> Back
            </Button>
          </div>
        }
      />

      <div className="container mx-auto px-4 py-6">
        <Tabs value={settingsTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="flex items-center gap-2">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Menu className="h-4 w-4" /> Sections
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground">Settings</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Store: {storeId}</p>
                  </div>
                  <div className="flex-1 p-2 space-y-1">
                    {[
                      { value: 'details', icon: StoreIcon, label: 'Store Details' },
                      { value: 'stocks', icon: Package, label: 'Products' },
                      ...(qrServiceActive ? [
                        { value: 'qr', icon: QrCode, label: 'QR Code' },
                        { value: 'slots', icon: Clock, label: 'Time Slots' },
                      ] : []),
                      { value: 'customers', icon: Users, label: 'Customers' },
                      { value: 'data', icon: Trash, label: 'Data Management' },
                      { value: 'billing', icon: CreditCard, label: 'Plan & Billing' },
                    ].map(item => {
                      const isProtected = PROTECTED_TABS.includes(item.value);
                      const isUnlocked = unlockedTabs.has(item.value);
                      const isActive = settingsTab === item.value;
                      return (
                        <Button
                          key={item.value}
                          variant={isActive ? 'secondary' : 'ghost'}
                          className={`w-full justify-start gap-2.5 h-10 ${isActive ? 'bg-primary/10 text-primary font-medium' : ''}`}
                          onClick={() => { handleTabChange(item.value); setMenuOpen(false); }}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            <item.icon className="h-3.5 w-3.5" />
                          </div>
                          {item.label}
                          {isProtected && !isUnlocked && <Lock className="h-3 w-3 ml-auto text-muted-foreground" />}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-sm font-medium text-muted-foreground capitalize">
              {settingsTab === 'details' ? 'Store Details' : settingsTab === 'stocks' ? 'Products' : settingsTab === 'qr' ? 'QR Code' : settingsTab === 'slots' ? 'Time Slots' : settingsTab === 'customers' ? 'Customers' : settingsTab === 'data' ? 'Data Management' : settingsTab === 'billing' ? 'Plan & Billing' : settingsTab}
            </span>
          </div>

          {/* Store Details */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-card border-border/50"><CardContent className="p-4 text-center"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2"><Package className="h-5 w-5 text-primary" /></div><p className="text-2xl font-bold text-foreground">{products.length}</p><p className="text-xs text-muted-foreground font-medium">Products</p></CardContent></Card>
              <Card className="glass-card border-border/50"><CardContent className="p-4 text-center"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2"><Users className="h-5 w-5 text-primary" /></div><p className="text-2xl font-bold text-foreground">{customers.length}</p><p className="text-xs text-muted-foreground font-medium">Customers</p></CardContent></Card>
              <Card className="glass-card border-border/50"><CardContent className="p-4 text-center"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2"><Clock className="h-5 w-5 text-primary" /></div><p className="text-2xl font-bold text-foreground">{timeSlots.filter(s => s.is_active).length}</p><p className="text-xs text-muted-foreground font-medium">Active Slots</p></CardContent></Card>
              <Card className="glass-card border-border/50"><CardContent className="p-4 text-center"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2"><QrCode className="h-5 w-5 text-primary" /></div><p className="text-sm font-bold text-foreground mt-1">Active</p><p className="text-xs text-muted-foreground font-medium">QR Code</p></CardContent></Card>
            </div>

            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><StoreIcon className="h-4 w-4 text-primary" /> Store Information</CardTitle></CardHeader>
              <CardContent>
                {/* Profile Picture */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                      {profilePicUrl ? (
                        <img src={profilePicUrl} alt="Store" className="w-full h-full object-cover" />
                      ) : (
                        <StoreIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                      {uploadingPic ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !storeId) return;
                        setUploadingPic(true);
                        try {
                          const ext = file.name.split('.').pop();
                          const path = `${storeId}/profile.${ext}`;
                          const { error: uploadErr } = await supabase.storage.from('store-profiles').upload(path, file, { upsert: true });
                          if (uploadErr) throw uploadErr;
                          const { data: { publicUrl } } = supabase.storage.from('store-profiles').getPublicUrl(path);
                          const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
                          await supabase.from('stores').update({ profile_picture_url: urlWithCacheBust } as any).eq('id', storeId);
                          setProfilePicUrl(urlWithCacheBust);
                          toast.success('Profile picture updated!');
                        } catch { toast.error('Failed to upload picture'); }
                        setUploadingPic(false);
                      }} />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Store Profile Picture</p>
                    <p className="text-xs text-muted-foreground">Click the camera icon to upload</p>
                  </div>
                </div>

                <form onSubmit={handleSaveDetails} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1"><StoreIcon className="h-3 w-3 text-primary" /> Store Name</label><Input value={storeName} onChange={e => setStoreName(e.target.value)} /></div>
                    <div><label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1"><Phone className="h-3 w-3 text-primary" /> Contact No</label><Input value={contactNo} onChange={e => setContactNo(e.target.value)} /></div>
                    <div><label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1"><Mail className="h-3 w-3 text-primary" /> Email</label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div><label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" /> Address</label><Input value={address} onChange={e => setAddress(e.target.value)} /></div>
                    <div><label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1"><Tag className="h-3 w-3 text-primary" /> Referral Code</label><Input value={refCodeDiscount} onChange={e => setRefCodeDiscount(e.target.value)} /></div>
                    <div><label className="text-sm font-medium text-foreground mb-1 flex items-center gap-1"><Link2 className="h-3 w-3 text-primary" /> Webhook URL</label><Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} className="font-mono text-sm" placeholder="https://..." /></div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Switch checked={showStoreNameOnQR} onCheckedChange={setShowStoreNameOnQR} id="show-store-name" />
                    <Label htmlFor="show-store-name" className="text-sm cursor-pointer">Show store name on customer QR page</Label>
                  </div>
                  <div className="space-y-2 pt-2">
                    <Label className="text-sm font-medium flex items-center gap-1"><Truck className="h-3 w-3 text-primary" /> Delivery Mode</Label>
                    <Select value={deliveryMode} onValueChange={setDeliveryMode}>
                      <SelectTrigger className="w-full sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Pickup + Delivery</SelectItem>
                        <SelectItem value="pickup_only">Pickup Only</SelectItem>
                        <SelectItem value="delivery_only">Delivery Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Controls what customers see on the QR ordering page.</p>
                  </div>
                  <Button type="submit" className="gap-2"><Save className="h-4 w-4" /> Save Details</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Stocks / Products */}
          <TabsContent value="stocks" className="space-y-6">
            <Card className="glass-card border-primary/30 relative z-10">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Product Library ({globalProducts.length} products)</CardTitle></CardHeader>
              <CardContent className="space-y-3 overflow-visible">
                <p className="text-xs text-muted-foreground">Search the shared library to add a product.</p>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search library by brand name..." value={librarySearch} onChange={e => handleLibrarySearch(e.target.value)} className="flex-1" />
                  </div>
                  {showLibraryDropdown && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {libraryResults.map(gp => (
                        <button key={gp.id} type="button" onClick={() => handleSelectFromLibrary(gp)} className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm flex justify-between items-center border-b border-border last:border-0 focus:bg-accent focus:text-accent-foreground focus:outline-none">
                          <span className="font-medium text-foreground">{gp.brand_name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{gp.carton_barcode || gp.packet_barcode}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <ScanHistoryPanel items={scanHistory} title="Scanned Products" />
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Scan & Add Product</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${scanTarget === 'carton' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>1. Scan Carton {cartonBarcode ? '✓' : ''}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${scanTarget === 'packet' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>2. Scan Packet {packetBarcode ? '✓' : ''}</span>
                </div>
                <BarcodeScanner onScan={handleBarcodeScan} />
                {(cartonBarcode || packetBarcode) && (
                  <form onSubmit={handleAddProduct} className="space-y-3 pt-3 border-t border-border">
                    <div className="grid grid-cols-2 gap-2 text-sm font-mono text-muted-foreground">
                      <p>Carton: {cartonBarcode || '—'}</p><p>Packet: {packetBarcode || '—'}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input placeholder="Brand Name" value={brandName} onChange={e => setBrandName(e.target.value)} required />
                      <Input placeholder="Manufacturer Name" value={manufacturerName} onChange={e => setManufacturerName(e.target.value)} />
                      <div className="flex gap-2">
                        <Input type="number" placeholder="Avg Sales (3 weeks)" value={avgSales} onChange={e => setAvgSales(e.target.value)} className="flex-1" />
                        <select value={avgSalesUnit} onChange={e => setAvgSalesUnit(e.target.value as 'carton' | 'packet')}
                          className="rounded-md border border-input bg-background px-2 py-2 text-sm h-10 w-[100px]">
                          <option value="carton">Carton</option>
                          <option value="packet">Packet</option>
                        </select>
                      </div>
                      <Input type="number" placeholder="Packets per Carton" value={orderQty} onChange={e => setOrderQty(e.target.value)} />
                      <select value={unitName} onChange={e => setUnitName(e.target.value)}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm h-10">
                        <option value="stick">Stick</option>
                        <option value="gram">Gram</option>
                        <option value="book">Book</option>
                        <option value="box">Box</option>
                        <option value="each">Each</option>
                        <option value="pack">Pack</option>
                        <option value="unit">Unit</option>
                        <option value="cigar">Cigar</option>
                      </select>
                    </div>
                    <Button type="submit" className="gap-2"><Plus className="h-4 w-4" /> {products.find(p => p.carton_barcode === cartonBarcode || p.packet_barcode === packetBarcode) ? 'Update' : 'Add'} Product</Button>
                  </form>
                )}
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="cursor-pointer" onClick={() => setShowProductsList(prev => !prev)}>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Products ({products.length} / {getSkuCap() === Infinity ? '∞' : getSkuCap()} SKUs)
                  <Button variant="outline" size="sm" className="ml-auto h-7 px-3 text-xs gap-1">
                    {showProductsList ? <><ChevronUp className="h-3 w-3" /> Hide List</> : <><ChevronDown className="h-3 w-3" /> Show List</>}
                  </Button>
                </CardTitle>
              </CardHeader>
              {showProductsList && (
              <CardContent>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by brand, barcode, manufacturer..."
                    value={productFilter}
                    onChange={e => { setProductFilter(e.target.value); setProductPage(1); }}
                    className="h-8 text-xs flex-1 min-w-[120px]"
                  />
                  <select
                    value={productUnitFilter}
                    onChange={e => { setProductUnitFilter(e.target.value); setProductPage(1); }}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs h-8"
                  >
                    <option value="">All Units</option>
                    <option value="stick">Stick</option>
                    <option value="gram">Gram</option>
                    <option value="book">Book</option>
                    <option value="box">Box</option>
                    <option value="each">Each</option>
                    <option value="pack">Pack</option>
                    <option value="unit">Unit</option>
                    <option value="cigar">Cigar</option>
                  </select>
                  {(productFilter || productUnitFilter) && (
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => { setProductFilter(''); setProductUnitFilter(''); setProductPage(1); }}>Clear</Button>
                  )}
                </div>
                {(() => {
                  const filtered = products.filter(p => {
                    const matchesText = !productFilter || (() => {
                      const q = productFilter.toLowerCase();
                      return (p.brand_name || '').toLowerCase().includes(q)
                        || (p.carton_barcode || p.barcode || '').toLowerCase().includes(q)
                        || (p.packet_barcode || '').toLowerCase().includes(q)
                        || (p.manufacturer_name || '').toLowerCase().includes(q);
                    })();
                    const matchesUnit = !productUnitFilter || (p.unit_name || 'unit') === productUnitFilter;
                    return matchesText && matchesUnit;
                  });
                  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
                  const safePage = Math.min(productPage, totalPages);
                  const paginated = filtered.slice((safePage - 1) * PRODUCTS_PER_PAGE, safePage * PRODUCTS_PER_PAGE);
                  return (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/50 hover:bg-transparent">
                              <TableHead className="text-xs text-muted-foreground font-medium">Carton</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Packet</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Brand</TableHead>
                               <TableHead className="text-xs text-muted-foreground font-medium">Manufacturer</TableHead><TableHead className="text-right text-xs text-muted-foreground font-medium">Avg</TableHead>
                               <TableHead className="text-right text-xs text-muted-foreground font-medium">Pkt/Ctn</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Unit</TableHead><TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginated.length === 0 ? (
                              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">{productFilter ? 'No matching products.' : 'No products yet.'}</TableCell></TableRow>
                            ) : paginated.map(p => (
                              <TableRow key={p.id} className="border-border/30">
                                <TableCell className="font-mono text-xs text-muted-foreground">{p.carton_barcode || p.barcode}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{p.packet_barcode || '—'}</TableCell>
                                <TableCell className="font-semibold text-foreground">{p.brand_name}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{p.manufacturer_name || '—'}</TableCell>
                                 <TableCell className="text-right">
                                   <div className="flex items-center gap-1 justify-end">
                                     <Input
                                       type="number"
                                       value={p.avg_sales_last_three_weeks}
                                       onChange={async (e) => {
                                         const val = Number(e.target.value);
                                         try {
                                           await saveProduct(storeId!, { id: p.id, brand_name: p.brand_name, avg_sales_last_three_weeks: val, avg_sales_unit: (p as any).avg_sales_unit || 'carton' });
                                           setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, avg_sales_last_three_weeks: val } : pr));
                                         } catch { toast.error('Failed to update'); }
                                       }}
                                       className="w-16 h-7 text-xs text-right px-1"
                                     />
                                     <select
                                       value={(p as any).avg_sales_unit === 'packet' ? 'packet' : 'carton'}
                                       onChange={async (e) => {
                                         const unit = e.target.value as 'carton' | 'packet';
                                         try {
                                           await saveProduct(storeId!, { id: p.id, brand_name: p.brand_name, avg_sales_unit: unit });
                                           setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, avg_sales_unit: unit } as any : pr));
                                         } catch { toast.error('Failed to update'); }
                                       }}
                                       className="rounded border border-input bg-background px-1 py-0.5 text-[10px] h-7 w-14"
                                     >
                                       <option value="carton">Ctn</option>
                                       <option value="packet">Pkt</option>
                                     </select>
                                   </div>
                                 </TableCell>
                                 <TableCell className="text-right">
                                   <Input
                                     type="number"
                                     value={p.quantity_of_order}
                                     onChange={async (e) => {
                                       const val = Number(e.target.value);
                                       try {
                                         await saveProduct(storeId!, { id: p.id, brand_name: p.brand_name, quantity_of_order: val });
                                         setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, quantity_of_order: val } : pr));
                                       } catch { toast.error('Failed to update'); }
                                     }}
                                     className="w-16 h-7 text-xs text-right px-1"
                                   />
                                 </TableCell>
                                 <TableCell>
                                   <select
                                     value={p.unit_name || 'unit'}
                                     onChange={async (e) => {
                                       const val = e.target.value;
                                       try {
                                         await saveProduct(storeId!, { id: p.id, brand_name: p.brand_name, unit_name: val });
                                         setProducts(prev => prev.map(pr => pr.id === p.id ? { ...pr, unit_name: val } as any : pr));
                                       } catch { toast.error('Failed to update'); }
                                     }}
                                     className="rounded border border-input bg-background px-1 py-0.5 text-[10px] h-7 w-16 capitalize"
                                   >
                                     <option value="stick">Stick</option>
                                     <option value="gram">Gram</option>
                                     <option value="book">Book</option>
                                     <option value="box">Box</option>
                                     <option value="each">Each</option>
                                     <option value="pack">Pack</option>
                                     <option value="unit">Unit</option>
                                     <option value="cigar">Cigar</option>
                                   </select>
                                 </TableCell>
                                 <TableCell><Button variant="outline" size="icon" className="border-border/50 hover:bg-destructive/10" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                          <span>Showing {(safePage - 1) * PRODUCTS_PER_PAGE + 1}–{Math.min(safePage * PRODUCTS_PER_PAGE, filtered.length)} of {filtered.length}</span>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={safePage <= 1} onClick={() => setProductPage(safePage - 1)}>Prev</Button>
                            <span className="px-2">Page {safePage} / {totalPages}</span>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={safePage >= totalPages} onClick={() => setProductPage(safePage + 1)}>Next</Button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
              )}
            </Card>

            {/* Unit Suggestion Rules */}
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Order Suggestion Unit Rules</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Choose the default suggestion unit per product type. E.g., Sticks → Carton only, Gram → Packet only.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {['stick', 'gram', 'book', 'box', 'each', 'pack', 'unit', 'cigar'].map(unitKey => (
                    <div key={unitKey} className="flex items-center justify-between border border-border rounded-md px-3 py-2">
                      <span className="text-sm font-medium capitalize text-foreground">{unitKey}</span>
                      <select
                        value={((store as any)?.unit_suggestion_rules || {})[unitKey] || 'auto'}
                        onChange={async (e) => {
                          if (!storeId || !store) return;
                          const rules = { ...((store as any)?.unit_suggestion_rules || {}) };
                          if (e.target.value === 'auto') {
                            delete rules[unitKey];
                          } else {
                            rules[unitKey] = e.target.value;
                          }
                          try {
                            await updateStore(storeId, { unit_suggestion_rules: rules } as any);
                            setStore({ ...store, unit_suggestion_rules: rules } as any);
                            toast.success(`${unitKey} suggestion set to ${e.target.value === 'auto' ? 'auto (follows avg unit)' : e.target.value}`);
                          } catch { toast.error('Failed to update'); }
                        }}
                        className="rounded border border-input bg-background px-2 py-1 text-xs h-8 w-24"
                      >
                        <option value="auto">Auto</option>
                        <option value="carton">Carton</option>
                        <option value="packet">Packet</option>
                      </select>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Auto = follows the product's avg sales unit. Carton = always suggest in cartons. Packet = always suggest in packets.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* QR Code */}
          <TabsContent value="qr" className="space-y-6">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" /> Store QR Code</CardTitle></CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">Customers scan this QR code to sign up and place orders at your store.</p>
                <div className="bg-background p-6 rounded-xl border border-border inline-block mx-auto">
                  <QRCodeSVG id="store-qr-code" value={qrUrl} size={200} level="H" includeMargin />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-mono text-muted-foreground break-all">{qrUrl}</p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={handleDownloadQR} className="gap-2"><Download className="h-4 w-4" /> Download QR</Button>
                    <Button variant="outline" onClick={() => { navigator.clipboard.writeText(qrUrl); toast.success('Link copied!'); }}>Copy Link</Button>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">How it works:</h3>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Print or display this QR code at your store</li>
                    <li>Customer scans and fills in their details</li>
                    <li>Customer selects pickup or delivery with a preferred time</li>
                    <li>You receive the order in your dashboard and can approve/reject it</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Customer Order Input Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer Order Input</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Choose what customers see when placing an order via QR code.</p>
                <Select value={qrOrderInputMode} onValueChange={async (val) => {
                  setQrOrderInputMode(val);
                  if (!storeId) return;
                  const { error } = await supabase.from('stores').update({ qr_order_input_mode: val } as any).eq('id', storeId);
                  if (error) toast.error('Failed to update');
                  else toast.success('Order input mode updated');
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="products">Products Only — customers pick from your QR menu</SelectItem>
                    <SelectItem value="notes">Notes Only — customers type free-text order details</SelectItem>
                    <SelectItem value="both">Both — show products and a notes field</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* QR Menu Products */}
            <QrMenuProducts storeId={storeId!} planType={store?.plan_type || 'free'} products={products} />
          </TabsContent>

          {/* Time Slots */}
          <TabsContent value="slots" className="space-y-6">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Manage Time Slots</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Set available pickup/delivery time slots. Assign to specific days, weekdays, or weekends.</p>
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <Input placeholder="e.g., 9:00 AM - 10:00 AM" value={newSlotLabel} onChange={e => setNewSlotLabel(e.target.value)} className="flex-1 min-w-[180px]" />
                    <select value={newSlotType} onChange={e => setNewSlotType(e.target.value)}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="both">Both</option>
                      <option value="pickup">Pickup Only</option>
                      <option value="delivery">Delivery Only</option>
                    </select>
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    <span className="text-xs font-medium text-muted-foreground">Available on:</span>
                    <select value={newDayType} onChange={e => setNewDayType(e.target.value)}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="all">All Days</option>
                      <option value="weekday">Weekdays (Mon-Fri)</option>
                      <option value="weekend">Weekends (Sat-Sun)</option>
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                    <Button onClick={handleAddSlot} className="gap-1"><Plus className="h-4 w-4" /> Add</Button>
                  </div>
                </div>

                {timeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No time slots configured yet.</p>
                ) : (
                  <div className="space-y-2">
                    {timeSlots.map(slot => {
                      const dayLabel = slot.day_type === 'all' ? 'All Days' : slot.day_type === 'weekday' ? 'Weekdays' : slot.day_type === 'weekend' ? 'Weekends' : slot.day_type.charAt(0).toUpperCase() + slot.day_type.slice(1);
                      return (
                        <div key={slot.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-primary" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{slot.slot_label}</p>
                              <div className="flex gap-2 text-xs text-muted-foreground">
                                <span className="capitalize">{slot.slot_type === 'both' ? 'Pickup & Delivery' : slot.slot_type}</span>
                                <span>•</span>
                                <span>{dayLabel}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant={slot.is_active ? 'default' : 'outline'} size="sm" className="text-xs h-7"
                              onClick={() => handleToggleSlot(slot.id, !slot.is_active)}>
                              {slot.is_active ? 'Active' : 'Inactive'}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteSlot(slot.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers */}
          <TabsContent value="customers" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Customers ({customers.length})</CardTitle>
                  <Button size="sm" onClick={() => { setAddCustomerOpen(true); setOtpStep('form'); setNewCustName(''); setNewCustContact(''); setNewCustEmail(''); setOtpGenerated(''); setOtpInput(''); setSkipVerification(false); }} className="gap-1 text-xs">
                    <UserPlus className="h-3 w-3" /> Add Customer
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {customers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search customers..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="flex-1" />
                  </div>
                )}
                {filteredCustomers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {customers.length === 0 ? 'No customers yet. Share your QR code to get started!' : 'No matching customers.'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                         <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Contact</TableHead>
                          <TableHead className="hidden md:table-cell">Address</TableHead><TableHead className="hidden md:table-cell">Code</TableHead>
                          <TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.map(c => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell className="text-xs">{c.email}</TableCell>
                            <TableCell className="text-xs">{c.contact_no}</TableCell>
                            <TableCell className="text-xs hidden md:table-cell">{c.address || '—'}</TableCell>
                            <TableCell className="text-xs hidden md:table-cell">{c.referral_code || '—'}</TableCell>
                            <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCustomer(c)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { setEditingCustomer(c); setDeleteCustomerOpen(true); }}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Customer Dialog */}
            <Dialog open={addCustomerOpen} onOpenChange={(open) => { setAddCustomerOpen(open); if (!open) { setOtpStep('form'); setOtpGenerated(''); setOtpInput(''); setSkipVerification(false); } }}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" /> {otpStep === 'form' ? 'Add New Customer' : 'Verify Customer'}</DialogTitle>
                </DialogHeader>
                {otpStep === 'form' ? (
                  <div className="space-y-4">
                    <div><Label className="flex items-center gap-1 mb-1"><User className="h-3 w-3" /> Name *</Label><Input value={newCustName} onChange={e => setNewCustName(e.target.value)} placeholder="Customer name" /></div>
                    <div><Label className="flex items-center gap-1 mb-1"><Phone className="h-3 w-3" /> Contact *</Label><Input value={newCustContact} onChange={e => setNewCustContact(e.target.value)} placeholder="04XX XXX XXX" /></div>
                    <div><Label className="flex items-center gap-1 mb-1"><Mail className="h-3 w-3" /> Email *</Label><Input type="email" value={newCustEmail} onChange={e => setNewCustEmail(e.target.value)} placeholder="customer@email.com" /></div>
                    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 border">
                      <Switch checked={skipVerification} onCheckedChange={setSkipVerification} id="skip-verify" />
                      <Label htmlFor="skip-verify" className="text-sm cursor-pointer">
                        <span className="font-medium">Skip email verification</span>
                        <span className="block text-xs text-muted-foreground">Add customer directly without OTP (admin override)</span>
                      </Label>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleGenerateOtp} disabled={addingCustomer} className="w-full gap-2">
                        {addingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : skipVerification ? <UserPlus className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                        {skipVerification ? 'Add Customer Directly' : 'Send Verification Code'}
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
                      <ShieldCheck className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">Waiting for Customer Verification</p>
                      <p className="text-xs text-muted-foreground mt-2">A verification code has been sent to the customer via SMS. Ask the customer for the code and enter it below.</p>
                    </div>
                    <div>
                      <Label className="mb-1 block">Enter code from customer *</Label>
                      <Input type="text" placeholder="000000" value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))} className="text-center text-2xl tracking-[0.4em] font-mono h-12" maxLength={6} />
                    </div>
                    <DialogFooter className="flex gap-2">
                      <Button variant="outline" onClick={() => setOtpStep('form')}>Back</Button>
                      <Button onClick={handleVerifyAndSaveCustomer} disabled={addingCustomer || otpInput.length < 6} className="flex-1 gap-2">
                        {addingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verify & Save
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            {/* Edit Customer Dialog */}
            <Dialog open={editCustomerOpen} onOpenChange={setEditCustomerOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Edit Customer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div><Label className="flex items-center gap-1 mb-1"><User className="h-3 w-3" /> Name *</Label><Input value={editCustName} onChange={e => setEditCustName(e.target.value)} placeholder="Customer name" /></div>
                  <div><Label className="flex items-center gap-1 mb-1"><Phone className="h-3 w-3" /> Contact *</Label><Input value={editCustContact} onChange={e => setEditCustContact(e.target.value)} placeholder="04XX XXX XXX" /></div>
                  <div><Label className="flex items-center gap-1 mb-1"><Mail className="h-3 w-3" /> Email *</Label><Input type="email" value={editCustEmail} onChange={e => setEditCustEmail(e.target.value)} placeholder="customer@email.com" /></div>
                  <div><Label className="flex items-center gap-1 mb-1"><MapPin className="h-3 w-3" /> Address</Label><Input value={editCustAddress} onChange={e => setEditCustAddress(e.target.value)} placeholder="Address (optional)" /></div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditCustomerOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveEditCustomer} disabled={addingCustomer || !editCustName.trim() || !editCustContact.trim() || !editCustEmail.trim()} className="gap-2">
                      {addingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Customer Confirmation */}
            <Dialog open={deleteCustomerOpen} onOpenChange={setDeleteCustomerOpen}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Delete Customer</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{editingCustomer?.name}</strong>? This action cannot be undone.</p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteCustomerOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleDeleteCustomer} disabled={addingCustomer} className="gap-2">
                    {addingCustomer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Data Management */}
          <TabsContent value="data" className="space-y-6">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Trash className="h-4 w-4 text-primary" /> Order Data Retention</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Choose how long customer order data is kept before automatic deletion.</p>
                <Select value={orderDataRetention} onValueChange={async (val) => {
                  setOrderDataRetention(val);
                  if (storeId) {
                    try {
                      await supabase.from('stores').update({ order_data_retention: val } as any).eq('id', storeId);
                      toast.success('Retention setting updated!');
                    } catch { toast.error('Failed to update'); }
                  }
                }}>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Select retention period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1_day">1 Day</SelectItem>
                    <SelectItem value="1_week">1 Week</SelectItem>
                    <SelectItem value="1_month">1 Month</SelectItem>
                    <SelectItem value="1_year">1 Year</SelectItem>
                  </SelectContent>
                </Select>
                <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Current setting: <span className="text-primary">{orderDataRetention === '1_day' ? '1 Day' : orderDataRetention === '1_week' ? '1 Week' : orderDataRetention === '1_month' ? '1 Month' : '1 Year'}</span></p>
                  <p>Orders older than the selected period will be automatically removed to keep your data clean.</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4 text-primary" /> Export Data</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">Download your customer list as a CSV file.</p>
                <Button variant="outline" size="sm" onClick={exportCustomersCSV} disabled={customers.length === 0} className="gap-1 text-xs">
                  <Download className="h-3 w-3" /> Export Customers CSV
                </Button>
                {customers.length === 0 && <p className="text-xs text-muted-foreground">No customers to export yet.</p>}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Plan & Billing */}
          <TabsContent value="billing" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" /> Current Plan & Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-semibold text-foreground capitalize">{store?.plan_type || 'starter'} Plan</p>
                    <p className="text-xs text-muted-foreground">
                      {store?.plan_type === 'enterprise' ? 'Custom pricing' : store?.plan_type === 'business' ? '$79.99/month' : store?.plan_type === 'popular' ? '$49.99/month' : '$29.99/month'}
                    </p>
                  </div>
                  {(store?.plan_type === 'starter' || store?.plan_type === 'free') && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">Starter</span>
                  )}
                  {store?.plan_type === 'popular' && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-medium">Popular</span>
                  )}
                  {store?.plan_type === 'business' && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-medium">Business</span>
                  )}
                  {store?.plan_type === 'enterprise' && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-medium">Enterprise</span>
                  )}
                </div>

                {/* Active Subscription Info */}
                <ActiveSubscriptionCard storeId={storeId} />

                {store?.plan_type !== 'enterprise' && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Choose your plan and subscribe:</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(store?.plan_type === 'starter' || store?.plan_type === 'free') && (
                        <Card className="border-primary/30">
                          <CardContent className="p-4 space-y-3">
                            <div>
                              <p className="font-semibold text-foreground">Starter</p>
                              <p className="text-xl font-bold text-foreground">
                                {starterBillingCycle === 'monthly' ? '$29.99' : starterBillingCycle === '6months' ? '$170.94' : '$323.89'}
                                <span className="text-sm font-normal text-muted-foreground">
                                  {starterBillingCycle === 'monthly' ? '/mo' : starterBillingCycle === '6months' ? '/6mo' : '/yr'}
                                </span>
                              </p>
                              {starterBillingCycle === '6months' && <p className="text-xs text-green-600 font-medium">5% discount applied!</p>}
                              {starterBillingCycle === 'yearly' && <p className="text-xs text-green-600 font-medium">10% discount applied!</p>}
                              <p className="text-xs text-muted-foreground mt-1">500 SKUs, stock tracking, barcode scanning, PDF reports</p>
                            </div>
                            <Select value={starterBillingCycle} onValueChange={(v) => setStarterBillingCycle(v as any)}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Billing cycle" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monthly">Monthly — $29.99/mo</SelectItem>
                                <SelectItem value="6months">6 Months — $170.94 (5% off)</SelectItem>
                                <SelectItem value="yearly">Yearly — $323.89 (10% off)</SelectItem>
                              </SelectContent>
                            </Select>
                            <PayPalCheckout
                              key={`starter-${starterBillingCycle}`}
                              plan="starter"
                              billingCycle={starterBillingCycle}
                              onSuccess={async () => {
                                if (storeId) {
                                  const updated = await getStoreById(storeId);
                                  if (updated) setStore(updated);
                                }
                              }}
                            />
                          </CardContent>
                        </Card>
                      )}
                      {store?.plan_type !== 'popular' && store?.plan_type !== 'business' && (
                        <Card className="border-primary/30">
                          <CardContent className="p-4 space-y-3">
                            <div>
                              <p className="font-semibold text-foreground">Popular</p>
                              <p className="text-xl font-bold text-foreground">
                                {popularBillingCycle === 'monthly' ? '$49.99' : popularBillingCycle === '6months' ? '$284.94' : '$539.89'}
                                <span className="text-sm font-normal text-muted-foreground">
                                  {popularBillingCycle === 'monthly' ? '/mo' : popularBillingCycle === '6months' ? '/6mo' : '/yr'}
                                </span>
                              </p>
                              {popularBillingCycle === '6months' && <p className="text-xs text-green-600 font-medium">5% discount applied!</p>}
                              {popularBillingCycle === 'yearly' && <p className="text-xs text-green-600 font-medium">10% discount applied!</p>}
                              <p className="text-xs text-muted-foreground mt-1">500 SKUs, community chat, QR ordering (5 items), order management</p>
                            </div>
                            <Select value={popularBillingCycle} onValueChange={(v) => setPopularBillingCycle(v as any)}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Billing cycle" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monthly">Monthly — $49.99/mo</SelectItem>
                                <SelectItem value="6months">6 Months — $284.94 (5% off)</SelectItem>
                                <SelectItem value="yearly">Yearly — $539.89 (10% off)</SelectItem>
                              </SelectContent>
                            </Select>
                            <PayPalCheckout
                              key={`popular-${popularBillingCycle}`}
                              plan="popular"
                              billingCycle={popularBillingCycle}
                              onSuccess={async () => {
                                if (storeId) {
                                  const updated = await getStoreById(storeId);
                                  if (updated) setStore(updated);
                                }
                              }}
                            />
                          </CardContent>
                        </Card>
                      )}
                      {store?.plan_type !== 'business' && (
                        <Card className="border-primary/30">
                          <CardContent className="p-4 space-y-3">
                            <div>
                              <p className="font-semibold text-foreground">Business</p>
                              <p className="text-xl font-bold text-foreground">
                                {businessBillingCycle === 'monthly' ? '$79.99' : businessBillingCycle === '6months' ? '$455.94' : '$863.89'}
                                <span className="text-sm font-normal text-muted-foreground">
                                  {businessBillingCycle === 'monthly' ? '/mo' : businessBillingCycle === '6months' ? '/6mo' : '/yr'}
                                </span>
                              </p>
                              {businessBillingCycle === '6months' && <p className="text-xs text-green-600 font-medium">5% discount applied!</p>}
                              {businessBillingCycle === 'yearly' && <p className="text-xs text-green-600 font-medium">10% discount applied!</p>}
                              <p className="text-xs text-muted-foreground mt-1">2,000 SKUs, QR ordering (20 items), multi-channel chat</p>
                            </div>
                            <Select value={businessBillingCycle} onValueChange={(v) => setBusinessBillingCycle(v as any)}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Billing cycle" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monthly">Monthly — $79.99/mo</SelectItem>
                                <SelectItem value="6months">6 Months — $455.94 (5% off)</SelectItem>
                                <SelectItem value="yearly">Yearly — $863.89 (10% off)</SelectItem>
                              </SelectContent>
                            </Select>
                            <PayPalCheckout
                              key={`business-${businessBillingCycle}`}
                              plan="business"
                              billingCycle={businessBillingCycle}
                              onSuccess={async () => {
                                if (storeId) {
                                  const updated = await getStoreById(storeId);
                                  if (updated) setStore(updated);
                                }
                              }}
                            />
                          </CardContent>
                        </Card>
                      )}
                      <Card className="border-primary/30">
                        <CardContent className="p-4 space-y-3">
                          <div>
                            <p className="font-semibold text-foreground">Enterprise</p>
                            <p className="text-xl font-bold text-foreground">Custom</p>
                            <p className="text-xs text-muted-foreground mt-1">Custom branded e-commerce app, customer logins, unlimited SKUs</p>
                          </div>
                          <p className="text-sm text-muted-foreground">Enterprise pricing is customized based on your needs. Contact us for a tailored quote.</p>
                          <Button className="w-full gap-2" variant="outline" onClick={() => window.open('mailto:support@cossinfo.com?subject=Enterprise Plan Inquiry', '_blank')}>
                            <Mail className="h-4 w-4" /> Contact Us
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {store?.plan_type === 'enterprise' && (
                  <p className="text-sm text-muted-foreground">You're on the highest plan. All features are unlocked! 🎉</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* Password Gate Dialog */}
      <Dialog open={passwordGateOpen} onOpenChange={setPasswordGateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Password Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your account password to access <strong>{pendingTab === 'details' ? 'Store Details' : pendingTab === 'slots' ? 'Time Slots' : pendingTab === 'products' ? 'Products' : pendingTab === 'data' ? 'Data Management' : 'Plan & Billing'}</strong>.
            </p>
            <p className="text-xs text-muted-foreground">A notification email will be sent to your registered email for security.</p>
            <form onSubmit={e => { e.preventDefault(); handlePasswordVerify(); }} autoComplete="off">
                <input type="text" name="prevent_autofill" style={{ display: 'none' }} tabIndex={-1} autoComplete="username" />
                <input type="password" name="prevent_autofill_pw" style={{ display: 'none' }} tabIndex={-1} autoComplete="new-password" />
                <div className="space-y-3">
                <div>
                  <Label className="text-xs">Password</Label>
                  <PasswordInput
                    placeholder="Enter your password"
                    value={gatePassword}
                    onChange={e => setGatePassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    name="gate_password_field"
                  />
                </div>
                {gateError && <p className="text-xs text-destructive">{gateError}</p>}
                <Button type="submit" className="w-full gap-2" disabled={!gatePassword || gateLoading}>
                  {gateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {gateLoading ? 'Verifying...' : 'Verify & Access'}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActiveSubscriptionCard({ storeId }: { storeId: string | null }) {
  const [sub, setSub] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    if (!storeId) { setLoading(false); return; }
    fetchSub();
  }, [storeId]);

  const callPayPal = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not logged in');
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const r = await fetch(`https://${projectId}.supabase.co/functions/v1/paypal-checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });
    return r.json();
  };

  const fetchSub = async () => {
    try {
      const data = await callPayPal({ action: 'get-subscription' });
      setSub(data.subscription);
      setInvoices(data.invoices || []);
    } catch { }
    setLoading(false);
  };

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      if (action === 'cancel') {
        const data = await callPayPal({ action: 'cancel-subscription', subscriptionId: sub.paypal_subscription_id });
        if (data.status === 'CANCELLED') { toast.success('Subscription cancelled'); setSub(null); }
        else toast.error('Failed to cancel');
      } else if (action === 'pause') {
        const data = await callPayPal({ action: 'pause-subscription' });
        if (data.status === 'PAUSED') { toast.success(`Subscription paused (${data.daysRemaining} days remaining)`); fetchSub(); }
        else toast.error(data.error || 'Failed to pause');
      } else if (action === 'resume') {
        const data = await callPayPal({ action: 'resume-subscription' });
        if (data.status === 'ACTIVE') { toast.success('Subscription resumed!'); fetchSub(); }
        else toast.error(data.error || 'Failed to resume');
      }
    } catch { toast.error(`Failed to ${action}`); }
    setActionLoading('');
  };

  if (loading) return <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-3 w-3 animate-spin" /> Loading subscription...</div>;
  if (!sub) return null;

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    grace_period: 'bg-orange-100 text-orange-700',
  };
  const statusLabels: Record<string, string> = {
    active: '✅ Active',
    paused: '⏸️ Paused',
    grace_period: '⚠️ Grace Period',
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Subscription</p>
          <div className="flex gap-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[sub.status] || 'bg-muted text-muted-foreground'}`}>
              {statusLabels[sub.status] || sub.status}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sub.payment_mode === 'recurring' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {sub.payment_mode === 'recurring' ? '🔄 Auto' : '💳 Manual'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>Plan: <span className="text-foreground capitalize">{sub.plan_type}</span></div>
          <div>Cycle: <span className="text-foreground capitalize">{sub.billing_cycle === '6months' ? '6 Months' : sub.billing_cycle}</span></div>
          <div>Amount: <span className="text-foreground">${Number(sub.amount).toFixed(2)} AUD</span></div>
          {sub.status === 'paused' && sub.pause_days_remaining != null && (
            <div>Days left: <span className="text-foreground font-medium">{sub.pause_days_remaining}</span></div>
          )}
          {sub.status === 'grace_period' && sub.grace_period_ends_at && (
            <div>Grace ends: <span className="text-foreground font-medium">{new Date(sub.grace_period_ends_at).toLocaleDateString()}</span></div>
          )}
          {sub.status === 'active' && sub.expires_at && (
            <div>Expires: <span className="text-foreground">{new Date(sub.expires_at).toLocaleDateString()}</span></div>
          )}
        </div>

        {sub.status === 'grace_period' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-700">
            ⚠️ Your payment failed. We're retrying automatically. Please update your payment method to avoid downgrade.
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {sub.status === 'active' && (
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleAction('pause')} disabled={!!actionLoading}>
              {actionLoading === 'pause' ? <Loader2 className="h-3 w-3 animate-spin" /> : null} ⏸️ Pause
            </Button>
          )}
          {sub.status === 'paused' && (
            <Button variant="outline" size="sm" className="text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50" onClick={() => handleAction('resume')} disabled={!!actionLoading}>
              {actionLoading === 'resume' ? <Loader2 className="h-3 w-3 animate-spin" /> : null} ▶️ Resume
            </Button>
          )}
          {sub.payment_mode === 'recurring' && sub.paypal_subscription_id && sub.status !== 'paused' && (
            <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1" onClick={() => handleAction('cancel')} disabled={!!actionLoading}>
              {actionLoading === 'cancel' ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Cancel Auto-Renewal
            </Button>
          )}
        </div>
      </div>

      {/* Invoice History */}
      {invoices.length > 0 && (
        <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
          <p className="text-sm font-medium text-foreground">Invoice History</p>
          <div className="space-y-1">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                <div className="flex gap-2 items-center">
                  <span className="font-mono text-primary">{inv.invoice_number}</span>
                  <span className="text-muted-foreground capitalize">{inv.plan_type} — {inv.billing_cycle === '6months' ? '6mo' : inv.billing_cycle}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium text-foreground">${Number(inv.amount).toFixed(2)}</span>
                  <span className="text-muted-foreground">{new Date(inv.issued_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}