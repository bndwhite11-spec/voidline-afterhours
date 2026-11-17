'use strict';
const assert=require('node:assert/strict');

// Exercises attachment UI handlers and a refresh with the same tab/session storage.
// File reading, microphone permission, and media recording are controlled fakes.
module.exports=async function verifyAttachmentRefresh(harness){
  assert.equal(typeof harness,'function','An application harness factory is required');
  const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6hGsAAAAASUVORK5CYII=';
  const audio='data:audio/webm;codecs=opus;base64,dGVzdC1hdWRpby1ieXRlcw==';
  const flush=()=>new Promise(setImmediate);
  const initial=()=>({messages:{'afterhours/general':[]}});
  const ownMessages=app=>(app.api.state.messages['afterhours/general']||[]).filter(message=>message.author==='self');
  const setText=async(app,text)=>{const composer=app.get('message-input');composer.value=text;await composer.dispatch('input');};
  function installReader(app){
    class Reader{
      readAsDataURL(file){
        assert.ok(file&&file.size>0,'The attachment reader should receive nonempty data');
        this.result=String(file.type).startsWith('audio/')?audio:image;
        this.onload?.({target:this});
      }
    }
    app.context.FileReader=Reader;app.window.FileReader=Reader;
  }
  function reload(app){return harness(null,app.storage,{sessionStorage:app.sessionStorage});}
  function send(app){return app.api.sendMessage({preventDefault(){}});}

  const pictureApp=harness(initial());installReader(pictureApp);
  const caption='A sketch for the quiet hours',filename='midnight-sketch.png';
  await setText(pictureApp,caption);
  const originalCreate=pictureApp.document.createElement;
  let picker;
  pictureApp.document.createElement=function(tag,...args){const element=originalCreate.call(this,tag,...args);if(String(tag).toLowerCase()==='input')picker=element;return element;};
  try{
    await pictureApp.click({action:'attachment'});
    assert.equal(typeof picker?.onchange,'function','The attachment action should open its file picker');
    picker.files=[{name:filename,type:'image/png',size:68}];picker.onchange();
  }finally{pictureApp.document.createElement=originalCreate;}
  assert.match(pictureApp.get('composer-context').innerHTML,/midnight-sketch\.png/);
  const pictureReload=reload(pictureApp);
  assert.equal(pictureReload.get('message-input').value,caption,'Refresh should restore the image caption draft');
  assert.match(pictureReload.get('composer-context').innerHTML,/midnight-sketch\.png/,'Refresh should restore the pending image name');
  const picture=send(pictureReload);assert.ok(picture,'Restored image draft should send successfully');assert.equal(picture.text,caption);assert.equal(picture.image,image,'Sending after refresh should retain the original image bytes');
  assert.equal(ownMessages(pictureReload).length,1);assert.equal(pictureReload.saved().messages['afterhours/general'].find(message=>message.id===picture.id).image,image);

  const voiceApp=harness(initial());installReader(voiceApp);
  const voiceCaption='Keep this recorded thought';await setText(voiceApp,voiceCaption);
  const track={stops:0,stop(){this.stops++;}},stream={getTracks:()=>[track]};
  let requests=0;
  voiceApp.context.navigator.mediaDevices={async getUserMedia(){requests++;return stream;}};
  class Recorder{
    static isTypeSupported(type){return type==='audio/webm;codecs=opus';}
    constructor(input,options={}){assert.equal(input,stream);this.mimeType=options.mimeType||'audio/webm';this.state='inactive';}
    start(){this.state='recording';}
    stop(){if(this.state!=='recording')return;this.state='inactive';this.ondataavailable?.({data:new Blob(['test-audio-bytes'],{type:this.mimeType})});this.onstop?.();}
  }
  voiceApp.context.MediaRecorder=Recorder;voiceApp.window.MediaRecorder=Recorder;
  await voiceApp.click({action:'voice'});await voiceApp.click({action:'record-voice'});await flush();
  assert.equal(requests,1,'Starting the voice note should request one fake stream');
  await voiceApp.click({action:'record-voice'});await flush();
  assert.equal(track.stops,1,'Preparing the pending voice note should stop its stream');
  assert.match(voiceApp.get('composer-context').innerHTML,/Voice note/);
  const voiceReload=reload(voiceApp);
  assert.equal(voiceReload.get('message-input').value,voiceCaption,'Refresh should restore the voice note caption');
  assert.match(voiceReload.get('composer-context').innerHTML,/Voice note/,'Refresh should retain the pending voice note');
  const note=send(voiceReload);assert.ok(note,'Restored voice note should send successfully');assert.equal(note.text,voiceCaption);assert.equal(note.audio,audio,'Sending after refresh should retain the recorded audio bytes');
  assert.equal(ownMessages(voiceReload).length,1);assert.equal(voiceReload.saved().messages['afterhours/general'].find(message=>message.id===note.id).audio,audio);
};
