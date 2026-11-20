/* Private account presets. Applying a look only changes the open draft. */
(() => {
  function mount({root, accountId, request, read, apply}) {
    if (!root || !accountId) return;
    root.innerHTML = '<details class="vp-looks"><summary>Saved looks</summary><p>Keep up to 12 combinations of avatar, banner, accent, name style, and frame. Uploaded images keep their placement.</p><label>Look name <input maxlength="40" type="text" data-look-name></label><button type="button" data-look-save>Save these presets</button><div data-look-list></div><small role="status"></small></details>';
    const details = root.firstElementChild;
    const live = () => root.isConnected && root.firstElementChild === details && window.VoidHome?.state?.account?.id === accountId;
    const name = details.querySelector('[data-look-name]');
    const status = details.querySelector('[role=status]');
    const list = details.querySelector('[data-look-list]');
    let loaded = false, busy = false;
    function button(label, action) {
      const control = document.createElement('button');
      control.type = 'button';
      control.textContent = label;
      control.addEventListener('click', action);
      return control;
    }
    async function render() {
      const response = await request('/api/profile-looks');
      if (!live()) return;
      list.replaceChildren();
      for (const look of response.looks) {
        const row = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = look.name;
        const use = button('Apply', () => {
          if (!live() || busy) return;
          apply({avatar:look.avatar,banner:look.banner,accent:look.accent,nameStyle:look.nameStyle,profileFrame:look.profileFrame});
          status.textContent = 'Applied to your draft. Save your profile to publish.';
        });
        use.setAttribute('aria-label', 'Apply ' + look.name);
        const remove = button('Delete', () => run(async () => {
          await request('/api/profile-looks/remove',{name:look.name});
          await render();
          if (live()) status.textContent = 'Saved look deleted.';
        }));
        remove.setAttribute('aria-label','Delete saved look ' + look.name);
        row.append(title,use,remove);
        list.appendChild(row);
      }
      if (!response.looks.length) list.textContent = 'No saved looks yet.';
      loaded = true;
    }
    async function run(action) {
      if (!live() || busy) return;
      busy = true;
      details.setAttribute('aria-busy','true');
      try { await action(); }
      catch (error) { if (live()) status.textContent = error.message || 'Could not load saved looks. Close and reopen to retry.'; }
      finally { busy = false; details.removeAttribute('aria-busy'); }
    }
    details.addEventListener('toggle', () => { if (details.open && !loaded) run(render); });
    const save = details.querySelector('[data-look-save]');
    save.addEventListener('click', () => run(async () => {
      if (!name.value.trim()) { name.focus(); status.textContent='Enter a name for this look.'; return; }
      const presets = read();
      await request('/api/profile-looks/save',{name:name.value.trim(), avatar:presets.avatar,banner:presets.banner,accent:presets.accent,nameStyle:presets.nameStyle,profileFrame:presets.profileFrame});
      if (!live()) return;
      name.value='';
      await render();
      if (live()) status.textContent='Look saved to your account.';
    }));
    name.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save.click(); } });
  }
  window.VoidProfileLooks = Object.freeze({mount});
})();
