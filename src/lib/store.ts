import { Product, StockEntry, Store, User, GlobalProduct, Feedback } from './types';

const STORES_KEY = 'cossinfo_stores';
const PRODUCTS_KEY = 'cossinfo_products';
const STOCK_KEY = 'cossinfo_stock';
const USERS_KEY = 'cossinfo_users';
const STORE_COUNTER_KEY = 'cossinfo_store_counter';
const GLOBAL_PRODUCTS_KEY = 'cossinfo_global_products';
const FEEDBACK_KEY = 'cossinfo_feedback';
const ADMIN_PASSWORD_KEY = 'cossinfo_admin_password';
const DEFAULT_ADMIN_PASSWORD = 'cossinfo@admin2024';

export function getAdminPassword(): string {
  return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_ADMIN_PASSWORD;
}

export function setAdminPassword(newPassword: string) {
  localStorage.setItem(ADMIN_PASSWORD_KEY, newPassword);
}

// ── Global Product Library ──────────────────────────────────
export function getGlobalProducts(): GlobalProduct[] {
  return JSON.parse(localStorage.getItem(GLOBAL_PRODUCTS_KEY) || '[]');
}

export function saveGlobalProduct(product: GlobalProduct) {
  const all = getGlobalProducts();
  const idx = all.findIndex(p => p.id === product.id);
  if (idx >= 0) all[idx] = product;
  else all.push(product);
  localStorage.setItem(GLOBAL_PRODUCTS_KEY, JSON.stringify(all));
}

export function getGlobalProductByBarcode(barcode: string): GlobalProduct | undefined {
  return getGlobalProducts().find(p =>
    p.cartonBarcode === barcode || p.packetBarcode === barcode
  );
}

export function searchGlobalProducts(query: string): GlobalProduct[] {
  const q = query.toLowerCase();
  return getGlobalProducts().filter(p => p.brandName.toLowerCase().includes(q));
}

export function deleteGlobalProduct(productId: string) {
  const all = getGlobalProducts().filter(p => p.id !== productId);
  localStorage.setItem(GLOBAL_PRODUCTS_KEY, JSON.stringify(all));
}

/** Ensure a global product exists for the given barcodes + brand, returns its id */
export function ensureGlobalProduct(cartonBarcode: string, packetBarcode: string, brandName: string): string {
  const existing = getGlobalProducts().find(p =>
    (cartonBarcode && (p.cartonBarcode === cartonBarcode)) ||
    (packetBarcode && (p.packetBarcode === packetBarcode))
  );
  if (existing) {
    // Update brand/barcodes if changed
    existing.brandName = brandName;
    if (cartonBarcode) existing.cartonBarcode = cartonBarcode;
    if (packetBarcode) existing.packetBarcode = packetBarcode;
    saveGlobalProduct(existing);
    return existing.id;
  }
  const gp: GlobalProduct = {
    id: crypto.randomUUID(),
    cartonBarcode,
    packetBarcode,
    brandName,
    manufacturerName: '',
  };
  saveGlobalProduct(gp);
  return gp.id;
}

// Auto-generate store ID
export function generateStoreId(): string {
  const counter = Number(localStorage.getItem(STORE_COUNTER_KEY) || '0') + 1;
  localStorage.setItem(STORE_COUNTER_KEY, String(counter));
  return `STORE-${String(counter).padStart(4, '0')}`;
}

// Store management
export function getStores(): Store[] {
  return JSON.parse(localStorage.getItem(STORES_KEY) || '[]');
}

export function getStoreById(storeId: string): Store | undefined {
  return getStores().find(s => s.id === storeId);
}

export function saveStore(store: Store) {
  const stores = getStores();
  const idx = stores.findIndex(s => s.id === store.id);
  if (idx >= 0) stores[idx] = store;
  else stores.push(store);
  localStorage.setItem(STORES_KEY, JSON.stringify(stores));
}

export function validateStoreLogin(storeId: string, password: string): Store | null {
  const store = getStoreById(storeId);
  if (store && store.password === password) {
    return store;
  }
  return null;
}

// Product management (per store)
export function getProducts(storeId: string): Product[] {
  const all = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '{}');
  return all[storeId] || [];
}

export function saveProduct(storeId: string, product: Product) {
  const all = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '{}');
  if (!all[storeId]) all[storeId] = [];
  const idx = all[storeId].findIndex((p: Product) => p.id === product.id);
  if (idx >= 0) all[storeId][idx] = product;
  else all[storeId].push(product);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(all));
}

export function getProductByBarcode(storeId: string, barcode: string): Product | undefined {
  return getProducts(storeId).find(p => 
    p.barcode === barcode || p.cartonBarcode === barcode || p.packetBarcode === barcode
  );
}

export function deleteProduct(storeId: string, productId: string) {
  const all = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '{}');
  if (all[storeId]) {
    all[storeId] = all[storeId].filter((p: Product) => p.id !== productId);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(all));
  }
}

// Stock entries (per store)
export function getStockEntries(storeId: string): StockEntry[] {
  const all = JSON.parse(localStorage.getItem(STOCK_KEY) || '{}');
  return all[storeId] || [];
}

export function saveStockEntry(storeId: string, entry: StockEntry) {
  const all = JSON.parse(localStorage.getItem(STOCK_KEY) || '{}');
  if (!all[storeId]) all[storeId] = [];
  const idx = all[storeId].findIndex((e: StockEntry) => e.id === entry.id);
  if (idx >= 0) all[storeId][idx] = entry;
  else all[storeId].push(entry);
  localStorage.setItem(STOCK_KEY, JSON.stringify(all));
}

export function deleteStockEntry(storeId: string, entryId: string) {
  const all = JSON.parse(localStorage.getItem(STOCK_KEY) || '{}');
  if (all[storeId]) {
    all[storeId] = all[storeId].filter((e: StockEntry) => e.id !== entryId);
    localStorage.setItem(STOCK_KEY, JSON.stringify(all));
  }
}

export function deleteStockEntriesByWeek(storeId: string, weekDate: string) {
  const all = JSON.parse(localStorage.getItem(STOCK_KEY) || '{}');
  if (all[storeId]) {
    all[storeId] = all[storeId].filter((e: StockEntry) => e.weekDate !== weekDate);
    localStorage.setItem(STOCK_KEY, JSON.stringify(all));
  }
}

// Calculate dynamic average from last 3 weeks in cartons
export function calculateDynamicAverage(storeId: string, barcode: string): number {
  const entries = getStockEntries(storeId).filter(e => e.barcode === barcode);
  if (entries.length === 0) return 0;

  // Get unique weeks, sorted descending
  const weeks = [...new Set(entries.map(e => e.weekDate))].sort().reverse();
  const lastThreeWeeks = weeks.slice(0, 3);
  if (lastThreeWeeks.length === 0) return 0;

  // Convert weekly stock to cartons: backStock(cartons) + frontStock(packets)/quantityOfOrder
  let totalCartons = 0;
  lastThreeWeeks.forEach(week => {
    const weekEntry = entries.find(e => e.weekDate === week);
    if (weekEntry) {
      const packetsPerCarton = weekEntry.quantityOfOrder > 0 ? weekEntry.quantityOfOrder : 1;
      totalCartons += weekEntry.backStock + (weekEntry.frontStock / packetsPerCarton);
    }
  });

  return Math.round(totalCartons / lastThreeWeeks.length);
}

// Users (per store)
export function getUsers(storeId: string): User[] {
  const all = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  return all[storeId] || [];
}

export function saveUser(storeId: string, user: User) {
  const all = JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  if (!all[storeId]) all[storeId] = [];
  const idx = all[storeId].findIndex((u: User) => u.id === user.id);
  if (idx >= 0) all[storeId][idx] = user;
  else all[storeId].push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(all));
}

// Webhook - now stored in Store object
export function getWebhookUrl(storeId: string): string {
  const store = getStoreById(storeId);
  return store?.webhookUrl || '';
}

export function saveWebhookUrl(storeId: string, url: string) {
  const store = getStoreById(storeId);
  if (store) {
    store.webhookUrl = url;
    saveStore(store);
  }
}

// Send data to webhook
export async function sendToWebhook(storeId: string, data: Record<string, unknown>) {
  const url = getWebhookUrl(storeId);
  if (!url) return { success: false, error: 'No webhook URL configured' };
  
  try {
    const payload = JSON.stringify({ storeId, timestamp: new Date().toISOString(), ...data });
    
    // Try with cors first, fall back to no-cors
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      return { success: response.ok };
    } catch {
      // CORS blocked — retry with no-cors (opaque response, but request still reaches server)
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: payload,
      });
      return { success: true };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ── Store Portfolio ──────────────────────────────────
const PORTFOLIO_KEY = 'cossinfo_store_portfolios';

export function getStorePortfolio(storeId: string): string[] {
  const all = JSON.parse(localStorage.getItem(PORTFOLIO_KEY) || '{}');
  return all[storeId] || [];
}

export function saveStorePortfolio(storeId: string, globalProductIds: string[]) {
  const all = JSON.parse(localStorage.getItem(PORTFOLIO_KEY) || '{}');
  all[storeId] = globalProductIds;
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(all));
}

export function addToStorePortfolio(storeId: string, globalProductId: string) {
  const ids = getStorePortfolio(storeId);
  if (!ids.includes(globalProductId)) {
    ids.push(globalProductId);
    saveStorePortfolio(storeId, ids);
  }
}

export function removeFromStorePortfolio(storeId: string, globalProductId: string) {
  const ids = getStorePortfolio(storeId).filter(id => id !== globalProductId);
  saveStorePortfolio(storeId, ids);
}

// ── Feedback ──────────────────────────────────
export function getFeedbacks(): Feedback[] {
  return JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
}

export function saveFeedback(feedback: Feedback) {
  const all = getFeedbacks();
  all.push(feedback);
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all));
}

export function deleteFeedback(feedbackId: string) {
  const all = getFeedbacks().filter(f => f.id !== feedbackId);
  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(all));
}
