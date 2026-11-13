'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // ============================================================
    // ICONS
    // ============================================================
    const P = {
      eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6'
    };
    const ic = (n, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n]}"/></svg>`;

    const BUDDY = (m = 'idle', c = '') => `<svg class="buddy ${m} ${c}" viewBox="0 0 120 120" role="img" aria-label="Buddy the dog"><ellipse cx="60" cy="112" rx="35" ry="6" fill="currentColor" opacity=".1"/><g class="dog-body"><path class="l-ear" d="M30 45C15 25 5 50 15 75Q25 65 35 60Z" fill="var(--ac)"/><path class="r-ear" d="M90 45C105 25 115 50 105 75Q95 65 85 60Z" fill="var(--ac)"/><path d="M30 45C30 15 90 15 90 45 100 75 85 95 60 95 35 95 20 75 30 45Z" fill="#FFE4B5"/><path d="M25 45C25 35 50 35 50 50 50 65 30 65 25 45Z" fill="var(--ac)"/><circle cx="38" cy="48" r="5" fill="#451A03"/><circle cx="82" cy="48" r="5" fill="#451A03"/><circle cx="36.5" cy="46" r="1.5" fill="#fff"/><circle cx="80.5" cy="46" r="1.5" fill="#fff"/><rect class="lid" x="30" y="42" width="16" height="13" fill="var(--ac)"/><rect class="lid" x="74" y="42" width="16" height="13" fill="#FFE4B5"/><ellipse cx="60" cy="72" rx="22" ry="16" fill="#FFF8DC"/><path d="M52 65Q60 62 68 65C68 76 52 76 52 65" fill="#451A03"/><path d="M50 78C55 86 65 86 70 78" stroke="#451A03" stroke-width="2.5" stroke-linecap="round" fill="none"/><path class="tongue" d="M55 81C55 96 65 96 65 81Z" fill="#FF8FA8"/></g></svg>`;

    // ============================================================
    // STATE & STORAGE
    // ============================================================
    const ACC = 'focus-buddy-accounts';
    const SES = 'focus-buddy-session';
    const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
    const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

    // If already logged in, redirect to main app
    if (rd(SES, null)) { router.replace('/'); return; }

    const $ = s => document.querySelector(s);
    let authMode = 'login', signRole = 'child';

    const hashPw = async (e, p) => {
      try {
        const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('fb:' + e + ':' + p));
        return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
      } catch (_) { return 'x:' + btoa(e + ':' + p); }
    };

    let toastTimer;
    const say = m => {
      const t = $('#toast');
      if (!t) return;
      t.textContent = m;
      t.classList.add('on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
    };

    const scLogin = () => {
      const L = authMode === 'login';
      return `<div class="ctr" style="min-height:100%;justify-content:center;padding:8px 0">${BUDDY('idle', 'big')}<h1 class="logo">Focus Buddy</h1>
<div class="card stack" style="width:100%;text-align:left"><div class="seg"><button data-a="auth" data-v="login" class="${L ? 'on' : ''}">Log in</button><button data-a="auth" data-v="signup" class="${L ? '' : 'on'}">Create account</button></div>
${L ? '' : '<div class="field"><label for="a-n">Your name</label><input id="a-n" autocomplete="name" placeholder="e.g. Aarav"></div>'}
<div class="field"><label for="a-e">Email</label><input id="a-e" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com"></div>
<div class="field"><label for="a-p">Password</label><div style="position:relative"><input id="a-p" type="password" autocomplete="${L ? 'current-password' : 'new-password'}" placeholder="${L ? 'Your password' : 'At least 6 characters'}" style="padding-right:56px"><button class="ib" data-a="eye" aria-label="Show password" style="position:absolute;right:4px;top:5px;min-width:40px;height:40px;border:0;background:none">${ic('eye', 20)}</button></div></div>
${L ? '' : `<div class="field"><label>I am a</label><div class="seg"><button id="r-child" data-a="pickRole" data-v="child" class="${signRole === 'child' ? 'on' : ''}">Child</button><button id="r-caregiver" data-a="pickRole" data-v="caregiver" class="${signRole === 'caregiver' ? 'on' : ''}">Caregiver</button></div></div>`}
<p class="err" id="a-err" role="alert" hidden></p>
<button class="btn lg" id="a-go" data-a="authgo">${L ? 'Log in' : 'Create account'}</button>
<p class="sm mu" style="text-align:center">${L ? 'New here?' : 'Already have an account?'} <button class="lnk" data-a="auth" data-v="${L ? 'signup' : 'login'}">${L ? 'Create account' : 'Log in'}</button></p></div></div>`;
    };

    const render = () => { $('#sc').innerHTML = scLogin(); };

    const A = {
      auth: m => { authMode = m; render(); },
      pickRole: r => {
        signRole = r;
        ['child', 'caregiver'].forEach(k => {
          const el = $('#r-' + k);
          if (el) el.classList.toggle('on', k === r);
        });
      },
      eye: (v, b) => {
        const i = $('#a-p'), h = i.type === 'password';
        i.type = h ? 'text' : 'password';
        b.setAttribute('aria-label', h ? 'Hide password' : 'Show password');
      },
      authgo: async () => {
        const su = authMode === 'signup';
        const n = su ? ($('#a-n')?.value || '').trim() : '';
        const e = ($('#a-e')?.value || '').trim().toLowerCase();
        const pw = $('#a-p')?.value || '';
        const er = $('#a-err');
        const b = $('#a-go');
        const fail = (m, id) => {
          er.textContent = m;
          er.hidden = false;
          b.disabled = false;
          if (id) $('#' + id)?.focus();
        };
        if (su && n.length < 2) return fail('Please enter your name.', 'a-n');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return fail('Enter a valid email address.', 'a-e');
        if (pw.length < 6) return fail(su ? 'Password needs at least 6 characters.' : 'Enter your password.', 'a-p');
        b.disabled = true;
        er.hidden = true;
        const h = await hashPw(e, pw);
        const acc = rd(ACC, []);
        let a;
        if (su) {
          if (acc.some(x => x.email === e)) return fail('An account with this email already exists. Try logging in.', 'a-e');
          a = { email: e, name: n, role: signRole, hash: h };
          acc.push(a);
          wr(ACC, acc);
        } else {
          a = acc.find(x => x.email === e && x.hash === h);
          if (!a) return fail('Email or password is incorrect.', 'a-p');
        }
        wr(SES, { email: a.email, name: a.name, role: a.role });
        say(`Welcome, ${a.name}!`);
        setTimeout(() => router.replace('/'), 600);
      }
    };

    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && /^a-/.test(e.target.id || '')) A.authgo();
    });
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      const f = A[b.dataset.a];
      if (f) f(b.dataset.v, b);
    });

    render();
  }, [router]);

  return (
    <>
      <main id="sc" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', WebkitOverflowScrolling: 'touch' }}></main>
      <div id="toast" role="status" aria-live="polite"></div>
    </>
  );
}
