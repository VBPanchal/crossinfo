import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClipboardList } from 'lucide-react';

interface ScanItem {
  barcode: string;
  brandName: string;
  timestamp: string;
  action: string;
}

interface ScanHistoryPanelProps {
  items: ScanItem[];
  title?: string;
}

export function ScanHistoryPanel({ items, title = 'Recent Scans' }: ScanHistoryPanelProps) {
  return (
    <Card className="glass-card">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          {title} ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
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
                {items.slice().reverse().map((item, i) => (
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
    </Card>
  );
}
