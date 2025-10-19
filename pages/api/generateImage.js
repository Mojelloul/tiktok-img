import { createRunware } from '@runware/ai-sdk-provider';
import { experimental_generateImage as generateImage } from 'ai';

export default async function handler(req, res){
  if(req.method !== 'POST'){
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { prompt, apiKey: apiKeyOverride, model: modelOverride } = req.body || {};
  if(!prompt || typeof prompt !== 'string'){
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }
  
  const apiKey = (typeof apiKeyOverride === 'string' && apiKeyOverride.trim()) || process.env.RUNWARE_API_KEY || 's9saT0cvacH0r2gAkMd3kfvkP3JMypRm';
  const runware = createRunware({ apiKey });
  const modelId = (typeof modelOverride === 'string' && modelOverride.trim()) || 'runware:101@1';

  try{
    const { image, images } = await generateImage({
      model: runware.image(modelId, { outputFormat: 'png' }),
      prompt,
      size: '768x1344' // 9:16 portrait
    });

    function toDataUriFromUint8(u8){
      try{ return 'data:image/png;base64,'+Buffer.from(u8).toString('base64'); } catch{ return null; }
    }

    const out = [];
    if(image){
      const url = image.url || null;
      const dataUri = image.base64 ? ('data:image/png;base64,'+image.base64) : (image.data ? toDataUriFromUint8(image.data) : null);
      out.push({ imageURL: url || undefined, imageDataURI: dataUri || undefined });
    }
    if(Array.isArray(images)){
      for(const img of images){
        const url = img?.url || null;
        const dataUri = img?.base64 ? ('data:image/png;base64,'+img.base64) : (img?.data ? toDataUriFromUint8(img.data) : null);
        out.push({ imageURL: url || undefined, imageDataURI: dataUri || undefined });
      }
    }
    res.status(200).json({ data: out.length ? out : [{}] });
  } catch(e){
    console.error('Runware SDK error:', e);
    const status = e?.status || 500;
    res.status(status).json({ error: 'Runware SDK error', details: e?.message || String(e) });
  }
}


