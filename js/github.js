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
  function pull() {
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
          // Only import if remote is newer than local
          var local = Store.get();
          if (!local.meta.lastUpdated || (remote.meta && remote.meta.lastUpdated && remote.meta.lastUpdated >= local.meta.lastUpdated)) {
            Store.importJSON(text);
          }
        }
        return true;
      });
    });
  }

  // Debounced push of current state.
  function queuePush(state) {
    if (!isConfigured()) return;
    pendingState = state;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(flush, 1500);
  }

  function flush() {
    if (!isConfigured() || pushing || !pendingState) return;
    pushing = true;
    var c = getConfig();
    var content = b64encode(JSON.stringify(pendingState, null, 2));
    var body = { message: 'Update finance data ' + new Date().toISOString(), content: content };
    if (sha) body.sha = sha;
    var doPut = function () {
      return api(c.path, { method: 'PUT', body: JSON.stringify(body) }).then(function (res) {
        if (res.status === 409) { // sha conflict — refetch sha and retry once
          return api(c.path).then(function (r) { return r.json(); }).then(function (j) { sha = j.sha; body.sha = sha; return api(c.path, { method: 'PUT', body: JSON.stringify(body) }); });
        }
        return res;
      });
    };
    doPut().then(function (res) {
      if (res && res.json) return res.json();
    }).then(function (j) {
      if (j && j.content) sha = j.content.sha;
      pushing = false;
      if (window.UI) { /* silent success */ }
    }).catch(function (e) {
      pushing = false;
      console.warn('GitHub push failed', e);
    });
    pendingState = null;
  }

  window.GitHubSync = { getConfig: getConfig, setConfig: setConfig, isConfigured: isConfigured, pull: pull, queuePush: queuePush };
})();
