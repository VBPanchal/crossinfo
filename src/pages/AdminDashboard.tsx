import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { getGlobalProducts, saveGlobalProduct, deleteGlobalProduct, getStores, getProducts, getStockEntries, updateStore, getStoreById, getFeedbacks, deleteFeedback, getStorePortfolio, addToStorePortfolio, removeFromStorePortfolio, deleteStore as deleteStoreDb } from '@/lib/supabase-store';
import type { DbGlobalProduct, DbStore, DbStoreProduct, DbStockEntry, DbFeedback } from '@/lib/supabase-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/PasswordInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Shield, BookOpen, Store as StoreIcon, Package, Pencil, Trash2, Plus, Download, Upload, LogOut, PauseCircle, PlayCircle, Link2, Key, MessageSquare, FileText, Factory, Briefcase, Check, X, Loader2, Search, CheckSquare, Square, Menu, Headphones, ClipboardList, CreditCard, Tag } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import logo from '@/assets/cossinfo-logo-new.png';
import { Badge } from '@/components/ui/badge';
import { AppHeader } from '@/components/AppHeader';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AdminSupportPanel } from '@/components/AdminSupportPanel';
import { AuditLogPanel } from '@/components/AuditLogPanel';
import { RevenueAnalytics } from '@/components/RevenueAnalytics';
import { AdminBillingPanel } from '@/components/AdminBillingPanel';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';

const MANUFACTURERS = ['BATA', 'IMP', 'PML', 'JTI', 'Other'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAdminUser, loading: authLoading, logout } = useAuth();
  const [globalProducts, setGlobalProducts] = useState<DbGlobalProduct[]>([]);
  const [stores, setStores] = useState<DbStore[]>([]);
  const [feedbacks, setFeedbacks] = useState<DbFeedback[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stores-manage');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Product dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DbGlobalProduct | null>(null);
  const [formCarton, setFormCarton] = useState('');
  const [formPacket, setFormPacket] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formCustomManufacturer, setFormCustomManufacturer] = useState('');
  const [formPacketsPerCarton, setFormPacketsPerCarton] = useState('');
  const [formUnitName, setFormUnitName] = useState('unit');
  const [scanTarget, setScanTarget] = useState<'carton' | 'packet' | null>(null);
  const [filterManufacturer, setFilterManufacturer] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCartonBarcode, setFilterCartonBarcode] = useState('');
  const [filterPacketBarcode, setFilterPacketBarcode] = useState('');
  const [filterPktPerCarton, setFilterPktPerCarton] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditManufacturer, setBulkEditManufacturer] = useState('');
  const [bulkEditCustomManufacturer, setBulkEditCustomManufacturer] = useState('');
  const [bulkEditPktPerCarton, setBulkEditPktPerCarton] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkEditing, setBulkEditing] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [storeCsvImporting, setStoreCsvImporting] = useState(false);
  const [storeFilterName, setStoreFilterName] = useState('');
  const [storeFilterStatus, setStoreFilterStatus] = useState<string>('all');
  const [storeFilterPlan, setStoreFilterPlan] = useState<string>('all');
  const [storeFilterTc, setStoreFilterTc] = useState<string>('all');

  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [storeProducts, setStoreProducts] = useState<DbStoreProduct[]>([]);
  const [storeStock, setStoreStock] = useState<DbStockEntry[]>([]);

  // Store edit
  const [storeEditOpen, setStoreEditOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<DbStore | null>(null);
  const [storeFormName, setStoreFormName] = useState('');
  const [storeFormOwner, setStoreFormOwner] = useState('');
  const [storeFormContact, setStoreFormContact] = useState('');
  const [storeFormEmail, setStoreFormEmail] = useState('');
  const [storeFormAddress, setStoreFormAddress] = useState('');
  const [storeFormWebhook, setStoreFormWebhook] = useState('');
  const [storeFormQrEnabled, setStoreFormQrEnabled] = useState(false);
  const [storeFormQrPlan, setStoreFormQrPlan] = useState<string>('0');
  const [storeFormPlanType, setStoreFormPlanType] = useState<string>('starter');
  const [storeFormCommunityEnabled, setStoreFormCommunityEnabled] = useState(false);
  const [storeFormCommunityPlan, setStoreFormCommunityPlan] = useState<string>('0');

  // Portfolio
  const [portfolioStoreId, setPortfolioStoreId] = useState<string | null>(null);
  const [portfolioIds, setPortfolioIds] = useState<string[]>([]);
  const [portfolioSearch, setPortfolioSearch] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdminUser) { navigate('/backend/login'); return; }
    refreshData();
  }, [user, isAdminUser, authLoading, navigate]);

  const refreshData = async () => {
    setPageLoading(true);
    try {
      const [gp, st, fb] = await Promise.all([getGlobalProducts(), getStores(), getFeedbacks()]);
      setGlobalProducts(gp); setStores(st); setFeedbacks(fb);
    } catch (err) {
      toast.error('Failed to load data');
    }
    setPageLoading(false);
  };

  const allManufacturers = [...new Set(globalProducts.map(p => p.manufacturer_name || 'Uncategorized').filter(Boolean))].sort();
  const filteredProducts = globalProducts.filter(p => {
    if (filterManufacturer !== 'all' && (p.manufacturer_name || 'Uncategorized') !== filterManufacturer) return false;
    if (filterBrand && !p.brand_name.toLowerCase().includes(filterBrand.toLowerCase())) return false;
    if (filterCartonBarcode && !(p.carton_barcode || '').toLowerCase().includes(filterCartonBarcode.toLowerCase())) return false;
    if (filterPacketBarcode && !(p.packet_barcode || '').toLowerCase().includes(filterPacketBarcode.toLowerCase())) return false;
    if (filterPktPerCarton && p.packets_per_carton !== Number(filterPktPerCarton)) return false;
    return true;
  });
  const groupedProducts = filteredProducts.reduce((acc, p) => {
    const mfr = p.manufacturer_name || 'Uncategorized';
    if (!acc[mfr]) acc[mfr] = [];
    acc[mfr].push(p);
    return acc;
  }, {} as Record<string, DbGlobalProduct[]>);

  const filteredStores = stores.filter(s => {
    if (storeFilterName && !s.name.toLowerCase().includes(storeFilterName.toLowerCase()) && !s.id.toLowerCase().includes(storeFilterName.toLowerCase())) return false;
    if (storeFilterStatus !== 'all' && s.status !== storeFilterStatus) return false;
    if (storeFilterPlan !== 'all' && (s as any).plan_type !== storeFilterPlan) return false;
    if (storeFilterTc !== 'all') {
      const accepted = !!s.terms_accepted_at;
      if (storeFilterTc === 'accepted' && !accepted) return false;
      if (storeFilterTc === 'not_accepted' && accepted) return false;
    }
    return true;
  });

  const allFilteredIds = filteredProducts.map(p => p.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedProductIds.has(id));
  const toggleSelectAll = () => {
    setSelectedProductIds(allSelected ? new Set() : new Set(allFilteredIds));
  };
  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCsvExportProducts = () => {
    const header = 'brand_name,manufacturer_name,carton_barcode,packet_barcode,packets_per_carton,unit_name';
    const rows = globalProducts.map(p => [p.brand_name, p.manufacturer_name || '', p.carton_barcode || '', p.packet_barcode || '', p.packets_per_carton ?? '', p.unit_name || 'unit'].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'product-library.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const handleCsvExportStores = () => {
    const header = 'store_id,name,owner_name,email,contact_no,address,status,plan_type,qr_service_enabled,terms_accepted_at';
    const rows = stores.map(s => [s.id, s.name, s.owner_name, s.email, s.contact_no, s.address || '', s.status, (s as any).plan_type || 'starter', (s as any).qr_service_enabled ? 'yes' : 'no', (s as any).terms_accepted_at ? new Date((s as any).terms_accepted_at).toISOString() : ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'stores.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Stores CSV exported');
  };

  const handleStoreCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStoreCsvImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { toast.error('CSV must have a header row and data rows'); setStoreCsvImporting(false); return; }
      const cols = lines[0].toLowerCase().split(',').map(c => c.trim());
      const nameIdx = cols.findIndex(c => c.includes('name') && !c.includes('owner'));
      const ownerIdx = cols.findIndex(c => c.includes('owner'));
      const emailIdx = cols.findIndex(c => c.includes('email'));
      const contactIdx = cols.findIndex(c => c.includes('contact'));
      const addressIdx = cols.findIndex(c => c.includes('address'));
      const statusIdx = cols.findIndex(c => c.includes('status'));
      const planIdx = cols.findIndex(c => c.includes('plan'));
      if (nameIdx === -1 || emailIdx === -1) { toast.error('CSV must have "name" and "email" columns'); setStoreCsvImporting(false); return; }
      let updated = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const storeIdIdx = cols.findIndex(c => c.includes('store_id') || c === 'id');
        const sid = storeIdIdx >= 0 ? vals[storeIdIdx] : '';
        if (!sid) continue;
        const updates: any = {};
        if (nameIdx >= 0 && vals[nameIdx]) updates.name = vals[nameIdx];
        if (ownerIdx >= 0 && vals[ownerIdx]) updates.owner_name = vals[ownerIdx];
        if (contactIdx >= 0 && vals[contactIdx]) updates.contact_no = vals[contactIdx];
        if (addressIdx >= 0 && vals[addressIdx]) updates.address = vals[addressIdx];
        if (statusIdx >= 0 && vals[statusIdx]) updates.status = vals[statusIdx];
        if (planIdx >= 0 && vals[planIdx]) updates.plan_type = vals[planIdx];
        if (Object.keys(updates).length > 0) {
          await updateStore(sid, updates);
          updated++;
        }
      }
      await refreshData();
      toast.success(`Updated ${updated} stores from CSV`);
    } catch { toast.error('Failed to import store CSV'); }
    setStoreCsvImporting(false);
    e.target.value = '';
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedProductIds.size} products from the global library?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedProductIds].map(id => deleteGlobalProduct(id)));
      setSelectedProductIds(new Set());
      await refreshData();
      toast.success(`Deleted successfully`);
    } catch { toast.error('Failed to delete some products'); }
    setBulkDeleting(false);
  };

  const handleBulkEditOpen = () => {
    if (selectedProductIds.size === 0) return;
    setBulkEditManufacturer(''); setBulkEditCustomManufacturer(''); setBulkEditPktPerCarton('');
    setBulkEditOpen(true);
  };

  const getBulkMfrValue = () => bulkEditManufacturer === 'Other' ? bulkEditCustomManufacturer.trim() : bulkEditManufacturer;

  const handleBulkEditSave = async () => {
    const mfr = getBulkMfrValue();
    const pkt = bulkEditPktPerCarton ? Number(bulkEditPktPerCarton) : undefined;
    if (!mfr && pkt === undefined) { toast.error('Set at least one field'); return; }
    setBulkEditing(true);
    try {
      const count = selectedProductIds.size;
      await Promise.all([...selectedProductIds].map(id => {
        const existing = globalProducts.find(p => p.id === id);
        if (!existing) return Promise.resolve();
        return saveGlobalProduct({ ...existing, ...(mfr ? { manufacturer_name: mfr } : {}), ...(pkt !== undefined ? { packets_per_carton: pkt } : {}) } as any);
      }));
      setSelectedProductIds(new Set()); setBulkEditOpen(false);
      await refreshData();
      toast.success(`${count} products updated`);
    } catch { toast.error('Failed to update some products'); }
    setBulkEditing(false);
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { toast.error('CSV must have a header row and at least one data row'); setCsvImporting(false); return; }
      const header = lines[0].toLowerCase();
      const cols = header.split(',').map(c => c.trim());
      const brandIdx = cols.findIndex(c => c.includes('brand'));
      const cartonIdx = cols.findIndex(c => c.includes('carton'));
      const packetIdx = cols.findIndex(c => c.includes('packet') && !c.includes('per'));
      const mfrIdx = cols.findIndex(c => c.includes('manufacturer') || c.includes('company'));
      const ppcIdx = cols.findIndex(c => c.includes('packets_per') || c.includes('pkt') || c.includes('per_carton'));
      const unitIdx = cols.findIndex(c => c.includes('unit_name') || c.includes('unit'));
      if (brandIdx === -1) { toast.error('CSV must have a "brand_name" column'); setCsvImporting(false); return; }
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const brand = vals[brandIdx];
        if (!brand) continue;
        await saveGlobalProduct({
          brand_name: brand,
          carton_barcode: cartonIdx >= 0 ? vals[cartonIdx] || '' : '',
          packet_barcode: packetIdx >= 0 ? vals[packetIdx] || '' : '',
          manufacturer_name: mfrIdx >= 0 ? vals[mfrIdx] || '' : '',
          packets_per_carton: ppcIdx >= 0 && vals[ppcIdx] ? Number(vals[ppcIdx]) : null,
          unit_name: unitIdx >= 0 && vals[unitIdx] ? vals[unitIdx] : 'unit',
        });
        imported++;
      }
      await refreshData();
      toast.success(`Imported ${imported} products from CSV`);
    } catch (err) { toast.error('Failed to import CSV'); }
    setCsvImporting(false);
    e.target.value = '';
  };

  const handleOpenAdd = () => {
    setEditingProduct(null); setFormCarton(''); setFormPacket(''); setFormBrand(''); setFormPacketsPerCarton('');
    setFormManufacturer(''); setFormCustomManufacturer(''); setFormUnitName('unit'); setScanTarget(null); setDialogOpen(true);
  };

  const handleOpenEdit = (gp: DbGlobalProduct) => {
    setEditingProduct(gp); setFormCarton(gp.carton_barcode || ''); setFormPacket(gp.packet_barcode || ''); setFormBrand(gp.brand_name);
    setFormPacketsPerCarton(gp.packets_per_carton ? String(gp.packets_per_carton) : ''); setFormUnitName(gp.unit_name || 'unit');
    const mfr = gp.manufacturer_name || '';
    if (MANUFACTURERS.includes(mfr)) { setFormManufacturer(mfr); setFormCustomManufacturer(''); }
    else if (mfr) { setFormManufacturer('Other'); setFormCustomManufacturer(mfr); }
    else { setFormManufacturer(''); setFormCustomManufacturer(''); }
    setScanTarget(null); setDialogOpen(true);
  };

  const getManufacturerValue = () => formManufacturer === 'Other' ? formCustomManufacturer.trim() : formManufacturer;

  const handleSave = async () => {
    if (!formBrand.trim()) { toast.error('Brand name is required'); return; }
    try {
      await saveGlobalProduct({
        id: editingProduct?.id,
        carton_barcode: formCarton.trim(),
        packet_barcode: formPacket.trim(),
        brand_name: formBrand.trim(),
        manufacturer_name: getManufacturerValue(),
        packets_per_carton: formPacketsPerCarton ? Number(formPacketsPerCarton) : null,
        unit_name: formUnitName,
      });
      await refreshData(); setDialogOpen(false);
      await logAudit(editingProduct ? 'product_edit' : 'product_add', 'product', editingProduct?.id || formBrand.trim(), { brand: formBrand.trim() });
      toast.success(editingProduct ? 'Product updated' : 'Product added');
    } catch (err) { toast.error('Failed to save'); }
  };

  const handleBarcodeScan = useCallback((barcode: string) => {
    if (scanTarget === 'carton') { setFormCarton(barcode); toast.success(`Carton: ${barcode}`); }
    else if (scanTarget === 'packet') { setFormPacket(barcode); toast.success(`Packet: ${barcode}`); }
    setScanTarget(null);
  }, [scanTarget]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product from the global library?')) return;
    try {
      const product = globalProducts.find(p => p.id === id);
      await deleteGlobalProduct(id);
      await logAudit('product_delete', 'product', id, { brand: product?.brand_name });
      await refreshData(); toast.success('Removed');
    } catch (err) { toast.error('Failed to delete product'); }
  };

  const logAudit = async (action: string, targetType: string, targetId: string, details: Record<string, any> = {}) => {
    if (!user) return;
    supabase.from('audit_logs').insert({
      admin_user_id: user.id,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    } as any).then(() => {});
  };

  // Store management
  const handleToggleStatus = async (store: DbStore) => {
    const newStatus = store.status === 'paused' ? 'active' : 'paused';
    await updateStore(store.id, { status: newStatus });
    await logAudit(newStatus === 'paused' ? 'store_pause' : 'store_resume', 'store', store.id, { name: store.name });
    await refreshData();
    toast.success(`Store ${newStatus === 'paused' ? 'paused' : 'resumed'}`);
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this store? This cannot be undone.')) return;
    try {
      const store = stores.find(s => s.id === storeId);
      await deleteStoreDb(storeId);
      await logAudit('store_delete', 'store', storeId, { name: store?.name });
      await refreshData();
      if (selectedStore === storeId) setSelectedStore(null);
      toast.success('Store deleted');
    } catch (err) { toast.error('Failed to delete store'); }
  };

  const handleEditStore = (store: DbStore) => {
    setEditingStore(store); setStoreFormName(store.name); setStoreFormOwner(store.owner_name);
    setStoreFormContact(store.contact_no); setStoreFormEmail(store.email);
    setStoreFormAddress(store.address || ''); setStoreFormWebhook(store.webhook_url || '');
    setStoreFormQrEnabled((store as any).qr_service_enabled === true);
    setStoreFormQrPlan(String((store as any).qr_service_plan_months || 0));
    setStoreFormPlanType((store as any).plan_type || 'starter');
    setStoreFormCommunityEnabled((store as any).community_enabled === true);
    setStoreFormCommunityPlan(String((store as any).community_plan_months || 0));
    setStoreEditOpen(true);
  };

  const handleStoreEditSave = async () => {
    if (!editingStore) return;
    try {
      const planMonths = parseInt(storeFormQrPlan) || 0;
      const expiresAt = storeFormQrEnabled && planMonths > 0
        ? new Date(Date.now() + planMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;
      const communityMonths = parseInt(storeFormCommunityPlan) || 0;
      const communityExpiresAt = storeFormCommunityEnabled && communityMonths > 0
        ? new Date(Date.now() + communityMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;
      await updateStore(editingStore.id, {
        name: storeFormName.trim(), owner_name: storeFormOwner.trim(), contact_no: storeFormContact.trim(),
        email: storeFormEmail.trim(), address: storeFormAddress.trim(), webhook_url: storeFormWebhook.trim(),
        qr_service_enabled: storeFormQrEnabled,
        qr_service_plan_months: planMonths || null,
        qr_service_expires_at: expiresAt,
        plan_type: storeFormPlanType,
        community_enabled: storeFormCommunityEnabled,
        community_plan_months: communityMonths || null,
        community_expires_at: communityExpiresAt,
      } as any);
      await logAudit('store_edit', 'store', editingStore.id, { name: storeFormName.trim(), plan: storeFormPlanType });
      await refreshData(); setStoreEditOpen(false); toast.success('Store updated');
    } catch (err) { toast.error('Failed to update'); }
  };

  const loadStoreData = async (storeId: string) => {
    setSelectedStore(storeId);
    const [prods, stock] = await Promise.all([getProducts(storeId), getStockEntries(storeId)]);
    setStoreProducts(prods); setStoreStock(stock);
  };

  const loadPortfolio = async (storeId: string) => {
    setPortfolioStoreId(storeId);
    setPortfolioIds(await getStorePortfolio(storeId));
    setPortfolioSearch('');
  };

  const handleAddPortfolio = async (gpId: string) => {
    if (!portfolioStoreId) return;
    await addToStorePortfolio(portfolioStoreId, gpId);
    setPortfolioIds(await getStorePortfolio(portfolioStoreId));
  };

  const handleRemovePortfolio = async (gpId: string) => {
    if (!portfolioStoreId) return;
    await removeFromStorePortfolio(portfolioStoreId, gpId);
    setPortfolioIds(await getStorePortfolio(portfolioStoreId));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const grouped = globalProducts.reduce((acc, p) => {
      const mfr = p.manufacturer_name || 'Uncategorized';
      if (!acc[mfr]) acc[mfr] = [];
      acc[mfr].push(p);
      return acc;
    }, {} as Record<string, DbGlobalProduct[]>);

    doc.setFontSize(18); doc.text('Global Product Library', 14, 20);
    doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString()} | Total: ${globalProducts.length}`, 14, 28);

    let startY = 36;
    Object.keys(grouped).sort().forEach(mfr => {
      doc.setFontSize(13); doc.setTextColor(40, 40, 120);
      doc.text(`Manufacturer: ${mfr}`, 14, startY); doc.setTextColor(0, 0, 0);
      autoTable(doc, {
        startY: startY + 4,
        head: [['Brand', 'Carton Barcode', 'Packet Barcode', 'Pkt/Ctn']],
        body: grouped[mfr].map(p => [p.brand_name, p.carton_barcode || '—', p.packet_barcode || '—', p.packets_per_carton ? String(p.packets_per_carton) : '—']),
        styles: { fontSize: 9 }, headStyles: { fillColor: [60, 60, 140] }, margin: { left: 14 },
      });
      startY = (doc as any).lastAutoTable.finalY + 10;
      if (startY > 260) { doc.addPage(); startY = 20; }
    });
    doc.save('product-library.pdf');
    toast.success('PDF generated');
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) { toast.error(error.message); return; }
    setNewPassword(''); setConfirmPassword('');
    await logAudit('password_change', 'admin', user?.id || '', {});
    toast.success('Password changed successfully!');
  };

  const handleLogout = async () => { await logout(); navigate('/backend/login'); };

  if (authLoading || pageLoading) {
    return <DashboardSkeleton variant="admin" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        leftContent={
          <div className="flex items-center gap-3">
            <img src={logo} alt="CossInfo" className="h-14" />
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Developer Panel</h1>
              <p className="text-xs text-muted-foreground">Developer Management</p>
            </div>
          </div>
        }
        rightContent={
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1"><LogOut className="h-3 w-3" /> Logout</Button>
        }
      />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card border-border/50"><CardContent className="p-4 text-center"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2"><BookOpen className="h-5 w-5 text-primary" /></div><p className="text-2xl font-bold text-foreground">{globalProducts.length}</p><p className="text-xs text-muted-foreground font-medium">Library Products</p></CardContent></Card>
          <Card className="glass-card border-border/50"><CardContent className="p-4 text-center"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2"><StoreIcon className="h-5 w-5 text-primary" /></div><p className="text-2xl font-bold text-foreground">{stores.length}</p><p className="text-xs text-muted-foreground font-medium">Stores</p></CardContent></Card>
          <Card className="glass-card border-border/50"><CardContent className="p-4 text-center"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2"><Factory className="h-5 w-5 text-primary" /></div><p className="text-2xl font-bold text-foreground">{allManufacturers.length}</p><p className="text-xs text-muted-foreground font-medium">Manufacturers</p></CardContent></Card>
          <Card className="glass-card border-border/50"><CardContent className="p-4 text-center"><div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2"><MessageSquare className="h-5 w-5 text-primary" /></div><p className="text-2xl font-bold text-foreground">{feedbacks.length}</p><p className="text-xs text-muted-foreground font-medium">Feedback</p></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile: Sheet sidebar for tabs */}
          <div className="sm:hidden">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full gap-2 justify-start">
                  <Menu className="h-4 w-4" />
                  {activeTab === 'stores-manage' ? 'Stores' : activeTab === 'portfolio' ? 'Portfolio' : activeTab === 'library' ? 'Products' : activeTab === 'stores' ? 'Data' : activeTab === 'feedback' ? `Feedback (${feedbacks.length})` : activeTab === 'support' ? 'Support' : activeTab === 'audit' ? 'Audit Logs' : activeTab === 'revenue' ? 'Revenue' : 'Settings'}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="text-sm">Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col py-2">
                  {[
                    { value: 'stores-manage', label: 'Stores', icon: StoreIcon },
                    { value: 'portfolio', label: 'Portfolio', icon: Briefcase },
                    { value: 'library', label: 'Products', icon: BookOpen },
                    { value: 'stores', label: 'Data', icon: Package },
                    { value: 'feedback', label: `Feedback (${feedbacks.length})`, icon: MessageSquare },
                    { value: 'support', label: 'Support', icon: Headphones },
                    { value: 'billing-admin', label: 'Billing', icon: CreditCard },
                    { value: 'audit', label: 'Audit Logs', icon: ClipboardList },
                    { value: 'settings', label: 'Settings', icon: Key },
                  ].map(item => {
                    const isActive = activeTab === item.value;
                    return (
                      <button
                        key={item.value}
                        onClick={() => { setActiveTab(item.value); setSidebarOpen(false); }}
                        className={`flex items-center gap-2.5 px-4 py-3 text-sm transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          <item.icon className="h-3.5 w-3.5" />
                        </div>
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          {/* Desktop: regular tabs */}
          <TabsList className="hidden sm:grid w-full grid-cols-10 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="stores-manage" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs gap-1"><StoreIcon className="h-3 w-3" /> Stores</TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs gap-1"><Briefcase className="h-3 w-3" /> Portfolio</TabsTrigger>
            <TabsTrigger value="library" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs gap-1"><BookOpen className="h-3 w-3" /> Products</TabsTrigger>
            <TabsTrigger value="stores" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs gap-1"><Package className="h-3 w-3" /> Data</TabsTrigger>
            <TabsTrigger value="feedback" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs gap-1"><MessageSquare className="h-3 w-3" /> Feedback</TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs gap-1"><Headphones className="h-3 w-3" /> Support</TabsTrigger>
            <TabsTrigger value="revenue" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs gap-1"><FileText className="h-3 w-3" /> Revenue</TabsTrigger>
            <TabsTrigger value="billing-admin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs gap-1"><CreditCard className="h-3 w-3" /> Billing</TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs gap-1"><ClipboardList className="h-3 w-3" /> Audit</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs gap-1"><Key className="h-3 w-3" /> Settings</TabsTrigger>
          </TabsList>

          {/* Manage Stores */}
          <TabsContent value="stores-manage" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Store Management ({stores.length}){filteredStores.length !== stores.length && <span className="text-muted-foreground ml-1">— showing {filteredStores.length}</span>}</h2>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1" onClick={handleCsvExportStores}><Download className="h-3 w-3" /> CSV Export</Button>
                <Button size="sm" variant="outline" className="gap-1 relative" disabled={storeCsvImporting}>
                  <input type="file" accept=".csv" onChange={handleStoreCsvImport} className="absolute inset-0 opacity-0 cursor-pointer" />
                  {storeCsvImporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} CSV Import
                </Button>
              </div>
            </div>
            {/* Store Filters */}
            <Card className="glass-card">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Input placeholder="Search name or ID..." value={storeFilterName} onChange={e => setStoreFilterName(e.target.value)} className="text-xs h-8" />
                  <Select value={storeFilterStatus} onValueChange={setStoreFilterStatus}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={storeFilterPlan} onValueChange={setStoreFilterPlan}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Plan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="popular">Popular</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={storeFilterTc} onValueChange={setStoreFilterTc}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="T&C" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All T&C</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="not_accepted">Not Accepted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-2 sm:p-6">
                <div className="overflow-x-auto">
                  <Table className="text-xs sm:text-sm">
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="text-xs text-muted-foreground font-medium">Store ID</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium">Name</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium hidden sm:table-cell">Owner</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium hidden sm:table-cell">Email</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium">Plan</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium">Community</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium">QR Service</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium hidden md:table-cell">T&C</TableHead>
                        <TableHead className="text-xs text-muted-foreground font-medium w-36">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStores.length === 0 ? (
                        <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No stores found.</TableCell></TableRow>
                      ) : filteredStores.map(s => {
                        const tcDate = s.terms_accepted_at ? new Date(s.terms_accepted_at) : null;
                        return (
                        <TableRow key={s.id} className={`border-border/30 ${s.status === 'paused' ? 'opacity-60' : ''}`}>
                          <TableCell className="font-mono text-xs text-primary">{s.id}</TableCell>
                          <TableCell className="font-semibold text-foreground">{s.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{s.owner_name || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{s.email}</TableCell>
                          <TableCell><Badge variant={s.status === 'paused' ? 'destructive' : 'default'} className={`text-[10px] ${s.status === 'paused' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-green-600/10 text-green-700 border border-green-200'}`}>{s.status === 'paused' ? '○ Paused' : '● Active'}</Badge></TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] capitalize border-border/50 font-medium">{(s as any).plan_type || 'starter'}</Badge>
                            {(s as any).trial_ends_at && new Date((s as any).trial_ends_at) > new Date() && (
                              <Badge variant="secondary" className="text-[9px] ml-1">Trial</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const on = (s as any).community_enabled;
                              const exp = (s as any).community_expires_at;
                              const active = on && (!exp || new Date(exp) > new Date());
                              return <Badge variant={active ? 'default' : 'secondary'} className={`text-[10px] ${active ? 'bg-green-600/10 text-green-700 border border-green-200' : 'bg-muted text-muted-foreground'}`}>{active ? '● Active' : '○ Off'}</Badge>;
                            })()}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const qrOn = (s as any).qr_service_enabled;
                              const exp = (s as any).qr_service_expires_at;
                              const active = qrOn && (!exp || new Date(exp) > new Date());
                              return <Badge variant={active ? 'default' : 'secondary'} className={`text-[10px] ${active ? 'bg-green-600/10 text-green-700 border border-green-200' : 'bg-muted text-muted-foreground'}`}>{active ? '● Active' : '○ Off'}</Badge>;
                            })()}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {tcDate ? (
                              <Badge variant="default" className="text-[10px] bg-green-600/10 text-green-700 border border-green-200">✓ {tcDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">Not Accepted</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="outline" size="icon" className="h-7 w-7 border-border/50" title="Edit" onClick={() => handleEditStore(s)}><Pencil className="h-3 w-3 text-primary" /></Button>
                              <Button variant="outline" size="icon" className="h-7 w-7 border-border/50" onClick={() => handleToggleStatus(s)}>
                                {s.status === 'paused' ? <PlayCircle className="h-3 w-3 text-green-600" /> : <PauseCircle className="h-3 w-3 text-yellow-600" />}
                              </Button>
                              <Button variant="outline" size="icon" className="h-7 w-7 border-border/50 hover:bg-destructive/10" onClick={() => handleDeleteStore(s.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );})}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portfolio */}
          <TabsContent value="portfolio" className="space-y-4">
            <div><h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Store Portfolio</h2></div>
            <div className="flex flex-wrap gap-2">
              {stores.map(s => (
                <Button key={s.id} variant={portfolioStoreId === s.id ? 'default' : 'outline'} size="sm" onClick={() => loadPortfolio(s.id)} className="text-xs">{s.name}</Button>
              ))}
            </div>
            {portfolioStoreId && (
              <Card className="glass-card">
                <CardHeader><CardTitle className="text-sm">Portfolio — {portfolioIds.length} products</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Input placeholder="Search library..." value={portfolioSearch} onChange={e => setPortfolioSearch(e.target.value)} className="text-xs mb-2" />
                  {portfolioSearch.trim() && (
                    <div className="border border-border rounded-md max-h-48 overflow-y-auto">
                      {globalProducts.filter(gp => gp.brand_name.toLowerCase().includes(portfolioSearch.toLowerCase()) && !portfolioIds.includes(gp.id)).slice(0, 10).map(gp => (
                        <div key={gp.id} className="flex items-center justify-between px-3 py-2 hover:bg-accent text-xs border-b border-border last:border-0">
                          <span className="font-medium">{gp.brand_name} <span className="text-muted-foreground">({gp.manufacturer_name})</span></span>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleAddPortfolio(gp.id)}><Plus className="h-3 w-3" /> Add</Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1">
                    {portfolioIds.map(gpId => {
                      const gp = globalProducts.find(p => p.id === gpId);
                      if (!gp) return null;
                      return (
                        <div key={gpId} className="flex items-center justify-between px-3 py-2 bg-muted rounded text-xs">
                          <span>{gp.brand_name} <span className="text-muted-foreground">({gp.manufacturer_name})</span></span>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive" onClick={() => handleRemovePortfolio(gpId)}><X className="h-3 w-3" /></Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Product Library */}
          <TabsContent value="library" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Product Library ({globalProducts.length}){filteredProducts.length !== globalProducts.length && <span className="text-muted-foreground ml-1">— showing {filteredProducts.length}</span>}</h2>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" className="gap-1" onClick={handleOpenAdd}><Plus className="h-3 w-3" /> Add</Button>
                <Button size="sm" variant="outline" className="gap-1 relative" disabled={csvImporting}>
                  <input type="file" accept=".csv" onChange={handleCsvImport} className="absolute inset-0 opacity-0 cursor-pointer" />
                  {csvImporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} CSV Import
                </Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={handleCsvExportProducts}><Download className="h-3 w-3" /> CSV Export</Button>
                <Button size="sm" variant="outline" className="gap-1" onClick={generatePDF}><FileText className="h-3 w-3" /> PDF</Button>
              </div>
            </div>

            {/* Filters */}
            <Card className="glass-card">
              <CardContent className="p-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <Input placeholder="Brand name..." value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="text-xs h-8" />
                  <Select value={filterManufacturer} onValueChange={setFilterManufacturer}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Manufacturer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Manufacturers</SelectItem>
                      {allManufacturers.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Carton barcode..." value={filterCartonBarcode} onChange={e => setFilterCartonBarcode(e.target.value)} className="text-xs h-8 font-mono" />
                  <Input placeholder="Packet barcode..." value={filterPacketBarcode} onChange={e => setFilterPacketBarcode(e.target.value)} className="text-xs h-8 font-mono" />
                  <Input type="number" placeholder="Pkt/Ctn..." value={filterPktPerCarton} onChange={e => setFilterPktPerCarton(e.target.value)} className="text-xs h-8" />
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedProductIds.size > 0 && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <Badge variant="secondary" className="text-xs">{selectedProductIds.size} selected</Badge>
                <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={handleBulkEditOpen}><Pencil className="h-3 w-3" /> Bulk Edit</Button>
                <Button size="sm" variant="destructive" className="gap-1 text-xs h-7" onClick={handleBulkDelete} disabled={bulkDeleting}>
                  {bulkDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Delete
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setSelectedProductIds(new Set())}>Clear</Button>
              </div>
            )}

            {/* Select All */}
            <div className="flex items-center gap-2 px-1">
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7" onClick={toggleSelectAll}>
                {allSelected ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5" />}
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {Object.keys(groupedProducts).sort().map(mfr => (
              <Card key={mfr} className="glass-card">
                <CardHeader className="py-3"><CardTitle className="text-xs font-semibold text-foreground flex items-center gap-2"><Factory className="h-3.5 w-3.5 text-primary" /> {mfr} ({groupedProducts[mfr].length})</CardTitle></CardHeader>
                <CardContent className="p-2">
                  <Table className="text-xs">
                    <TableHeader><TableRow className="border-border/50 hover:bg-transparent"><TableHead className="text-xs w-8"></TableHead><TableHead className="text-xs text-muted-foreground font-medium">Brand</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Carton</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Packet</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Pkt/Ctn</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Unit</TableHead><TableHead className="text-xs w-16"></TableHead></TableRow></TableHeader>
                    <TableBody>
                      {groupedProducts[mfr].map(p => (
                        <TableRow key={p.id} className={`border-border/30 ${selectedProductIds.has(p.id) ? 'bg-primary/5' : ''}`}>
                          <TableCell className="pr-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleSelectProduct(p.id)}>
                              {selectedProductIds.has(p.id) ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5 text-muted-foreground" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">{p.brand_name}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{p.carton_barcode || '—'}</TableCell>
                          <TableCell className="font-mono text-muted-foreground">{p.packet_barcode || '—'}</TableCell>
                          <TableCell className="font-medium">{p.packets_per_carton || '—'}</TableCell>
                          <TableCell className="capitalize text-muted-foreground">{p.unit_name || 'unit'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="outline" size="icon" className="h-6 w-6 border-border/50" onClick={() => handleOpenEdit(p)}><Pencil className="h-3 w-3 text-primary" /></Button>
                              <Button variant="outline" size="icon" className="h-6 w-6 border-border/50 hover:bg-destructive/10" onClick={() => handleDelete(p.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Store Data */}
          <TabsContent value="stores" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {stores.map(s => (
                <Button key={s.id} variant={selectedStore === s.id ? 'default' : 'outline'} size="sm" onClick={() => loadStoreData(s.id)} className="text-xs">{s.name} ({s.id})</Button>
              ))}
            </div>
            {selectedStore && (
              <div className="space-y-4">
                <Card className="glass-card border-border/50">
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Products ({storeProducts.length})</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table className="text-xs"><TableHeader><TableRow className="border-border/50 hover:bg-transparent"><TableHead className="text-xs text-muted-foreground font-medium">Brand</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Carton</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Packet</TableHead><TableHead className="text-right text-xs text-muted-foreground font-medium">Avg</TableHead><TableHead className="text-right text-xs text-muted-foreground font-medium">Pkt/Ctn</TableHead></TableRow></TableHeader>
                        <TableBody>{storeProducts.map(p => (<TableRow key={p.id} className="border-border/30"><TableCell className="font-semibold text-foreground">{p.brand_name}</TableCell><TableCell className="font-mono text-muted-foreground">{p.carton_barcode || '—'}</TableCell><TableCell className="font-mono text-muted-foreground">{p.packet_barcode || '—'}</TableCell><TableCell className="text-right font-medium">{p.avg_sales_last_three_weeks}</TableCell><TableCell className="text-right">{p.quantity_of_order}</TableCell></TableRow>))}</TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass-card border-border/50">
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Stock Entries ({storeStock.length})</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table className="text-xs"><TableHeader><TableRow className="border-border/50 hover:bg-transparent"><TableHead className="text-xs text-muted-foreground font-medium">Week</TableHead><TableHead className="text-xs text-muted-foreground font-medium">Brand</TableHead><TableHead className="text-right text-xs text-muted-foreground font-medium">Front</TableHead><TableHead className="text-right text-xs text-muted-foreground font-medium">Back</TableHead><TableHead className="text-right text-xs text-muted-foreground font-medium">Order</TableHead></TableRow></TableHeader>
                        <TableBody>{storeStock.slice(0, 50).map(e => (<TableRow key={e.id} className="border-border/30"><TableCell className="text-muted-foreground">{e.week_date}</TableCell><TableCell className="font-semibold text-foreground">{e.brand_name}</TableCell><TableCell className="text-right">{e.front_stock}</TableCell><TableCell className="text-right">{e.back_stock}</TableCell><TableCell className="text-right font-semibold text-primary">{e.next_week_need}</TableCell></TableRow>))}</TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Feedback */}
          <TabsContent value="feedback" className="space-y-4">
            {feedbacks.length === 0 ? <p className="text-sm text-muted-foreground">No feedback yet.</p> : (
              feedbacks.map(f => (
                <Card key={f.id} className="glass-card border-border/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{f.email} · {new Date(f.created_at).toLocaleDateString()}</p>
                        <p className="text-sm text-foreground mt-2">{f.message}</p>
                      </div>
                      <Button variant="outline" size="icon" className="border-border/50 hover:bg-destructive/10" onClick={async () => { if (!window.confirm('Delete this feedback?')) return; await deleteFeedback(f.id); await refreshData(); toast.success('Deleted'); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Support */}
          <TabsContent value="support" className="space-y-4">
            <AdminSupportPanel />
          </TabsContent>

          {/* Revenue Analytics */}
          <TabsContent value="revenue" className="space-y-4">
            <RevenueAnalytics />
          </TabsContent>

          {/* Billing Admin */}
          <TabsContent value="billing-admin" className="space-y-4">
            <AdminBillingPanel />
          </TabsContent>

          {/* Audit Logs */}
          <TabsContent value="audit" className="space-y-4">
            <AuditLogPanel />
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-4">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Key className="h-4 w-4 text-primary" /> Change Password</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">New Password</label>
                  <PasswordInput placeholder="Enter new password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Confirm Password</label>
                  <PasswordInput placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
                <Button onClick={handleChangePassword} disabled={changingPassword} className="gap-2">
                  {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Logged in as: <span className="font-medium text-foreground">{user?.email}</span></p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Brand Name *" value={formBrand} onChange={e => setFormBrand(e.target.value)} />
            <Select value={formManufacturer} onValueChange={setFormManufacturer}>
              <SelectTrigger><SelectValue placeholder="Manufacturer" /></SelectTrigger>
              <SelectContent>{MANUFACTURERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            {formManufacturer === 'Other' && <Input placeholder="Custom manufacturer" value={formCustomManufacturer} onChange={e => setFormCustomManufacturer(e.target.value)} />}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Carton Barcode</label>
                <div className="flex gap-1"><Input value={formCarton} onChange={e => setFormCarton(e.target.value)} className="font-mono text-xs" /><Button variant="outline" size="sm" onClick={() => setScanTarget('carton')}>Scan</Button></div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Packet Barcode</label>
                <div className="flex gap-1"><Input value={formPacket} onChange={e => setFormPacket(e.target.value)} className="font-mono text-xs" /><Button variant="outline" size="sm" onClick={() => setScanTarget('packet')}>Scan</Button></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Packets per Carton" value={formPacketsPerCarton} onChange={e => setFormPacketsPerCarton(e.target.value)} />
              <Select value={formUnitName} onValueChange={setFormUnitName}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Unit Name" /></SelectTrigger>
                <SelectContent>
                  {['stick', 'gram', 'book', 'box', 'each', 'pack', 'unit', 'cigar'].map(u => <SelectItem key={u} value={u} className="capitalize">{u.charAt(0).toUpperCase() + u.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {scanTarget && <BarcodeScanner onScan={handleBarcodeScan} />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingProduct ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Store Edit Dialog */}
      <Dialog open={storeEditOpen} onOpenChange={setStoreEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Store</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Store Name" value={storeFormName} onChange={e => setStoreFormName(e.target.value)} />
            <Input placeholder="Owner Name" value={storeFormOwner} onChange={e => setStoreFormOwner(e.target.value)} />
            <Input placeholder="Contact No" value={storeFormContact} onChange={e => setStoreFormContact(e.target.value)} />
            <Input placeholder="Email" value={storeFormEmail} onChange={e => setStoreFormEmail(e.target.value)} />
            <Input placeholder="Address" value={storeFormAddress} onChange={e => setStoreFormAddress(e.target.value)} />
            <Input placeholder="Webhook URL" value={storeFormWebhook} onChange={e => setStoreFormWebhook(e.target.value)} className="font-mono text-sm" />
            <div className="border-t pt-3 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">📋 Store Plan</h4>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Plan Type</label>
                <select value={storeFormPlanType} onChange={e => setStoreFormPlanType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="starter">Starter ($29.99/mo — 500 SKUs)</option>
                  <option value="popular">Popular ($49.99/mo — 500 SKUs, 5 QR items)</option>
                  <option value="business">Business ($79.99/mo — 2,000 SKUs, 20 QR items)</option>
                  <option value="enterprise">Enterprise (Custom — Unlimited SKUs)</option>
                </select>
              </div>
            </div>
            {(storeFormPlanType === 'popular' || storeFormPlanType === 'business' || storeFormPlanType === 'enterprise') && (
              <div className="border-t pt-3 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">💬 Community Chat Service</h4>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={storeFormCommunityEnabled} onChange={e => setStoreFormCommunityEnabled(e.target.checked)} id="community-enabled" className="rounded" />
                  <label htmlFor="community-enabled" className="text-sm cursor-pointer">Enable Community Chat</label>
                </div>
                {storeFormCommunityEnabled && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Plan Duration</label>
                    <select value={storeFormCommunityPlan} onChange={e => setStoreFormCommunityPlan(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="1">1 Month</option>
                      <option value="3">3 Months</option>
                      <option value="6">6 Months</option>
                      <option value="12">12 Months</option>
                    </select>
                  </div>
                )}
                {editingStore && (editingStore as any).community_expires_at && (
                  <p className="text-xs text-muted-foreground">
                    Current expiry: {new Date((editingStore as any).community_expires_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
            <div className="border-t pt-3 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">🛒 QR Order Service (Popular, Business & Enterprise)</h4>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={storeFormQrEnabled} onChange={e => setStoreFormQrEnabled(e.target.checked)} id="qr-enabled" className="rounded" disabled={storeFormPlanType !== 'popular' && storeFormPlanType !== 'business' && storeFormPlanType !== 'enterprise'} />
                <label htmlFor="qr-enabled" className="text-sm cursor-pointer">Enable QR Order Service</label>
                {storeFormPlanType !== 'popular' && storeFormPlanType !== 'business' && storeFormPlanType !== 'enterprise' && <span className="text-xs text-muted-foreground">(Popular, Business & Enterprise only)</span>}
              </div>
              {storeFormQrEnabled && (storeFormPlanType === 'popular' || storeFormPlanType === 'business' || storeFormPlanType === 'enterprise') && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Plan Duration</label>
                  <select value={storeFormQrPlan} onChange={e => setStoreFormQrPlan(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="1">1 Month</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                  </select>
                </div>
              )}
              {editingStore && (editingStore as any).qr_service_expires_at && (
                <p className="text-xs text-muted-foreground">
                  Current expiry: {new Date((editingStore as any).qr_service_expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoreEditOpen(false)}>Cancel</Button>
            <Button onClick={handleStoreEditSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bulk Edit — {selectedProductIds.size} products</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Only filled fields will be updated. Leave blank to keep current values.</p>
          <div className="space-y-3">
            <Select value={bulkEditManufacturer} onValueChange={setBulkEditManufacturer}>
              <SelectTrigger><SelectValue placeholder="Set Manufacturer..." /></SelectTrigger>
              <SelectContent>{MANUFACTURERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            {bulkEditManufacturer === 'Other' && <Input placeholder="Custom manufacturer" value={bulkEditCustomManufacturer} onChange={e => setBulkEditCustomManufacturer(e.target.value)} />}
            <Input type="number" placeholder="Set Packets per Carton..." value={bulkEditPktPerCarton} onChange={e => setBulkEditPktPerCarton(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkEditSave} disabled={bulkEditing}>
              {bulkEditing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Update All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
