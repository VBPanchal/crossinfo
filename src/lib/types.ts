export interface Product {
  id: string;
  barcode: string; // legacy, kept for backward compat
  cartonBarcode: string;
  packetBarcode: string;
  brandName: string;
  avgSalesLastThreeWeeks: number;
  quantityOfOrder: number;
  unitType: 'carton' | 'packet';
}

export interface StockEntry {
  id: string;
  productId: string;
  barcode: string;
  brandName: string;
  avgSalesLastThreeWeeks: number;
  quantityOfOrder: number;
  frontStock: number;
  backStock: number;
  nextWeekNeed: number;
  weekDate: string;
  storeId: string;
  employeeId: string;
}

export interface Store {
  id: string;
  name: string;
  ownerName: string;
  contactNo: string;
  email: string;
  streetAddress: string;
  suburb: string;
  city: string;
  pinCode: string;
  address: string; // legacy combined address
  refCodeDiscount: string;
  webhookUrl: string;
  password: string;
  status: 'active' | 'paused';
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'employee';
  storeId: string;
}

export type StockSide = 'front' | 'back';

/** Shared across all stores — just barcode + brand info */
export interface GlobalProduct {
  id: string;
  cartonBarcode: string;
  packetBarcode: string;
  brandName: string;
  manufacturerName: string;
  packetsPerCarton?: number;
}

export interface Feedback {
  id: string;
  name: string;
  email: string;
  message: string;
  timestamp: string;
}
