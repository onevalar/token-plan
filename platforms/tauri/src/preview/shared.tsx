import {useState,type ReactNode} from 'react';
import {Select,type SelectProps} from '../components/arc/select/select';
import {Switch} from '../components/arc/switch/switch';
import type {Copy} from '../copy';
import type {Request,Send} from '../desktop';

export function Group({title,children,description}:{title:string;children:ReactNode;description?:string}) {
 return <section className="preference-group"><h2>{title}</h2><div className="preference-surface">{children}</div>{description&&<p className="group-description">{description}</p>}</section>;
}
export function SelectRow(props:SelectProps) {
 return <div className="setting-select"><Select {...props}/></div>;
}
export function ToggleRow({label,description,...props}:React.ComponentProps<typeof Switch>&{description?:string}) {
 return <div className="setting-toggle"><Switch {...props} label={label}/>{description&&<p>{description}</p>}</div>;
}
export function useChange(send:Send,t:Copy) {
 const [pending,setPending]=useState(false),[error,setError]=useState('');
 const change=async(request:Request)=>{setPending(true);setError('');try{await send(request);return true;}catch{setError(t.failed);return false;}finally{setPending(false);}};
 return {pending,change,notice:error?<p className="inline-error" role="alert">{error}</p>:null};
}
