/** Inline HTML for web config UI - single form with all config fields */
export function getConfigFormHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>gracenote-epg – Config</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 1rem auto; padding: 0 1rem; }
    h1 { font-size: 1.25rem; }
    label { display: block; margin-top: 0.5rem; }
    input, select { width: 100%; box-sizing: border-box; }
    .row { display: flex; gap: 1rem; }
    .row > * { flex: 1; }
    button { margin-top: 1rem; margin-right: 0.5rem; padding: 0.5rem 1rem; }
    .msg { margin-top: 1rem; padding: 0.5rem; border-radius: 4px; }
    .msg.ok { background: #cfc; }
    .msg.err { background: #fcc; }
  </style>
</head>
<body>
  <h1>gracenote-epg – Config</h1>
  <form id="f">
    <fieldset>
      <legend>Grid API</legend>
      <label>lineupId <input name="lineupId" type="text"></label>
      <label>timespan (hours) <input name="timespan" type="text"></label>
      <label>headendId <input name="headendId" type="text"></label>
      <label>country <input name="country" type="text"></label>
      <label>timezone <input name="timezone" type="text"></label>
      <label>device <input name="device" type="text"></label>
      <label>postalCode <input name="postalCode" type="text"></label>
      <label>isOverride <input name="isOverride" type="text"></label>
      <label>pref <input name="pref" type="text"></label>
      <label>userId <input name="userId" type="text"></label>
      <label>aid <input name="aid" type="text"></label>
      <label>languagecode <input name="languagecode" type="text"></label>
    </fieldset>
    <fieldset>
      <legend>App</legend>
      <label>baseUrl <input name="baseUrl" type="url"></label>
      <label>userAgent <input name="userAgent" type="text"></label>
      <label>outputFile <input name="outputFile" type="text"></label>
      <label>cacheFile <input name="cacheFile" type="text"></label>
      <label>archiveDir <input name="archiveDir" type="text"></label>
      <label>scheduleWindowHours (1–168, default 24) <input name="scheduleWindowHours" type="number" min="1" max="168"></label>
      <label>requestDelayMs <input name="requestDelayMs" type="number"></label>
      <label>maxRequestsPerMinute <input name="maxRequestsPerMinute" type="number"></label>
      <label>webUiPort <input name="webUiPort" type="number"></label>
    </fieldset>
    <button type="submit">Save</button>
    <button type="button" id="cancel">Cancel</button>
  </form>
  <div id="msg" class="msg" style="display:none"></div>
  <script>
    const form = document.getElementById('f');
    const msg = document.getElementById('msg');
    function show(s, ok) { msg.textContent = s; msg.className = 'msg ' + (ok ? 'ok' : 'err'); msg.style.display = 'block'; }
    fetch('/api/config').then(r => r.json()).then(c => {
      form.lineupId.value = c.lineupId ?? '';
      form.timespan.value = c.timespan ?? '';
      form.headendId.value = c.headendId ?? '';
      form.country.value = c.country ?? '';
      form.timezone.value = c.timezone ?? '';
      form.device.value = c.device ?? '';
      form.postalCode.value = c.postalCode ?? '';
      form.isOverride.value = c.isOverride ?? '';
      form.pref.value = c.pref ?? '';
      form.userId.value = c.userId ?? '';
      form.aid.value = c.aid ?? '';
      form.languagecode.value = c.languagecode ?? '';
      form.baseUrl.value = c.baseUrl ?? '';
      form.userAgent.value = c.userAgent ?? '';
      form.outputFile.value = c.outputFile ?? '';
      form.cacheFile.value = c.cacheFile ?? '';
      form.archiveDir.value = c.archiveDir ?? '';
      form.scheduleWindowHours.value = c.scheduleWindowHours ?? 24;
      form.requestDelayMs.value = c.rateLimit?.requestDelayMs ?? 1500;
      form.maxRequestsPerMinute.value = c.rateLimit?.maxRequestsPerMinute ?? 20;
      form.webUiPort.value = c.webUiPort ?? 8765;
    }).catch(e => show('Load failed: ' + e.message, false));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const c = {
        lineupId: form.lineupId.value,
        timespan: form.timespan.value,
        headendId: form.headendId.value,
        country: form.country.value,
        timezone: form.timezone.value,
        device: form.device.value,
        postalCode: form.postalCode.value,
        isOverride: form.isOverride.value,
        pref: form.pref.value,
        userId: form.userId.value,
        aid: form.aid.value,
        languagecode: form.languagecode.value,
        baseUrl: form.baseUrl.value,
        userAgent: form.userAgent.value,
        outputFile: form.outputFile.value,
        cacheFile: form.cacheFile.value,
        archiveDir: form.archiveDir.value,
        scheduleWindowHours: Number(form.scheduleWindowHours.value) || 24,
        rateLimit: {
          requestDelayMs: Number(form.requestDelayMs.value),
          maxRequestsPerMinute: Number(form.maxRequestsPerMinute.value)
        },
        webUiPort: Number(form.webUiPort.value)
      };
      fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })
        .then(r => r.json()).then(data => show(data.ok ? 'Saved.' : (data.error || 'Save failed'), data.ok))
        .catch(e => show('Save failed: ' + e.message, false));
    });
    document.getElementById('cancel').onclick = () => location.reload();
  </script>
</body>
</html>`;
}
