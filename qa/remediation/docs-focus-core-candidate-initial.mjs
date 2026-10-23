import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
export const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const luminance = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i],0)
const contrast = (a,b) => (Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05)
const paint = target => target.evaluate(el => {const style = getComputedStyle(el),rect=el.getBoundingClientRect(),svg=el.querySelector('svg'),s=svg&&getComputedStyle(svg);return {tag:el.tagName,label:el.getAttribute('aria-label')||el.innerText?.trim()||el.placeholder,html:el.outerHTML.slice(0,1000),tabindex:el.getAttribute('tabindex'),focused:document.activeElement===el,focusVisible:el.matches(':focus-visible'),color:style.color,background:style.backgroundColor,border:style.border,outline:style.outline,outlineStyle:style.outlineStyle,outlineWidth:parseFloat(style.outlineWidth),outlineOffset:style.outlineOffset,shadow:style.boxShadow,opacity:style.opacity,caret:style.caretColor,textDecoration:style.textDecoration,svg:s&&{fill:s.fill,color:s.color,opacity:s.opacity},rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},selectionStart:el.selectionStart,selectionEnd:el.selectionEnd}})
export async function measureFocus({page,target,info,report,root,folder}) {
  await target.evaluate(el => {document.activeElement?.blur();el.scrollIntoView({block:'center',inline:'nearest'})})
  await page.mouse.move(0,page.viewportSize().height-1)
  const authorTabindex=await target.getAttribute('tabindex'),isImplicitAnchor=await target.evaluate(el=>el.matches('a[href]')&&!el.hasAttribute('tabindex'))
  await target.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab')
  let focused=await paint(target),actualKeyboardFocused=focused.focused
  const reached=await page.evaluate(()=>({tag:document.activeElement.tagName,html:document.activeElement.outerHTML.slice(0,700)}))
  const policyUnsupported=info.browser==='webkit'&&isImplicitAnchor&&!actualKeyboardFocused
  if(policyUnsupported){await target.evaluate(el=>el.setAttribute('tabindex','0'));await target.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab')}
  await target.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest'}));await page.waitForTimeout(35)
  focused=await paint(target)
  const rect=await target.boundingBox();if(!rect||rect.width<1||rect.height<1)throw Error('Focus target has no rendered box')
  const x=Math.max(0,Math.floor(rect.x-8)),y=Math.max(0,Math.floor(rect.y-8)),clip={x,y,width:Math.min(page.viewportSize().width-x,Math.ceil(rect.width+16)),height:Math.min(page.viewportSize().height-y,Math.ceil(rect.height+16))}
  if(clip.width<=0||clip.height<=0)throw Error('Focus target outside visible viewport')
  const focusPNG=await page.screenshot({clip,animations:'disabled',caret:'initial'})
  await target.evaluate(el=>el.blur());await page.waitForTimeout(35)
  const rest=await paint(target),restPNG=await page.screenshot({clip,animations:'disabled',caret:'initial'}),after=await target.boundingBox()
  if(policyUnsupported)await target.evaluate((el,value)=>value===null?el.removeAttribute('tabindex'):el.setAttribute('tabindex',value),authorTabindex)
  const samples=await page.evaluate(async({buffers,rect,clip})=>{const images=[];for(const bytes of buffers){const image=new Image();image.src='data:image/png;base64,'+bytes;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);images.push({width:canvas.width,height:canvas.height,data:ctx.getImageData(0,0,canvas.width,canvas.height).data})}const[a,b]=images,maps={exterior:new Map(),interior:new Map()},bounds={x1:Infinity,y1:Infinity,x2:-1,y2:-1};for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){const i=(y*a.width+x)*4,from=[...a.data.slice(i,i+3)],to=[...b.data.slice(i,i+3)];if(!from.some((value,j)=>Math.abs(value-to[j])>3))continue;const outside=x+clip.x<rect.x||x+clip.x>=rect.x+rect.width||y+clip.y<rect.y||y+clip.y>=rect.y+rect.height,map=maps[outside?'exterior':'interior'],key=from.join(',')+'|'+to.join(',');map.set(key,(map.get(key)||0)+1);if(!outside){bounds.x1=Math.min(bounds.x1,x);bounds.x2=Math.max(bounds.x2,x);bounds.y1=Math.min(bounds.y1,y);bounds.y2=Math.max(bounds.y2,y)}}return{...Object.fromEntries(Object.entries(maps).map(([k,m])=>[k,[...m].map(([key,count])=>({colours:key.split('|').map(s=>s.split(',').map(Number)),count}))])),interiorBounds:bounds.x2>=0?{x:bounds.x1,y:bounds.y1,width:bounds.x2-bounds.x1+1,height:bounds.y2-bounds.y1+1}:null}},{buffers:[restPNG,focusPNG].map(b=>b.toString('base64')),rect,clip})
  for(const key of['exterior','interior'])samples[key]=samples[key].map(row=>({...row,ratio:contrast(...row.colours)})).sort((a,b)=>b.ratio-a.ratio)
  const exterior=samples.exterior.find(row=>row.count>=2)||null,interior=samples.interior.find(row=>row.count>=2)||null
  const geometryUnchanged=Math.abs(rect.width-after.width)<.02&&Math.abs(rect.height-after.height)<.02,positionUnchanged=Math.abs(rect.x-after.x)<.02&&Math.abs(rect.y-after.y)<.02
  const changedInk=rest.color!==focused.color||JSON.stringify(rest.svg)!==JSON.stringify(focused.svg),changedBorder=rest.border!==focused.border,changedBackground=rest.background!==focused.background,changedDecoration=rest.textDecoration!==focused.textDecoration
  const exteriorPass=(exterior?.ratio||1)>=3,alternatePass=(changedInk||changedBorder||changedBackground||changedDecoration)&&(interior?.ratio||1)>=3
  const unmodifiedUAOutline=focused.outlineStyle==='auto'&&focused.outlineWidth>0&&(exterior?.count||0)>0&&rest.outlineStyle!==focused.outlineStyle
  const textInput=['INPUT','TEXTAREA'].includes(rest.tag),caretCue=textInput&&samples.interiorBounds&&samples.interiorBounds.height>=8&&samples.interiorBounds.width<=3&&(interior?.ratio||1)>=3
  const pendingCaret=textInput&&focused.focused&&focused.focusVisible&&!exteriorPass&&!alternatePass&&!unmodifiedUAOutline&&!caretCue
  const pass=pendingCaret?null:focused.focused&&focused.focusVisible&&geometryUnchanged&&positionUnchanged&&(exteriorPass||alternatePass||unmodifiedUAOutline||caretCue)
  const serial=report.observations.length.toString().padStart(4,'0'),prefix=`${folder}/${info.browser}-${info.scheme||'normal'}-${info.theme}-${info.width}-${serial}`
  await fs.writeFile(path.join(root,prefix+'-rest.png'),restPNG);await fs.writeFile(path.join(root,prefix+'-focus.png'),focusPNG)
  const row={...info,name:focused.label,state:'rest-to-real-keyboard-focus',rest,focused,actualKeyboardFocused,policyUnsupported,reached,identicalPaint:restPNG.equals(focusPNG),geometryUnchanged,positionUnchanged,clip,exteriorCue:exterior,interiorCue:interior,interiorBounds:samples.interiorBounds,changedInk,changedBorder,changedBackground,changedDecoration,exteriorPass,alternatePass,unmodifiedUAOutline,caretCue,pendingCaret,status:pendingCaret?'Native text-input caret not observable in automated screenshot; manual observation pending':policyUnsupported?'Focus appearance with temporary explicit tabindex; ordinary implicit-link Tab unsupported in this automated WebKit policy':unmodifiedUAOutline?'Visible unmodified user-agent outline; UA appearance exception, measured antialias pixels retained':pass?'Measured visible focus cue':'No confirmed sufficient focus cue',pass,screenshots:[prefix+'-rest.png',prefix+'-focus.png'],screenshotSHA256:[sha(restPNG),sha(focusPNG)]}
  report.observations.push(row)
  if(pass!==true||policyUnsupported)console.log(JSON.stringify({browser:info.browser,scheme:info.scheme,theme:info.theme,width:info.width,surface:info.surface,label:focused.label,pass,policyUnsupported,pendingCaret,unmodifiedUAOutline,identicalPaint:row.identicalPaint,exterior:exterior?.ratio,interior:interior?.ratio,outline:focused.outline,shadow:focused.shadow,changedDecoration}))
  return row
}
