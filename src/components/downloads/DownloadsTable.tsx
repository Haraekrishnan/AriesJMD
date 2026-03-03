
'use client';

import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import { useAppContext } from '@/contexts/app-provider';
import type { DownloadableDocument } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';

interface DownloadsTableProps {
  documents: DownloadableDocument[];
  canManage: boolean;
  onEdit: (doc: DownloadableDocument) => void;
}

export default function DownloadsTable({ documents = [], canManage, onEdit }: DownloadsTableProps) {
  const { deleteDocument, users } = useAppContext();

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [documents]);

  if (!documents || documents.length === 0) {
    return <p className="text-center py-8 text-muted-foreground">No documents found.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Uploaded By</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedDocuments.map(doc => {
          const uploader = users.find(u => u.id === doc.uploadedBy);
          return (
            <TableRow key={doc.id}>
              <TableCell>
                <p className="font-medium">{doc.title}</p>
                {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
              </TableCell>
              <TableCell>{doc.category || 'N/A'}</TableCell>
              <TableCell>{doc.documentType || 'N/A'}</TableCell>
              <TableCell>{uploader?.name || 'Unknown'}</TableCell>
              <TableCell>{format(parseISO(doc.createdAt), 'dd MMM, yyyy')}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button asChild size="sm">
                    <a href={doc.url} download target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" /> Download
                    </a>
                  </Button>
                  {canManage && (
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => onEdit(doc)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete the document "{doc.title}". This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteDocument(doc.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
