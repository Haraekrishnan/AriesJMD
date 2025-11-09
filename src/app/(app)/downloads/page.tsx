'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download } from 'lucide-react';
import AddDocumentDialog from '@/components/downloads/AddDocumentDialog';
import DownloadsTable from '@/components/downloads/DownloadsTable';
import EditDocumentDialog from '@/components/downloads/EditDocumentDialog';
import type { DownloadableDocument } from '@/lib/types';
import { Input } from '@/components/ui/input';

export default function DownloadsPage() {
  const { can, downloadableDocuments = [] } = useAppContext();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DownloadableDocument | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const canManage = can.manage_downloads;

  const filteredDocuments = useMemo(() => {
    if (!searchTerm) {
      return downloadableDocuments;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return downloadableDocuments.filter(doc => 
      doc.title.toLowerCase().includes(lowercasedTerm) ||
      (doc.description && doc.description.toLowerCase().includes(lowercasedTerm)) ||
      (doc.category && doc.category.toLowerCase().includes(lowercasedTerm))
    );
  }, [downloadableDocuments, searchTerm]);

  const handleEdit = (doc: DownloadableDocument) => {
    setEditingDocument(doc);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Download /> Forms & Documents
          </h1>
          <p className="text-muted-foreground">Find and download shared company documents and forms.</p>
        </div>
        {canManage && (
          <Button onClick={() => setIsAddOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Document
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Available Documents</CardTitle>
              <CardDescription>
                A list of all documents available for download.
              </CardDescription>
            </div>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DownloadsTable 
            documents={filteredDocuments}
            canManage={canManage}
            onEdit={handleEdit}
          />
        </CardContent>
      </Card>

      {canManage && <AddDocumentDialog isOpen={isAddOpen} setIsOpen={setIsAddOpen} />}
      {canManage && editingDocument && (
        <EditDocumentDialog
          isOpen={!!editingDocument}
          setIsOpen={() => setEditingDocument(null)}
          document={editingDocument}
        />
      )}
    </div>
  );
}
