/* Still-image crops and original GIF staging; private upload receipts remain authoritative. */
(() => {
 'use strict';
 const active=new Set();
 async function encode(blob){const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let at=0;at<bytes.length;at+=32768)binary+=String.fromCharCode(...bytes.subarray(at,at+32768));return btoa(binary);}
 async function upload({request,blob,kind,clientId=crypto.randomUUID(),filename,conversationId,channelId,isCurrent=()=>true}){
  if(!isCurrent())throw Error('The account or conversation changed. Select the file again.');
  const base64=await encode(blob);if(!isCurrent())throw Error('The account or conversation changed. Select the file again.');
  const response=await request('/api/media/uploads',{kind,clientId,filename:filename||blob.name||kind+'.png',contentType:blob.type.split(';')[0],base64,...(conversationId?{conversationId}:{}),...(channelId?{channelId}:{})});
  if(!isCurrent())throw Error('The account or conversation changed during upload. The unclaimed file will expire.');
  if(!response.asset?.id||!/^\/api\/media\/[a-f0-9]{64}$/.test(response.asset.url))throw Error('The server did not acknowledge the uploaded file. Retry the upload.');return response.asset;
 }
 async function mountGif({container,bytes,kind,metadata,onApply,onCancel,onError,isCurrent}){
  let disposed=false,applying=false;const blob=new Blob([bytes],{type:'image/gif'}),frames=metadata.frames||1,duration=Number.isFinite(metadata.durationMs)?` · ${(metadata.durationMs/1000).toFixed(1)} s`:'';
  container.innerHTML=`<div class="vp-crop vp-gif-upload"><h3>${kind==='avatar'?'GIF avatar':'GIF banner'}</h3><div class="vp-gif-placeholder" aria-hidden="true">GIF</div><p>${metadata.width} × ${metadata.height} pixels · ${frames} ${frames===1?'frame':'frames'}${duration}</p><p>The original GIF keeps its animation. It is shown from the center to fit your ${kind}; GIFs are not cropped. Upload it, then save your profile.</p><div class="vp-actions"><button type="button" class="vh-secondary" data-gif-action="cancel">Cancel GIF</button><button type="button" class="vh-primary" data-gif-action="upload">Upload GIF</button></div><p class="vp-fine" data-gif-state role="status">A still preview is available after upload. GIF playback is optional.</p></div>`;
  const status=container.querySelector('[data-gif-state]');
  const dispose=()=>{if(disposed)return;disposed=true;active.delete(dispose);container.removeEventListener?.('click',click);container.replaceChildren();};
  const click=async event=>{const action=event.target.closest?.('[data-gif-action]')?.dataset.gifAction;if(!action||disposed||applying)return;if(action==='cancel'){dispose();onCancel?.();return;}if(action!=='upload')return;
   if(!isCurrent()){dispose();return;}applying=true;container.querySelectorAll('button').forEach(node=>node.disabled=true);status.textContent='Uploading original GIF…';
   try{await onApply(blob);dispose();}catch(error){if(!disposed){status.textContent=error.message||'The upload failed. Retry the same GIF.';onError?.(error);}}finally{applying=false;if(!disposed)container.querySelectorAll('button').forEach(node=>node.disabled=false);}
  };
  active.add(dispose);container.addEventListener('click',click);return{dispose};
 }
 async function mountCrop({container,file,kind,onApply,onCancel,onError,isCurrent=()=>true}){
  const helpers=window.VoidMediaValidation;if(!helpers)throw Error('Image tools could not load. Refresh and retry.');
  if(!['avatar','banner'].includes(kind))throw Error('Choose an avatar or banner.');
  const bytes=new Uint8Array(await file.arrayBuffer());const metadata=helpers.inspectImage(bytes,{allowGif:true});if(!isCurrent()||!container?.isConnected)return null;
  if(metadata.mime==='image/gif')return mountGif({container,bytes,kind,metadata,onApply,onCancel,onError,isCurrent});
  let source,url=null,disposed=false,applying=false,pointer=null;
  if(typeof createImageBitmap==='function')source=await createImageBitmap(new Blob([bytes],{type:file.type}));
  else{url=URL.createObjectURL(new Blob([bytes],{type:file.type}));source=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('This image could not be decoded.'));image.src=url;});}
  if(!isCurrent()||!container.isConnected){source.close?.();if(url)URL.revokeObjectURL(url);return null;}
  const ratio=kind==='avatar'?1:3,outputWidth=kind==='avatar'?512:1536,outputHeight=outputWidth/ratio,viewWidth=600,viewHeight=viewWidth/ratio;
  container.innerHTML=`<div class="vp-crop"><h3>Crop ${kind}</h3><p>Drag the image or use the controls. Arrow keys move it; + and − adjust zoom.</p><canvas class="vp-crop-canvas" width="${viewWidth}" height="${viewHeight}" tabindex="0" role="img" aria-label="${kind==='avatar'?'Square avatar':'Wide banner'} crop preview. Use arrow keys to move, plus and minus to zoom."></canvas><label>Zoom<input data-crop="zoom" type="range" min="1" max="4" step="0.01" value="1"></label><label>Horizontal position<input data-crop="x" type="range" min="-1" max="1" step="0.01" value="0"></label><label>Vertical position<input data-crop="y" type="range" min="-1" max="1" step="0.01" value="0"></label><div class="vp-actions"><button type="button" class="vh-secondary" data-crop-action="reset">Reset crop</button><button type="button" class="vh-secondary" data-crop-action="cancel">Cancel crop</button><button type="button" class="vh-primary" data-crop-action="apply">Upload crop</button></div><p class="vp-fine" data-crop-state role="status">${outputWidth} × ${outputHeight} pixels · PNG · original metadata removed</p></div>`;
  const canvas=container.querySelector('canvas'),context=canvas.getContext('2d',{alpha:false}),controls=Object.fromEntries([...container.querySelectorAll('[data-crop]')].map(node=>[node.dataset.crop,node])),status=container.querySelector('[data-crop-state]');let zoom=1,x=0,y=0;
  const draw=(target,width,height)=>{const scale=Math.max(width/source.width,height/source.height)*zoom,w=source.width*scale,h=source.height*scale;target.fillStyle='#151922';target.fillRect(0,0,width,height);target.drawImage(source,(width-w)/2+x*Math.max(0,w-width)/2,(height-h)/2+y*Math.max(0,h-height)/2,w,h);};
  const paint=()=>{if(disposed)return;zoom=Math.max(1,Math.min(4,zoom));x=Math.max(-1,Math.min(1,x));y=Math.max(-1,Math.min(1,y));for(const [key,value]of Object.entries({zoom,x,y}))controls[key].value=String(value);draw(context,viewWidth,viewHeight);};
  const dispose=()=>{if(disposed)return;disposed=true;active.delete(dispose);source.close?.();if(url)URL.revokeObjectURL(url);container.replaceChildren();};active.add(dispose);
  container.addEventListener('input',event=>{if(disposed||!event.target.dataset.crop||applying)return;const value=Number(event.target.value);if(event.target.dataset.crop==='zoom')zoom=value;else if(event.target.dataset.crop==='x')x=value;else y=value;paint();});
  canvas.addEventListener('keydown',event=>{if(applying)return;const step=event.shiftKey?.1:.035;if(event.key==='ArrowLeft')x-=step;else if(event.key==='ArrowRight')x+=step;else if(event.key==='ArrowUp')y-=step;else if(event.key==='ArrowDown')y+=step;else if(event.key==='+'||event.key==='=')zoom+=.1;else if(event.key==='-'||event.key==='_')zoom-=.1;else return;event.preventDefault();paint();});
  canvas.addEventListener('pointerdown',event=>{if(applying)return;pointer={id:event.pointerId,x:event.clientX,y:event.clientY,atX:x,atY:y};canvas.setPointerCapture?.(event.pointerId);});
  canvas.addEventListener('pointermove',event=>{if(!pointer||pointer.id!==event.pointerId||applying)return;const rect=canvas.getBoundingClientRect(),scale=Math.max(viewWidth/source.width,viewHeight/source.height)*zoom,extraX=Math.max(1,(source.width*scale-viewWidth)*rect.width/viewWidth),extraY=Math.max(1,(source.height*scale-viewHeight)*rect.height/viewHeight);x=pointer.atX+2*(event.clientX-pointer.x)/extraX;y=pointer.atY+2*(event.clientY-pointer.y)/extraY;paint();});
  const end=()=>{pointer=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  container.addEventListener('click',async event=>{const action=event.target.closest('[data-crop-action]')?.dataset.cropAction;if(!action||disposed||applying)return;if(action==='reset'){zoom=1;x=0;y=0;paint();return;}if(action==='cancel'){dispose();onCancel?.();return;}if(action!=='apply')return;
   applying=true;container.querySelectorAll('button,input').forEach(node=>node.disabled=true);status.textContent='Preparing and uploading your crop…';try{const output=document.createElement('canvas');output.width=outputWidth;output.height=outputHeight;draw(output.getContext('2d',{alpha:false}),outputWidth,outputHeight);const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));if(!blob)throw Error('This browser could not create the crop.');if(!isCurrent())throw Error('The account changed. Reopen the editor.');await onApply(blob);dispose();}catch(error){if(!disposed){status.textContent=error.message||'The upload failed. Your crop is still here; retry it.';onError?.(error);}}finally{applying=false;if(!disposed)container.querySelectorAll('button,input').forEach(node=>node.disabled=false);}
  });paint();return {dispose};
 }
 window.VoidProfileMedia=Object.freeze({mountCrop,upload,encode,disposeAll(){for(const dispose of [...active])dispose();}});
})();
