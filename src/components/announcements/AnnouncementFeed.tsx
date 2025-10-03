
'use client';
import { useMemo } from 'react';
import { useAppContext } from '@/contexts/app-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Megaphone, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';

export default function AnnouncementFeed() {
    const { user, announcements, dismissAnnouncement, deleteAnnouncement } = useAppContext();

    const handleHide = (id: string) => {
        dismissAnnouncement(id);
    };

    const handleDelete = (id: string) => {
        deleteAnnouncement(id);
    };
    
    const visibleAnnouncements = useMemo(() => {
        if (!user) return [];
        return announcements
            .filter(a => {
                if (a.status !== 'approved') return false;
                // Admins see all approved announcements, regardless of dismissal status
                if (user.role === 'Admin') return true;
                // Other users see announcements they haven't dismissed
                return !(a.dismissedBy || []).includes(user.id);
            })
            .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [announcements, user]);

    if (visibleAnnouncements.length === 0) return null;

    return (
        <div className="space-y-4">
            {visibleAnnouncements.map(announcement => (
                <div key={announcement.id} className="relative w-full rounded-lg border p-4 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-4">
                        <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                            <h5 className="mb-1 font-medium leading-none tracking-tight text-blue-900 dark:text-blue-200">{announcement.title}</h5>
                            <div className="text-sm text-blue-800 dark:text-blue-300">
                                {announcement.content}
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-2 right-2 flex items-center">
                        {user?.role === 'Admin' && (
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete the announcement for all users. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(announcement.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        <Button 
                            size="icon" 
                            variant="ghost"
                            className="h-6 w-6 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
                            onClick={() => handleHide(announcement.id)}
                        >
                            <X className="h-4 w-4 text-black dark:text-white" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
