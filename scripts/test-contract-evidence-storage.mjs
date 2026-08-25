import { createClient } from "@supabase/supabase-js";
import { createHmac, randomUUID } from "node:crypto";

const url=process.env.LOCAL_SUPABASE_URL;
const serviceKey=process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
const anonKey=process.env.LOCAL_SUPABASE_ANON_KEY;
const jwtSecret=process.env.LOCAL_SUPABASE_JWT_SECRET;
let localUrl;
try{localUrl=new URL(url);}catch{throw new Error("C8C1_STORAGE_LOCAL_CONFIGURATION_REQUIRED");}
if(localUrl.protocol!=="http:"||!["127.0.0.1","localhost"].includes(localUrl.hostname)||!localUrl.port||!serviceKey||!anonKey||!jwtSecret)throw new Error("C8C1_STORAGE_LOCAL_CONFIGURATION_REQUIRED");
const service=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const anon=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const encoded=value=>Buffer.from(JSON.stringify(value)).toString("base64url");
const header=encoded({alg:"HS256",typ:"JWT"});const payload=encoded({sub:randomUUID(),role:"authenticated",aud:"authenticated",exp:Math.floor(Date.now()/1000)+300});
const unsigned=`${header}.${payload}`;const authenticatedToken=`${unsigned}.${createHmac("sha256",jwtSecret).update(unsigned).digest("base64url")}`;
const authenticated=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${authenticatedToken}`}}});
const bucket=`c8c1-storage-cert-${randomUUID()}`;const path=`private/${randomUUID()}.pdf`;
const bytes=new TextEncoder().encode("%PDF-1.7\nC8C1 local storage certification\n%%EOF\n");
let created=false;
try{
  const bucketResult=await service.storage.createBucket(bucket,{public:false,fileSizeLimit:15728640,allowedMimeTypes:["application/pdf","image/jpeg","image/png"]});
  if(bucketResult.error)throw bucketResult.error;created=true;
  const upload=await service.storage.from(bucket).upload(path,bytes,{contentType:"application/pdf",upsert:false});if(upload.error)throw upload.error;
  const duplicate=await service.storage.from(bucket).upload(path,bytes,{contentType:"application/pdf",upsert:false});if(!duplicate.error)throw new Error("C8C1_STORAGE_OVERWRITE_ALLOWED");
  const publicResult=service.storage.from(bucket).getPublicUrl(path);const publicFetch=await fetch(publicResult.data.publicUrl,{headers:{apikey:anonKey}});if(publicFetch.ok)throw new Error("C8C1_STORAGE_PUBLIC_READ_ALLOWED");
  const anonDownload=await anon.storage.from(bucket).download(path);if(!anonDownload.error)throw new Error("C8C1_STORAGE_ANON_READ_ALLOWED");
  const authenticatedDownload=await authenticated.storage.from(bucket).download(path);if(!authenticatedDownload.error)throw new Error("C8C1_STORAGE_AUTHENTICATED_READ_ALLOWED");
  const downloaded=await service.storage.from(bucket).download(path);if(downloaded.error||!downloaded.data)throw downloaded.error??new Error("C8C1_STORAGE_DOWNLOAD_FAILED");
  const actual=new Uint8Array(await downloaded.data.arrayBuffer());if(Buffer.compare(Buffer.from(actual),Buffer.from(bytes))!==0)throw new Error("C8C1_STORAGE_BYTES_CHANGED");
  console.log("C8C1_STORAGE_REAL_OK");
}finally{
  if(created){await service.storage.emptyBucket(bucket);await service.storage.deleteBucket(bucket);}
}
