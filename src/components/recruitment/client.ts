'use client';
import '@/lib/rtdb';
import {getApp} from 'firebase/app';
import {getFunctions,httpsCallable} from 'firebase/functions';
import type {User} from '@/lib/types';
const endpoint=httpsCallable(getFunctions(getApp(),'asia-south1'),'recruitment');
// Reuse the existing portal session; never create a second authentication session.
export function createRecruitmentClient(user:User){
  return async function recruitmentCall<T>(data:Record<string,unknown>):Promise<T>{
    return (await endpoint({...data,portalSession:{userId:user.id,password:user.password}})).data as T;
  };
}
