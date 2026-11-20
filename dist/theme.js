/* Account preferences live in the home controller. Theme rendering also serves
 * the private draft preview inside its appearance dialog. */
(() => {
  'use strict';
  if (window.VoidTheme) return;
  const palettes = Object.freeze({graphite:'#0e1013',midnight:'#121b2c',forest:'#14221f'});
  const defaults = Object.freeze({
    font:'15',highContrast:false,reducedMotion:false,simpleProfiles:false,
    palette:'graphite',background:palettes.graphite,accent:'#cbef84',density:'comfortable'
  });
  const darkInk = '#000000', lightInk = '#ffffff';
  let preferences = defaults, activePreview = null;
  const previousStyles = new WeakMap();

  function media(query) {
    try { return window.matchMedia?.(query) || null; } catch (_) { return null; }
  }
  const reduced = media('(prefers-reduced-motion: reduce)');
  const contrast = media('(prefers-contrast: more)');
  function color(value, fallback) {
    if (typeof value !== 'string') return fallback;
    const input = value.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(input)) return input;
    return /^#[0-9a-f]{3}$/.test(input) ? input.replace(/[0-9a-f]/g, ch => ch + ch) : fallback;
  }
  function normalize(value) {
    const v = value && typeof value === 'object' ? value : defaults;
    return {
      font:[15,17,19,'15','17','19'].includes(v.font) ? String(v.font) : defaults.font,
      highContrast:v.highContrast === true,reducedMotion:v.reducedMotion === true,simpleProfiles:v.simpleProfiles === true,
      palette:typeof v.palette==='string' && (v.palette==='custom' || Object.hasOwn(palettes,v.palette)) ? v.palette : defaults.palette,
      background:color(v.background,defaults.background),accent:color(v.accent,defaults.accent),
      density:v.density === 'compact' ? 'compact' : defaults.density
    };
  }
  function effective(v) {
    return Object.freeze({...v,systemReducedMotion:!!reduced?.matches,systemHighContrast:!!contrast?.matches,
      effectiveReducedMotion:v.reducedMotion || !!reduced?.matches,
      effectiveHighContrast:v.highContrast || !!contrast?.matches});
  }
  const state = () => effective(preferences);
  const channels = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
  function mix(a,b,amount) {
    const other = channels(b);
    return '#' + channels(a).map((v,i) =>
      Math.round(v + (other[i]-v)*amount).toString(16).padStart(2,'0')).join('');
  }
  function luminance(hex) {
    const linear = channels(hex).map(n => {
      const x = n/255;
      return x <= .04045 ? x/12.92 : ((x+.055)/1.055)**2.4;
    });
    return .2126*linear[0] + .7152*linear[1] + .0722*linear[2];
  }
  function ratio(a,b) { return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); }
  function labelOn(fill) { return luminance(fill) > .17913 ? darkInk : lightInk; }
  // Find the nearest mix toward the chosen text color that is readable on the
  // hardest surface. All the surface colors stay on the same side of that ink.
  function readable(color, surfaceLuminance, ink, minimum = 4.5) {
    const ok = candidate => {
      const lum = luminance(candidate);
      return ratio(lum,surfaceLuminance) >= minimum && (ink===lightInk ? lum>surfaceLuminance : lum<surfaceLuminance);
    };
    if (ok(color)) return color;
    let low=0, high=1;
    for (let i=0;i<10;i++) {
      const trial=(low+high)/2;
      if (ok(mix(color,ink,trial))) high=trial;
      else low=trial;
    }
    return mix(color,ink,high);
  }

  function colorRoles(v) {
    // An empty override restores the original stylesheet, including its OS and
    // app high-contrast variants. Draft previews establish their own CSS scope.
    if (v.effectiveHighContrast || (v.palette==='graphite' && v.accent===defaults.accent)) return {};
    const base = v.palette==='custom' ? v.background : palettes[v.palette];
    const lum = luminance(base), ink=labelOn(base), light=ink===darkInk;
    const vars = {};
    // Near middle gray keep surfaces on the readable side of the background.
    const depth = (light && lum>.45) || (!light && lum>=.095) ? darkInk : lightInk;
    const surface = (tone,amount) => {
      const candidate = mix(base,tone,amount);
      return ratio(luminance(ink),luminance(candidate)) >= 4.55 ? candidate : base;
    };
    const coloredBase = v.palette !== 'graphite';
    const selected = surface(v.accent,.14), own = surface(v.accent,.09);
    const danger = light ? '#a02b37' : '#f3a8ad';
    const dangerSurface = coloredBase ? surface(danger,.13) : '#342326';
    const raised = coloredBase ? surface(depth,.13) : '#252c34';
    const backgrounds = [base,raised,selected,own,dangerSurface];
    const hardest = (light ? Math.min : Math.max)(...backgrounds.map(luminance));
    if (coloredBase) Object.assign(vars,{
      '--vh-bg':base,'--vh-rail':surface(depth,.025),'--vh-side':surface(depth,.045),
      '--vh-surface':surface(depth,.08),'--vh-raised':raised,
      '--vh-line-soft':mix(base,ink,.14),'--vh-line':mix(base,ink,.24),
      '--vh-control-line':readable(mix(base,ink,.52),hardest,ink,3),
      '--vh-text':readable(mix(base,ink,.95),hardest,ink),
      '--vh-copy':readable(mix(base,ink,.82),hardest,ink),
      '--vh-muted':readable(mix(base,ink,.64),hardest,ink),
      '--vh-danger':readable(danger,hardest,ink),'--vh-danger-surface':dangerSurface,
      '--vh-success':readable(light?'#285d40':'#b7d7ba',hardest,ink)
    });
    const accent=readable(v.accent,hardest,ink), accentInk=labelOn(accent), buttonInk=labelOn(v.accent);
    if (lum > .065) vars['--vh-profile-readable']='var(--vh-copy)';
    Object.assign(vars,{
      '--vh-selected':selected,'--vh-own-message':own,'--vh-accent':accent,
      '--vh-accent-hover':mix(accent,accentInk===darkInk?lightInk:darkInk,.16),'--vh-accent-ink':accentInk,
      '--vh-button-bg':v.accent,'--vh-button-ink':buttonInk,
      '--vh-button-hover':mix(v.accent,buttonInk===darkInk?lightInk:darkInk,.14),
      '--vh-button-edge':accent
    });
    return vars;
  }

  function setFlags(node,v) {
    node.dataset.vhFont=v.font;
    node.dataset.vhDensity=v.density;
    const base=v.palette==='custom'?v.background:palettes[v.palette];
    node.dataset.vhTone=!v.effectiveHighContrast && labelOn(base)===darkInk ? 'light' : 'dark';
    node.dataset.vhSimpleProfiles=String(v.simpleProfiles);
    node.dataset.vhMotion=v.effectiveReducedMotion?'reduce':'standard';
    node.dataset.vhContrast=v.effectiveHighContrast?'more':'standard';
    node.classList.toggle('vh-reduced-motion',v.effectiveReducedMotion);
    node.classList.toggle('vh-high-contrast',v.effectiveHighContrast);
  }
  function writeColors(node,v) {
    if (!node?.style) return;
    const next=colorRoles(v), last=previousStyles.get(node)||{};
    for (const key of Object.keys(last)) if (!(key in next)) node.style.removeProperty(key);
    for (const [key,value] of Object.entries(next)) if (last[key]!==value) node.style.setProperty(key,value);
    previousStyles.set(node,next);
  }
  function preview(node,value) {
    if (!node || node===document.body || node===document.documentElement) return;
    const draft=normalize(value),v=effective(draft);
    activePreview={node,draft};
    node.dataset.vhThemePreview='';
    setFlags(node,v);
    writeColors(node,v);
    node.style?.setProperty('--vl-text-scale',String(Number(v.font)/15));
    return v;
  }
  function sync() {
    const v=state();
    for (const node of [document.documentElement,document.body]) if (node) setFlags(node,v);
    writeColors(document.documentElement,v);
    const meta=document.querySelector?.('meta[name="theme-color"]');
    if (meta) meta.content=v.effectiveHighContrast?defaults.background:(v.palette==='custom'?v.background:palettes[v.palette]);
    if (activePreview?.node.isConnected) preview(activePreview.node,activePreview.draft);
    else activePreview=null;
    if (typeof CustomEvent==='function') window.dispatchEvent(new CustomEvent('voidline:theme',{detail:v}));
    return v;
  }
  function apply(value) { preferences=normalize(value); return sync(); }
  function reset() { activePreview=null; return apply(defaults); }
  for (const query of [reduced,contrast]) {
    if (query?.addEventListener) query.addEventListener('change',sync);
    else if (query?.addListener) query.addListener(sync);
  }
  window.VoidTheme=Object.freeze({apply,reset,state,preview,normalize,defaults,palettes});
  reset();
  if (!document.body) document.addEventListener('DOMContentLoaded',sync,{once:true});
})();
