/* Still-image crops and original GIF staging; private upload receipts remain authoritative. */
(() => {
 'use strict';
 const active=new Set(),selections=new WeakMap();let imageToolsPromise=null;
 function imageTools(){
  const ready=()=>window.VoidProfileImageTools?.inspectProfileImage?window.VoidProfileImageTools:window.VoidMediaValidation?.inspectProfileImage?window.VoidMediaValidation:null;
  if(ready())return Promise.resolve(ready());
  if(imageToolsPromise)return imageToolsPromise;
  imageToolsPromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');let settled=false,timer;
   const finish=error=>{if(settled)return;settled=true;if(timer!==undefined)clearTimeout(timer);script.onload=script.onerror=null;if(error){script.remove?.();reject(error);}else resolve(ready());};
   script.src='/pkg/profile-images/tools.js';script.async=true;
   script.onload=()=>finish(ready()?null:Error('Image format tools could not start. Refresh and try again.'));
   script.onerror=()=>finish(Error('Image format tools could not load. Check your connection and try again.'));
   timer=setTimeout(()=>finish(Error('Image format tools took too long to load. Check your connection and try again.')),15000);
   try{(document.head||document.documentElement).appendChild(script);}catch{finish(Error('Image format tools could not load. Refresh and try again.'));}
  }).catch(error=>{imageToolsPromise=null;throw error;});
  return imageToolsPromise;
 }
 async function encode(blob){const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let at=0;at<bytes.length;at+=32768)binary+=String.fromCharCode(...bytes.subarray(at,at+32768));return btoa(binary);}
 async function upload({request,blob,kind,clientId=crypto.randomUUID(),filename,conversationId,channelId,isCurrent=()=>true}){
  if(!isCurrent())throw Error('The account or conversation changed. Select the file again.');
  const base64=await encode(blob);if(!isCurrent())throw Error('The account or conversation changed. Select the file again.');
  const response=await request('/api/media/uploads',{kind,clientId,filename:filename||blob.name||kind+'.png',contentType:blob.type.split(';')[0],base64,...(conversationId?{conversationId}:{}),...(channelId?{channelId}:{})});
  if(!isCurrent())throw Error('The account or conversation changed during upload. The unclaimed file will expire.');
  if(!response.asset?.id||!/^\/api\/media\/[a-f0-9]{64}$/.test(response.asset.url))throw Error('The server did not acknowledge the uploaded file. Retry the upload.');return response.asset;
 }
 function beginSelection(container,isCurrent){
  selections.get(container)?.dispose();let disposed=false,mounted=false;const cleanups=[];
  const selection={
   current(){return !disposed&&selections.get(container)===selection&&container.isConnected!==false&&isCurrent();},
   mounted(){mounted=true;},
   cleanup(fn){if(disposed){try{fn();}catch{}}else cleanups.push(fn);},
   dispose(){if(disposed)return;disposed=true;active.delete(selection.dispose);if(selections.get(container)===selection){selections.delete(container);if(mounted)container.replaceChildren();}for(const fn of cleanups.splice(0))try{fn();}catch{}}
  };
  selections.set(container,selection);active.add(selection.dispose);return selection;
 }
 function listen(selection,node,type,handler){node.addEventListener(type,handler);selection.cleanup(()=>node.removeEventListener?.(type,handler));}
 function boundedDimensions(width,height){
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1)throw Error('The selected image has no usable dimensions. Try another image.');
  if(width>16384||height>16384||width*height>16*1024*1024)throw Error('Choose an image under 16 megapixels and 16,384 pixels per side.');
  return{width,height};
 }
 function sourceCanvas(width,height,selection){
  boundedDimensions(width,height);const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;selection.cleanup(()=>{canvas.width=0;canvas.height=0;});
  const context=canvas.getContext('2d');if(!context)throw Error('This browser could not prepare the selected image. Try Chrome or Safari.');return{canvas,context};
 }
 function decodeCodec(bytes,metadata,selection){
  return new Promise((resolve,reject)=>{
   let worker,timer,settled=false;const id=crypto.randomUUID();
   const finish=(error,result)=>{if(settled)return;settled=true;if(timer!==undefined)clearTimeout(timer);if(worker){worker.onmessage=worker.onerror=worker.onmessageerror=null;try{worker.terminate();}catch{}}error?reject(error):resolve(result);};
   selection.cleanup(()=>finish(null,null));if(settled)return;
   try{
    if(typeof Worker!=='function')throw Error('This browser cannot run the local photo converter. Export the image as PNG or JPEG.');
    worker=new Worker('/pkg/profile-images/worker.js');
    worker.onmessage=event=>{const result=event.data;if(!result||result.id!==id)return;if(!selection.current()){finish(null,null);return;}try{if(result.error)throw Error(result.error.message||'This image could not be converted. Export it as PNG or JPEG.');boundedDimensions(result.width,result.height);if(!(result.pixels instanceof ArrayBuffer)||result.pixels.byteLength!==result.width*result.height*4)throw Error('The local photo converter returned incomplete pixels. Choose another image.');finish(null,result);}catch(error){finish(error);}};
    worker.onerror=()=>finish(Error('The local photo converter could not load. Check your connection or export the image as PNG or JPEG.'));
    worker.onmessageerror=()=>finish(Error('The local photo converter returned unreadable data. Export the image as PNG or JPEG.'));
    timer=setTimeout(()=>finish(Error('This image took too long to convert. Choose a smaller image or export it as PNG or JPEG.')),30000);
    const buffer=bytes.slice().buffer;worker.postMessage({id,bytes:buffer,mime:metadata.mime},[buffer]);
   }catch(error){finish(error);}
  });
 }
 async function codecSource(bytes,metadata,selection){
  const result=await decodeCodec(bytes,metadata,selection);if(!result||!selection.current())return null;
  const{canvas,context}=sourceCanvas(result.width,result.height,selection),pixels=new Uint8ClampedArray(result.pixels);
  const image=typeof ImageData==='function'?new ImageData(pixels,result.width,result.height):context.createImageData(result.width,result.height);if(image.data!==pixels)image.data.set(pixels);context.putImageData(image,0,0);return canvas;
 }
 async function decodeStill(blob,selection){
  if(typeof createImageBitmap==='function'){
   let bitmap;try{bitmap=await createImageBitmap(blob);}catch{if(!selection.current())return null;}
   if(bitmap){selection.cleanup(()=>bitmap.close?.());if(!selection.current())return null;boundedDimensions(bitmap.width,bitmap.height);return bitmap;}
  }
  if(!selection.current())return null;
  let url;try{url=URL.createObjectURL(blob);}catch{throw Error('This browser could not open the selected image. Try another image or export it as PNG or JPEG.');}
  selection.cleanup(()=>URL.revokeObjectURL(url));
  const image=await new Promise((resolve,reject)=>{
   const candidate=new Image();let settled=false;
   const clear=()=>{candidate.onload=null;candidate.onerror=null;};
   const finish=value=>{if(settled)return;settled=true;clear();resolve(value);};
   candidate.onload=()=>finish(candidate);
   candidate.onerror=()=>{if(settled)return;settled=true;clear();reject(Error('The selected image could not be opened in this browser. Try another PNG or JPEG, or export the image to one of those formats.'));};
   selection.cleanup(()=>{if(!settled)finish(null);candidate.src='';});
   candidate.src=url;
  });
  if(!image||!selection.current())return null;
  // HTMLImageElement can animate. Capture one frame once so later crop redraws
  // and retries use the same pixels, then release its detached decoder.
  const{width,height}=boundedDimensions(image.naturalWidth||image.width,image.naturalHeight||image.height),{canvas,context}=sourceCanvas(width,height,selection);context.drawImage(image,0,0,width,height);image.src='';return canvas;
 }
 async function mountGif({container,bytes,kind,metadata,onApply,onCancel,onError,selection}){
  let applying=false;const blob=new Blob([bytes],{type:'image/gif'}),frames=metadata.frames||1,duration=Number.isFinite(metadata.durationMs)?` · ${(metadata.durationMs/1000).toFixed(1)} s`:'';
  container.innerHTML=`<div class="vp-crop vp-gif-upload"><h3>${kind==='avatar'?'GIF avatar':'GIF banner'}</h3><div class="vp-actions vp-crop-actions"><button type="button" class="vh-primary" data-gif-action="upload">Use this GIF</button><button type="button" class="vh-secondary" data-gif-action="cancel">Cancel GIF</button></div><p class="vp-fine" data-gif-state role="status">Choose Use this GIF, then Save profile to publish it.</p><p>The original GIF keeps its animation. It is shown from the center to fit your ${kind}; GIFs are not cropped.</p><p>${metadata.width} × ${metadata.height} pixels · ${frames} ${frames===1?'frame':'frames'}${duration}</p><div class="vp-gif-placeholder" aria-hidden="true">GIF</div></div>`;
  selection.mounted();const status=container.querySelector('[data-gif-state]');
  const click=async event=>{const action=event.target.closest?.('[data-gif-action]')?.dataset.gifAction;if(!action||applying)return;if(!selection.current()){selection.dispose();return;}if(action==='cancel'){selection.dispose();onCancel?.();return;}if(action!=='upload')return;
   applying=true;container.querySelectorAll('button').forEach(node=>node.disabled=true);status.textContent='Uploading original GIF…';
   try{await onApply(blob);selection.dispose();}catch(error){if(selection.current()){status.textContent=error.message||'The upload failed. Retry the same GIF.';onError?.(error);}}finally{applying=false;if(selection.current())container.querySelectorAll('button').forEach(node=>node.disabled=false);}
  };
  listen(selection,container,'click',click);return{dispose:selection.dispose};
 }
 async function mountCrop({container,file,kind,onApply,onCancel,onError,isCurrent=()=>true}){
  const helpers=window.VoidMediaValidation;if(!helpers)throw Error('Image tools could not load. Refresh and retry.');
  if(!['avatar','banner'].includes(kind))throw Error('Choose an avatar or banner.');
  if(!container||container.isConnected===false||!isCurrent())return null;
  const selection=beginSelection(container,isCurrent);let applying=false,pointer=null;
  try{
   if(Number.isFinite(file.size)&&(file.size<=0||file.size>(helpers.MEDIA_LIMIT||8*1024*1024)))throw Error('Choose a file smaller than 8 MiB.');
   const bytes=new Uint8Array(await file.arrayBuffer());if(!selection.current()){selection.dispose();return null;}
   const formats=await imageTools();if(!selection.current()){selection.dispose();return null;}
   let metadata=formats.inspectProfileImage(bytes),sourceBytes=bytes;
   if(metadata.mime==='image/gif')return await mountGif({container,bytes,kind,metadata,onApply,onCancel,onError,selection});
   if(metadata.decoder==='svg'){metadata=await formats.prepareProfileSvg(bytes);if(!selection.current()){selection.dispose();return null;}sourceBytes=metadata.bytes;}
   // Android providers may omit or mislabel File.type. Validated bytes define
   // the decoder MIME; a browser Image is a fallback for bitmap-decoder limits.
   // A phone JPEG may carry a Motion Photo or secondary image after its EOI.
   // Only the bounded primary image enters the decoder; crop output is PNG.
   const source=metadata.decoder==='heif'||metadata.decoder==='tiff'?await codecSource(sourceBytes,metadata,selection):await decodeStill(new Blob([sourceBytes.subarray(0,metadata.sourceEnd??sourceBytes.length)],{type:metadata.mime}),selection);
   if(!source||!selection.current()){selection.dispose();return null;}
   boundedDimensions(source.width,source.height);
   const ratio=kind==='avatar'?1:3,outputWidth=kind==='avatar'?512:1536,outputHeight=outputWidth/ratio,viewWidth=600,viewHeight=viewWidth/ratio;
   container.innerHTML=`<div class="vp-crop" data-crop-kind="${kind}"><h3>Crop ${kind}</h3><div class="vp-actions vp-crop-actions"><button type="button" class="vh-primary" data-crop-action="apply">Use this crop</button><button type="button" class="vh-secondary" data-crop-action="reset">Reset crop</button><button type="button" class="vh-secondary" data-crop-action="cancel">Cancel crop</button></div><p class="vp-fine" data-crop-state role="status">Adjust the image, choose Use this crop, then Save profile to publish it.</p><canvas class="vp-crop-canvas" width="${viewWidth}" height="${viewHeight}" tabindex="0" role="img" aria-label="${kind==='avatar'?'Square avatar':'Wide banner'} crop preview. Use arrow keys to move, plus and minus to zoom."></canvas><p>Drag the image or use the controls. Arrow keys move it; + and − adjust zoom.</p><label>Zoom<input data-crop="zoom" type="range" min="1" max="4" step="0.01" value="1"></label><label>Horizontal position<input data-crop="x" type="range" min="-1" max="1" step="0.01" value="0"></label><label>Vertical position<input data-crop="y" type="range" min="-1" max="1" step="0.01" value="0"></label></div>`;
   selection.mounted();
   const canvas=container.querySelector('canvas'),context=canvas.getContext('2d',{alpha:false}),controls=Object.fromEntries([...container.querySelectorAll('[data-crop]')].map(node=>[node.dataset.crop,node])),status=container.querySelector('[data-crop-state]');let zoom=1,x=0,y=0,preparedBlob=null,uploadAttempted=false;
   if(!context)throw Error('This browser could not prepare the image crop. Try reopening the app in Chrome or Safari.');
   const draw=(target,width,height)=>{const scale=Math.max(width/source.width,height/source.height)*zoom,w=source.width*scale,h=source.height*scale;target.fillStyle='#151922';target.fillRect(0,0,width,height);target.drawImage(source,(width-w)/2+x*Math.max(0,w-width)/2,(height-h)/2+y*Math.max(0,h-height)/2,w,h);};
   const paint=()=>{if(!selection.current())return;zoom=Math.max(1,Math.min(4,zoom));x=Math.max(-1,Math.min(1,x));y=Math.max(-1,Math.min(1,y));for(const [key,value]of Object.entries({zoom,x,y}))controls[key].value=String(value);draw(context,viewWidth,viewHeight);};
   listen(selection,container,'input',event=>{if(!selection.current()||!event.target.dataset.crop||applying||uploadAttempted)return;const value=Number(event.target.value);if(event.target.dataset.crop==='zoom')zoom=value;else if(event.target.dataset.crop==='x')x=value;else y=value;paint();});
   listen(selection,canvas,'keydown',event=>{if(!selection.current()||applying||uploadAttempted)return;const step=event.shiftKey?.1:.035;if(event.key==='ArrowLeft')x-=step;else if(event.key==='ArrowRight')x+=step;else if(event.key==='ArrowUp')y-=step;else if(event.key==='ArrowDown')y+=step;else if(event.key==='+'||event.key==='=')zoom+=.1;else if(event.key==='-'||event.key==='_')zoom-=.1;else return;event.preventDefault();paint();});
   listen(selection,canvas,'pointerdown',event=>{if(!selection.current()||applying||uploadAttempted)return;pointer={id:event.pointerId,x:event.clientX,y:event.clientY,atX:x,atY:y};canvas.setPointerCapture?.(event.pointerId);});
   listen(selection,canvas,'pointermove',event=>{if(!selection.current()||!pointer||pointer.id!==event.pointerId||applying||uploadAttempted)return;const rect=canvas.getBoundingClientRect(),scale=Math.max(viewWidth/source.width,viewHeight/source.height)*zoom,extraX=Math.max(1,(source.width*scale-viewWidth)*rect.width/viewWidth),extraY=Math.max(1,(source.height*scale-viewHeight)*rect.height/viewHeight);x=pointer.atX+2*(event.clientX-pointer.x)/extraX;y=pointer.atY+2*(event.clientY-pointer.y)/extraY;paint();});
   const end=()=>{pointer=null;};listen(selection,canvas,'pointerup',end);listen(selection,canvas,'pointercancel',end);
   listen(selection,container,'click',async event=>{const action=event.target.closest?.('[data-crop-action]')?.dataset.cropAction;if(!action||!selection.current()||applying)return;if(action==='reset'){if(uploadAttempted)return;zoom=1;x=0;y=0;paint();return;}if(action==='cancel'){selection.dispose();onCancel?.();return;}if(action!=='apply')return;
    applying=true;container.querySelectorAll('button,input').forEach(node=>node.disabled=true);status.textContent=uploadAttempted?'Retrying the same crop…':'Preparing and uploading your crop…';try{if(!preparedBlob){const output=document.createElement('canvas');output.width=outputWidth;output.height=outputHeight;const outputContext=output.getContext('2d',{alpha:false});if(!outputContext)throw Error('This browser could not prepare the crop.');draw(outputContext,outputWidth,outputHeight);const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));if(!blob)throw Error('This browser could not create the crop.');preparedBlob=blob;}if(!selection.current())throw Error('The account or selected image changed. Reopen the editor.');uploadAttempted=true;await onApply(preparedBlob);selection.dispose();}catch(error){if(selection.current()){const message=(error.message||'The upload failed.')+(uploadAttempted?' Retry this crop, or cancel and choose the image again to adjust it.':' Your crop is still here; retry it.');status.textContent=message;const button=container.querySelector('[data-crop-action="apply"]');if(button&&uploadAttempted)button.textContent='Retry this crop';onError?.(new Error(message));}}finally{applying=false;if(selection.current()){container.querySelectorAll('button').forEach(node=>node.disabled=false);for(const control of Object.values(controls))control.disabled=uploadAttempted;const reset=container.querySelector('[data-crop-action="reset"]');if(reset)reset.disabled=uploadAttempted;}}
   });paint();return{dispose:selection.dispose};
  }catch(error){const current=selection.current();selection.dispose();if(!current)return null;throw error;}
 }
 window.VoidProfileMedia=Object.freeze({mountCrop,upload,encode,disposeAll(){for(const dispose of [...active])dispose();}});
})();
