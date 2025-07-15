import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function StoreInventoryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Store Inventory</h1>
       <Card>
        <CardHeader>
            <CardTitle>Inventory Management</CardTitle>
            <CardDescription>Grouped view of all store items.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                This page will feature an accordion view to manage store inventory, with import functionality.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}
