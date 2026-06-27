/* ===========================================================
   github.js — optional GitHub sync (shared data between devices).
   Stores config in localStorage. Reads/writes one JSON file in a
   private repo via the GitHub Contents API. Exposes window.GitHubSync
   =========================================================== */
(function () {
  'use strict';
  var LS = 'afh_github_v1';
  var cfg = null;
  var pushTimer = null, sha = null, pushing = false, pendingState = null;
  var pendingVersion = 0, flushingVersion = -1;

  function getConfig() {
    if (cfg) return cfg;
    try { cfg = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { cfg = null; }
    return cfg;
  }
  function setConfig(c) {
    cfg = c;
    if (c) localStorage.setItem(LS, JSON.stringify(c)); else localStorage.removeItem(LS);
    sha = null;
  }
  function isConfigured() { var c = getConfig(); return !!(c && c.repo && c.token); }

  function api(path, opts) {
    var c = getConfig();
    return fetch('https://api.github.com/repos/' + c.repo + '/contents/' + path, Object.assign({
      headers: { 'Authorization': 'Bearer ' + c.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    }, opts || {}));
  }

  function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64decode(str) { return decodeURIComponent(escape(atob((str || '').replace(/\n/g, '')))); }

  // Pull remote -> import into Store. Returns true if data found.
  // force=true (explicit Save&test / Pull latest) always adopts the cloud copy.
  function pull(force) {
    if (!isConfigured()) return Promise.reject(new Error('not configured'));
    var c = getConfig();
    return api(c.path).then(function (res) {
      if (res.status === 404) return false;
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json().then(function (j) {
        sha = j.sha;
        var text = b64decode(j.content);
        if (text && text.trim()) {
          var remote = JSON.parse(text);
          var local = Store.get();
          var remoteTime = remote.meta && remote.meta.lastUpdated;
          var localTime = local.meta && local.meta.lastUpdated;
          // Import when forced, when this device has no real data yet (fresh
          // device must accept the shared copy), or when remote is newer.
          if (force || !Store.hasUserData(local) || !localTime || (remoteTime && remoteTime >= localTime)) {
            Store.importJSON(text, { keepTimestamp: true });
          }
        }
        return true;
      });
    });
  }

  // Debounced push of current state. State is a singleton mutated in place, so
  // we track a version counter to detect edits that land mid-push.
  function queuePush(state) {
    if (!isConfigured()) return;
    pendingState = state;
    pendingVersion++;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(flush, 1500);
  }

  function flush() {
    if (!isConfigured() || pushing || !pendingState) return;
    pushing = true;
    flushingVersion = pendingVersion;
    var c = getConfig();
    var localTime = pendingState.meta && pendingState.meta.lastUpdated;
    var content = b64encode(JSON.stringify(pendingState, null, 2));
    var body = { message: 'Update finance data ' + new Date().toISOString(), content: content };
    if (sha) body.sha = sha;

    api(c.path, { method: 'PUT', body: JSON.stringify(body) })
      .then(function (res) {
        if (res.status === 409) {
          // Remote changed under us — fetch it and keep whichever is NEWER,
          // instead of blindly clobbering the other device's edits.
          return api(c.path).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
            if (!j) return null;
            sha = j.sha;
            try {
              var remote = JSON.parse(b64decode(j.content));
              var rt = remote.meta && remote.meta.lastUpdated;
              if (rt && (!localTime || rt > localTime)) {
                // Other device is newer — adopt it, skip our overwrite.
                Store.importJSON(JSON.stringify(remote), { keepTimestamp: true });
                return null;
              }
            } catch (e) {}
            // Ours is newer — retry the push with the refreshed sha.
            body.sha = sha;
            return api(c.path, { method: 'PUT', body: JSON.stringify(body) });
          });
        }
        return res;
      })
      .then(function (res) { if (res && res.ok) return res.json().then(function (j) { if (j && j.content) sha = j.content.sha; }); })
      .catch(function (e) { console.warn('GitHub push failed', e); })
      .then(function () {
        pushing = false;
        // Edits arrived while we were pushing? flush again so nothing is lost.
        if (pendingVersion !== flushingVersion) { if (pushTimer) clearTimeout(pushTimer); pushTimer = setTimeout(flush, 600); }
      });
  }

  window.GitHubSync = { getConfig: getConfig, setConfig: setConfig, isConfigured: isConfigured, pull: pull, queuePush: queuePush };
})();
