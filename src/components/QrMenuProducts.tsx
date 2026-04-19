import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Package, Plus, Trash2, Loader2 } from 'lucide-react';
import type { DbStoreProduct } from '@/lib/supabase-store';

interface QrMenuProductsProps {
  storeId: string;
  planType: string;
  products: DbStoreProduct[];
}

type QrProduct = { id: string; store_product_id: string | null; display_name: string; display_order: number; is_active: boolean };

export function QrMenuProducts({ storeId, planType, products }: QrMenuProductsProps) {
  const [qrProducts, setQrProducts] = useState<QrProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customName, setCustomName] = useState('');
  const [addMode, setAddMode] = useState<'existing' | 'custom'>('existing');

  const maxItems = planType === 'enterprise' ? 100 : planType === 'business' ? 20 : 5;

  useEffect(() => {
    loadQrProducts();
  }, [storeId]);

  const loadQrProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('store_qr_products').select('*').eq('store_id', storeId).order('display_order');
    setQrProducts((data as QrProduct[]) || []);
    setLoading(false);
  };

  const handleAddExisting = async () => {
    if (!selectedProductId) return;
    if (qrProducts.length >= maxItems) {
      toast.error(`You can add up to ${maxItems} QR menu items on your plan.`);
      return;
    }
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    const exists = qrProducts.find(q => q.store_product_id === selectedProductId);
    if (exists) { toast.error('This product is already on the QR menu.'); return; }

    const { error } = await supabase.from('store_qr_products').insert({
      store_id: storeId,
      store_product_id: selectedProductId,
      display_name: product.brand_name,
      display_order: qrProducts.length,
    } as any);
    if (error) { toast.error('Failed to add'); return; }
    setSelectedProductId('');
    await loadQrProducts();
    toast.success(`Added "${product.brand_name}" to QR menu`);
  };

  const handleAddCustom = async () => {
    const name = customName.trim();
    if (!name) { toast.error('Please enter a product name.'); return; }
    if (qrProducts.length >= maxItems) {
      toast.error(`You can add up to ${maxItems} QR menu items on your plan.`);
      return;
    }
    const duplicate = qrProducts.find(q => q.display_name.toLowerCase() === name.toLowerCase());
    if (duplicate) { toast.error('An item with this name already exists on the QR menu.'); return; }

    const { error } = await supabase.from('store_qr_products').insert({
      store_id: storeId,
      store_product_id: null,
      display_name: name,
      display_order: qrProducts.length,
    } as any);
    if (error) { toast.error('Failed to add custom item'); return; }
    setCustomName('');
    await loadQrProducts();
    toast.success(`Added "${name}" to QR menu`);
  };

  const handleRemove = async (id: string) => {
    await supabase.from('store_qr_products').delete().eq('id', id);
    setQrProducts(prev => prev.filter(q => q.id !== id));
    toast.success('Removed from QR menu');
  };

  if (planType === 'free') return null;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" /> QR Menu Products ({qrProducts.length}/{maxItems})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Add products from your store inventory or create custom items for the QR order page. Customers will see these items and can adjust quantities.
        </p>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Toggle between existing / custom */}
            <div className="flex gap-2">
              <Button
                variant={addMode === 'existing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAddMode('existing')}
                className="text-xs"
              >
                From Store Products
              </Button>
              <Button
                variant={addMode === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAddMode('custom')}
                className="text-xs"
              >
                Custom Item
              </Button>
            </div>

            {addMode === 'existing' ? (
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a product to add..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter(p => !qrProducts.some(q => q.store_product_id === p.id))
                      .map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.brand_name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddExisting} disabled={!selectedProductId || qrProducts.length >= maxItems} className="gap-1">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Enter custom item name..."
                  className="flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
                />
                <Button onClick={handleAddCustom} disabled={!customName.trim() || qrProducts.length >= maxItems} className="gap-1">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            )}

            {qrProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No products added yet. Add products above to show them on your QR order page.</p>
            ) : (
              <div className="space-y-2">
                {qrProducts.map((qp, i) => (
                  <div key={qp.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-6">{i + 1}.</span>
                      <span className="text-sm font-medium text-foreground">{qp.display_name}</span>
                      {!qp.store_product_id && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent text-accent-foreground font-medium">Custom</span>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemove(qp.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
