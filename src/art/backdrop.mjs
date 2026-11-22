// Small woven, printed and embossed marks confined to the edges of the stage.
// Local curves, no assets, animations, identifiers or network requests.
const marks=Object.freeze({
 'cue dots':'M-6-1a1.3 1.3 0 1 0 .1 0 M0 2a1.3 1.3 0 1 0 .1 0 M5-3a1.3 1.3 0 1 0 .1 0',
 'signal lines':'M-7 1h3l2-5 3 9 2-6h4',
 'splice marks':'M-7 3h5l4-6h5M-4 6l8-12',
 'knurl lines':'M-6 3l6-7m-2 8 6-7m-1 6 5-6',
 'register crosses':'M-6 0H6M0-6V6M-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
 'calibration ticks':'M-6 4l-2-3M-3 0l-1-4M1-1v-5M5 0l2-4',
 'level marks':'M-5-5v10m0-9h7m-7 4h4m-4 4h7',
 'rivet pairs':'M-6-1a2 2 0 1 0 4 0 2 2 0 1 0-4 0 M2 2a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
 'firing rings':'M-6 1a6 2.5 0 1 0 12 0 6 2.5 0 1 0-12 0M-3-3a3 1.5 0 1 0 6 0 3 1.5 0 1 0-6 0',
 'seam marks':'M-6 2Q0-2 6 0 M-3-2l1 5 M2-3l1 5',
 'stitches':'M-6 1l5-4m1 6 5-4',
 'stitched chevrons':'m-6-2 5 4 5-4m-10 3 5 4 5-4',
 'repair crosses':'m-5-4 8 8m0-8-8 8',
 'thread loops':'M-7 4c3-6 8-7 8-4s-4 4-4 2 4-3 8-1',
 'crescent stitches':'M3-6a6 6 0 1 0 3 9A6 6 0 0 1 3-6z',
 'tiny key legends':'M-6-4H5v8H-6z M-3 0h5m-2-2 2 2-2 2',
 'key legends':'M-6-4H5v8H-6z M-3 0h5m-2-2 2 2-2 2',
 'circuit traces':'M-7 4v-4h5l3-4h5m-10 8h6l3-4',
 'moons':'M3-6A6.2 6.2 0 1 0 6 4A6.4 6.4 0 0 1 3-6z',
 'ripples':'M-7 0q3-3 6 0t7 0 M-5 4q3-3 6 0t4 0',
 'mineral facets':'m-6-2 4-3 6 1 2 4-5 5-7-4z M-2-5l3 10 3-9',
 'crescents':'M3-6A6.2 6.2 0 1 0 6 4A6.4 6.4 0 0 1 3-6z'
});
let mountId=0;
export function modelBackdrop(item){
 const d=marks[item?.motif?.toLowerCase()],field=item?.backdrop;
 if(!field||![field.center,field.edge,field.motifColor].every(color=>/^#[0-9a-f]{6}$/i.test(color)))return '';
 const gradient='va-object-field-'+(++mountId);
 const stamps=[[26,38,-12],[68,21,9],[224,30,17],[238,81,-8],[20,171,14],[38,225,-9],[207,228,10],[236,186,-10]];
 const motif=d?stamps.map(([x,y,r])=>`<path transform="translate(${x} ${y}) rotate(${r})" d="${d}"/>`).join(''):'';
 return `<svg class="va-backdrop" viewBox="0 0 256 256" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><radialGradient id="${gradient}" cx=".43" cy=".36" r=".84"><stop stop-color="${field.center}"/><stop offset="1" stop-color="${field.edge}"/></radialGradient></defs><rect width="256" height="256" fill="url(#${gradient})"/><g opacity=".52" fill="none" stroke="${field.motifColor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${motif}</g></svg>`;
}
