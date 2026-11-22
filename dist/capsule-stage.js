/* Decorative capsule packaging. Account state, playback and all controls belong to the parent view. */
(() => {
  'use strict';
  const svgNamespace = 'http://www.w3.org/2000/svg';
  // The lid's pivot is the left end of the long rear hinge (45,74).
  // The open interior and the tray are complete even when the lid covers them.
  const pieces = [
    ['shadow', [
      ['M26 131Q23 127 33 124L133 106Q141 105 158 112L178 122Q184 126 175 129L79 149Q73 150 67 147Z','#0a1016']
    ]],
    ['shell', [
      ['M28 77L135 57L177 79L174 111Q174 116 168 118L74 140Q69 141 64 138L31 118Q28 116 28 110Z','#28353d'],
      ['M28 76L70 101L177 79L135 54Z','#91a8af'],
      ['M35 76L135 58L166 77L71 96Z','#1a282d'],
      ['M43 77L134 61L159 77L72 92Z','#38474a'],
      ['M30 81L69 104L69 136L35 115Q31 113 30 109Z','#485c63'],
      ['M73 103L175 82L173 109Q173 114 168 116L73 137Z','#33434b'],
      ['M73 103L175 82L175 85L73 107Z','#acbfc1'],
      ['M34 100L62 117L62 121L34 104Z','#526770'],
      ['M93 119L149 107L149 112L93 124Z','#202f37'],
      ['M79 130L87 128L87 131L79 133ZM157 113L165 111L165 114L157 116Z','#c9d5c8']
    ]],
    ['lid', [
      ['M28 69Q28 66 32 65L131 45Q135 44 139 46L177 67L177 77L70 101L28 77Z','#586d75'],
      ['M29 68L134 47L175 69L69 92Z','#91a5a9'],
      ['M37 68L133 50L165 68L70 88Z','#657b83'],
      ['M44 68L132 52L158 67L70 85Z','#71878b'],
      ['M36 69L69 88L164 68L164 70L69 91Z','#c1ceca'],
      ['M29 70L69 93L69 100L29 77Z','#40545c'],
      ['M71 93L177 70L177 77L71 100Z','#9bacac'],
      ['M75 82L58 72L65 70L82 80ZM86 79L69 69L73 68L90 78Z','#c4cfb5'],
      ['M104 66L116 63L125 68L112 71Z','#2f454b'],
      ['M108 66L115 65L120 68L113 69Z','#cbd9c3']
    ]],
    ['hinge', [
      ['M40 66L54 63L56 65L42 68ZM116 51L128 49L131 51L118 54Z','#32454a']
    ]],
    ['latch', [
      ['M111 88L133 83L133 98Q133 101 130 102L117 105Q112 106 112 102Z','#26383f'],
      ['M113 88L131 84L131 97L114 101Z','#d4dac2'],
      ['M115 90L129 87L129 93L115 96Z','#7c8d80'],
      ['M118 91L126 89L126 92L118 94Z','#344950']
    ]]
  ];
  function create(doc) {
    const stage = doc.createElement('div');
    stage.className = 'vc-capsule-stage';
    stage.setAttribute('aria-hidden', 'true');
    const svg = doc.createElementNS(svgNamespace, 'svg');
    svg.setAttribute('viewBox', '0 0 208 166');
    svg.setAttribute('focusable', 'false');
    for (const [name, panels] of pieces) {
      const group = doc.createElementNS(svgNamespace, 'g');
      group.setAttribute('class', 'vc-case-' + name);
      for (const [shape, color] of panels) {
        const panel = doc.createElementNS(svgNamespace, 'path');
        panel.setAttribute('d', shape);
        panel.setAttribute('fill', color);
        group.appendChild(panel);
      }
      svg.appendChild(group);
    }
    stage.appendChild(svg);
    return stage;
  }
  window.VoidlineCapsuleStage = Object.freeze({create});
})();
