/* AI Natives: show the real signed-in user's name/initials on all dashboards. */
(function () {
  function readSession() {
    try {
      return JSON.parse(localStorage.getItem('aiNativesLoggedIn') || localStorage.getItem('loggedInUser') || 'null');
    } catch (_) {
      return null;
    }
  }

  function getName(user) {
    if (!user) return 'User';
    return (user.full_name || user.fullName || user.name || user.displayName || user.email || 'User').trim();
  }

  function getRole(user) {
    var role = (user && user.role ? String(user.role) : 'user').toLowerCase();
    if (role === 'admin') return 'System Administrator';
    if (role === 'employer') return 'Employer';
    return 'User';
  }

  function initialsFromName(name) {
    var clean = String(name || 'User').trim();
    if (clean.indexOf('@') > -1) clean = clean.split('@')[0];
    var parts = clean.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function applyUserProfile() {
    var user = readSession();
    if (!user) return;

    var name = getName(user);
    var initials = initialsFromName(name);
    var roleTitle = getRole(user);

    // Store both formats so older/newer scripts can read the same signed-in user.
    try {
      var normalised = Object.assign({}, user, { name: name, full_name: name });
      localStorage.setItem('aiNativesLoggedIn', JSON.stringify(normalised));
      localStorage.setItem('loggedInUser', JSON.stringify(normalised));
    } catch (_) {}

    // User dashboard classes.
    document.querySelectorAll('.user-avatar, .top-avatar').forEach(function (el) {
      el.textContent = initials;
      el.title = name;
    });
    document.querySelectorAll('.user-name').forEach(function (el) {
      el.textContent = name;
    });
    document.querySelectorAll('.user-role').forEach(function (el) {
      el.textContent = roleTitle;
    });

    // Admin dashboard profile chip.
    document.querySelectorAll('.sb-user-av').forEach(function (el) {
      el.textContent = initials;
      el.title = name;
    });
    document.querySelectorAll('.sb-user-meta .n').forEach(function (el) {
      el.textContent = name;
    });
    document.querySelectorAll('.sb-user-role').forEach(function (el) {
      el.textContent = roleTitle;
    });

    // Employer dashboard profile chip.
    document.querySelectorAll('.nuc-av').forEach(function (el) {
      el.textContent = initials;
      el.title = name;
    });
    document.querySelectorAll('.nuc-meta .n').forEach(function (el) {
      el.textContent = name;
    });

    // Generic IDs, if present.
    var profileCircle = document.getElementById('profileCircle');
    if (profileCircle) profileCircle.textContent = initials;
    var profileName = document.getElementById('profileName');
    if (profileName) profileName.textContent = name;

    // Welcome text on user dashboard.
    document.querySelectorAll('.dash-title').forEach(function (el) {
      if (/hello|dashboard/i.test(el.textContent)) el.textContent = 'Hello, ' + name;
    });
    document.querySelectorAll('.dash-sub').forEach(function (el) {
      if (/welcome back/i.test(el.textContent)) el.textContent = "Welcome back, " + name + "! Here's what's happening with your system.";
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyUserProfile);
  } else {
    applyUserProfile();
  }
  window.addEventListener('storage', applyUserProfile);
  window.aiNativesApplyLoggedInUser = applyUserProfile;
})();
