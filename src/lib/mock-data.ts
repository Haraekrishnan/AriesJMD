
'use client';

import type { User, Task, PlannerEvent, Achievement, RoleDefinition, Project, TaskStatus, ActivityLog, DailyPlannerComment, InternalRequest, ManagementRequest, InventoryItem, CertificateRequest, ManpowerLog, UTMachine, Vehicle, ManpowerProfile, Trade, DftMachine, MobileSim, LaptopDesktop, Driver, Announcement, IncidentReport, Building, IgpOgpRecord, PpeInwardRecord, JobRecordPlant, JobCode } from './types';
import { sub, add, format } from 'date-fns';
import { ALL_PERMISSIONS } from './types';

export { ALL_PERMISSIONS };

export const ROLES: RoleDefinition[] = [
  {
    id: 'role-admin',
    name: 'Admin',
    permissions: [...ALL_PERMISSIONS],
    isEditable: true,
  },
  {
    id: 'role-manager',
    name: 'Manager',
     permissions: [
      'manage_tasks', 'manage_planner', 'manage_incidents', 'manage_achievements',
      'manage_vehicles', 'manage_manpower', 'manage_manpower_list', 'manage_accommodation',
      'approve_store_requests', 'manage_inventory',
      'manage_equipment_status',
      'manage_announcements', 'view_performance_reports', 'view_activity_logs',
      'log_manpower', 'manage_job_schedule', 'manage_vendors', 'manage_payments', 'view_ppe_requests',
      'manage_job_record', 'manage_purchase_register', 'manage_igp_ogp'
    ],
    isEditable: false,
  },
  {
    id: 'role-project-coordinator',
    name: 'Project Coordinator',
    permissions: [
      'manage_tasks', 'manage_planner', 'manage_incidents', 'manage_achievements',
      'manage_vehicles', 'manage_manpower', 'manage_manpower_list', 'manage_accommodation',
      'approve_store_requests', 'manage_inventory', 
      'manage_equipment_status',
      'manage_announcements', 'view_performance_reports', 'view_activity_logs',
      'log_manpower', 'manage_job_schedule', 'prepare_master_schedule', 'manage_igp_ogp',
      'manage_ppe_request', 'view_internal_store_request', 'manage_store_requests',
      'manage_job_record', 'manage_tp_certification'
    ],
    isEditable: false,
  },
  {
    id: 'role-supervisor',
    name: 'Supervisor',
    permissions: [
      'manage_tasks', 'manage_planner', 'manage_incidents', 'manage_achievements', 'view_performance_reports', 'manage_manpower', 'log_manpower', 'manage_job_schedule', 'manage_job_record'
    ],
    isEditable: false,
  },
   {
    id: 'role-ndt-supervisor',
    name: 'NDT Supervisor',
    permissions: [
      'manage_tasks', 'manage_planner', 'manage_incidents', 'manage_achievements', 'view_performance_reports', 'manage_manpower', 'log_manpower', 'manage_job_schedule', 'manage_job_record', 'manage_equipment_status'
    ],
    isEditable: true,
  },
  {
    id: 'role-hse',
    name: 'Senior Safety Supervisor',
    permissions: [
      'manage_tasks', 'manage_planner', 'manage_incidents', 'view_performance_reports', 'manage_equipment_status'
    ],
    isEditable: false,
  },
  {
    id: 'role-jr-supervisor',
    name: 'Junior Supervisor',
    permissions: ['view_performance_reports', 'log_manpower', 'manage_job_record'],
    isEditable: false,
  },
  {
    id: 'role-jr-hse',
    name: 'Safety Supervisor',
    permissions: ['view_performance_reports'],
    isEditable: false,
  },
    {
    id: 'role-store-in-charge',
    name: 'Store in Charge',
    permissions: [
      'manage_tasks', 'manage_planner', 'manage_incidents',
      'manage_inventory', 'approve_store_requests',
      'manage_equipment_status',
      'view_performance_reports',
      'manage_vehicles',
      'manage_igp_ogp', 'view_ppe_requests', 'manage_ppe_stock', 'manage_tp_certification',
      'view_internal_store_request', 'manage_logbook'
    ],
    isEditable: false,
  },
  {
    id: 'role-asst-store-incharge',
    name: 'Assistant Store Incharge',
    permissions: ['manage_inventory', 'view_performance_reports', 'manage_tasks', 'manage_equipment_status'],
    isEditable: false,
  },
  {
    id: 'role-team-member',
    name: 'Team Member',
    permissions: ['manage_tasks'],
    isEditable: true,
  },
  {
    id: 'role-document-controller',
    name: 'Document Controller',
    permissions: [
        'manage_manpower_list', 'manage_tasks', 'log_manpower',
        'manage_ppe_request', 'view_internal_store_request', 'manage_store_requests',
        'manage_job_record'
    ],
    isEditable: true,
  }
];

export const PROJECTS: Project[] = [
    { id: 'proj-1', name: 'SEZ' },
    { id: 'proj-2', name: 'DTA' },
    { id: 'proj-3', name: 'MTF' },
    { id: 'proj-4', name: 'DTA-JPC' },
    { id: 'proj-5', name: 'SEZ-JPC' },
    { id: 'proj-6', name: 'RPMG-SOLAR' },
    { id: 'proj-7', name: 'Head Office' },
    { id: 'proj-8', name: 'Pass Section' },
    { id: 'proj-9', name: 'Unassigned' },
];

export const JOB_RECORD_PLANTS: JobRecordPlant[] = [
    { id: 'plant-1', name: 'DTA' },
    { id: 'plant-2', name: 'SEZ' },
    { id: 'plant-3', name: 'DTA-JPC' },
    { id: 'plant-4', name: 'MTF' },
];

export const JOB_CODES: JobCode[] = [];

export const USERS: User[] = [
  { id: '1', name: 'Harirkrishnan P S', email: 'satanin2013@gmail.com', password: 'password', role: 'Admin', avatar: 'https://i.pravatar.cc/150?u=1', projectId: 'proj-6', planningScore: 0, status: 'active' },
  { id: '2', name: 'Manu M G', email: 'manu@ariesmar.com', password: 'password', role: 'Project Coordinator', avatar: 'https://i.pravatar.cc/150?u=2', supervisorId: '1', projectId: 'proj-6', planningScore: 0, status: 'active' },
  { id: '3', name: 'Mujeeb', email: 'mujeeb@ariesmarine.com', password: 'password', role: 'Supervisor', avatar: 'https://i.pravatar.cc/150?u=3', supervisorId: '2', projectId: 'proj-1', planningScore: 0, status: 'active' },
  { id: '4', name: 'Albin Raju', email: 'albin@ariesmarine.com', password: 'password', role: 'Supervisor', avatar: 'https://i.pravatar.cc/150?u=4', supervisorId: '2', projectId: 'proj-2', planningScore: 0, status: 'active' },
  { id: '5', name: 'Arjun P', email: 'arjun@ariesmarine.com', password: 'password', role: 'Supervisor', avatar: 'https://i.pravatar.cc/150?u=5', supervisorId: '2', projectId: 'proj-3', planningScore: 0, status: 'active' },
  { id: '6', name: 'Sreehari', email: 'sreehari@ariesmarine.com', password: 'password', role: 'Supervisor', avatar: 'https://i.pravatar.cc/150?u=6', supervisorId: '2', projectId: 'proj-4', planningScore: 0, status: 'active' },
  { id: '7', name: 'Vishnu H', email: 'vishnu.h@ariesmarine.com', password: 'password', role: 'Supervisor', avatar: 'https://i.pravatar.cc/150?u=7', supervisorId: '2', projectId: 'proj-5', planningScore: 0, status: 'active' },
  { id: '8', name: 'Akhil A', email: 'akhil.a@ariesmarine.com', password: 'password', role: 'Supervisor', avatar: 'https://i.pravatar.cc/150?u=8', supervisorId: '2', projectId: 'proj-1', planningScore: 0, status: 'active' },
  { id: '9', name: 'Dhaneesh Kumar', email: 'dhaneesh@ariesmarine.com', password: 'password', role: 'Supervisor', avatar: 'https://i.pravatar.cc/150?u=9', supervisorId: '2', projectId: 'proj-2', planningScore: 0, status: 'active' },
  { id: '10', name: 'Rakhil Raj', email: 'rakhil@ariesmarine.com', password: 'password', role: 'Supervisor', avatar: 'https://i.pravatar.cc/150?u=10', supervisorId: '2', projectId: 'proj-3', planningScore: 0, status: 'active' },
  { id: '11', name: 'Akhil Pillai', email: 'akhil.pillai@ariesmarine.com', password: 'password', role: 'Junior Supervisor', avatar: 'https://i.pravatar.cc/150?u=11', supervisorId: '3', projectId: 'proj-1', planningScore: 0, status: 'active' },
  { id: '12', name: 'Athul Kumar', email: 'athul@ariesmarine.com', password: 'password', role: 'Junior Supervisor', avatar: 'https://i.pravatar.cc/150?u=12', supervisorId: '3', projectId: 'proj-1', planningScore: 0, status: 'active' },
  { id: '13', name: 'Rinu Sam', email: 'rinu@ariesmarine.com', password: 'password', role: 'Junior Supervisor', avatar: 'https://i.pravatar.cc/150?u=13', supervisorId: '4', projectId: 'proj-2', planningScore: 0, status: 'active' },
  { id: '14', name: 'Syam Kumar', email: 'syam@ariesmarine.com', password: 'password', role: 'Junior Supervisor', avatar: 'https://i.pravatar.cc/150?u=14', supervisorId: '4', projectId: 'proj-2', planningScore: 0, status: 'active' },
  { id: '15', name: 'Vishnu S', email: 'vishnu.s@ariesmarine.com', password: 'password', role: 'Junior Supervisor', avatar: 'https://i.pravatar.cc/150?u=15', supervisorId: '5', projectId: 'proj-3', planningScore: 0, status: 'active' },
  { id: '16', name: 'Vishnu J', email: 'vishnu.j@ariesmarine.com', password: 'password', role: 'Junior Supervisor', avatar: 'https://i.pravatar.cc/150?u=16', supervisorId: '5', projectId: 'proj-3', planningScore: 0, status: 'active' },
  { id: '17', name: 'Amaldas M', email: 'amaldas@ariesmarine.com', password: 'password', role: 'Junior Supervisor', avatar: 'https://i.pravatar.cc/150?u=17', supervisorId: '6', projectId: 'proj-4', planningScore: 0, status: 'active' },
  { id: '18', name: 'Sajin Soman', email: 'sajin@ariesmarine.com', password: 'password', role: 'Junior Supervisor', avatar: 'https://i.pravatar.cc/150?u=18', supervisorId: '6', projectId: 'proj-4', planningScore: 0, status: 'active' },
  { id: '19', name: 'Aparna M R', email: 'aparna@ariesmarine.com', password: 'password', role: 'Team Member', avatar: 'https://i.pravatar.cc/150?u=19', supervisorId: '11', projectId: 'proj-1', planningScore: 0, status: 'active' },
  { id: '20', name: 'John Safety', email: 'john.safety@ariesmarine.com', password: 'password', role: 'Senior Safety Supervisor', avatar: 'https://i.pravatar.cc/150?u=20', supervisorId: '2', projectId: 'proj-6', planningScore: 0, status: 'active' },
  { id: '21', name: 'Peter Hazard', email: 'peter.hazard@ariesmarine.com', password: 'password', role: 'Safety Supervisor', avatar: 'https://i.pravatar.cc/150?u=21', supervisorId: '20', projectId: 'proj-6', planningScore: 0, status: 'active' },
    { id: '22', name: 'Store Keeper', email: 'store@ariesmarine.com', password: 'password', role: 'Store in Charge', avatar: 'https://i.pravatar.cc/150?u=22', supervisorId: '2', projectId: 'proj-6', planningScore: 0, status: 'active' },
  { id: '23', name: 'Asst. Store Keeper', email: 'asst.store@ariesmarine.com', password: 'password', role: 'Assistant Store Incharge', avatar: 'https://i.pravatar.cc/150?u=23', supervisorId: '22', projectId: 'proj-6', planningScore: 0, status: 'active' },
];

export const TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Develop new homepage design',
    description: 'Create a modern and responsive design for the company homepage. Focus on user experience and brand consistency.',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    assigneeId: '19', 
    assigneeIds: ['19'],
    creatorId: '11', 
    isViewedByAssignee: true,
    comments: [
        { id: 'c-1-1', userId: '11', text: 'Let me know if you have any questions on the design brief.', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), eventId: 'task-1' }
    ],
    requiresAttachmentForCompletion: true,
    approvalState: 'none'
  },
  {
    id: 'task-2',
    title: 'Set up CI/CD pipeline',
    description: 'Implement a continuous integration and deployment pipeline for the main application using GitHub Actions.',
    status: 'To Do',
    priority: 'High',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    assigneeId: '12', 
    assigneeIds: ['12'],
    creatorId: '3', 
    isViewedByAssignee: true,
    comments: [],
    requiresAttachmentForCompletion: false,
    approvalState: 'none'
  },
  {
    id: 'task-3',
    title: 'Quarterly performance review',
    description: 'Prepare and conduct quarterly performance reviews for all team members. Collect feedback and set goals.',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    assigneeId: '2', 
    assigneeIds: ['2'],
    creatorId: '1', 
    isViewedByAssignee: true,
    comments: [],
    requiresAttachmentForCompletion: false,
    approvalState: 'none'
  },
  {
    id: 'task-4',
    title: 'Fix login page bug',
    description: 'A critical bug is preventing some users from logging in. Needs immediate attention.',
    status: 'In Progress',
    priority: 'High',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    assigneeId: '15', 
    assigneeIds: ['15'],
    creatorId: '5', 
    isViewedByAssignee: true,
    comments: [
        { id: 'c-4-1', userId: '5', text: 'This is a top priority, please escalate if you run into issues.', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), eventId: 'task-4' },
        { id: 'c-4-2', userId: '15', text: 'On it. I think I have an idea of what the issue is.', date: new Date().toISOString(), eventId: 'task-4' }
    ],
    requiresAttachmentForCompletion: false,
    approvalState: 'none'
  },
  {
    id: 'task-5',
    title: 'Update brand style guide',
    description: 'Revise the brand style guide with new logos and color palettes. Distribute to all relevant teams.',
    status: 'Done',
    priority: 'Low',
    dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    completionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    assigneeId: '19', 
    assigneeIds: ['19'],
    creatorId: '11', 
    isViewedByAssignee: true,
    comments: [],
    requiresAttachmentForCompletion: false,
    approvalState: 'approved'
  },
  {
    id: 'task-6',
    title: 'Plan team offsite event',
    description: 'Organize a team-building offsite event for the end of the quarter. Handle logistics, budget, and activities.',
    status: 'To Do',
    priority: 'Medium',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    assigneeId: '2',
    assigneeIds: ['2'],
    creatorId: '1', 
    isViewedByAssignee: true,
    comments: [],
    requiresAttachmentForCompletion: false,
    approvalState: 'none'
  },
  {
    id: 'task-7',
    title: 'Migrate database to new server',
    description: 'Plan and execute the migration of the production database to a new, more powerful server.',
    status: 'To Do',
    priority: 'High',
    dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    assigneeId: '12', 
    assigneeIds: ['12'],
    creatorId: '3', 
    isViewedByAssignee: false,
    comments: [],
    requiresAttachmentForCompletion: true,
    approvalState: 'none'
  },
  {
    id: 'task-8',
    title: 'User testing for new feature',
    description: 'Conduct user testing sessions for the upcoming feature release. Gather feedback and report findings.',
    status: 'Done',
    priority: 'Medium',
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    completionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    assigneeId: '16', 
    assigneeIds: ['16'],
    creatorId: '5', 
    isViewedByAssignee: true,
    comments: [],
    requiresAttachmentForCompletion: false,
    approvalState: 'approved'
  },
];

export const INTERNAL_REQUESTS: InternalRequest[] = [
    {
        id: 'ireq-1',
        requesterId: '19', 
        items: [
          { id: 'item-1-1', description: 'A4 paper ream', quantity: 5, unit: 'pcs', remarks: '', status: 'Pending' },
          { id: 'item-1-2', description: 'Blue and black pens', quantity: 2, unit: 'box', remarks: '1 box each', status: 'Pending' }
        ],
        status: 'Pending',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        comments: [],
        viewedByRequester: true,
    },
    {
        id: 'ireq-2',
        requesterId: '12', 
        items: [
          { id: 'item-2-1', description: 'Fluke Multimeters', quantity: 2, unit: 'pcs', remarks: 'The old ones are malfunctioning.', status: 'Approved' }
        ],
        status: 'Approved',
        approverId: '22',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        comments: [{ id: 'c-ireq-1', userId: '22', text: 'Approved. You can collect from the main store.', date: new Date().toISOString(), eventId: 'ireq-2' }],
        viewedByRequester: false,
    }
];

export const MANAGEMENT_REQUESTS: ManagementRequest[] = [
    {
        id: 'mreq-1',
        requesterId: '13', 
        recipientId: '4', 
        subject: 'Request for additional training',
        body: 'I would like to request enrollment in the advanced project management course to improve my skills.',
        status: 'Pending',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        comments: [],
        viewedByRequester: true,
    }
];

export const INVENTORY_ITEMS: InventoryItem[] = [
    { id: 'inv-1', name: 'Harness', serialNumber: 'HN-001', chestCrollNo: 'CCN-A1', ariesId: 'ARIES-001', status: 'In Use', inspectionDate: sub(new Date(), { months: 2 }).toISOString(), inspectionDueDate: add(new Date(), { months: 4 }).toISOString(), tpInspectionDueDate: add(new Date(), { months: 10 }).toISOString(), projectId: 'proj-1', lastUpdated: new Date().toISOString() },
    { id: 'inv-2', name: 'Harness', serialNumber: 'HN-002', chestCrollNo: 'CCN-A2', ariesId: 'ARIES-002', status: 'In Store', inspectionDate: sub(new Date(), { months: 1 }).toISOString(), inspectionDueDate: add(new Date(), { months: 5 }).toISOString(), tpInspectionDueDate: add(new Date(), { months: 11 }).toISOString(), projectId: 'proj-6', lastUpdated: new Date().toISOString() },
    { id: 'inv-3', name: 'Foot Loop', serialNumber: 'FL-001', status: 'In Use', inspectionDate: sub(new Date(), { days: 10 }).toISOString(), inspectionDueDate: add(new Date(), { months: 5, days: 20 }).toISOString(), tpInspectionDueDate: add(new Date(), { months: 11, days: 20 }).toISOString(), projectId: 'proj-2', lastUpdated: new Date().toISOString() },
    { id: 'inv-4', name: 'Grinder', serialNumber: 'GR-001', status: 'Damaged', inspectionDate: sub(new Date(), { years: 1 }).toISOString(), inspectionDueDate: sub(new Date(), { months: 6 }).toISOString(), tpInspectionDueDate: sub(new Date(), { months: 1 }).toISOString(), projectId: 'proj-3', lastUpdated: new Date().toISOString() },
    { id: 'inv-5', name: 'Harness', serialNumber: 'HN-003', chestCrollNo: 'CCN-B1', ariesId: 'ARIES-003', status: 'In Use', inspectionDate: new Date().toISOString(), inspectionDueDate: add(new Date(), { days: 25 }).toISOString(), tpInspectionDueDate: add(new Date(), { months: 6, days: 25 }).toISOString(), projectId: 'proj-4', lastUpdated: new Date().toISOString() },
    { id: 'inv-6', name: 'Harness', serialNumber: 'HN-004', chestCrollNo: 'CCN-B2', ariesId: 'ARIES-004', status: 'Expired', inspectionDate: sub(new Date(), { months: 7 }).toISOString(), inspectionDueDate: sub(new Date(), { months: 1 }).toISOString(), tpInspectionDueDate: sub(new Date(), { months: 1 }).toISOString(), projectId: 'proj-8', lastUpdated: new Date().toISOString() },
];

export const CERTIFICATE_REQUESTS: CertificateRequest[] = [
  {
    id: 'cert-req-1',
    itemId: 'inv-1',
    requesterId: '3', 
    requestType: 'TP Certificate',
    status: 'Pending',
    requestDate: new Date().toISOString(),
    remarks: 'Need this for client audit next week.',
    comments: [{ id: 'c-cert-1', userId: '3', text: 'Need this for client audit next week.', date: new Date().toISOString(), eventId: 'cert-req-1' }],
  }
];

export const MANPOWER_LOGS: ManpowerLog[] = [
    { id: 'mp-1', date: format(new Date(), 'yyyy-MM-dd'), projectId: 'proj-1', countIn: 20, countOut: 1, reason: '1 person sick leave', updatedBy: '3', yesterdayCount: 19, total: 38, countOnLeave: 1, personOnLeaveName: 'David', openingManpower: 19, updatedAt: new Date().toISOString() },
    { id: 'mp-2', date: format(new Date(), 'yyyy-MM-dd'), projectId: 'proj-2', countIn: 15, countOut: 0, reason: 'Full attendance', updatedBy: '4', yesterdayCount: 15, total: 30, countOnLeave: 0, openingManpower: 15, updatedAt: new Date().toISOString() },
    { id: 'mp-3', date: format(sub(new Date(), { days: 1 }), 'yyyy-MM-dd'), projectId: 'proj-1', countIn: 19, countOut: 0, reason: 'Full attendance', updatedBy: '3', yesterdayCount: 19, total: 38, countOnLeave: 0, openingManpower: 19, updatedAt: sub(new Date(), { days: 1 }).toISOString() },
];

export const UT_MACHINES: UTMachine[] = [];
export const DFT_MACHINES: DftMachine[] = [];
export const MOBILE_SIMS: MobileSim[] = [];
export const LAPTOPS_DESKTOPS: LaptopDesktop[] = [];


export const DRIVERS: Driver[] = [
    { id: 'd-1', name: 'Ali Khan', licenseNumber: 'DL-001', epNumber: 'EP-001', sdpNumber: 'SDP-001', epExpiry: add(new Date(), { months: 4 }).toISOString(), medicalExpiry: add(new Date(), { years: 1 }).toISOString(), photo: '' },
    { id: 'd-2', name: 'Babu Raj', licenseNumber: 'DL-002', epNumber: 'EP-002', sdpNumber: 'SDP-002', epExpiry: add(new Date(), { days: 20 }).toISOString(), medicalExpiry: add(new Date(), { months: 6 }).toISOString(), photo: '' },
];

export const VEHICLES: Vehicle[] = [
    { id: 'vh-1', vehicleNumber: 'DXB 12345', driverId: 'd-1', seatingCapacity: 4, vapValidity: add(new Date(), { months: 6 }).toISOString(), insuranceValidity: add(new Date(), { years: 1 }).toISOString(), fitnessValidity: add(new Date(), { years: 2 }).toISOString(), taxValidity: add(new Date(), { months: 3 }).toISOString(), puccValidity: add(new Date(), { months: 5 }).toISOString() },
    { id: 'vh-2', vehicleNumber: 'SHJ 54321', driverId: 'd-2', seatingCapacity: 7, vapValidity: add(new Date(), { days: 25 }).toISOString(), insuranceValidity: add(new Date(), { months: 8 }).toISOString(), fitnessValidity: add(new Date(), { years: 1 }).toISOString(), taxValidity: add(new Date(), { months: 2 }).toISOString(), puccValidity: add(new Date(), { months: 4 }).toISOString() },
];

export const TRADES: Trade[] = ['RA Level 1', 'RA Level 2', 'RA Level 3', 'RA + Supervisor', 'Supervisor', 'Senior Safety Supervisor', 'Safety Supervisor', 'Document Controller', 'Cook', 'Others'];
export const RA_TRADES: Trade[] = ['RA Level 1', 'RA Level 2', 'RA Level 3', 'RA + Supervisor'];
export const MANDATORY_DOCS = ['Aadhar Card', 'CV', 'Pan Card', 'Personal Details', 'Form A', 'Induction', 'Signed Contract', 'Medical Report', 'First Aid Certificate'];

export const MANPOWER_PROFILES: ManpowerProfile[] = [
    {
        id: 'mp-prof-1',
        name: 'John Doe',
        trade: 'RA Level 1',
        status: 'Working',
        hardCopyFileNo: 'File-A',
        epNumber: 'EP12345',
        eic: 'proj-1',
        joiningDate: new Date().toISOString(),
        documents: [
            { name: 'Aadhar Card', details: '1234 5678 9012', status: 'Collected' },
            { name: 'CV', details: '', status: 'Collected' },
            { name: 'Pan Card', details: 'ABCDE1234F', status: 'Received' },
            { name: 'Personal Details', details: '', status: 'Pending' },
            { name: 'Form A', details: '', status: 'Pending' },
            { name: 'Induction', details: '', status: 'Pending' },
            { name: 'Signed Contract', details: '', status: 'Pending' },
            { name: 'Medical Report', details: '', status: 'Pending' },
            { name: 'IRATA Certificate', details: 'IRATA-9876', status: 'Collected' },
        ]
    },
    {
        id: 'mp-prof-2',
        name: 'Peter Jones',
        trade: 'Supervisor',
        status: 'On Leave',
        hardCopyFileNo: 'File-A',
        leaveHistory: {
            'leave-1': { id: 'leave-1', leaveType: 'Annual', leaveStartDate: sub(new Date(), {days: 5}).toISOString() }
        },
        documents: [
            { name: 'Aadhar Card', details: '2345 6789 0123', status: 'Collected' },
            { name: 'CV', details: '', status: 'Collected' },
            { name: 'Pan Card', details: 'FGHIJ5678K', status: 'Collected' },
            { name: 'Personal Details', details: '', status: 'Collected' },
            { name: 'Form A', details: '', status: 'Collected' },
            { name: 'Induction', details: '', status: 'Collected' },
            { name: 'Signed Contract', details: '', status: 'Pending' },
            { name: 'Medical Report', details: '', status: 'Pending' },
        ]
    }
];


export const PLANNER_EVENTS: PlannerEvent[] = [
    {
        id: 'event-1',
        title: 'Daily Standup',
        description: 'Sync up on project progress and blockers.',
        date: new Date().toISOString(),
        frequency: 'daily',
        creatorId: '11', 
        userId: '19', 
    },
    {
        id: 'event-2',
        title: 'Product Sprint Demo',
        description: 'Showcase new features developed in the current sprint.',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        frequency: 'once',
        creatorId: '2', 
        userId: '2', 
    },
    {
        id: 'event-3',
        title: 'Monthly All-Hands',
        description: 'Company-wide update meeting.',
        date: new Date(new Date().setDate(15)).toISOString(),
        frequency: 'monthly',
        creatorId: '1', 
        userId: '1', 
    },
    {
        id: 'event-4',
        title: 'Team Retrospective',
        description: 'Discuss what went well and what could be improved.',
        date: new Date(new Date().setDate(25)).toISOString(),
        frequency: 'weekly',
        creatorId: '3', 
        userId: '12',
    }
];

export const DAILY_PLANNER_COMMENTS: DailyPlannerComment[] = [];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'ach-1', userId: '19', type: 'manual', title: 'Safety Star', description: 'Maintained a perfect safety record for Q2.', points: 50, date: new Date().toISOString(), awardedById: '11', status: 'approved' },
  { id: 'ach-2', userId: '12', type: 'manual', title: 'Innovation Award', description: 'Proposed a new workflow that saved 10 hours per week.', points: 100, date: new Date().toISOString(), awardedById: '2', status: 'approved' },
];

const now = new Date();
export const ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'log-1',
    userId: '19',
    action: 'Updated task',
    details: 'Updated task: "Develop new homepage design"',
    timestamp: sub(now, { days: 1, hours: 8 }).toISOString(),
  },
  {
    id: 'log-2',
    userId: '12',
    action: 'Created task',
    details: 'Created task: "Set up CI/CD pipeline"',
    timestamp: sub(now, { days: 1, hours: 7 }).toISOString(),
  },
    {
    id: 'log-3',
    userId: '2',
    action: 'Planned event',
    details: 'Planned team offsite event details',
    timestamp: sub(now, { days: 2, hours: 8 }).toISOString(),
  },
];

export const ANNOUNCEMENTS: Announcement[] = [];
export const INCIDENTS: IncidentReport[] = [];
export const PPE_INWARD_HISTORY: PpeInwardRecord[] = [];

export const BUILDINGS: Building[] = [
    {
        id: 'bldg-1',
        buildingNumber: 'A1',
        rooms: [
            {
                id: 'room-a1-101',
                roomNumber: '101',
                beds: [
                    { id: 'bed-a1-101-1', bedNumber: 'A', bedType: 'Bunk', occupantId: 'mp-prof-1' },
                    { id: 'bed-a1-101-2', bedNumber: 'B', bedType: 'Bunk' },
                    { id: 'bed-a1-101-3', bedNumber: 'C', bedType: 'Bunk' },
                    { id: 'bed-a1-101-4', bedNumber: 'D', bedType: 'Bunk' },
                ]
            },
            {
                id: 'room-a1-102',
                roomNumber: '102',
                beds: [
                    { id: 'bed-a1-102-1', bedNumber: 'A', bedType: 'Single' },
                    { id: 'bed-a1-102-2', bedNumber: 'B', bedType: 'Single' },
                ]
            }
        ]
    }
];

export const IGP_OGP_RECORDS: IgpOgpRecord[] = [];