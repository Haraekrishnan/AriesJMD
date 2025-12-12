'use client';
import { useMemo } from 'react';
import { useConsumable } from '@/contexts/consumable-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/dashboard/stat-card';
import { Package, PackageCheck, PackageX } from 'lucide-react';

export default function ConsumablesPage() {
  const { consumableItems } = useConsumable();

  const { dailyConsumables, jobConsumables, summary } = useMemo(() => {
    const daily: any[] = [];
    const job: any[] = [];
    let totalItems = 0;
    let lowStockItems = 0;
    
    consumableItems.forEach(item => {
      totalItems += item.quantity || 0;
      if ((item.quantity || 0) <= 5) { // Assuming low stock is 5 or less
        lowStockItems++;
      }
      if (item.category === 'Daily Consumable') {
        daily.push(item);
      } else if (item.category === 'Job Consumable') {
        job.push(item);
      }
    });

    return {
      dailyConsumables: daily,
      jobConsumables: job,
      summary: { totalItems, lowStockItems }
    };
  }, [consumableItems]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Consumable Items</h1>
        <p className="text-muted-foreground">Manage stock levels for daily and job-specific consumables.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard 
            title="Total Items in Stock"
            value={summary.totalItems}
            icon={Package}
            description="Total quantity of all consumable items."
        />
        <StatCard 
            title="Items in Stock"
            value={consumableItems.length}
            icon={PackageCheck}
            description="Number of distinct consumable item types."
        />
        <StatCard 
            title="Low Stock Items"
            value={summary.lowStockItems}
            icon={PackageX}
            description="Items with quantity of 5 or less."
            className={summary.lowStockItems > 0 ? "border-destructive" : ""}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Consumables</CardTitle>
          <CardDescription>Items used on a daily basis, tracked by quantity.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyConsumables.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant={(item.quantity || 0) <= 5 ? 'destructive' : 'secondary'}>{item.quantity || 0}</Badge>
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.remarks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job Consumables</CardTitle>
          <CardDescription>Items used for specific jobs, tracked by quantity.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobConsumables.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                     <Badge variant={(item.quantity || 0) <= 5 ? 'destructive' : 'secondary'}>{item.quantity || 0}</Badge>
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.remarks}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
