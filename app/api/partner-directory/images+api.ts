import { z } from 'zod';
import { assertRateLimit,assertGlobalRateLimit } from '@/lib/rate-limit';
import { HttpError,jsonError } from '@/lib/server';
import { getSql } from '@/lib/sql';
import { getDirectoryByToken } from '@/lib/partner-directory';
import { moderateImage,uploadToCloudinary } from '@/app/api/uploads/image+api';

export async function POST(request:Request) {
  try{
    await assertRateLimit(request,'directory-media',5,3600);
    await assertGlobalRateLimit('directory-media-global',80,3600);
    const form=await request.formData();
    const token=z.string().parse(form.get('token'));
    const field=form.get('slot');
    if(field!=='logo'&&field!=='photo')throw new HttpError(400,'Invalid image slot');
    const item=await getDirectoryByToken(token);
    if(item.status!=='awaiting_verification')throw new HttpError(403,'Changes require BuildPair approval. Contact info@buildpair.co.uk.');
    if(field==='photo'&&item.imageUrls.length>=3)throw new HttpError(400,'Maximum of three gallery photos.');
    const image=form.get('file');
    if(!(image instanceof File))throw new HttpError(400,'Choose a JPG, PNG or WebP image.');
    if(!['image/jpeg','image/png','image/webp'].includes(image.type) || image.size<=0 || image.size>5*1024*1024)
      throw new HttpError(400,'JPG, PNG or WebP only, maximum 5 MB.');
    const bytes=Buffer.from(await image.arrayBuffer());
    // Image is checked before any external storage or public listing.
    await moderateImage({bytes,mimeType:image.type,kind:'partner'});
    const upload=await uploadToCloudinary({bytes,mimeType:image.type,kind:'partner'});
    const sql=getSql();
    if(field==='logo'){
      await sql`UPDATE buildpair_partner_directory SET logo_url=${upload.url},updated_at=now()
      WHERE id=${item.id}::uuid AND status='awaiting_verification'`;
    }else{
      await sql`UPDATE buildpair_partner_directory SET image_urls=array_append(image_urls,${upload.url}),
      updated_at=now() WHERE id=${item.id}::uuid AND status='awaiting_verification'
      AND cardinality(image_urls)<3`;
    }
    return Response.json({url:upload.url},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return jsonError(e);}
}
