import {signedInStorageKey} from '@/lib/server-bridge';
export const dynamic='force-dynamic';
export async function GET(){
  const key=await signedInStorageKey();
  return Response.json({storageKey:key?`pp-device-${key}`:null},{headers:{'Cache-Control':'no-store','Vary':'Cookie'}});
}
