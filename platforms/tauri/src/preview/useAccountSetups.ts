import {useCallback,useEffect,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
export type AccountSetup={id:string;provider:string;label:string;directory:string};
export function useAccountSetups(){
 const [records,setRecords]=useState<AccountSetup[]>([]),[error,setError]=useState('');
 const reload=useCallback(async()=>{try{setRecords(await invoke<AccountSetup[]>('account_setups'));setError('');}catch(e){console.error('Pending accounts could not be read',e);setError('Could not load pending accounts. Try again.');throw e;}},[]);
 useEffect(()=>{void reload().catch(()=>{});},[reload]);
 const forget=async(id:string)=>{await invoke('account_setup_remove',{id});await reload();};
 return {records,error,reload,forget};
}
