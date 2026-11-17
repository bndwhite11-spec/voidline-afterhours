'use strict';
const assert = require('node:assert/strict');

// Exercises the actual application's template-content branch with a small, structural
// DOM fixture. It deliberately makes no rendering, geometry, or browser-layout claims.
module.exports = function verifyStaticReconciliation(app) {
  const api = app.api || app.window?.VoidApp || app.VoidApp;
  const document = app.document;
  assert.equal(typeof api?.reconcile, 'function', 'VoidApp.reconcile must be exposed');
  assert.ok(document && typeof document.createElement === 'function', 'A document fixture is required');

  function text(value) {
    return {nodeType:3,parentElement:null,textContent:String(value),get outerHTML(){return this.textContent;},cloneNode(){return text(this.textContent);}};
  }
  function element(content) {
    const node = {
      nodeType:1,tagName:'DIV',dataset:{staticKey:'intro'},className:'conversation-intro',parentElement:null,childNodes:[],
      querySelector(){return null;},querySelectorAll(){return [];},
      replaceChildren(...children){this.childNodes=children;children.forEach(child=>{child.parentElement=this;});},
      remove(){const parent=this.parentElement;if(parent)parent.children=parent.children.filter(child=>child!==this);this.parentElement=null;},
      replaceWith(replacement){const parent=this.parentElement;if(!parent)return;const index=parent.children.indexOf(this);this.remove();parent.children.splice(index,0,replacement);replacement.parentElement=parent;},
      cloneNode(deep){const copy=element('');copy.className=this.className;copy.dataset={...this.dataset};if(deep)copy.replaceChildren(...this.childNodes.map(child=>child.cloneNode(true)));return copy;}
    };
    Object.defineProperties(node, {
      innerHTML:{get(){return this.childNodes.map(child=>child.outerHTML??child.textContent??'').join('');},set(value){this.replaceChildren(text(value));}},
      textContent:{get(){return this.childNodes.map(child=>child.textContent??'').join('');},set(value){this.replaceChildren(text(value));}},
      outerHTML:{get(){return `<div data-static-key="${this.dataset.staticKey}" class="${this.className}">${this.innerHTML}</div>`;}},
      nextSibling:{get(){const siblings=this.parentElement?.children||[];return siblings[siblings.indexOf(this)+1]||null;}}
    });
    node.innerHTML=content;
    return node;
  }
  const existing=element('old intro'),desired=element('new intro content');
  const container={
    children:[existing],
    get firstChild(){return this.children[0]||null;},
    insertBefore(child,reference){
      if(child.parentElement)child.parentElement.children=child.parentElement.children.filter(node=>node!==child);
      const index=reference?this.children.indexOf(reference):-1;
      this.children.splice(index<0?this.children.length:index,0,child);child.parentElement=this;return child;
    },
    append(child){return this.insertBefore(child,null);}
  };
  existing.parentElement=container;
  const originalCreateElement=document.createElement;
  let templates=0;
  document.createElement=function(tag,...args){
    if(String(tag).toLowerCase()!=='template')return originalCreateElement.call(this,tag,...args);
    templates++;
    return {content:{children:[desired],childNodes:[desired]},innerHTML:''};
  };
  try {
    api.reconcile(container,'<div data-static-key="intro" class="conversation-intro">new intro content</div>');
    assert.equal(templates,1,'The template-content reconciliation path should be exercised');
    assert.equal(container.children.length,1,'The existing keyed introduction must not be duplicated');
    assert.equal(container.children[0].dataset.staticKey,'intro');
    assert.equal(container.children[0].innerHTML,'new intro content','A reused static-key introduction must display its new content');
  } finally {
    document.createElement=originalCreateElement;
  }
};
