import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'savedJSON';

export default function HomePage(){
  const [jsonText, setJsonText] = useState('');
  const [parsed, setParsed] = useState(null); // { titre, chapitres[], hashtags }
  const [prompts, setPrompts] = useState([]); // [{id, prompt, texte, copied}]
  const [originalPrompts, setOriginalPrompts] = useState([]);
  const [outputText, setOutputText] = useState('');
  const [titleAndHashtags, setTitleAndHashtags] = useState('');
  const [singlePrompt, setSinglePrompt] = useState('');
  const [status, setStatus] = useState('inactif');
  const [promptImages, setPromptImages] = useState({}); // { [id]: { url, dataURI } }
  const [busy, setBusy] = useState(false); // block multiple generations at once
  const [generatingFor, setGeneratingFor] = useState(null); // key of the prompt currently generating
  const [apiKey, setApiKey] = useState('');
  const [modelId, setModelId] = useState('runware:101@1');
  const [customModel, setCustomModel] = useState('');
  const remaining = useMemo(()=>prompts.filter(p=>!p.copied).length, [prompts]);

  // Restore from localStorage
  useEffect(()=>{
    if(typeof window === 'undefined') return;
    try{
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if(stored){
        const obj = JSON.parse(stored);
        setParsed(obj);
        const list = Array.isArray(obj.chapitres) ? obj.chapitres
          .map(c=>({ id:c.id, prompt:c.prompt||'', texte:c.texte||'', copied: !!c.copied }))
          .filter(p=>p.prompt) : [];
        setPrompts(list);
        setOriginalPrompts(list);
        setJsonText(JSON.stringify(obj, null, 2));
      }
      // Restore generated images
      const imagesStored = window.localStorage.getItem('promptImages');
      if(imagesStored){
        try{
          const images = JSON.parse(imagesStored);
          if(images && Object.keys(images).length > 0){
            setPromptImages(images);
            console.log('Images restaurées:', Object.keys(images).length);
          }
        } catch(e){
          console.error('Erreur restauration images:', e);
        }
      }
    } catch {}
  },[]);

  // Save into localStorage whenever parsed changes or when prompts copy state changes
  useEffect(()=>{
    if(typeof window === 'undefined') return;
    if(!parsed) return;
    try{
      const clone = JSON.parse(JSON.stringify(parsed));
      if(Array.isArray(clone.chapitres)){
        clone.chapitres.forEach(c=>{
          const m = prompts.find(p=>p.id===c.id);
          if(m) c.copied = !!m.copied;
        });
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clone));
    } catch {}
  },[parsed, prompts]);

  // Save images to localStorage whenever promptImages changes
  useEffect(()=>{
    if(typeof window === 'undefined') return;
    try{
      // Only save if there are images to save
      if(Object.keys(promptImages).length > 0){
        window.localStorage.setItem('promptImages', JSON.stringify(promptImages));
        console.log('Images sauvegardées:', Object.keys(promptImages).length);
      }
    } catch(e){
      console.error('Erreur sauvegarde images:', e);
    }
  },[promptImages]);

  function handleParse(){
    let obj;
    try{ obj = JSON.parse(jsonText); } catch(e){ alert('JSON invalide: '+e.message); return; }
    if(!Array.isArray(obj.chapitres)) { alert('JSON: champ "chapitres" manquant ou non-array.'); return; }
    const stored = typeof window!=='undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    let prev = null;
    try{ prev = stored ? JSON.parse(stored) : null; } catch {}
    const list = obj.chapitres.map(c=>{
      let copied = false;
      if(prev && Array.isArray(prev.chapitres)){
        const old = prev.chapitres.find(s=>s.id===c.id);
        if(old && old.copied) copied = true;
      }
      return { id:c.id, prompt:c.prompt||'', texte:c.texte||'', copied };
    }).filter(p=>p.prompt);
    setParsed(obj);
    setPrompts(list);
    setOriginalPrompts(list);
    alert('JSON chargé: '+obj.chapitres.length+' chapitres.');
  }

  function handleGenerateText(){
    if(!parsed){ alert('Chargez/parsez le JSON avant.'); return; }
    
    // Texte concaténé (seulement les chapitres)
    const textParts = [];
    if(Array.isArray(parsed.chapitres)){
      parsed.chapitres.forEach(ch=>{ if(ch.texte) textParts.push(ch.texte); });
    }
    setOutputText(textParts.join('\n\n'));
    
    // Titre + hashtags séparés
    const titleParts = [];
    if(parsed.titre) titleParts.push(parsed.titre);
    if(parsed.hashtags){
      const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.join(' ') : parsed.hashtags;
      titleParts.push(hashtags);
    }
    setTitleAndHashtags(titleParts.join('\n'));
  }

  async function handleCopyAll(){
    if(!outputText){ alert('Aucun texte à copier.'); return; }
    try{
      await navigator.clipboard.writeText(outputText);
      alert('Texte copié.');
    } catch{
      // fallback
      const ta = document.createElement('textarea');
      ta.value = outputText; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      alert('Texte copié (fallback).');
    }
  }

  async function handleCopyTitleAndHashtags(){
    if(!titleAndHashtags){ alert('Aucun titre/hashtags à copier.'); return; }
    try{
      await navigator.clipboard.writeText(titleAndHashtags);
      alert('Titre + hashtags copiés.');
    } catch{
      // fallback
      const ta = document.createElement('textarea');
      ta.value = titleAndHashtags; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      alert('Titre + hashtags copiés (fallback).');
    }
  }

  function handleResetPrompts(){
    setPrompts(JSON.parse(JSON.stringify(originalPrompts)));
  }

  function handleResetCopiedState(){
    setPrompts(old => old.map(p => ({ ...p, copied: false })));
  }

  function handleForceSaveImages(){
    if(typeof window === 'undefined') return;
    try{
      window.localStorage.setItem('promptImages', JSON.stringify(promptImages));
      alert(`Images sauvegardées: ${Object.keys(promptImages).length}`);
    } catch(e){
      alert('Erreur sauvegarde: ' + e.message);
    }
  }

  function handleClearStorage(){
    if(typeof window==='undefined') return;
    if(!confirm('Supprimer la mémoire JSON ?')) return;
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem('promptImages');
    setParsed(null); setPrompts([]); setOriginalPrompts([]);
    setJsonText(''); setOutputText(''); setTitleAndHashtags(''); setSinglePrompt('');
    setPromptImages({});
  }

  function toggleCopied(idx){
    setPrompts(old=>{
      const copy = old.slice();
      const item = { ...copy[idx], copied: true };
      copy[idx] = item;
      return copy;
    });
  }

  async function handleCopyPrompt(idx){
    const p = prompts[idx];
    try{ await navigator.clipboard.writeText(p.prompt); }
    catch{
      const ta=document.createElement('textarea'); ta.value=p.prompt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    // Show text in red after copying, but keep button active for multiple copies
    toggleCopied(idx);
  }

  async function handleGenerateImage(){
    const prompt = singlePrompt.trim();
    if(!prompt){ alert('Colle une prompt.'); return; }
    if(busy){ alert('Attendez la fin de la génération en cours.'); return; }
    setStatus('génération en cours...');
    try{
      const res = await fetch('/api/generateImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if(!res.ok){
        const t = await res.text().catch(()=>null);
        setStatus('Erreur API');
        alert('Erreur API: '+res.status+'\n'+(t||''));
        return;
      }
      const data = await res.json();
      // Debug log: see raw data from API
      try { console.log('API /generateImage data:', data); } catch {}
      // Expect an array or object with URL/base64
      let imageUrl = null;
      if(data && data.data && Array.isArray(data.data) && data.data[0]){
        // try common fields
        if(data.data[0].imageURL) imageUrl = data.data[0].imageURL;
        if(!imageUrl && data.data[0].imageDataURI) imageUrl = data.data[0].imageDataURI;
        if(!imageUrl && data.data[0].imageBase64Data) imageUrl = 'data:image/png;base64,'+data.data[0].imageBase64Data;
      }
      if(!imageUrl && Array.isArray(data) && data[0]){
        if(data[0].imageURL) imageUrl = data[0].imageURL;
        if(!imageUrl && data[0].imageDataURI) imageUrl = data[0].imageDataURI;
        if(!imageUrl && data[0].imageBase64Data) imageUrl = 'data:image/png;base64,'+data[0].imageBase64Data;
      }
      if(!imageUrl){
        setStatus('Pas d\'image reçue');
        try { console.error('Réponse sans image', data); } catch {}
        // Show raw JSON on page for quick debug
        const container = document.getElementById('imagesContainer');
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.style.fontSize = '12px';
        pre.style.background = '#f3f4f6';
        pre.style.padding = '8px';
        pre.style.borderRadius = '8px';
        pre.textContent = 'Réponse brute (aucune image détectée)\n' + JSON.stringify(data, null, 2);
        container.prepend(pre);
        return;
      }
      // show image
      const container = document.getElementById('imagesContainer');
      const wrap = document.createElement('div');
      const img = document.createElement('img');
      img.src = imageUrl; img.style.maxWidth='100%'; img.style.borderRadius='8px';
      wrap.appendChild(img);
      const cap = document.createElement('div'); cap.textContent = 'prompt: '+prompt; cap.style.color='#6b7280'; cap.style.marginTop='6px'; wrap.appendChild(cap);
      const btn = document.createElement('button'); btn.textContent='Télécharger'; btn.className='small-btn'; btn.style.marginTop='6px';
      btn.onclick = ()=>{ const a=document.createElement('a'); a.href=imageUrl; a.download='runware_image.png'; document.body.appendChild(a); a.click(); a.remove(); };
      wrap.appendChild(btn);
      container.prepend(wrap);
      setStatus('image générée');
    } catch(e){
      console.error(e);
      setStatus('Erreur réseau');
      alert('Erreur réseau. Voir console.');
    }
  }

  // Generate image and render it under a specific prompt row
  async function handleGenerateForPrompt(idx){
    const item = prompts[idx];
    if(!item || !item.prompt){ alert('Prompt invalide.'); return; }
    if(busy){ alert('Attendez la fin de la génération en cours.'); return; }
    try{
      const key = item.id ?? idx;
      setBusy(true);
      setGeneratingFor(key);
      const res = await fetch('/api/generateImage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: item.prompt, apiKey, model: modelId === 'custom' ? customModel : modelId })
      });
      if(!res.ok){
        const t = await res.text().catch(()=>null);
        alert('Erreur API: '+res.status+'\n'+(t||''));
        return;
      }
      const data = await res.json();
      let imageUrl = null;
      if(data && data.data && Array.isArray(data.data) && data.data[0]){
        if(data.data[0].imageURL) imageUrl = data.data[0].imageURL;
        if(!imageUrl && data.data[0].imageDataURI) imageUrl = data.data[0].imageDataURI;
      }
      if(!imageUrl && Array.isArray(data) && data[0]){
        if(data[0].imageURL) imageUrl = data[0].imageURL;
        if(!imageUrl && data[0].imageDataURI) imageUrl = data[0].imageDataURI;
      }
      if(!imageUrl){
        // show raw for this prompt row (in-place)
        console.error('Réponse sans image', data);
        alert('Aucune image trouvée pour cette prompt.');
        return;
      }
      setPromptImages(prev=>{
        const updated = { ...prev, [key]: { url: imageUrl } };
        console.log('Image ajoutée pour prompt', key, 'Total images:', Object.keys(updated).length);
        return updated;
      });
    } catch(e){
      console.error(e);
      alert('Erreur réseau. Voir console.');
    } finally {
      setBusy(false);
      setGeneratingFor(null);
    }
  }

  return (
    <div style={{fontFamily:'Inter,system-ui,Arial', margin:'4px', background:'#f7f8fb', color:'#111', maxWidth:980, marginLeft:'auto', marginRight:'auto', padding:'8px'}}>
      <h2 style={{fontSize:'18px', marginBottom:'16px', textAlign:'center'}}>Concaténateur JSON — Texte & Prompts + Runware Image</h2>
      <div style={{display:'flex', flexDirection:'column', gap:8}}>
        <div className="cols" style={{display:'flex', flexDirection:'column', gap:8}}>
          {/* Left panel */}
          <div className="card" style={{flex:1, background:'#fff', borderRadius:10, padding:12, boxShadow:'0 6px 18px rgba(20,20,40,0.06)'}}>
            <div className="col" style={{display:'flex', flexDirection:'column', gap:8}}>
              {/* Runtime credentials */}
              <div className="row" style={{display:'flex', flexDirection:'column', gap:8}}>
                <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="API Key Runware" style={{width:'100%', padding:10, borderRadius:8, border:'1px solid #e3e6ee', fontSize:14}} />
                <div style={{display:'flex', gap:4, flexDirection:'column'}}>
                  <select value={modelId} onChange={e=>setModelId(e.target.value)} style={{width:'100%', padding:10, borderRadius:8, border:'1px solid #e3e6ee', fontSize:14}}>
                    <option value="runware:101@1">runware:101@1</option>
                    <option value="rundiffusion:133005@920957">rundiffusion:133005@920957</option>
                    <option value="custom">Autre...</option>
                  </select>
                  {modelId === 'custom' && (
                    <input type="text" value={customModel} onChange={e=>setCustomModel(e.target.value)} placeholder="Modèle personnalisé" style={{width:'100%', padding:10, borderRadius:8, border:'1px solid #e3e6ee', fontSize:14}} />
                  )}
                </div>
              </div>
              <label className="small" style={{fontSize:13, color:'#374151'}}>Coller JSON (titre, chapitres[id, texte, prompt], hashtags)</label>
              <textarea id="jsonInput" value={jsonText} onChange={e=>setJsonText(e.target.value)} placeholder='Collez votre JSON ici...' style={{width:'100%', minHeight:80, padding:8, fontSize:14, border:'1px solid #e3e6ee', borderRadius:8, resize:'vertical'}} />

              <div className="row" style={{display:'flex', flexDirection:'column', gap:6}}>
                <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                  <button onClick={handleParse} style={btn()}>Charger JSON</button>
                  <button onClick={handleGenerateText} style={btn()}>Générer texte</button>
                </div>
                <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                  <button onClick={handleCopyAll} style={btn()}>Copier texte</button>
                  <button onClick={handleCopyTitleAndHashtags} style={btn('#10b981')}>Copier titre+tags</button>
                </div>
                <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                  <button onClick={handleResetPrompts} style={btn('#6b7280')}>Reset prompts</button>
                  <button onClick={handleResetCopiedState} style={btn('#059669')}>Réactiver copie</button>
                </div>
                <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                  <button onClick={handleForceSaveImages} style={btn('#7c3aed')}>Sauver images</button>
                  <button onClick={handleClearStorage} style={btn('#e11d48')}>Suppr. tout</button>
                </div>
              </div>

              <label className="small" style={{fontSize:13, color:'#374151'}}>Titre + Hashtags</label>
              <textarea value={titleAndHashtags} onChange={e=>setTitleAndHashtags(e.target.value)} placeholder="Titre et hashtags apparaîtront ici..." style={{width:'100%', minHeight:60, padding:8, fontSize:14, border:'1px solid #e3e6ee', borderRadius:8, resize:'vertical'}} />

              <label className="small" style={{fontSize:13, color:'#374151'}}>Texte concaténé</label>
              <textarea id="outputText" value={outputText} onChange={e=>setOutputText(e.target.value)} placeholder="Le texte concaténé apparaîtra ici..." style={{width:'100%', minHeight:80, padding:8, fontSize:14, border:'1px solid #e3e6ee', borderRadius:8, resize:'vertical'}} />

              <hr />

              <label className="small" style={{fontSize:13, color:'#374151'}}>Liste des prompts</label>
              <div id="promptsList" aria-live="polite">
                {prompts.length===0 && (
                  <div className="muted" style={{color:'#6b7280', fontSize:13}}>Aucun prompt restant.</div>
                )}
                {prompts.map((p, idx)=>{
                  const copied = !!p.copied;
                  const key = p.id ?? idx;
                  return (
                    <div key={key} className="prompt-row" style={{display:'flex', flexDirection:'column', gap:6, marginBottom:12, padding:8, background:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0'}}>
                      <div style={{display:'flex', flexDirection:'column', gap:6}}>
                        <div className={`prompt-box ${copied? 'copied copied-text':''}`} style={{width:'100%', padding:8, borderRadius:8, border:'1px solid #e6e9f2', background:'#fbfcff', fontSize:13, wordBreak:'break-word', textDecoration: copied ? 'line-through' : 'none', color: copied ? 'red' : '#111', minHeight:'40px'}}>
                          {copied ? (p.texte || '') : (p.prompt || '')}
                        </div>
                        <div style={{display:'flex', gap:6, justifyContent:'space-between'}}>
                          <button className="small-btn" onClick={()=>handleCopyPrompt(idx)} style={{flex:1, padding:'8px 12px', borderRadius:6, border:0, background:'#111827', color:'#fff', fontSize:12}}>Copier</button>
                          <button className="small-btn" disabled={busy} onClick={()=>handleGenerateForPrompt(idx)} style={{flex:1, padding:'8px 12px', borderRadius:6, border:0, background: busy ? '#94a3b8' : '#2563eb', color:'#fff', fontSize:12, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.8 : 1}}>Générer</button>
                        </div>
                      </div>
                      {generatingFor === key && (
                        <div className="muted" style={{color:'#6b7280', fontSize:12, textAlign:'center', padding:'4px'}}>Génération en cours...</div>
                      )}
                      {(promptImages[key]?.url) && (
                        <div style={{marginTop:8}}>
                          <img src={promptImages[key].url} alt="generated" style={{width:'100%', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="muted" style={{color:'#6b7280', fontSize:13}}>Prompts copiées → barrées + texte affiché en rouge</div>
              <div className="muted" style={{color:'#6b7280', fontSize:13}}>Prompts restantes: <span id="remainingCount">{remaining}</span></div>
            </div>
          </div>

          {/* Right panel removed per user request */}
        </div>
      </div>

      <style jsx>{`
        @media(min-width:820px){
          .cols{ flex-direction: row; }
        }
        .copied{}
        .copied-text{}
      `}</style>
    </div>
  );
}

function btn(bg = '#0b5fff'){
  return { cursor:'pointer', padding:'8px 12px', borderRadius:8, border:0, background:bg, color:'#fff', fontSize:'13px', fontWeight:'500' };
}


