/* Browser-only API layer for ROTUL'S AI PRO. */
(function(){
  const api='https://openrouter.ai/api/v1';
  const headers=(key)=>({
    'Content-Type':'application/json',
    'Authorization':'Bearer '+key,
    'HTTP-Referer': location.href,
    'X-Title': "ROTUL'S AI PRO"
  });
  async function readJson(r){
    const text=await r.text();
    let j={}; try{j=JSON.parse(text)}catch{j={error:{message:text||'Respons tidak valid'}}}
    return {r,j};
  }
  async function chat({key,model,messages}){
    const r=await fetch(api+'/chat/completions',{method:'POST',headers:headers(key),body:JSON.stringify({model,messages})});
    const {r:rr,j}=await readJson(r);
    if(!rr.ok) throw new Error(j?.error?.message||'OpenRouter request gagal');
    return {ok:true,text:j?.choices?.[0]?.message?.content||''};
  }
  async function vision({key,model,prompt,dataUrl}){
    return chat({key,model,messages:[{role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:dataUrl}}]}]});
  }
  async function models(key){
    const r=await fetch(api+'/models',{headers:{Authorization:'Bearer '+key}}); const {r:rr,j}=await readJson(r);
    if(!rr.ok) return {ok:false,error:j?.error?.message||'Gagal memuat model'};
    return {ok:true,models:(j.data||[]).slice(0,200)};
  }
  function download(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);return {ok:true};}
  function escapeHtml(s){return String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));}
  async function transcribe(){
    return new Promise(resolve=>{
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!SR) return resolve({ok:false,error:'Speech Recognition tidak didukung browser ini.'});
      const r=new SR(); r.lang='id-ID'; r.interimResults=false; r.maxAlternatives=1;
      r.onresult=e=>resolve({ok:true,text:e.results[0][0].transcript});
      r.onerror=e=>resolve({ok:false,error:e.error||'Pengenalan suara gagal'});
      r.onend=()=>{}; r.start();
    });
  }
  async function makeDocx({content,title}){
    try{
      if(!window.docx) throw new Error('Library Word belum termuat.');
      const {Document,Packer,Paragraph,TextRun,HeadingLevel}=window.docx;
      const lines=String(content||'').split(/\r?\n/);
      const children=lines.map((line,i)=>i===0&&title?new Paragraph({heading:HeadingLevel.HEADING_1,children:[new TextRun(title)]}):new Paragraph({children:[new TextRun(line)]}));
      const doc=new Document({sections:[{children}]});
      const blob=await Packer.toBlob(doc); return download('ROTULS-AI-PRO.docx',blob);
    }catch(e){return {ok:false,error:e.message}}
  }
  async function makePdf({title,content}){
    try{
      const js=window.jspdf?.jsPDF; if(!js) throw new Error('Library PDF belum termuat.');
      const doc=new js({unit:'mm',format:'a4'}); const margin=15, width=180; let y=18;
      doc.setFontSize(16); doc.text(String(title||"ROTUL'S AI PRO").slice(0,90),margin,y); y+=10; doc.setFontSize(10);
      const lines=doc.splitTextToSize(String(content||''),width);
      for(const line of lines){if(y>280){doc.addPage();y=18}doc.text(line,margin,y);y+=5.2}
      doc.save('ROTULS-AI-PRO.pdf'); return {ok:true};
    }catch(e){return {ok:false,error:e.message}}
  }
  async function makeXlsx({rows}){
    try{if(!window.XLSX) throw new Error('Library Excel belum termuat.');const ws=XLSX.utils.aoa_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'ROTULS AI PRO');XLSX.writeFile(wb,'ROTULS-AI-PRO.xlsx');return {ok:true}}catch(e){return {ok:false,error:e.message}}
  }
  async function makePptx({slides}){
    try{if(!window.PptxGenJS) throw new Error('Library PowerPoint belum termuat.');const ppt=new PptxGenJS();ppt.layout='LAYOUT_WIDE';for(const s of slides){const slide=ppt.addSlide();slide.addText(String(s.title||"ROTUL'S AI PRO"),{x:.6,y:.5,w:12,h:.6,fontSize:24,bold:true,color:'FFFFFF'});slide.addText(String(s.body||''),{x:.7,y:1.4,w:11.8,h:5.2,fontSize:16,color:'D8E9FF',breakLine:false,fit:'shrink'});slide.background={color:'06122B'}}await ppt.writeFile({fileName:'ROTULS-AI-PRO.pptx'});return {ok:true}}catch(e){return {ok:false,error:e.message}}
  }
  async function generateImage({key,prompt}){
    return {ok:false,error:'Pembuatan gambar langsung bergantung pada model image-generation yang tersedia di akun/model OpenRouter. Gunakan Tanya AI untuk memilih model yang mendukung gambar.'};
  }
  async function generateSong(){return {ok:false,error:'Pembuatan lagu belum disediakan oleh endpoint OpenRouter chat standar.'}}
  async function generateVideo(){return {ok:false,error:'Pembuatan video belum disediakan oleh endpoint OpenRouter chat standar.'}}
  window.rotuls={chat,vision,models,transcribe,makeDocx,makePdf,makeXlsx,makePptx,generateImage,generateSong,generateVideo};
})();
