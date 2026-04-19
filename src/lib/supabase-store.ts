import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// ── Type aliases ──
export type DbStore = Tables<'stores'>;
export type DbGlobalProduct = Tables<'global_products'>;
export type DbStoreProduct = Tables<'store_products'>;
export type DbStockEntry = Tables<'stock_entries'>;
export type DbOrder = Tables<'orders'>;
export type DbFeedback = Tables<'feedback'>;

// ── Store ID generation ──
export async function generateStoreId(): Promise<string> {
  const { data, error } = await supabase.rpc('generate_store_id');
  if (error) throw error;
  return data;
}

// ── Store CRUD ──
export async function getStores(): Promise<DbStore[]> {
  const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getStoreById(storeId: string): Promise<DbStore | null> {
  const { data, error } = await supabase.from('stores').select('*').eq('id', storeId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getStoreByUserId(userId: string): Promise<DbStore | null> {
  const { data, error } = await supabase.from('stores').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createStore(store: TablesInsert<'stores'>): Promise<DbStore> {
  const { data, error } = await supabase.from('stores').insert(store).select().single();
  if (error) throw error;
  return data;
}

export async function updateStore(storeId: string, updates: TablesUpdate<'stores'>): Promise<DbStore> {
  const { data, error } = await supabase.from('stores').update(updates).eq('id', storeId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStore(storeId: string): Promise<void> {
  const { error } = await supabase.from('stores').delete().eq('id', storeId);
  if (error) throw error;
}

// ── Global Products ──
export async function getGlobalProducts(): Promise<DbGlobalProduct[]> {
  const { data, error } = await supabase.from('global_products').select('*').order('brand_name');
  if (error) throw error;
  return data || [];
}

export async function saveGlobalProduct(product: TablesInsert<'global_products'>): Promise<DbGlobalProduct> {
  const { data, error } = await supabase.from('global_products').upsert(product).select().single();
  if (error) throw error;
  return data;
}

export async function deleteGlobalProduct(id: string): Promise<void> {
  const { error } = await supabase.from('global_products').delete().eq('id', id);
  if (error) throw error;
}

export async function getGlobalProductByBarcode(barcode: string): Promise<DbGlobalProduct | null> {
  const { data, error } = await supabase
    .from('global_products')
    .select('*')
    .or(`carton_barcode.eq.${barcode},packet_barcode.eq.${barcode}`)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function searchGlobalProducts(query: string): Promise<DbGlobalProduct[]> {
  const { data, error } = await supabase
    .from('global_products')
    .select('*')
    .ilike('brand_name', `%${query}%`)
    .limit(10);
  if (error) throw error;
  return data || [];
}

// ── Store Products ──
export async function getProducts(storeId: string): Promise<DbStoreProduct[]> {
  const { data, error } = await supabase.from('store_products').select('*').eq('store_id', storeId).order('brand_name');
  if (error) throw error;
  return data || [];
}

export async function saveProduct(storeId: string, product: Omit<TablesInsert<'store_products'>, 'store_id'>): Promise<DbStoreProduct> {
  const { data, error } = await supabase
    .from('store_products')
    .upsert({ ...product, store_id: storeId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getProductByBarcode(storeId: string, barcode: string): Promise<DbStoreProduct | null> {
  const { data, error } = await supabase
    .from('store_products')
    .select('*')
    .eq('store_id', storeId)
    .or(`barcode.eq.${barcode},carton_barcode.eq.${barcode},packet_barcode.eq.${barcode}`)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteProduct(storeId: string, productId: string): Promise<void> {
  const { error } = await supabase.from('store_products').delete().eq('id', productId).eq('store_id', storeId);
  if (error) throw error;
}

// ── Stock Entries ──
export async function getStockEntries(storeId: string): Promise<DbStockEntry[]> {
  const { data, error } = await supabase.from('stock_entries').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveStockEntry(storeId: string, entry: Omit<TablesInsert<'stock_entries'>, 'store_id'>): Promise<DbStockEntry> {
  const { data, error } = await supabase
    .from('stock_entries')
    .upsert({ ...entry, store_id: storeId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStockEntry(storeId: string, entryId: string): Promise<void> {
  const { error } = await supabase.from('stock_entries').delete().eq('id', entryId).eq('store_id', storeId);
  if (error) throw error;
}

export async function deleteStockEntriesByWeek(storeId: string, weekDate: string): Promise<void> {
  const { error } = await supabase.from('stock_entries').delete().eq('store_id', storeId).eq('week_date', weekDate);
  if (error) throw error;
}

// ── Orders ──
export async function getOrders(storeId: string): Promise<DbOrder[]> {
  const { data, error } = await supabase.from('orders').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createOrder(order: TablesInsert<'orders'>): Promise<DbOrder> {
  const { data, error } = await supabase.from('orders').insert(order).select().single();
  if (error) throw error;
  return data;
}

// ── Store Portfolio ──
export async function getStorePortfolio(storeId: string): Promise<string[]> {
  const { data, error } = await supabase.from('store_portfolios').select('global_product_id').eq('store_id', storeId);
  if (error) throw error;
  return (data || []).map(d => d.global_product_id);
}

export async function addToStorePortfolio(storeId: string, globalProductId: string): Promise<void> {
  const { error } = await supabase.from('store_portfolios').upsert({ store_id: storeId, global_product_id: globalProductId });
  if (error) throw error;
}

export async function removeFromStorePortfolio(storeId: string, globalProductId: string): Promise<void> {
  const { error } = await supabase.from('store_portfolios').delete().eq('store_id', storeId).eq('global_product_id', globalProductId);
  if (error) throw error;
}

// ── Feedback ──
export async function getFeedbacks(): Promise<DbFeedback[]> {
  const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveFeedback(feedback: TablesInsert<'feedback'>): Promise<void> {
  const { error } = await supabase.from('feedback').insert(feedback);
  if (error) throw error;
}

export async function deleteFeedback(feedbackId: string): Promise<void> {
  const { error } = await supabase.from('feedback').delete().eq('id', feedbackId);
  if (error) throw error;
}

// ── Webhook ──
export async function sendToWebhook(storeId: string, data: Record<string, unknown>) {
  const store = await getStoreById(storeId);
  const url = store?.webhook_url;
  if (!url) return { success: false, error: 'No webhook URL configured' };

  try {
    const payload = JSON.stringify({ storeId, timestamp: new Date().toISOString(), ...data });
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      return { success: response.ok };
    } catch {
      await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: payload });
      return { success: true };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ── Auth helpers ──
export async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
  if (error) return false;
  return !!data;
}

// ── Unit suggestion rules type ──
export type UnitSuggestionRules = Record<string, 'carton' | 'packet'>;

// ── Utility: calculate suggested order ──
export function calculateSuggestedOrder(
  avgValue: number,
  frontPackets: number,
  backCartons: number,
  packetsPerCarton: number,
  avgUnit: 'carton' | 'packet' = 'carton',
  unitSuggestionOverride?: 'carton' | 'packet'
): { value: number; unit: 'carton' | 'packet' } {
  const ppc = packetsPerCarton > 0 ? packetsPerCarton : 1;

  // If there's a unit override from settings, force suggestion in that unit
  const effectiveUnit = unitSuggestionOverride || avgUnit;

  if (effectiveUnit === 'packet') {
    // Everything in packets
    const totalPktsAvailable = frontPackets + (backCartons * ppc);
    return { value: Math.max(0, Math.ceil(avgValue * (avgUnit === 'carton' ? ppc : 1) - totalPktsAvailable)), unit: 'packet' };
  }

  // First check deficit in packets to avoid false positives from Math.ceil on fractions
  const avgInPackets = avgUnit === 'packet' ? avgValue : avgValue * ppc;
  const totalPacketsAvailable = frontPackets + (backCartons * ppc);
  const deficitInPackets = avgInPackets - totalPacketsAvailable;

  // No deficit → no order needed
  if (deficitInPackets <= 0) {
    return { value: 0, unit: 'carton' };
  }

  // Convert deficit to cartons, rounding up
  return { value: Math.ceil(deficitInPackets / ppc), unit: 'carton' };
}

// Backward compat alias
export function calculateSuggestedCartons(avgValue: number, frontPackets: number, backCartons: number, packetsPerCarton: number, avgUnit: 'carton' | 'packet' = 'carton'): number {
  return calculateSuggestedOrder(avgValue, frontPackets, backCartons, packetsPerCarton, avgUnit).value;
}
