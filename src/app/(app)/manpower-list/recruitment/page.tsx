'use client';
import {useAuth} from '@/contexts/auth-provider';
import RecruitmentRegister from '@/components/recruitment/RecruitmentRegister';
export default function RecruitmentPage(){
 const {user,can,loading}=useAuth();
 if(loading)return <p>Loading…</p>;
 if(!user)return null;
 if(!can.view_recruitment_sheet)return <p>You do not have permission to view the recruitment sheet. Contact an administrator.</p>;
 return <RecruitmentRegister key={user.id+String(can.manage_recruitment_sheet)} user={user} permissions={{view:can.view_recruitment_sheet,manage:can.manage_recruitment_sheet}}/>;
}
