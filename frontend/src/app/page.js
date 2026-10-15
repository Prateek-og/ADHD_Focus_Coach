'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function FocusBuddyApp() {
  const router = useRouter();
  useEffect(() => {
    // Session guard — redirect to login if no session
    const SES = 'focus-buddy-session';
    let sess = null;
    try { sess = JSON.parse(localStorage.getItem(SES)); } catch (e) {}
    if (!sess) { router.replace('/login'); return; }
    // ============================================================
    // ICONS
    // ============================================================
    const P = {
      home:'M3 10.5 12 3l9 7.5V21H3z M9 21v-6h6v6',
      list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
      chart:'M3 21h18M7 21v-8M12 21V7M17 21v-5',
      user:'M20 21a8 8 0 1 0-16 0 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
      sun:'M12 3v2M12 19v2M5 12H3M21 12h-2M6 6 4.5 4.5M19.5 19.5 18 18M6 18l-1.5 1.5M19.5 4.5 18 6 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
      target:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2',
      'arrow-left':'M19 12H5M11 18l-6-6 6-6',
      check:'M20 6 9 17l-5-5',
      bell:'M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8 M13.7 21a2 2 0 0 1-3.4 0',
      plus:'M12 5v14M5 12h14',
      trash:'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
      up:'M12 19V5M5 12l7-7 7 7',
      down:'M12 5v14M19 12l-7 7-7-7',
      x:'M18 6 6 18M6 6l12 12',
      clock:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M12 7v5l3 2',
      star:'M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9z',
      flame:'M12 22a7 7 0 0 0 7-7c0-5-4-6-4-10 0 0-3 1.5-3 5 0-2-2-3-2-3s-5 3-5 8a7 7 0 0 0 7 7z',
      pause:'M9 4v16M15 4v16',
      help:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18 M9.2 9.2a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4 M12 18h.01',
      edit:'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z',
      gift:'M20 12v9H4v-9M2 7h20v5H2zM12 7v14M12 7S10.5 3 8 3a2 2 0 0 0 0 4M12 7s1.5-4 4-4a2 2 0 0 1 0 4',
      arrow:'M5 12h14M13 6l6 6-6 6',
      swap:'M8 4l-4 4 4 4 M4 8h16 M16 20l4-4-4-4 M20 16H4'
    };
    const icon = (n, s=24) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
      style="vertical-align: text-bottom" aria-hidden="true"><path d="${P[n]||''}"/></svg>`;

    // ============================================================
    // DOG BUDDY SVG GENERATOR
    // ============================================================
    const BUDDY = (mood='idle') => `
    <svg class="buddy dog ${mood}" viewBox="0 0 120 120" role="img" aria-label="Buddy the Dog">
      <ellipse cx="60" cy="112" rx="35" ry="6" fill="currentColor" opacity="0.1" />
      <g class="dog-body">
        <!-- Ears -->
        <path class="ear l-ear" d="M30 45 C15 25 5 50 15 75 Q25 65 35 60 Z" fill="var(--accent)"/>
        <path class="ear r-ear" d="M90 45 C105 25 115 50 105 75 Q95 65 85 60 Z" fill="var(--accent)"/>
        <!-- Head Base -->
        <path d="M30 45 C30 15 90 15 90 45 C100 75 85 95 60 95 C35 95 20 75 30 45 Z" fill="#FFE4B5"/>
        <!-- Eye Patch -->
        <path d="M25 45 C25 35 50 35 50 50 C50 65 30 65 25 45 Z" fill="var(--accent)"/>
        <!-- Eyes -->
        <circle cx="38" cy="48" r="5" fill="#451A03"/>
        <circle cx="82" cy="48" r="5" fill="#451A03"/>
        <!-- Catchlights -->
        <circle cx="36.5" cy="46" r="1.5" fill="#FFF"/>
        <circle cx="80.5" cy="46" r="1.5" fill="#FFF"/>
        <!-- Blinking lids -->
        <rect class="lid" x="30" y="42" width="16" height="13" fill="var(--accent)"/>
        <rect class="lid" x="74" y="42" width="16" height="13" fill="#FFE4B5"/>
        <!-- Snout Base -->
        <ellipse cx="60" cy="72" rx="22" ry="16" fill="#FFF8DC"/>
        <!-- Nose -->
        <path d="M52 65 Q60 62 68 65 C68 76 52 76 52 65" fill="#451A03"/>
        <!-- Mouth -->
        <path class="mouth" d="M50 78 C55 86 65 86 70 78" stroke="#451A03" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <!-- Tongue -->
        <path class="tongue" d="M55 81 C55 96 65 96 65 81 Z" fill="#FF8FA8"/>
      </g>
    </svg>`;

    // ============================================================
    // STATE
    // ============================================================
    const KEY='focus-buddy-proto-v2';
    const todayKey=(o=0)=>{const d=new Date();d.setDate(d.getDate()-o);return d.toISOString().slice(0,10);};

    function seed(){
      return {
        role:'child', screen:'login', band:'young', fast:true,
        child:{name:'Aarav', age:8, klass:'Class 3', description:'Loves dogs. Gets stuck when a task feels big.'},
        prefs:['Small steps','Encouragement'],
        points:120,
        tasks:[
          {id:1,title:'Tidy your room',desc:'Before dinner',minutes:15,at:'17:30',priority:'Normal',
           recur:'Daily',reward:'10 min game time',done:false,
           steps:[{t:'Put dirty clothes in the hamper',m:3},{t:'Clear off the desk',m:4},
                  {t:'Put books back on the shelf',m:4},{t:'Make the bed',m:4}]},
          {id:2,title:'Finish maths worksheet',desc:'Questions 1 to 6',minutes:20,at:'18:15',priority:'High',
           recur:'Weekdays',reward:'',done:false,
           steps:[{t:'Get out the worksheet and a pencil',m:2},{t:'Do questions 1 to 3',m:8},
                  {t:'Do questions 4 to 6',m:8},{t:'Check the answers',m:2}]}
        ],
        nextId:3,
        notes:[
          {id:1,type:'TASK_REMINDER',msg:'Tidy your room starts in 15 minutes.',when:'17:15',read:false}
        ],
        feedback:[
          {task:'Practise piano',feel:'Okay',helped:'Small steps',hard:'No',date:todayKey(1)}
        ],
        done:{[todayKey(1)]:2,[todayKey(2)]:1}
      };
    }
    let S = load() || seed();
    let session = null;
    function load(){ try{const r=localStorage.getItem(KEY); return r?JSON.parse(r):null;}catch(e){return null;} }
    function save(){ try{localStorage.setItem(KEY, JSON.stringify(S));}catch(e){} }

    const NAV = {
      child:[{k:'me',l:'Me',i:'user'},{k:'today',l:'Today',i:'sun'},{k:'focus',l:'Focus',i:'target'},{k:'market',l:'Market',i:'gift'}],
      caregiver:[{k:'home',l:'Home',i:'home'},{k:'tasks',l:'Tasks',i:'list'},
                 {k:'progress',l:'Progress',i:'chart'},{k:'child',l:'Child',i:'user'}]
    };
    const say = t => { document.getElementById('live').textContent = t; };

    // ============================================================
    // DIALOG
    // ============================================================
    const scrim=document.getElementById('scrim'), dlg=document.getElementById('dialog');
    let lastFocus=null, onClose=null;
    function openDialog(html, {onclose=null, focus='button'}={}){
      lastFocus=document.activeElement; onClose=onclose;
      dlg.classList.remove('left', 'wide'); delete dlg.dataset.locked;
      dlg.innerHTML=html; scrim.classList.add('open');
      const f=dlg.querySelector(focus)||dlg.querySelector('button'); if(f) f.focus();
    }
    function closeDialog(){
      if(!scrim.classList.contains('open')) return;
      scrim.classList.remove('open'); dlg.innerHTML='';
      if(lastFocus&&lastFocus.isConnected) lastFocus.focus();
      const cb=onClose; onClose=null; if(cb) cb();
    }
    document.addEventListener('keydown', e=>{
      if(!scrim.classList.contains('open')) return;
      if(e.key==='Escape'){ e.preventDefault(); if(!dlg.dataset.locked) closeDialog(); return; }
    });
    scrim.addEventListener('mousedown', e=>{ if(e.target===scrim && !dlg.dataset.locked) closeDialog(); });

    // ============================================================
    // SESSION
    // ============================================================
    const speed = () => S.fast ? 0.06 : 1;

    function startSession(taskId){
      const t=S.tasks.find(x=>x.id===taskId); if(!t) return;
      const w=1/t.steps.length;
      session={
        taskId, fsm:'INITIATED',
        items:t.steps.map((s,i)=>({id:'s'+i, text:s.t, min:s.m, weight:w})),
        progress:0, left:0, tick:null, idle:null, stuck:[], overtime:false
      };
      go('focus');
    }
    function beginStep(){
      session.fsm='ACTIVE'; session.overtime=false;
      session.left=Math.max(20, Math.round(session.items[0].min*60*speed()));
      session.total=session.left;
      clearInterval(session.tick);
      session.tick=setInterval(()=>{
        if(session.fsm!=='ACTIVE') return;
        session.left--;
        if(session.left<=0 && !session.overtime){ session.overtime=true; paintRing(); say('Timer finished. No rush.'); }
        paintRing();
      },1000);
      touch(); render();
    }
    function touch(){
      clearTimeout(session.idle);
      if(session.fsm!=='ACTIVE') return;
      const ms=Math.max(20, Math.round(session.items[0].min*60*0.5*speed()))*1000;
      session.idle=setTimeout(goQuiet, ms);
    }
    function goQuiet(){
      if(!session||session.fsm!=='ACTIVE') return;
      session.fsm='INACTIVE'; render();
      openDialog(`
        <h2 id="dlg-title">${kid()?'Still there?':'Checking in'}</h2>
        <div style="margin:20px 0;">${BUDDY('wait')}</div>
        <p class="muted" style="font-size:1.1rem; margin-bottom:24px;">${kid()?'No rush. Tap when you want to carry on.':'No interaction for a while. Resume whenever you are ready.'}</p>
        <div class="actions">
          <button class="btn lg block" data-a="resume">${kid()?"I'm back!":'Resume'}</button>
          <button class="btn quiet block" data-a="break">Take a break</button>
        </div>`, {onclose:()=>{ if(session&&session.fsm==='INACTIVE'){ session.fsm='ACTIVE'; touch(); render(); } }});
      dlg.querySelector('[data-a="resume"]').onclick=()=>{ session.fsm='ACTIVE'; closeDialog(); touch(); render(); };
      dlg.querySelector('[data-a="break"]').onclick=()=>{ closeDialog(); takeBreak(); };
    }
    function takeBreak(){ session.fsm='BREAK'; clearTimeout(session.idle); render(); say('On a break.'); }
    function resumeBreak(){ session.fsm='ACTIVE'; touch(); render(); }

    function doneStep(){
      const s=session.items.shift();
      session.progress=Math.min(1, session.progress+s.weight);
      addPoints(10);
      if(!session.items.length) return finishSession();
      beginStep();
    }
    function deferStep(){
      if(session.items.length<2){
        openDialog(`<h2 id="dlg-title">This is the last step</h2>
          <p class="muted" style="margin-bottom:24px;">There is nothing to move it behind. Try breaking it into something smaller instead.</p>
          <button class="btn lg block" data-a="smaller">Make it smaller</button>
          <button class="btn quiet block" data-a="close">Keep going</button>`);
        dlg.querySelector('[data-a="smaller"]').onclick=()=>{ closeDialog(); decompose(); };
        dlg.querySelector('[data-a="close"]').onclick=closeDialog;
        return;
      }
      session.items.push(session.items.shift());
      beginStep();
    }
    function askStuck(){
      openDialog(`
        <h2 id="dlg-title">${kid()?"What's tricky?":'What is blocking you?'}</h2>
        <div class="opts" style="margin: 16px 0;">
          <button class="opt" data-r="big">
            <span style="background:var(--primary-wash); color:var(--primary-dark); padding:12px; border-radius:12px;">${icon('list',24)}</span>
            It's too big
          </button>
          <button class="opt" data-r="unclear">
            <span style="background:var(--primary-wash); color:var(--primary-dark); padding:12px; border-radius:12px;">${icon('help',24)}</span>
            I don't understand it
          </button>
        </div>
        <button class="btn quiet block" data-a="close">Never mind</button>`);
      dlg.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{
        const r=b.dataset.r; session.stuck.push(r); closeDialog();
        r==='big' ? decompose() : refine();
      });
      dlg.querySelector('[data-a="close"]').onclick=closeDialog;
    }

    function simulateAI(callback) {
      openDialog(`
        <div style="padding:40px 0; display:flex; flex-direction:column; align-items:center; gap:32px;">
          ${BUDDY('spin')}
          <h2 id="dlg-title">Buddy is thinking...</h2>
        </div>
      `);
      dlg.dataset.locked = '1';
      setTimeout(() => { closeDialog(); callback(); }, 1500);
    }

    function decompose(){
      simulateAI(() => {
        const f=session.items.shift(), half=f.weight/2, m=Math.max(1,Math.round(f.min/2));
        session.items.unshift({id:f.id+'b',text:f.text+' — second half',min:m,weight:half});
        session.items.unshift({id:f.id+'a',text:f.text+' — first half',min:m,weight:half});
        beginStep();
      });
    }
    function refine(){
      simulateAI(() => {
        const f=session.items[0];
        f.text = kid() ? 'Just start: ' + f.text.charAt(0).toLowerCase()+f.text.slice(1) : 'Simplified: ' + f.text;
        beginStep();
      });
    }
    function finishSession(){
      session.fsm='COMPLETED'; clearInterval(session.tick); clearTimeout(session.idle);
      const t=S.tasks.find(x=>x.id===session.taskId); t.done=true;
      const k=todayKey(); S.done[k]=(S.done[k]||0)+1; addPoints(40);
      S.notes.unshift({id:Date.now(),type:'CAREGIVER_UPDATE', msg:`${S.child.name} finished ${t.title}.`, when:'Just now',read:false});
      save(); render(); celebrate(t);
    }
    function endSession(){ if(session){clearInterval(session.tick); clearTimeout(session.idle);} session=null; }

    function celebrate(task){
      const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
      const cols=['#6366f1','#ec4899','#10b981','#f59e0b','#8b5cf6'];
      const bits=reduce?'':Array.from({length:30},(_,i)=>{
        const a=(i/30)*Math.PI*2;
        return `<i style="background:${cols[i%5]};--dx:${Math.cos(a)*180|0}px;--dy:${(Math.sin(a)*180+60)|0}px;--rot:${i*47}deg;animation-delay:${(Math.random()*150)|0}ms"></i>`;
      }).join('');
      openDialog(`
        <div class="burst">${bits}</div>
        <div style="margin:20px 0;">${BUDDY('cheer')}</div>
        <h2 id="dlg-title" style="font-size:2.5rem; color:var(--primary-dark)">${kid()?'You did it!':'Task complete'}</h2>
        <p class="muted" style="font-size:1.2rem">${task.title} — every step finished.${task.reward?`<br><strong style="color:var(--text-main)">Reward earned: ${esc(task.reward)}</strong>`:''}</p>
        <div class="row" style="justify-content:center; margin-bottom:24px;">
          <span class="chip brand">+50 points</span>
          <span class="chip warn">${icon('flame',16)} ${streak()} day streak</span>
        </div>
        <button class="btn lg block" data-a="fb">${kid()?'Tell Buddy how it went':'Give feedback'}</button>`,
        {onclose:()=>{ endSession(); go('today'); }});
      dlg.querySelector('[data-a="fb"]').onclick=()=>{ onClose=null; askFeedback(task); };
    }

    const FB=[
      {k:'feel',q:'How did that feel?',a:['Easy','Okay','A little hard','Very hard']},
      {k:'helped',q:'What helped?',a:['Small steps','Encouragement','The timer','Something else']},
      {k:'hard',q:'Was any step difficult?',a:['Yes','No']}
    ];
    function askFeedback(task, i=0, acc={}){
      const q=FB[i];
      openDialog(`
        <p class="lbl">Question ${i+1} of 3</p>
        <h2 id="dlg-title" style="margin-bottom:24px;">${q.q}</h2>
        <div class="opts">${q.a.map(a=>`<button class="opt" data-v="${esc(a)}">${esc(a)}</button>`).join('')}</div>`,
        {onclose:()=>{ endSession(); go('today'); }});
      dlg.dataset.locked='1';
      dlg.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{
        acc[q.k]=b.dataset.v;
        if(i+1<FB.length) askFeedback(task,i+1,acc);
        else{
          S.feedback.unshift({task:task.title,...acc,date:todayKey()}); learnPrefs(); save();
          openDialog(`
            <div style="margin:20px 0;">${BUDDY('cheer')}</div>
            <h2 id="dlg-title">Thanks!</h2>
            <p class="muted" style="margin-bottom:24px;">Buddy will remember that.</p>
            <button class="btn lg block" data-a="ok">Done</button>`,
            {onclose:()=>{ endSession(); go('today'); }});
          dlg.querySelector('[data-a="ok"]').onclick=closeDialog;
        }
      });
    }
    function learnPrefs(){
      const c={}; S.feedback.forEach(f=>{ if(f.helped&&f.helped!=='Something else') c[f.helped]=(c[f.helped]||0)+1; });
      const top=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
      if(top.length) S.prefs=top;
    }
    function addPoints(n){ S.points+=n; save(); }

    // ============================================================
    // DERIVED DATA
    // ============================================================
    function streak(){
      let n=0, d=new Date();
      if(!S.done[todayKey()]) d.setDate(d.getDate()-1);
      for(;;){ const k=d.toISOString().slice(0,10); if(S.done[k]){n++; d.setDate(d.getDate()-1);} else break; }
      return n;
    }
    const weekCount=()=>[...Array(7)].reduce((a,_,i)=>a+(S.done[todayKey(i)]||0),0);
    const monthCount=()=>[...Array(30)].reduce((a,_,i)=>a+(S.done[todayKey(i)]||0),0);
    const unread=()=>S.notes.filter(n=>!n.read).length;
    const kid=()=>S.role==='child';
    const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const BADGES=[{n:'First step',p:50,i:'check'},{n:'3 day streak',p:150,i:'flame'}, {n:'Ten tasks',p:300,i:'star'},{n:'Helper',p:500,i:'gift'}];

    // ============================================================
    // RENDER
    // ============================================================
    function go(screen){ 
      if(!S.history) S.history = [];
      if(S.screen && S.screen !== screen && S.screen !== 'login') S.history.push(S.screen);
      S.screen=screen; 
      save(); 
      render(); 
    }
    function goBack(){
      if(S.history && S.history.length > 0) {
        S.screen = S.history.pop();
        save();
        render();
      }
    }

    function render(){
      const mainEl=document.querySelector('.main');
      if(mainEl) mainEl.classList.remove('no-scroll');
      document.body.dataset.audience = kid() ? 'kid' : 'adult';
      const appbar = document.querySelector('.appbar');
      const side = document.getElementById('side');
      const tabs = document.getElementById('tabs');
      const bodyEl = document.querySelector('.body');

      if(S.screen === 'login') {
          appbar.style.display = 'none'; side.style.display = 'none'; tabs.style.display = 'none';
          bodyEl.style.gridTemplateColumns = '1fr';
          document.getElementById('screen').innerHTML = scLogin();
          wire(); return;
      }
      
      appbar.style.display = 'flex';
      if(window.innerWidth >= 900) { 
          side.style.display = 'block'; tabs.style.display = 'none'; 
          bodyEl.style.gridTemplateColumns = '260px 1fr';
      } else { 
          side.style.display = 'none'; tabs.style.display = 'grid'; 
          bodyEl.style.gridTemplateColumns = '1fr';
      }

      const nav=NAV[S.role]; if(!nav.some(n=>n.k===S.screen)) S.screen=nav[0].k;

      const navHtml=nav.map(n=>`<button class="tab" data-go="${n.k}" ${S.screen===n.k?'aria-current="page"':''}>
        <span class="ic">${icon(n.i,24)}</span><span style="margin-top:4px">${n.l}</span></button>`).join('');
      side.innerHTML=`<p class="navlbl">${kid()?'Your app':'Caregiver'}</p>${navHtml}`;
      tabs.innerHTML=navHtml;
      tabs.style.gridTemplateColumns=`repeat(${nav.length},1fr)`;

      document.getElementById('ab-avatar').innerHTML = kid()
        ? `<span class="ab-av" style="display:flex;align-items:center;justify-content:center;background:#312e81;border-radius:50%;width:48px;height:48px;">${BUDDY('idle')}</span>`
        : `<span style="width:48px;height:48px;border-radius:50%;background:#312e81;color:#a5b4fc;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(49,46,129,0.3)">${icon('user',24)}</span>`;
      document.getElementById('ab-title').textContent = kid() ? `Hi ${S.child.name}!` : 'Focus Coach';
      document.getElementById('ab-sub').textContent = kid() ? (nav.find(n=>n.k===S.screen)||{}).l : `${S.child.name} · ${S.child.klass}`;

      const roleToggle = document.getElementById('role-toggle');
      if (roleToggle) {
        if (kid()) {
          roleToggle.innerHTML = `${icon('user', 20)} <span class="role-text">Child</span>`;
          roleToggle.setAttribute('title', 'Switch to Caregiver');
          roleToggle.setAttribute('aria-label', 'Switch to Caregiver');
        } else {
          roleToggle.innerHTML = `${icon('home', 20)} <span class="role-text">Caregiver</span>`;
          roleToggle.setAttribute('title', 'Switch to Child');
          roleToggle.setAttribute('aria-label', 'Switch to Child');
        }
      }
      
      const bell=document.getElementById('bell');
      bell.innerHTML=icon('bell',24)+(unread()?`<span class="badge">${unread()}</span>`:'');
      bell.style.display = kid() ? 'none' : '';

      const backBtn = document.getElementById('backBtn');
      const screenEl = document.getElementById('screen');
      if(S.history && S.history.length > 0 && S.screen !== 'login') {
          backBtn.style.display = '';
          backBtn.innerHTML = icon('arrow-left', 24);
          screenEl.style.paddingLeft = '48px';
      } else {
          backBtn.style.display = 'none';
          screenEl.style.paddingLeft = '0';
      }

      document.getElementById('screen').innerHTML = ({
        login:scLogin, today:scToday, focus:scFocus, me:scMe, market:scMarket,
        home:scHome, tasks:scTasks, progress:scProgress, child:scChild
      })[S.screen]();

      document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
      wire();
      if(S.screen==='focus'&&session&&session.fsm!=='INITIATED') paintRing();
    }

    /* ---------- LOGIN ---------- */
    function scLogin(){
      return `
      <div class="focus-wrap" style="padding-top:var(--s10); min-height: 85vh; justify-content: center;">
        <div style="transform: scale(1.3); margin-bottom: 24px;">
            ${BUDDY('idle')}
        </div>
        <h1 style="font-size: 3.5rem; margin-bottom: 12px; background: linear-gradient(135deg, var(--primary), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.05));">Focus Buddy</h1>
        <p class="muted" style="max-width:340px; font-size: 1.25rem; font-weight: 700; color:var(--text-main);">Your personal coaching dog for getting things done.</p>
        <div class="glass-card stack" style="margin-top:var(--s8); width: 100%; max-width: 400px; text-align: center;">
          <p class="lbl" style="margin-bottom:var(--s2); font-size: 0.9rem;">Who is using the app?</p>
          <button class="btn lg block" data-a="login-child">I am a Child</button>
          <button class="btn quiet lg block" data-a="login-caregiver">I am a Caregiver</button>
        </div>
      </div>`;
    }

    /* ---------- CHILD: Today ---------- */
    function scToday(){
      const left=S.tasks.filter(t=>!t.done);
      return `
      <div class="today-layout">
        <div class="glass-card full-height-card hero">
          <h2 style="align-self:flex-start; width:100%; text-align:left;">Avatar</h2>
          <div style="margin:auto; transform: scale(1.5);">
            ${BUDDY(left.length?'idle':'cheer')}
          </div>
          <div style="text-align:center; margin-top:20px;">
             <h3>${left.length?`${left.length} things to do`:'All done today!'}</h3>
          </div>
        </div>
        <div class="glass-card full-height-card">
          <h2>Todays task</h2>
          <div class="tasklist flex-1" style="margin-top:20px;">
            ${S.tasks.map(t=>`
              <div class="task">
                <span class="icon ${t.done?'done':''}">${icon(t.done?'check':'target',28)}</span>
                <div class="meta">
                  <div class="t">${esc(t.title)}</div>
                  <div class="s">${t.minutes} min</div>
                </div>
                ${t.done?'<span class="chip ok">Done!</span>':`<button class="btn" data-start="${t.id}">Start</button>`}
              </div>`).join('')}
          </div>
        </div>
      </div>`;
    }

    /* ---------- CHILD: Focus ---------- */
    function scFocus(){
      if(!session){
        const left=S.tasks.filter(t=>!t.done);
        return `<div class="focus-layout" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding-bottom:25vh;">
          <h2>Nothing running</h2>
          <p style="font-size:1.15rem; margin:16px 0 24px;">${left.length?'Choose a mission from Today to start.':'Everything is finished for today.'}</p>
          <button class="btn" data-go="today">Go to Today</button>
        </div>`;
      }
      const t=S.tasks.find(x=>x.id===session.taskId);

      if(session.fsm==='COMPLETED' || !session.items.length){
        return `<div class="focus-layout" style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding-bottom:25vh;">
          ${BUDDY('cheer')}
          <h2>${esc(t.title)} is finished</h2>
          <p style="font-size:1.15rem; margin:16px 0 24px;">Every step done.</p>
          <button class="btn" data-go="today">Back to Today</button></div>`;
      }
      if(session.fsm==='INITIATED'){
        return `<div class="focus-layout">
          <div class="glass-card full-height-card hero">
            <h2 style="align-self:flex-start; width:100%; text-align:left;">Avatar</h2>
            <p class="small muted" style="position:absolute; top:20px; right:20px; max-width:120px; text-align:right;">Avatar can be removed and minimised</p>
            <div style="margin:auto; transform: scale(1.5);">
              ${BUDDY('idle')}
            </div>
          </div>
          <div class="focus-main">
            <h1>${esc(t.title)}</h1>
            <p class="muted" style="font-size:1.15rem; margin-bottom: 20px;">Buddy split this into ${session.items.length} small steps.</p>
            <div class="stack flex-1" style="width:100%;max-width:420px; overflow-y:auto; margin-bottom: 20px;">
              ${session.items.map((s,i)=>`<div class="rowitem">
                <span class="chip brand">${i+1}</span><span class="push" style="font-weight:700;">${esc(s.text)}</span>
                <span class="small muted tnum">${s.min}m</span></div>`).join('')}
            </div>
            <div class="actions">
              <button class="btn lg block" data-a="begin">Let's go</button>
              <button class="btn quiet block" data-a="quit">Not now</button>
            </div>
          </div>
        </div>`;
      }
      if(session.fsm==='BREAK'){
        return `<div class="focus-layout">
          <div class="glass-card full-height-card hero">
            <h2 style="align-self:flex-start; width:100%; text-align:left;">Avatar</h2>
            <div style="margin:auto; transform: scale(1.5);">
              ${BUDDY('wait')}
            </div>
          </div>
          <div class="focus-main">
            <h1>Break time</h1>
            <p class="muted" style="font-size:1.15rem; margin-bottom: 20px;">Your step is saved. Come back when you are ready.</p>
            <div class="card flat" style="width:100%;max-width:420px; margin-bottom: 20px;">
              <p class="lbl">Waiting for you</p><p style="font-size:1.2rem; font-weight:700;">${esc(session.items[0].text)}</p>
            </div>
            <div class="actions"><button class="btn lg block" data-a="resume">I'm ready</button></div>
          </div>
        </div>`;
      }
      const doneCount=Math.round(session.progress*100);
      return `<div class="focus-layout">
        <div class="glass-card full-height-card hero">
          <h2 style="align-self:flex-start; width:100%; text-align:left;">Avatar</h2>
          <p class="small muted" style="position:absolute; top:20px; right:20px; max-width:120px; text-align:right;">Avatar can be removed and minimised</p>
          <div style="margin:auto; transform: scale(1.5);">
            ${BUDDY('idle')}
          </div>
        </div>
        <div class="focus-main">
          <div class="ring" id="ring" style="margin:auto; transform: scale(1.2);">
            <svg viewBox="0 0 120 120"><circle class="track" cx="60" cy="60" r="52"/><circle class="prog" id="prog" cx="60" cy="60" r="52"/></svg>
            <span class="inner"><span class="time tnum" id="tleft">0:00</span><span class="cap" id="tcap">left</span></span>
          </div>
          <div class="focus-prog">
            <div style="text-align:center; margin-bottom:8px; font-weight:bold;">Progress bar of the tasks</div>
            <p class="step-text" style="text-align:center; margin-bottom:12px; font-size:1.2rem;">${esc(session.items[0].text)}</p>
            <div class="bar"><i style="width:${doneCount}%"></i></div>
            <div class="actions" style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
               <button class="btn" data-a="done">${icon('check',24)} Step done</button>
               <button class="btn quiet" data-a="stuck">I'm stuck</button>
               <button class="btn quiet" data-a="break">${icon('pause',20)} Break</button>
               <button class="btn soft" data-a="defer">Later</button>
            </div>
          </div>
        </div>
      </div>`;
    }

    function paintRing(){
      const c=document.getElementById('prog'), t=document.getElementById('tleft'),
            cap=document.getElementById('tcap'), ring=document.getElementById('ring');
      if(!c||!session) return;
      const C=2*Math.PI*52;
      const frac=session.overtime?0:Math.max(0,Math.min(1,session.left/session.total));
      c.style.strokeDasharray=C; c.style.strokeDashoffset=C*(1-frac);
      const s=Math.abs(session.left);
      t.textContent=`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
      if(session.overtime){ ring.classList.add('over'); cap.textContent='no rush'; }
      else{ ring.classList.remove('over'); cap.textContent='left'; }
      const buddy = document.querySelector('.focus-layout .buddy');
      if (buddy) {
          if (session.overtime) buddy.setAttribute('class', 'buddy dog wait');
          else if (session.left < 10) buddy.setAttribute('class', 'buddy dog cheer');
          else buddy.setAttribute('class', 'buddy dog idle');
      }
    }

    /* ---------- CHILD: Me ---------- */
    function scMe(){
      return `
      <div class="me-layout">
        <div class="glass-card hero full-height-card">
          <div style="position:absolute; top: 20px; right: 20px; font-size: 1.2rem; font-weight: bold;">${esc(S.child.name)}</div>
          <h2 style="align-self:flex-start; width:100%; text-align:left;">Avatar</h2>
          <div style="margin:auto; transform: scale(1.5);">
             ${BUDDY('idle')}
          </div>
        </div>
        <div class="glass-card streak-card">
          <h2>Week streak</h2>
          <div class="stats" style="margin-top: 10px;">
            <div class="stat"><div class="v tnum">${streak()}</div><div class="k">Day streak</div></div>
          </div>
        </div>
        <div class="glass-card rewards-card full-height-card">
          <h2 style="text-align:center;">Rewards</h2>
          <div class="badges flex-1" style="margin-top: 20px; display:flex; flex-direction:column; gap:10px;">
            ${BADGES.map(b=>`<div class="badge-t ${S.points>=b.p?'':'locked'}" style="width:100%; flex-direction:row; padding:10px; justify-content:flex-start;">
              <span class="m" style="width:40px;height:40px;flex:none;">${icon(b.i,20)}</span>
              <span class="n" style="flex:1;text-align:left;padding-left:10px;">${b.n}</span>
              <span class="small muted tnum">${b.p} pts</span></div>`).join('')}
          </div>
        </div>
      </div>`;
    }

    /* ---------- CHILD: Market ---------- */
    function scMarket(){
      const tab = S.marketTab || 'buddies';
      return `
      <div class="market-layout">
        <div class="glass-card full-height-card">
          <div class="row" style="border-bottom: 2px solid var(--border); padding-bottom: 10px; margin-bottom: 20px;">
            <h3 class="push mtab" data-mtab="buddies" style="cursor:pointer; border-right: 2px solid var(--border); text-align:center; ${tab==='buddies'?'color:var(--text-main); font-weight:800;':'color:var(--text-muted); font-weight:600;'}">Buddies</h3>
            <h3 class="push mtab" data-mtab="accessories" style="cursor:pointer; text-align:center; ${tab==='accessories'?'color:var(--text-main); font-weight:800;':'color:var(--text-muted); font-weight:600;'}">Accessories</h3>
          </div>
          <div class="grid2 flex-1" style="grid-template-columns: repeat(3, 1fr); align-content: start;">
             ${[...Array(6)].map((_,i)=>`
               <div style="aspect-ratio:1; background:var(--sunken); border: 2px solid var(--border); border-radius:16px; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-weight:bold; font-size: 1.2rem;">
                 ${tab === 'buddies' ? 'Buddy ' + (i+1) : 'Acc ' + (i+1)}
               </div>
             `).join('')}
          </div>
        </div>
        <div class="glass-card full-height-card hero" style="position:relative;">
          <div class="chip brand" style="position:absolute; top:20px; right:20px; font-size:1.2rem; padding: 10px 20px;">
             Points: ${S.points}
          </div>
          <h2 style="align-self:flex-start; width:100%; text-align:left;">Avatar</h2>
          <div style="margin:auto; transform: scale(1.5);">
             ${BUDDY('idle')}
          </div>
        </div>
      </div>`;
    }

    /* ---------- CAREGIVER: Home ---------- */
    function scHome(){
      const done=S.tasks.filter(t=>t.done).length;
      setTimeout(()=>{
        const mainEl=document.querySelector('.main');
        if(mainEl) mainEl.classList.add('no-scroll');
      },0);
      return `
      <div class="home-layout" style="padding: 0 40px;">
        <div class="home-header" style="margin-bottom: var(--s10); min-height: var(--tap);">
          <h1 class="push">Today</h1>
        </div>
        <div class="stat"><div class="v tnum">${streak()}</div><div class="k">Day streak</div></div>
        <div class="stat"><div class="v tnum">${weekCount()}</div><div class="k">Finished this week</div></div>
        <div class="stat"><div class="v tnum">${S.tasks.length-done}</div><div class="k">Still to do</div></div>
        <div class="glass-card home-card home-card-wide" style="margin-top: var(--s6);">
          <div class="row" style="margin-bottom:var(--s6);flex:none;"><h2 class="push">Today's tasks</h2>
            <button class="btn sm soft" data-go="tasks">Manage</button></div>
          <div class="card-body">
            ${S.tasks.map(t=>`<div class="rowitem" style="padding:16px; margin-bottom:var(--s3);">
              <span class="chip ${t.done?'ok':''}">${t.at}</span>
              <span class="push" style="font-weight:700;">${esc(t.title)}</span>
              ${t.done?'<span class="chip ok">Done</span>':`<span class="chip">${esc(t.priority)}</span>`}
            </div>`).join('')}
          </div>
        </div>
        <div class="glass-card home-card" style="margin-top: var(--s6);">
          <div class="row" style="margin-bottom:var(--s6);flex:none;"><h2 class="push">Recent updates</h2>
            ${unread()?`<button class="btn sm quiet" data-a="readall">Mark all read</button>`:''}</div>
          <div class="card-body">
            ${S.notes.slice(0,4).map(n=>`<div class="note ${n.read?'read':''}">
              <span class="dot"></span>
              <div><div style="font-weight:700; margin-bottom:4px;">${esc(n.msg)}</div>
              <div class="small muted">${esc(n.type.replace(/_/g,' ').toLowerCase())} · ${esc(n.when)}</div></div>
            </div>`).join('')}
          </div>
        </div>
      </div>`;
    }

    /* ---------- CAREGIVER: Tasks ---------- */
    function scTasks(){
      return `
      <div style="padding: 0 40px;">
        <div class="row" style="margin-bottom: var(--s10);"><h1 class="push">Tasks</h1>
          <button class="btn" data-a="new">${icon('plus',20)} New Task</button></div>
        <div id="task-form-container" style="margin-bottom: 24px;"></div>
        <div class="tasklist">
          ${S.tasks.map((t,i)=>`
            <div class="task">
              <div class="meta">
                <div class="t">${esc(t.title)}</div>
                <div class="s">${t.at} • ${t.minutes} min • ${esc(t.recur)} • ${esc(t.priority)} priority${t.reward?` • ${esc(t.reward)}`:''}</div>
                <div class="s" style="margin-top:8px;"><span class="chip">${t.steps.length} steps</span>${t.desc?` <span style="margin-left:8px;">${esc(t.desc)}</span>`:''}</div>
              </div>
              <div class="row" style="gap:12px;">
                <button class="iconbtn" style="min-width:40px;min-height:40px" data-edit="${t.id}">${icon('edit',18)}</button>
                <button class="iconbtn" style="min-width:40px;min-height:40px;color:var(--bad);" data-del="${t.id}">${icon('trash',18)}</button>
              </div>
            </div>`).join('')}
        </div>
        ${S.tasks.length?'':`<div class="empty">${icon('list',48)}<h2 style="margin-top:16px;">No tasks yet</h2>
           <p style="margin:16px 0 24px;">Add the first routine.</p><button class="btn lg" data-a="new">Add a task</button></div>`}
      </div>`;
    }
    function taskForm(t){
      const d=t||{title:'',desc:'',minutes:10,at:'17:00',priority:'Normal',recur:'Daily',reward:''};
      const html = `
        <div class="glass-card stack" style="text-align:left; border: 2px solid var(--primary); padding: var(--s6);">
          <h2 style="margin-bottom: 8px;">${t?'Edit task':'New task'}</h2>
          <div class="grid2">
            <div class="field"><label for="f-t">Title</label><input id="f-t" value="${esc(d.title)}" placeholder="e.g. Tidy your room"></div>
            <div class="field"><label for="f-d">Description</label><input id="f-d" value="${esc(d.desc)}" placeholder="Optional details"></div>
          </div>
          <div class="grid2">
            <div class="field"><label for="f-at">Start time</label><input id="f-at" type="time" value="${d.at}"></div>
            <div class="field"><label for="f-m">Minutes</label><input id="f-m" type="number" min="1" max="90" value="${d.minutes}"></div>
            <div class="field"><label for="f-p">Priority</label><select id="f-p">
              ${['Low','Normal','High'].map(p=>`<option ${p===d.priority?'selected':''}>${p}</option>`).join('')}</select></div>
            <div class="field"><label for="f-r">Repeats</label><select id="f-r">
              ${['Daily','Weekdays','Weekly','3x a week'].map(p=>`<option ${p===d.recur?'selected':''}>${p}</option>`).join('')}</select></div>
          </div>
          <div class="field"><label for="f-rw">Reward (optional)</label><input id="f-rw" value="${esc(d.reward)}" placeholder="e.g. 10 min game time"></div>
          <div style="display:flex; justify-content:flex-end; gap:16px; margin-top:24px;">
            <button class="btn quiet" id="inline-cancel">Cancel</button>
            <button class="btn" id="inline-save">Save task</button>
          </div>
        </div>`;
      const container = document.getElementById('task-form-container');
      if(!container) return;
      container.innerHTML = html;
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const titleInput = document.getElementById('f-t');
      if(titleInput) titleInput.focus();
      document.getElementById('inline-cancel').onclick = () => { container.innerHTML = ''; };
      document.getElementById('inline-save').onclick=()=>{
        const v=id=>document.getElementById(id).value;
        const title=v('f-t').trim(); if(!title){ document.getElementById('f-t').focus(); return; }
        const rec={title,desc:v('f-d').trim(),minutes:+v('f-m')||10,at:v('f-at'), priority:v('f-p'),recur:v('f-r'),reward:v('f-rw').trim()};
        if(t) Object.assign(t,rec);
        else S.tasks.push({id:S.nextId++,...rec,done:false, steps:[{t:'Get everything you need',m:2},{t:'Do the main part',m:Math.max(2,(+v('f-m')||10)-4)}, {t:'Tidy up and check',m:2}]});
        save(); render(); say(t?'Task saved':'Task added');
      };
    }

    /* ---------- CAREGIVER: Progress ---------- */
    function scProgress(){
      const span=S.span||'week'; const n=span==='day'?1:span==='week'?7:30;
      const days=[...Array(n)].map((_,i)=>({k:todayKey(n-1-i), v:S.done[todayKey(n-1-i)]||0}));
      const max=Math.max(1,...days.map(d=>d.v)); const shown=span==='month'?days.slice(-14):days;
      const total=span==='day'?days[0].v:span==='week'?weekCount():monthCount();
      const best=Object.keys(S.done).length;
      const line = streak()>=3 ? `${S.child.name} has kept going ${streak()} days in a row — the longest stretch so far this month.` : streak()>0 ? `A ${streak()} day streak is running. Short stretches are normal at this stage.` : `No streak at the moment. The last finished task was ${Object.keys(S.done).length?'recently':'a while ago'} — a new one can start today.`;
      const helped={}; S.feedback.forEach(f=>{ if(f.helped) helped[f.helped]=(helped[f.helped]||0)+1; });
      const pats=Object.entries(helped).sort((a,b)=>b[1]-a[1]);
      return `
      <div style="padding: 0 40px; padding-bottom: 40px;">
        <div class="row" style="margin-bottom: var(--s10); min-height: var(--tap);"><h1 class="push">Progress</h1>
          <div class="row" style="gap:var(--s1)">
            ${['day','week','month'].map(s=>`<button class="btn sm ${s===span?'':'quiet'}" data-span="${s}">${s[0].toUpperCase()+s.slice(1)}</button>`).join('')}
          </div></div>
        <div class="stats" style="margin-bottom: 24px;">
          <div class="stat"><div class="v tnum">${total}</div><div class="k">Tasks finished</div></div>
          <div class="stat"><div class="v tnum">${streak()}</div><div class="k">Day streak</div></div>
          <div class="stat"><div class="v tnum">${best}</div><div class="k">Active days logged</div></div>
        </div>
        <div class="glass-card stack" style="margin-bottom: 24px;">
          <h3>Last ${shown.length} days</h3>
          <div class="chart">
            ${shown.map(d=>`<div class="col ${d.v?'':'empty'}">
              <span class="v tnum">${d.v||''}</span>
              <span class="b" style="height:${d.v?Math.max(12,d.v/max*100):4}%"></span>
              <span class="k">${new Date(d.k+'T00:00:00').toLocaleDateString(undefined,{weekday:'narrow'})}</span>
            </div>`).join('')}
          </div>
          <div class="card flat"><p style="font-weight:600;">${esc(line)}</p></div>
        </div>
        <h2 style="margin-bottom: 16px; margin-top: 16px;">AI Insights &amp; Analytics</h2>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
          <div class="glass-card stack" style="grid-column: 1 / -1; display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 24px;">
             <div class="stack">
               <h3 style="display:flex; align-items:center; gap:8px; font-size:1.25rem;">${icon('sun',20)} Golden Hour</h3>
               <p style="font-size: 1.1rem;">Tasks before <strong>6 PM</strong> have a <strong>78%</strong> completion rate.</p>
               <button class="btn sm" style="align-self:flex-start;">Shift tasks to optimal time</button>
             </div>
             <div class="stack" style="border-left: 1px solid var(--border); padding-left: 24px;">
               <h3 style="display:flex; align-items:center; gap:8px; font-size:1.25rem;">${icon('clock',20)} Time Estimate Accuracy</h3>
               <p>Parent estimate: <strong>20m</strong><br>Actual average: <strong style="color:var(--warn-ink);">35m</strong></p>
               <button class="btn sm quiet" style="align-self:flex-start;">Suggest better durations</button>
             </div>
          </div>
          <div class="glass-card stack">
             <h3 style="display:flex; align-items:center; gap:8px;">Starting vs Finishing</h3>
             <p>Time to start first step: <strong>12 mins</strong>.</p>
             <p class="small muted">High difficulty starting, but normal completion once started.</p>
          </div>
          <div class="glass-card stack">
             <h3 style="display:flex; align-items:center; gap:8px;">Where they get stuck</h3>
             <p>Most sessions stop at <strong>Step 3</strong>.</p>
             <p class="small muted">Typically deferred or abandoned.</p>
          </div>
          <div class="glass-card stack">
             <h3 style="display:flex; align-items:center; gap:8px;">Task Size Analysis</h3>
             <p><strong>4+ step</strong> tasks are deferred 40% more often.</p>
             <p class="small muted">Parent will be warned during creation.</p>
          </div>
          <div class="glass-card stack">
             <h3 style="display:flex; align-items:center; gap:8px;">Stuck Reason Analysis</h3>
             <p>Motivation / Feeling issues are <strong>increasing</strong>.</p>
             <div style="height: 12px; background: rgba(0,0,0,0.05); border-radius: 6px; display:flex; overflow:hidden; margin: 8px 0;">
                <div style="width: 20%; background: var(--ok);"></div>
                <div style="width: 60%; background: var(--warn);"></div>
                <div style="width: 20%; background: var(--primary);"></div>
             </div>
             <div class="small muted" style="display:flex; justify-content:space-between; font-weight:700;">
               <span style="color:var(--ok-ink);">Thinking</span> <span style="color:var(--warn-ink);">Motivation</span> <span style="color:var(--primary-dark);">Environment</span>
             </div>
          </div>
          <div class="glass-card stack">
             <h3 style="display:flex; align-items:center; gap:8px;">Independence Tracking</h3>
             <p>Help requests are <strong>decreasing</strong>.</p>
             <p class="small muted">-12% this week compared to last week.</p>
          </div>
          <div class="glass-card stack">
             <h3 style="display:flex; align-items:center; gap:8px;">Reward Effectiveness</h3>
             <p>Rewards are becoming <strong>less effective</strong>.</p>
             <p class="small muted">Task completion with rewards dropped 8% this month.</p>
          </div>
          <div class="glass-card stack" style="grid-column: 1 / -1; display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; padding: 24px;">
             <div class="stack">
               <h3 style="display:flex; align-items:center; gap:8px; font-size:1.25rem;">Child Self-Assessment</h3>
               <p>Child says: <em>"timer helps"</em></p>
               <p class="small muted">App confirms: Timed sessions have <strong>20% higher</strong> completion.</p>
             </div>
             <div class="stack" style="border-left: 1px solid var(--border); padding-left: 24px;">
               <h3 style="display:flex; align-items:center; gap:8px; font-size:1.25rem;">Difficulty vs Reality</h3>
               <p>Child consistently rates Maths as <em>"Very hard"</em>, but finishes in under 10 minutes with no deferrals.</p>
               <p class="small" style="color:var(--warn-ink); font-weight:700; background:var(--warn-wash); padding:4px 8px; border-radius:8px; display:inline-block; align-self:flex-start;">Mismatch flagged</p>
             </div>
          </div>
        </div>
      </div>`;
    }

    /* ---------- CAREGIVER: Child ---------- */
    function scChild(){
      return `
      <div style="padding: 0 40px; padding-bottom: 40px;">
        <div class="row" style="margin-bottom: var(--s10); min-height: var(--tap);"><h1 class="push">Child profile</h1></div>
        <div class="glass-card stack">
          <div class="grid2">
            <div class="field"><label for="c-n">Name</label><input id="c-n" value="${esc(S.child.name)}"></div>
            <div class="field"><label for="c-a">Age</label><input id="c-a" type="number" min="5" max="16" value="${S.child.age}"></div>
            <div class="field"><label for="c-c">Class</label><input id="c-c" value="${esc(S.child.klass)}"></div>
          </div>
          <div class="field"><label for="c-d">What should the coach know?</label>
            <textarea id="c-d">${esc(S.child.description)}</textarea></div>
          <button class="btn" style="align-self:flex-start;" data-a="savechild">Save profile</button>
        </div>
        <div class="glass-card stack" style="margin-top: 24px;">
          <h3>What the coach has learned</h3>
          <div class="row wrap">${S.prefs.map(p=>`<span class="chip grape" style="padding-right:8px;">${esc(p)}
            <button class="iconbtn" data-rmpref="${esc(p)}" aria-label="Remove ${esc(p)}"
              style="min-width:24px;min-height:24px;border-radius:50%;margin-left:6px;background:rgba(255,255,255,0.2);color:white;border:none;box-shadow:none;">${icon('x',14)}</button></span>`).join('')}</div>
          <p class="small muted">Kept to three at most, counted from the child's answers. You can remove any of them.</p>
        </div>
      </div>`;
    }

    // ============================================================
    // WIRING
    // ============================================================
    function wire(){
      const on=(sel,fn)=>document.querySelectorAll(sel).forEach(fn);
      on('[data-start]',b=>b.onclick=()=>startSession(+b.dataset.start));
      on('[data-mtab]',b=>b.onclick=()=>{S.marketTab=b.dataset.mtab; save(); render();});
      on('[data-span]',b=>b.onclick=()=>{S.span=b.dataset.span; save(); render();});
      on('[data-edit]',b=>b.onclick=()=>taskForm(S.tasks.find(t=>t.id===+b.dataset.edit)));
      on('[data-del]',b=>b.onclick=()=>{
        const t=S.tasks.find(x=>x.id===+b.dataset.del);
        openDialog(`<h2 id="dlg-title">Delete this task?</h2>
          <p class="muted" style="margin-bottom:24px;">${esc(t.title)} will be removed, along with its steps.</p>
          <div class="actions"><button class="btn danger lg block" data-a="yes">Delete</button>
          <button class="btn quiet block" data-a="no">Keep it</button></div>`);
        dlg.querySelector('[data-a="no"]').onclick=closeDialog;
        dlg.querySelector('[data-a="yes"]').onclick=()=>{
          S.tasks=S.tasks.filter(x=>x.id!==t.id); if(session&&session.taskId===t.id) endSession();
          save(); closeDialog(); render(); say('Task deleted');
        };
      });
      on('[data-rmpref]',b=>b.onclick=()=>{ S.prefs=S.prefs.filter(p=>p!==b.dataset.rmpref); save(); render(); });

      const act=a=>document.querySelector(`.page [data-a="${a}"]`);
      const bind=(a,fn)=>{const el=act(a); if(el) el.onclick=fn;};
      
      bind('login-child', () => { setRoleAndBand('child', 'young'); });
      bind('login-caregiver', () => { setRoleAndBand('caregiver', 'young'); });
      bind('new',()=>taskForm(null));
      bind('readall',()=>{S.notes.forEach(n=>n.read=true); save(); render();});
      bind('savechild',()=>{
        S.child.name=document.getElementById('c-n').value.trim()||S.child.name;
        S.child.age=+document.getElementById('c-a').value||S.child.age;
        S.child.klass=document.getElementById('c-c').value.trim();
        S.child.description=document.getElementById('c-d').value.trim();
        save(); render(); say('Profile saved');
      });
      bind('begin',()=>beginStep()); bind('quit',()=>{ endSession(); go('today'); });
      bind('resume',()=>resumeBreak()); bind('done',()=>doneStep());
      bind('stuck',()=>askStuck()); bind('break',()=>takeBreak()); bind('defer',()=>deferStep());
      
      window.addEventListener('resize', () => {
         if(S.screen !== 'login') {
             const bodyEl = document.querySelector('.body');
             if(window.innerWidth >= 900) { 
                 document.getElementById('side').style.display = 'block'; document.getElementById('tabs').style.display = 'none'; 
                 bodyEl.style.gridTemplateColumns = '260px 1fr';
             } else { 
                 document.getElementById('side').style.display = 'none'; document.getElementById('tabs').style.display = 'grid'; 
                 bodyEl.style.gridTemplateColumns = '1fr';
             }
         }
      });
    }

    const pc=(id,fn)=>{ const el=document.getElementById(id); if(el) el.onclick=fn; };
    function toggleRole() {
      if (kid()) {
        setRoleAndBand('caregiver', S.band);
      } else {
        setRoleAndBand('child', S.band);
      }
    }
    function setRoleAndBand(r, b) {
        S.role = r; S.band = b; S.child.age = b==='young'?8:12; S.child.klass = b==='young'?'Class 3':'Class 7';
        S.screen = NAV[r][0].k;
        save(); render();
    }

    // Make toggleRole available globally for the button onclick
    window.toggleRole = toggleRole;
    window.goBack = goBack;

    pc('pc-logout',()=>{ endSession(); try { localStorage.removeItem('focus-buddy-session'); } catch(e){} router.replace('/login'); say('Logged out'); });

    render();
  }, []);

  return (
    <>
      <div id="proto">
        <span className="tag">Prototype controls</span>
        <span className="spacer"></span>
        <div className="grp">
          <button id="pc-logout">Log Out</button>
        </div>
      </div>

      <div className="app">
        <header className="appbar">
          <div className="who">
            <span id="ab-avatar"></span>
            <div style={{minWidth:0}}>
              <div className="nm" id="ab-title">Focus Buddy</div>
              <div className="sub" id="ab-sub">Today</div>
            </div>
            <button id="role-toggle" className="role-pill-btn" onClick={() => window.toggleRole && window.toggleRole()} title="Switch mode" aria-label="Switch mode"></button>
          </div>
          <span className="push"></span>
          <button className="iconbtn" id="bell" aria-label="Notifications"></button>
        </header>

        <div className="body">
          <nav className="side" id="side" aria-label="Sections"></nav>
          <main className="main" style={{position:'relative'}}>
            <button className="iconbtn" id="backBtn" aria-label="Go back" style={{display:'none', position:'absolute', top:'var(--s4)', left:'var(--s4)', zIndex:50}} onClick={() => window.goBack && window.goBack()}></button>
            <div className="page" id="screen"></div>
          </main>
        </div>

        <nav className="tabs" id="tabs" aria-label="Sections"></nav>
      </div>

      <div className="scrim" id="scrim"><div className="dialog" id="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title"></div></div>
      <p className="sr" id="live" role="status" aria-live="polite"></p>
    </>
  );
}
