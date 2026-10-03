const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let key=localStorage.getItem('rotuls_openrouter_key')||'';
if($('#key')) $('#key').value=key;
let history=JSON.parse(localStorage.getItem('rotuls_history')||'[]');
let lastAnswer='', lastQuestion='', attached=null, recording=null, chunks=[];
const DEFAULT_MODEL='google/gemma-4-26b-a4b-it:free';
const pages={home:{title:'Halo! 👋',sub:'Ada yang bisa saya bantu hari ini?',eyebrow:'AI ASSISTANT SERBA BISA'},chat:{title:'Tanya AI',sub:'Tulis pertanyaan atau kirim gambar untuk mulai.',eyebrow:"ROTUL'S AI PRO"},history:{title:'Riwayat',sub:'Lihat percakapan yang sudah dibuat.',eyebrow:'RIWAYAT'},settings:{title:'Pengaturan',sub:'Atur koneksi AI dan model.',eyebrow:'PENGATURAN'}};
function show(page){$$('.page').forEach(x=>x.classList.toggle('show',x.id===page));$$('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===page));const p=pages[page]||pages.home;$('#pageTitle').textContent=p.title;$('#pageSub').textContent=p.sub;$('#eyebrow').textContent=p.eyebrow;window.scrollTo(0,0)}
$$('[data-page]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.page)));
$('#allFeatures').onclick=()=>{$('.feature-grid').classList.toggle('show-extra');$('#allFeatures').textContent=$('.feature-grid').classList.contains('show-extra')?'Sembunyikan fitur tambahan ↑':'Lihat semua fitur AI →'};
$('#newChat')?.addEventListener('click',()=>show('chat'));
function addMsg(role,text){const body=$('#messages');if(body.querySelector('.empty-answer'))body.innerHTML='';const row=document.createElement('div');row.className='msg';row.innerHTML=`<div class="avatar">${role==='user'?'YOU':'✦'}</div><div class="bubble"></div>`;row.querySelector('.bubble').textContent=text;body.appendChild(row);body.scrollTop=body.scrollHeight;return row.querySelector('.bubble')}
function setPreview(name){$('#filePreview').textContent=name||'Belum ada gambar';}
function readDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
async function handleFile(file){if(!file)return; attached={file,name:file.name,mime:file.type||'application/octet-stream',dataUrl:await readDataURL(file)};setPreview('File: '+file.name);}
function openFile(){ $('#fileInput').click() }
function openCamera(){ $('#cameraInput').click() }
$('#attach').onclick=openFile;$('#imageFeature').onclick=openFile;$('#uploadFeature').onclick=openFile;$('#heroImage').onclick=openFile;$('#cameraBtn').onclick=openCamera;$('#cameraFeature').onclick=openCamera;
$('#fileInput').onchange=e=>handleFile(e.target.files?.[0]);$('#cameraInput').onchange=e=>handleFile(e.target.files?.[0]);

async function send(){
 const input=$('#input'), text=input.value.trim(); if(!text&&!attached)return;
 if(!key){show('settings');$('#settingsStatus').textContent='Masukkan OpenRouter API Key dulu.';return}
 const file=attached; input.value='';
 addMsg('user',(text||'')+(file?'\n['+file.name+']':''));
 const b=addMsg('ai','Sedang memproses…');
 let r;
 try{
   if(file && file.mime.startsWith('image/')){
     r=await window.rotuls.vision({key,model:$('#model').value||DEFAULT_MODEL,prompt:text||'Jelaskan dan analisis gambar ini secara detail dalam bahasa Indonesia.',dataUrl:file.dataUrl});
   } else if(file && file.mime==='application/pdf'){
     // OpenRouter accepts PDFs as file content on chat-capable models.
     r=await window.rotuls.chat({key,model:$('#model').value||DEFAULT_MODEL,messages:[{role:'user',content:[{type:'text',text:text||'Analisis PDF ini dan jelaskan isinya dalam bahasa Indonesia.'},{type:'file',file:{filename:file.name,file_data:file.dataUrl}}]}]});
   } else if(file){
     const raw=atob(file.dataUrl.split(',')[1]||'');
     let preview=raw.slice(0,120000);
     if(file.mime==='application/json'){try{preview=JSON.stringify(JSON.parse(preview),null,2)}catch{}}
     r=await window.rotuls.chat({key,model:$('#model').value||DEFAULT_MODEL,messages:[{role:'user',content:(text||'Analisis file berikut.')+'\n\nFILE '+file.name+'\n'+preview}]});
   } else {
     const msgs=[...$('#messages').querySelectorAll('.msg')].slice(-12).map(x=>({role:x.querySelector('.avatar').textContent.trim()==='YOU'?'user':'assistant',content:x.querySelector('.bubble').textContent}));
     r=await window.rotuls.chat({key,model:$('#model').value||DEFAULT_MODEL,messages:msgs});
   }
 }catch(e){r={ok:false,error:e.message}}
 b.textContent=r.ok?r.text:'Error: '+r.error;
 if(r.ok){lastQuestion=text||file?.name||'';lastAnswer=r.text||'';history.unshift({q:lastQuestion,a:lastAnswer,time:new Date().toLocaleString('id-ID')});history=history.slice(0,50);localStorage.setItem('rotuls_history',JSON.stringify(history));renderHistory()}
 attached=null;setPreview();$('#fileInput').value='';$('#cameraInput').value='';
}
$('#send').onclick=send;$('#input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});

async function recordVoice(){
 if(!key){show('settings');$('#settingsStatus').textContent='Masukkan OpenRouter API Key dulu.';return}
 if(recording){recording.stop();return}
 if(!navigator.mediaDevices?.getUserMedia){alert('Mikrofon tidak tersedia di perangkat ini.');return}
 try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});
   recording=new MediaRecorder(stream);chunks=[];
   recording.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   recording.onstop=async()=>{
     stream.getTracks().forEach(t=>t.stop()); recording=null; $('#mic').textContent='◉ Rekam';
     const blob=new Blob(chunks,{type:'audio/webm'}); const data=await readDataURL(blob); const base64=data.split(',')[1];
     $('#input').placeholder='Mentranskripsi suara…'; const r=await window.rotuls.transcribe({key,base64,format:'webm'}); $('#input').placeholder='Ketik pertanyaanmu di sini...\n\nContoh: Jelaskan fotosintesis dengan bahasa sederhana.';
     if(r.ok){$('#input').value+=($('#input').value?' ':'')+r.text;$('#input').focus()} else alert('Transkripsi gagal: '+r.error);
   };
   recording.start(); $('#mic').textContent='■ Berhenti';
 }catch(e){alert('Mikrofon tidak bisa digunakan: '+e.message)}
}
$('#mic').onclick=recordVoice;$('#voiceFeature').onclick=recordVoice;

function syncModelLabel(){const t=$('#model').selectedOptions?.[0]?.textContent||'OpenRouter model';$('#modelPill').textContent='✦ '+t;$('#chatModelPill').textContent='✦ '+t}
$('#model').onchange=syncModelLabel;
$('#saveKey').onclick=()=>{key=$('#key').value.trim();localStorage.setItem('rotuls_openrouter_key',key);$('#settingsStatus').textContent=key?'API key tersimpan di perangkat ini.':'API key kosong.'};
$('#loadModels').onclick=async()=>{if(!key){$('#settingsStatus').textContent='Isi API key terlebih dahulu.';return}$('#settingsStatus').textContent='Memuat model…';const r=await window.rotuls.models(key);if(!r.ok){$('#settingsStatus').textContent=r.error;return}$('#model').innerHTML=r.models.map(x=>`<option value="${x.id}">${x.name||x.id}</option>`).join('');syncModelLabel();$('#settingsStatus').textContent=`${r.models.length} model dimuat.`};

function renderHistory(){const el=$('#historyList');if(!history.length){el.innerHTML='<div class="empty-box">Belum ada riwayat.</div>';return}el.innerHTML=history.map((x,i)=>`<div class="history-item" data-i="${i}"><b>${escapeHtml(x.q||'File / gambar')}</b><div style="color:#5f82a5;font-size:9px;margin-top:5px">${x.time}</div><div style="color:#8fb0d1;font-size:11px;margin-top:6px">${escapeHtml((x.a||'').slice(0,180))}${(x.a||'').length>180?'…':''}</div></div>`).join('');$$('.history-item').forEach(el=>el.onclick=()=>{const x=history[Number(el.dataset.i)];show('chat');$('#messages').innerHTML='';addMsg('user',x.q);addMsg('ai',x.a);lastQuestion=x.q;lastAnswer=x.a})}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
renderHistory(); syncModelLabel();

async function exportDoc(type){if(!lastAnswer){alert('Belum ada hasil AI untuk diekspor. Tanya AI dulu.');return}let r;if(type==='doc')r=await window.rotuls.makeDocx({content:lastAnswer});if(type==='pdf')r=await window.rotuls.makePdf({title:lastQuestion||"ROTUL'S AI PRO",content:lastAnswer});if(type==='excel')r=await window.rotuls.makeXlsx({rows:[['Pertanyaan',lastQuestion],['Jawaban',lastAnswer]]});if(type==='ppt'){r=await window.rotuls.makePptx({slides:[{title:lastQuestion||"ROTUL'S AI PRO",body:lastAnswer}]})}if(!r?.ok&&!r?.canceled)alert('Ekspor gagal: '+(r?.error||'Unknown error'))}

async function featureAction(a){
 modal.classList.remove('show');
 if(a==='chat'){show('chat');return}
 if(a==='voice'){show('chat');recordVoice();return}
 if(a==='camera'){show('chat');openFile();return}
 if(a==='upload'){show('chat');openFile();return}
 if(a==='doc'){await exportDoc('doc');return}
 if(a==='pdf'){await exportDoc('pdf');return}
 if(a==='excel'){await exportDoc('excel');return}
 if(a==='ppt'){await exportDoc('ppt');return}
 if(!key){show('settings');$('#settingsStatus').textContent='Masukkan OpenRouter API Key dulu.';return}
 if(a==='image'){
   const prompt=window.prompt('Tulis prompt gambar yang ingin dibuat:','Robot futuristik biru-ungu, cinematic, high detail');if(!prompt)return;
   $('#settingsStatus').textContent='Menghasilkan gambar…';const r=await window.rotuls.generateImage({key,prompt});alert(r.ok?'Gambar berhasil disimpan ke '+r.path:'Gagal: '+r.error);return;
 }
 if(a==='song'){
   const prompt=window.prompt('Deskripsikan lagu yang ingin dibuat:','Lagu pop elektronik ceria tentang masa depan dan teknologi, dengan vokal dan chorus');if(!prompt)return;
   const r=await window.rotuls.generateSong({key,prompt});alert(r.ok?'Lagu berhasil disimpan ke '+r.path:'Gagal: '+r.error);return;
 }
 if(a==='video'){
   const prompt=window.prompt('Deskripsikan video yang ingin dibuat:','Robot AI futuristik berjalan di kota neon biru pada malam hari');if(!prompt)return;
   const r=await window.rotuls.generateVideo({key,prompt});alert(r.ok?'Video berhasil disimpan ke '+r.path:'Gagal: '+r.error);return;
 }
}

const modal=$('#featureModal');$('#closeModal').onclick=()=>modal.classList.remove('show');modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
$$('.modal-grid button').forEach(b=>b.onclick=()=>featureAction(b.dataset.action));
$('#fileFeature').onclick=()=>modal.classList.add('show');$('#pdfFeature').onclick=()=>{modal.classList.add('show')};$('#makeImageFeature').onclick=()=>featureAction('image');$('#makeSongFeature').onclick=()=>featureAction('song');
// Add video capability to the existing feature modal without changing the main UI.
const grid=$('.modal-grid'); if(grid && !grid.querySelector('[data-action="video"]')){const b=document.createElement('button');b.dataset.action='video';b.innerHTML='▣ Video<small>Text to video</small>';grid.appendChild(b);b.onclick=()=>featureAction('video')}
