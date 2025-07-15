import {
  LayoutDashboard,
  ClipboardCheck,
  Calendar,
  BarChart2,
  Trophy,
  Wrench,
  Archive,
  Ship,
  Users,
  Building2,
  User,
  FileText,
  History,
  AlertOctagon,
  List,
  CalendarDays,
  Send,
} from 'lucide-react';

export const NAV_LINKS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
   {
    href: '/my-requests',
    label: 'My Requests',
    icon: Send,
  },
  {
    href: '/tasks',
    label: 'Tasks',
    icon: ClipboardCheck,
  },
  {
    label: 'Schedule & Planner',
    icon: Calendar,
    subLinks: [
      {
        href: '/planner',
        label: 'Monthly Planner',
        icon: CalendarDays,
      },
      {
        href: '/schedule',
        label: 'Schedule View',
        icon: List,
      },
    ],
  },
  {
    label: 'Performance',
    icon: BarChart2,
    subLinks: [
      {
        href: '/performance',
        label: 'Performance',
        icon: BarChart2,
      },
      {
        href: '/achievements',
        label: 'Achievements',
        icon: Trophy,
      },
    ],
  },
  {
    label: 'Equipment & Inventory',
    icon: Wrench,
    subLinks: [
      {
        href: '/equipment-status',
        label: 'Equipment Status',
        icon: Wrench,
      },
      {
        href: '/store-inventory',
        label: 'Store Inventory',
        icon: Archive,
      },
    ],
  },
  {
    href: '/vehicle-status',
    label: 'Fleet Management',
    icon: Ship,
  },
  {
    label: 'Manpower & Accommodation',
    icon: Users,
    subLinks: [
      {
        href: '/manpower',
        label: 'Manpower',
        icon: Users,
      },
      {
        href: '/manpower-list',
        label: 'Manpower List',
        icon: List,
      },
      {
        href: '/accommodation',
        label: 'Accommodation',
        icon: Building2,
      },
    ],
  },
  {
    label: 'Administration',
    icon: User,
    subLinks: [
        {
            href: '/account',
            label: 'Account',
            icon: User,
        },
        {
            href: '/incident-reporting',
            label: 'Incident Reporting',
            icon: AlertOctagon,
        },
        {
            href: '/reports',
            label: 'Reports',
            icon: FileText,
        },
        {
            href: '/activity-tracker',
            label: 'Activity Tracker',
            icon: History,
        },
    ]
  }
];
