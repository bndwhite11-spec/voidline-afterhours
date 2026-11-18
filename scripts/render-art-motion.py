"""Render the same authored part transforms as still frames; this is not browser QA."""
from pathlib import Path
import json,math,subprocess,os,xml.etree.ElementTree as ET
root=Path('/workspace/work/voidline-output/motion-v18');root.mkdir(exist_ok=True)
items=json.loads((root/'input.json').read_text())
ET.register_namespace('','http://www.w3.org/2000/svg')
def ease(x):
 lo,hi=0.,1.
 for _ in range(25):
  t=(lo+hi)/2;v=3*(1-t)**2*t*.42+3*(1-t)*t*t*.58+t**3
  if v<x:lo=t
  else:hi=t
 t=(lo+hi)/2
 return 3*(1-t)*t*t+t**3

def values(layer,t):
 frames=layer['frames'];left,right=frames[0],frames[-1]
 for a,b in zip(frames,frames[1:]):
  if a['at']<=t<=b['at']:left,right=a,b;break
 span=right['at']-left['at'];q=max(0,min(1,(t-left['at'])/span if span else 1));q=ease(q)
 return {key:left.get(key,default)+(right.get(key,default)-left.get(key,default))*q for key,default in [('x',0),('y',0),('rotate',0),('scaleX',1),('scaleY',1)]},left,right,q

def scene(item,progress,instance):
 svg=ET.fromstring(item['svg']);t=max(0,min(1,progress))
 for layer in item['motion']['layers']:
  v,left,right,q=values(layer,t);ox,oy=layer.get('origin',[128,128])
  for node in svg.iter():
   if node.attrib.get('data-part')!=layer['name']:continue
   base=node.attrib.get('transform','');node.set('transform',f'translate({ox+v["x"]} {oy+v["y"]}) rotate({v["rotate"]}) scale({v["scaleX"]} {v["scaleY"]}) translate({-ox} {-oy}) '+base)
   rest=float(node.attrib.get('opacity',1));opacity=left.get('opacity',rest)+(right.get('opacity',rest)-left.get('opacity',rest))*q;node.set('opacity',str(opacity))
 value=ET.tostring(svg,encoding='unicode');value=value.replace('va3-'+item['id']+'-detail','motion'+str(instance));return value

def nested(svg,x,y,size):
 value=ET.fromstring(svg);value.set('x',str(x));value.set('y',str(y));value.set('width',str(size));value.set('height',str(size));return ET.tostring(value,encoding='unicode')

def render(svg,path,width):
 path.write_text(svg);result=subprocess.run(['inkscape',str(path),'--export-type=png','--export-width='+str(width),'--export-filename='+str(path.with_suffix('.png'))],capture_output=True,text=True,env={**os.environ,'INKSCAPE_PROFILE_DIR':'/tmp/voidline-inkscape-profile'},timeout=30)
 if result.returncode:raise RuntimeError(result.stderr[-1000:])

cols=5;w=1120;rowh=208;h=len(items)*rowh+50
parts=[]
for row,item in enumerate(items):
 y=50+row*rowh;parts.append(f'<text x="16" y="{y+20}" fill="#dfe4e6" font-size="15" font-family="sans-serif">{item["name"]}</text>')
 for col,t in enumerate([0,.25,.5,.75,1]):
  x=170+col*185;parts.append(nested(scene(item,t,row*10+col),x,y+4,180));parts.append(f'<text x="{x+65}" y="{y+196}" fill="#a5abb4" font-size="12" font-family="sans-serif">{round(t*100)}%</text>')
film=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="100%" height="100%" fill="#11161c"/><text x="16" y="30" fill="#eef1ed" font-family="sans-serif" font-size="20">VOIDLINE / authored object-motion samples</text>{"".join(parts)}</svg>'
render(film,root/'motion-filmstrip.svg',1120)
# A single-play animated artifact from the same layer keyframes, not a screen recording.
for frame in range(25):
 millis=frame*83.333;parts=[]
 for index,item in enumerate(items):
  x=index%3*288;y=index//3*302
  parts.append(f'<text x="{x+14}" y="{y+22}" fill="#e5e9e5" font-size="15" font-family="sans-serif">{item["name"]}</text>')
  parts.append(nested(scene(item,millis/item['motion']['duration'],index),x+16,y+32,256))
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="864" height="604"><rect width="100%" height="100%" fill="#11161c"/>{"".join(parts)}</svg>'
 render(svg,root/f'frame-{frame:03}.svg',864)
subprocess.run(['ffmpeg','-y','-v','error','-framerate','12','-i',str(root/'frame-%03d.png'),'-filter_complex','[0:v]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a','-loop','-1',str(root/'motion-preview.gif')],check=True,timeout=90)
print(json.dumps({'filmstrip':str(root/'motion-filmstrip.png'),'animated_preview':str(root/'motion-preview.gif'),'frames':25,'source':'authored SVG and motion keyframes','screen_recording':False}))
