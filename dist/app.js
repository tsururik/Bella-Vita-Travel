'use strict';
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionQuery.matches;
  const hasGsap = typeof gsap !== 'undefined';
  let lenis = null;
  if (!reduced && typeof Lenis !== 'undefined') {
    lenis = new Lenis({duration:1.15, smoothWheel:true, syncTouch:false, anchors:false});
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(time => lenis?.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = time => {lenis?.raf(time); requestAnimationFrame(raf);}; requestAnimationFrame(raf);
    }
  }
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  const goTo = (target, immediate = false) => {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, {offset:0, immediate, duration:1.6});
    else el.scrollIntoView({behavior: reduced || immediate ? 'instant' : 'smooth'});
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const el = $(a.getAttribute('href')); if (!el) return;
    e.preventDefault(); goTo(el); history.replaceState(null, '', a.getAttribute('href'));
  }));
  // Short opening curtain. Content remains usable even if a library fails.
  setTimeout(() => {
    const loader = $('#loader');
    if (hasGsap && !reduced) {
      gsap.to(loader, {yPercent:-100,duration:.8,ease:'power3.inOut',onComplete:() => loader.remove()});
      gsap.from('.hero-content > *', {y:30,opacity:0,stagger:.09,duration:1,ease:'power2.out',delay:.3});
    } else loader.remove();
  }, reduced ? 100 : 1400);

  const sections = $$('[data-progress]');
  function updateProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    $('#page-progress').style.transform = `scaleY(${max > 0 ? scrollY / max : 0})`;
    $('#nav').classList.toggle('scrolled', scrollY > 60);
    let active = 'Minsk';
    for (const section of sections) if (section.getBoundingClientRect().top < innerHeight * .52) active = section.dataset.progress;
    $$('[data-stop]').forEach(a => a.classList.toggle('active', a.dataset.stop === active));
    $$('.nav nav a').forEach(a => a.classList.toggle('active', a.textContent === active));
  }
  let progressPending = false;
  addEventListener('scroll', () => {
    if (!progressPending) {progressPending = true; requestAnimationFrame(() => {updateProgress(); progressPending = false;});}
  }, {passive:true});
  updateProgress();

  // The same native SVG path sampler drives both flight sequences and the map.
  function sampleRoute(path, traveler, p, rotate = true) {
    const length = path.getTotalLength();
    const distance = Math.max(0, Math.min(1, p)) * length;
    const point = path.getPointAtLength(distance);
    const next = path.getPointAtLength(Math.min(length, distance + 1));
    const previous = path.getPointAtLength(Math.max(0, distance - 1));
    const angle = Math.atan2(next.y - previous.y, next.x - previous.x) * 180 / Math.PI;
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length - distance}`;
    traveler.setAttribute('transform', `translate(${point.x} ${point.y})${rotate ? ` rotate(${angle})` : ''}`);
  }
  const mapPath = $('#map-route'), mapTraveler = $('#map-traveler');
  const mapLength = mapPath.getTotalLength();
  const routeCities = [[712,202],[671,183],[441,502],[419,456],[438,414],[671,183],[712,202]];
  // Locate ordered waypoints on the actual path, so labels and vehicles change at arrivals.
  let last = 0;
  const boundaries = [0];
  routeCities.slice(1).forEach(([x,y]) => {
    let best = last, distance = Infinity;
    for (let l = last + 10; l <= mapLength; l += .8) {
      const p = mapPath.getPointAtLength(l), d = Math.hypot(p.x-x,p.y-y);
      if (d < distance) {best=l;distance=d;}
      if (d < 1.2) break;
    }
    last=best; boundaries.push(best/mapLength);
  });
  boundaries[boundaries.length-1]=1;
  const stages = [
    {mode:'TRANSFER · 17 APR',title:'Minsk → Vilnius',detail:'An early start. A whole world ahead.',city:'Minsk',icon:'coach'},
    {mode:'FLIGHT · 17 APR',title:'Vilnius → Rome',detail:'Above the clouds. Closer to la dolce vita.',city:'Vilnius',icon:'plane'},
    {mode:'ITALY BEGINS · 17–20 APR',title:'Rome → Florence',detail:'Three Roman nights, then 1 h 30 by train.',city:'Rome',icon:'train'},
    {mode:'THE RENAISSANCE · 20–22 APR',title:'Florence → Venice',detail:'Art, an espresso, and 2 h 05 to the lagoon.',city:'Florence',icon:'train'},
    {mode:'RETURN FLIGHT · 24 APR',title:'Venice → Vilnius',detail:'One last look at the lagoon from above.',city:'Venice',icon:'plane'},
    {mode:'HOMEWARD · 24 APR',title:'Vilnius → Minsk',detail:'Back home. A little more Italian.',city:'Vilnius',icon:'coach'}
  ];
  let previousStage = -1;
  function drawMap(progress) {
    let index=boundaries.findIndex((b,i) => i>0 && progress < b)-1;
    if (index < 0) index=5;
    index=Math.min(5,Math.max(0,index));
    sampleRoute(mapPath,mapTraveler,progress,false);
    if (index!==previousStage) {
      const stage=stages[index];
      $('#route-number').textContent=String(index+1).padStart(2,'0');
      $('#route-mode').textContent=stage.mode;
      $('#route-stage').textContent=stage.title;
      $('#route-detail').textContent=stage.detail;
      $('#map-vehicle').setAttribute('href',`#${stage.icon}-icon`);
      $$('.map-city').forEach(c => c.classList.toggle('active',c.dataset.city===stage.city));
      previousStage=index;
    }
    if (progress>.995) $$('.map-city').forEach(c => c.classList.toggle('active',c.dataset.city==='Minsk'));
  }
  drawMap(0);
  // City titles are split into letters for a subtle staggered entrance; the heading keeps its name for screen readers.
  $$('[data-split]').forEach(el => {
    const textNodes=[...el.childNodes].filter(n => n.nodeType===Node.TEXT_NODE);
    el.setAttribute('aria-label',textNodes.map(n => n.textContent).join('').trim());
    textNodes.forEach(node => {
      const letters=document.createDocumentFragment();
      for (const ch of node.textContent) {const span=document.createElement('span');span.className='split-char';span.setAttribute('aria-hidden','true');span.textContent=ch;letters.append(span);}
      node.replaceWith(letters);
    });
  });
  let animationContext;
  function setupMotion() {
    if (!hasGsap) {drawMap(1);return;}
    animationContext = gsap.matchMedia();
    animationContext.add('(prefers-reduced-motion: no-preference)', () => {
      const observers=[];
      $$('.reveal').forEach(el => {
        gsap.from(el,{y:35,opacity:0,duration:1.05,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 94%',once:true}});
      });
      $$('[data-split]').forEach(el => {
        gsap.from($$('.split-char',el),{yPercent:40,opacity:0,duration:1.2,ease:'power3.out',stagger:.06,scrollTrigger:{trigger:el,start:'top 90%',once:true}});
      });
      $$('.parallax-image').forEach(img => gsap.fromTo(img,{yPercent:-4},{yPercent:6,ease:'none',scrollTrigger:{trigger:img.closest('.city-scene'),start:'top bottom',end:'bottom top',scrub:true}}));
      if (innerWidth>900) {
        ScrollTrigger.create({trigger:'#journey',start:'top top',end:'+=1350',pin:'.journey-sticky',scrub:true,onUpdate:self=>drawMap(self.progress)});
      } else {
        ScrollTrigger.create({trigger:'#journey',start:'top 65%',end:'bottom 30%',onUpdate:self=>drawMap(self.progress)});
      }
      gsap.to('.train-dot',{left:'100%',xPercent:-100,ease:'none',scrollTrigger:{trigger:'.rail-transition',start:'top 65%',end:'bottom 35%',scrub:1}});
      gsap.to('.water-rings',{rotation:15,scale:1.25,ease:'none',scrollTrigger:{trigger:'.water-transition',start:'top bottom',end:'bottom top',scrub:true}});
      const countObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
        if (!entry.isIntersecting) return;
        const el=entry.target,state={n:0};
        gsap.to(state,{n:Number(el.dataset.count),duration:1.5,ease:'power1.out',onUpdate:()=>el.textContent=Math.round(state.n)});
        countObserver.unobserve(el);
      }),{threshold:.7});
      $$('.count').forEach(el=>countObserver.observe(el));observers.push(countObserver);
      return ()=>observers.forEach(o=>o.disconnect());
    });
    animationContext.add('(prefers-reduced-motion: reduce)',()=>drawMap(1));
  }
  setupMotion();
  motionQuery.addEventListener('change', e => {
    reduced=e.matches;
    if(reduced){lenis?.destroy();lenis=null;activeTimeline?.progress(1);}
  });
  document.fonts.ready.then(()=>{if(hasGsap)ScrollTrigger.refresh();});
  addEventListener('load',()=>{if(hasGsap)ScrollTrigger.refresh();});

  // Native dialogs provide focus trapping and Escape support.
  let activeTimeline=null, returnFocus=null;
  function openDialog(dialog) {
    if(dialog.open)return;
    returnFocus=document.activeElement;
    lenis?.stop();document.body.classList.add('dialog-open');
    dialog.showModal();
  }
  function closeDialog(dialog) {
    activeTimeline?.kill();activeTimeline=null;
    if(dialog.id==='departure-dialog')dialog.dataset.advance='true';
    dialog.close();
  }
  $$('.fullscreen-dialog').forEach(dialog=>{
    $$('[data-close]',dialog).forEach(b=>b.addEventListener('click',()=>closeDialog(dialog)));
    dialog.addEventListener('cancel',()=>{activeTimeline?.kill();activeTimeline=null;});
    dialog.addEventListener('close',()=>{
      document.body.classList.remove('dialog-open');lenis?.start();
      returnFocus?.focus({preventScroll:true});
      if(dialog.dataset.advance==='true'){delete dialog.dataset.advance;requestAnimationFrame(()=>goTo('#journey'));}
    });
  });
  // Departure captions follow the plane: Minsk, then Vilnius once it is reached, then Roma on arrival.
  const departureStages=[{mode:'01 — TRANSFER',city:'MINSK'},{mode:'02 — FLIGHT',city:'VILNIUS'},{mode:'03 — ITALY BEGINS',city:'ROMA'}];
  let departureStage=-1;
  function setDepartureStage(index) {
    if(index===departureStage)return;
    departureStage=index;
    $$('.dep-city').forEach((city,i)=>city.classList.toggle('reached',i<=index));
    $('#departure-mode').textContent=departureStages[index].mode;
    $('#departure-city').textContent=departureStages[index].city;
    if(hasGsap&&!reduced)gsap.fromTo('.departure-stage > *',{opacity:0,y:18},{opacity:1,y:0,duration:.6,stagger:.08,ease:'power2.out',overwrite:true});
  }
  function pathFractionNear(path,x,y) {
    const length=path.getTotalLength();let best=0,distance=Infinity;
    for(let l=0;l<=length;l+=2){const p=path.getPointAtLength(l),d=Math.hypot(p.x-x,p.y-y);if(d<distance){distance=d;best=l;}}
    return best/length;
  }
  const vilniusAt=pathFractionNear($('#departure-route'),480,100);
  $('#start-journey').addEventListener('click',()=>{
    const dialog=$('#departure-dialog');
    if(hasGsap)gsap.set('.departure-content',{clearProps:'opacity,transform'});
    departureStage=-1;setDepartureStage(0);
    openDialog(dialog);
    const path=$('#departure-route'),plane=$('#departure-plane');
    sampleRoute(path,plane,0);
    if(reduced||!hasGsap){sampleRoute(path,plane,1);setDepartureStage(2);closeDialog(dialog);return;}
    const state={p:0};
    activeTimeline=gsap.timeline({onComplete:()=>{activeTimeline=null;closeDialog(dialog);}});
    activeTimeline.to(state,{p:1,duration:4.2,ease:'power1.inOut',onUpdate:()=>{
        sampleRoute(path,plane,state.p);
        setDepartureStage(state.p>=.985?2:state.p>=vilniusAt?1:0);
      }},.35)
      .to('.departure-content',{opacity:0,y:-20,duration:.45},4.9)
      .set('.departure-content',{clearProps:'opacity,transform'});
  });
  // Skip advances through the close handler; Escape simply dismisses.

  const romePhotos=[
    {src:'hero-rome.jpg',alt:'The Colosseum at golden sunset',title:'THE COLOSSEUM',heading:'Two thousand years. Still breathtaking.',description:'Walk through the Colosseum and the Roman Forum with a local guide. Some stories deserve to be told where they began.'},
    {src:'trevi.jpg',alt:'The sculptures and turquoise water of the Trevi Fountain',title:'TREVI FOUNTAIN',heading:'A little wish. A reason to return.',description:'A slow walk through Rome’s historic centre brings you to the Trevi Fountain. Stay a little longer. Listen to the water. Make your own Roman memory.'},
    {src:'skyline.jpg',alt:'Rome domes and terracotta rooftops at sunset',title:'ROMAN ROOFTOPS',heading:'The city has a golden hour all its own.',description:'An unhurried evening, warm rooftops and a table waiting somewhere below. This is the Rome between the landmarks — and it might be your favourite.'}
  ];
  let romeIndex=0;
  function setRome(index){
    romeIndex=(index+romePhotos.length)%romePhotos.length;
    const photo=romePhotos[romeIndex],img=$('#rome-gallery-image');
    if(hasGsap&&!reduced)gsap.fromTo(img,{opacity:.25,scale:1.02},{opacity:1,scale:1,duration:.7,ease:'power2.out'});
    img.src=`assets/images/${photo.src}`;img.alt=photo.alt;
    $('#rome-photo-count').textContent=`0${romeIndex+1} / 03`;$('#rome-photo-title').textContent=photo.title;
    $('#rome-photo-heading').textContent=photo.heading;$('#rome-photo-description').textContent=photo.description;
    $$('[data-rome-photo]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.romePhoto)===romeIndex)));
  }
  $('#explore-rome').addEventListener('click',()=>openDialog($('#rome-dialog')));
  $$('[data-rome-photo]').forEach(b=>b.addEventListener('click',()=>setRome(Number(b.dataset.romePhoto))));
  $('#rome-prev').addEventListener('click',()=>setRome(romeIndex-1));$('#rome-next').addEventListener('click',()=>setRome(romeIndex+1));
  $('#rome-dialog').addEventListener('keydown',e=>{if(e.key==='ArrowRight'){e.preventDefault();setRome(romeIndex+1);}if(e.key==='ArrowLeft'){e.preventDefault();setRome(romeIndex-1);}});
  // Horizontal gallery: pointer dragging, touch, trackpad, keyboard and buttons.
  const gallery=$('#florence-gallery');let drag=null;
  gallery.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;drag={x:e.clientX,scroll:gallery.scrollLeft};gallery.setPointerCapture(e.pointerId);gallery.classList.add('dragging');});
  gallery.addEventListener('pointermove',e=>{if(drag)gallery.scrollLeft=drag.scroll-(e.clientX-drag.x);});
  const release=()=>{drag=null;gallery.classList.remove('dragging');};
  gallery.addEventListener('pointerup',release);gallery.addEventListener('pointercancel',release);gallery.addEventListener('lostpointercapture',release);
  function shiftGallery(dir){gallery.scrollBy({left:dir*gallery.clientWidth*.55,behavior:reduced?'instant':'smooth'});}
  $('#gallery-prev').addEventListener('click',()=>shiftGallery(-1));$('#gallery-next').addEventListener('click',()=>shiftGallery(1));
  gallery.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();shiftGallery(e.key==='ArrowRight'?1:-1);}});
  const galleryProgress=()=>{const max=gallery.scrollWidth-gallery.clientWidth;$('#gallery-progress').style.width=`${30+70*(max?gallery.scrollLeft/max:0)}%`;};
  gallery.addEventListener('scroll',galleryProgress,{passive:true});galleryProgress();
  $('#gondola-toggle').addEventListener('click',()=>{
    const riding=$('#venice').classList.toggle('riding');
    $('#gondola-toggle').setAttribute('aria-pressed',String(riding));
    $('#gondola-label').textContent=riding?'BACK TO THE GRAND CANAL':'TAKE A GONDOLA RIDE';
    $('#gondola-caption').textContent=riding?'Just the water. And a little wonder.':'St Mark’s at sunrise. The lagoon at your own pace.';
  });
  // No payment, storage or real reservation. The only request is the optional ticket email (email-config.js).
  const booking=$('#booking-dialog'),form=$('#booking-form');
  const dateInput=$('#preferred-date');
  const now=new Date();const localToday=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  dateInput.min=localToday;
  if(dateInput.value<localToday)dateInput.value=localToday;
  $$('[data-book]').forEach(b=>b.addEventListener('click',()=>{
    booking.classList.remove('confirmed');$('#booking-form-view').hidden=false;$('#confirmation-view').hidden=true;
    openDialog(booking);
  }));
  const euros=n=>new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n);
  $('#travellers').addEventListener('change',()=>{
    const n=Number($('#travellers').value);$('#booking-total').replaceChildren(document.createTextNode(`${euros(n*1650)} `));
    const small=document.createElement('small');small.textContent=`/ ${n} traveller${n>1?'s':''}`;$('#booking-total').append(small);
  });
  const nameInputs=[$('#first-name'),$('#last-name')];
  nameInputs.forEach(input=>input.addEventListener('input',()=>input.setCustomValidity('')));
  // The ticket is emailed through EmailJS, which sends it from the agency's Yandex mailbox.
  const emailConfig=window.BELLA_VITA_EMAIL||{};
  const emailReady=['serviceId','templateId','publicKey'].every(key=>emailConfig[key]);
  async function emailTicket(params) {
    const response=await fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({service_id:emailConfig.serviceId,template_id:emailConfig.templateId,user_id:emailConfig.publicKey,template_params:params})});
    if(!response.ok)throw new Error(await response.text());
  }
  function bookingReference() {
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=crypto.getRandomValues(new Uint8Array(6));
    return 'BV-'+[...bytes].map(b=>alphabet[b%alphabet.length]).join('');
  }
  // The trail curves under the ticket and climbs out on the right, so it never crosses the headline.
  // On narrow screens the text spans the full width, so the trail crosses mid-screen and then fades.
  function layoutConfirmationRoute(path) {
    const view=$('#confirmation-view'),w=view.clientWidth,h=view.clientHeight,top=view.getBoundingClientRect().top;
    path.ownerSVGElement.setAttribute('viewBox',`0 0 ${w} ${h}`);
    if(w<700){path.setAttribute('d',`M-80 ${h*.5} C${w*.3} ${h*.32} ${w*.6} ${h*.66} ${w+80} ${h*.36}`);return false;}
    const contentBottom=$('.confirmation-content').getBoundingClientRect().bottom-top;
    const ticketBottom=$('.ticket').getBoundingClientRect().bottom-top;
    const yLeft=Math.max(h*.6,ticketBottom+40),yLow=Math.min(h-24,contentBottom+45);
    path.setAttribute('d',`M-90 ${yLeft} C${w*.16} ${yLeft} ${w*.24} ${yLow} ${w*.5} ${yLow} C${w*.76} ${yLow} ${w*.86} ${h*.62} ${w+90} ${h*.2}`);
    return true;
  }
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const [firstName,lastName]=nameInputs.map(input=>input.value.trim().replace(/\s+/g,' '));
    nameInputs.forEach((input,i)=>input.setCustomValidity([firstName,lastName][i]?'':`Please enter your ${i?'last':'first'} name.`));
    if(!form.reportValidity())return;
    const name=`${firstName} ${lastName}`,email=$('#email').value.trim(),reference=bookingReference();
    const date=new Date(dateInput.value+'T12:00:00Z'),returnDate=new Date(date);returnDate.setUTCDate(returnDate.getUTCDate()+7);
    const fmt=d=>d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
    $('#ticket-passenger').textContent=name;$('#ticket-date').textContent=fmt(date);
    const travelers=Number($('#travellers').value);
    $('#ticket-return').textContent=fmt(returnDate);$('#ticket-travellers').textContent=`${travelers} TRAVELLER${travelers>1?'S':''}`;
    $('#ticket-ref').textContent=reference;
    const status=$('#email-status');
    if(emailReady){
      status.textContent=`Sending your ticket to ${email}…`;
      emailTicket({to_email:email,passenger:name,first_name:firstName,last_name:lastName,booking_ref:reference,
        departure:fmt(date),return_date:fmt(returnDate),travellers:`${travelers} traveller${travelers>1?'s':''}`,total:euros(travelers*1650),
        route:'Minsk → Vilnius → Rome → Florence → Venice → Vilnius → Minsk'})
        .then(()=>{status.textContent=`Your ticket is on its way to ${email}.`;})
        .catch(()=>{status.textContent=`We could not email the ticket to ${email}. Please check the address or your connection and book again.`;});
    } else status.textContent='Demo mode: ticket email is not set up yet, so nothing was sent.';
    $('#booking-form-view').hidden=true;$('#confirmation-view').hidden=false;booking.classList.add('confirmed');booking.scrollTop=0;
    const path=$('#confirmation-route'),plane=$('#confirmation-plane');
    const trailStays=layoutConfirmationRoute(path);sampleRoute(path,plane,0);
    if(hasGsap&&!reduced){
      gsap.set('.confirmation-item',{opacity:0,y:20});gsap.set(path,{opacity:1});const state={p:0};
      activeTimeline=gsap.timeline({onComplete:()=>{activeTimeline=null;$('#confirmation-heading').focus({preventScroll:true});}})
        .to(state,{p:1,duration:2.4,ease:'power1.inOut',onUpdate:()=>sampleRoute(path,plane,state.p)})
        .to('.confirmation-item',{opacity:1,y:0,duration:.8,stagger:.19,ease:'power2.out'},2.1)
        .fromTo('.ticket',{rotation:3,scale:.92},{rotation:-2,scale:1,duration:1,ease:'power2.out'},3.1);
      if(!trailStays)activeTimeline.to(path,{opacity:0,duration:.8},2.1);
    } else {sampleRoute(path,plane,1);if(hasGsap)gsap.set('.confirmation-item',{clearProps:'all'});$('#confirmation-heading').focus({preventScroll:true});}
  });
  // Fine-pointer details keep the standard pointer and disappear on touch devices.
  if(matchMedia('(pointer:fine)').matches&&!reduced){
    const cursor=$('.cursor');
    addEventListener('pointermove',e=>{cursor.style.display='flex';cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';},{passive:true});
    document.addEventListener('pointerleave',()=>cursor.style.display='none');
    $$('a,button').forEach(el=>{el.addEventListener('pointerenter',()=>cursor.classList.add('hover'));el.addEventListener('pointerleave',()=>cursor.classList.remove('hover'));});
    gallery.addEventListener('pointerenter',()=>{cursor.classList.add('drag');$('span',cursor).textContent='DRAG';});
    gallery.addEventListener('pointerleave',()=>{cursor.classList.remove('drag');$('span',cursor).textContent='';});
    if(hasGsap)$$('.magnetic').forEach(b=>{b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();gsap.to(b,{x:(e.clientX-r.left-r.width/2)*.12,y:(e.clientY-r.top-r.height/2)*.16,scale:1.04,duration:.4});});b.addEventListener('pointerleave',()=>gsap.to(b,{x:0,y:0,scale:1,duration:.6,ease:'elastic.out(1,.5)'}));});
    // Florence: the photo drifts against the cursor while the title drifts with it.
    if(hasGsap){
      const florence=$('#florence'),photo=$('.florence-main img'),title=$('.florence-copy h2');
      gsap.set(photo,{scale:1.08});
      const ease={duration:1.2,ease:'power3.out'};
      const photoX=gsap.quickTo(photo,'x',ease),photoY=gsap.quickTo(photo,'y',ease),titleX=gsap.quickTo(title,'x',ease);
      florence.addEventListener('pointermove',e=>{const r=florence.getBoundingClientRect(),dx=(e.clientX-r.left)/r.width-.5,dy=(e.clientY-r.top)/r.height-.5;photoX(dx*-28);photoY(dy*-20);titleX(dx*16);});
      florence.addEventListener('pointerleave',()=>{photoX(0);photoY(0);titleX(0);});
    }
  }
  // Optional agent-readable itinerary, supported browsers only; never submits a booking.
  const modelContext = document.modelContext;
  if(modelContext?.registerTool){
    const lifecycle = new AbortController();
    addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
    try {
    Promise.resolve(modelContext.registerTool({annotations:{readOnlyHint:true,untrustedContentHint:false},name:'get_italian_journey',description:'Read the Bella Vita Travel fictional Italian Grand Tour itinerary, price and demo booking status.',inputSchema:{type:'object',properties:{}},execute:async()=>({content:[{type:'text',text:JSON.stringify({name:'Italian Grand Tour',dates:'17–24 April 2027',days:8,nights:7,priceEUR:1650,groupSize:20,route:['Minsk','Vilnius','Rome','Florence','Venice','Vilnius','Minsk'],booking:'Local demonstration only; no reservations are made.'})}]})},{signal:lifecycle.signal})).catch(()=>{});
    } catch { /* Optional browser integration must not affect the experience. */ }
  }
})();
