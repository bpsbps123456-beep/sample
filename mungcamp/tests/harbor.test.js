// 확장된 마을 바다: 데크·보트 낚시, 선착장 승하선, 보트 충돌과 다른 사람의 모습.
'use strict';
const { main } = require('./lib');

main(async ({ check, presenceServer, person, until, sleep, cleanup, shot }) => {
  const srv = await presenceServer(); cleanup(() => srv.close());
  const one = await person(), two = await person({nick:'바다멍'});
  cleanup(() => one.close()); cleanup(() => two.close());
  const A=one.page,B=two.page;
  for(const p of [A,B]) { await p.goto(srv.url); await until(p,()=>!!MC.app?.camp?.ground); }
  const c = await A.evaluate(()=>{
    const c=MC.app.camp,s=c.sea;
    return {width:c.ground.width/c.gs,cast:s.cast(),board:s.board(),controls:!!s.controls(),water:c.walkable(3300,800)};
  });
  check(c.width>=3699&&!c.cast&&!c.board&&!c.controls&&!c.water,'오른쪽 바다 확장, 땅에서 낚시·보트 타기·물 위 걷기 불가',c);
  const path=await A.evaluate(()=>{
    const c=MC.app.camp,S=MC.CampSea;
    c.pup.x=S.pier.x0-90; c.pup.y=1110;c.target=null;c.setKeys(0,0);
    const goal={x:S.deck.x0+90,y:1120},screen=c.toScreen(goal.x,goal.y);
    c.tap(screen.x,screen.y);
    for(let i=0;i<750;i++)c.update(1/60);
    return {distance:Math.hypot(c.pup.x-goal.x,c.pup.y-goal.y),fish:c.sea.canFish()};
  });
  check(path.distance<12&&path.fish,'데크를 톡 하면 입구를 거쳐 긴 잔교 끝까지 걸어간다',path);
  await until(A,()=>!document.querySelector('#seaControls').hidden);
  await A.click('#seaAction');
  check(await until(A,()=>MC.app.camp.sea.fishing?.stage===1&&document.querySelector('#seaAction').disabled),'낚싯대를 던지고 입질을 기다린다');
  await until(B,()=>[...MC.app.camp.visitors.values()].some(v=>v.st.fs===1));
  check(await B.evaluate(()=>[...MC.app.camp.visitors.values()].some(v=>v.st.fs===1)),'다른 멍이에게도 낚시하는 모습이 전해진다');
  await A.click('#seaStop');
  check(await A.evaluate(()=>!MC.app.camp.sea.fishing),'기다리는 중에도 낚싯대를 거둘 수 있다');
  await A.click('#seaAction');
  await A.evaluate(()=>{MC.app.camp.sea.fishing.remaining=.01;});
  await until(A,()=>MC.app.camp.sea.fishing?.stage===2);
  await sleep(400);
  check(await A.evaluate(()=>{const t=document.querySelector('#campToast').getBoundingClientRect(),r=document.querySelector('#seaControls').getBoundingClientRect();return t.bottom<=r.top-6;}),'입질 안내가 낚아채기 버튼을 가리지 않는다');
  await shot(A,'harbor-fishing');
  await A.click('#seaAction');
  check(await A.evaluate(()=>{const s=MC.app.camp.sea;return !s.fishing&&!!s.catch?.name&&s.catch.cm>=13;}),'입질 때 낚아채면 물고기의 종류·크기를 보고 놓아준다');
  await until(A,()=>document.querySelector('#seaStatus').textContent.includes('돌려보냈어요'));
  await A.click('#seaAction');
  await A.keyboard.down('ArrowLeft');await sleep(180);await A.keyboard.up('ArrowLeft');
  check(await A.evaluate(()=>!MC.app.camp.sea.fishing),'걷기 시작하면 낚싯대가 저절로 접힌다');
  await A.evaluate(()=>{const c=MC.app.camp;c.sea.cast();c.sea.fishing.remaining=.01;c.update(.02);c.sea.fishing.remaining=.01;c.update(.02);});
  check(await A.evaluate(()=>!MC.app.camp.sea.fishing),'입질을 놓쳐도 다시 던질 수 있다');
  const board=await A.evaluate(()=>{
    const c=MC.app.camp,S=MC.CampSea;
    c.pup.x=S.deck.x1-30;c.pup.y=S.deck.y1-25;c.target=null;c.route=[];
    const t=c.toScreen(S.berth.x,S.berth.y);c.tap(t.x,t.y);
    for(let i=0;i<400;i++)c.update(1/60);
    c.cam.x=c.pup.x;c.cam.y=c.pup.y-100;c.clampCam();
    return c.sea.controls()?.label;
  });
  check(board==='보트 타기','낚시 데크 모서리에서도 잔교를 따라 선착장까지 걸어간다');
  await until(A,()=>document.querySelector('#seaAction').textContent==='보트 타기');
  await A.click('#seaAction');
  check(await until(A,()=>MC.app.camp.sea.boating),'선착장에서 보트에 오른다');
  await A.keyboard.down('ArrowRight');await sleep(650);await A.keyboard.up('ArrowRight');
  await until(A,()=>!MC.app.camp.moving);
  check(await A.evaluate(()=>{const c=MC.app.camp;return c.pup.x>MC.CampSea.launch.x+100&&c.sea.boating&&!c.sea.land()&&c.sea.canFish()&&!c.toggleChair();}),'멈춘 보트에서는 낚시 가능, 바다 한가운데서 하선·의자 펼치기 불가');
  await until(B,()=>[...MC.app.camp.visitors.values()].some(v=>v.st.bt===1));
  check(await B.evaluate(()=>[...MC.app.camp.visitors.values()].some(v=>v.st.bt===1)),'다른 화면에도 보트와 탄 멍이가 보인다');
  await shot(A,'harbor-boat');
  await until(A,()=>document.querySelector('#seaAction').textContent==='낚싯대 던지기');
  await A.click('#seaAction');
  await A.evaluate(()=>{MC.app.camp.sea.fishing.remaining=120;});
  check(await until(B,()=>[...MC.app.camp.visitors.values()].some(v=>v.st.bt===1&&v.st.fs===1)),'보트에서 던진 낚싯대가 다른 사람 화면에도 함께 보인다');
  await shot(A,'harbor-boat-fishing');
  await A.evaluate(()=>{MC.app.camp.sea.fishing.remaining=.01;});
  check(await until(B,()=>[...MC.app.camp.visitors.values()].some(v=>v.st.bt===1&&v.st.fs===2)),'보트의 입질 상태도 다른 사람에게 전해진다');
  await until(A,()=>document.querySelector('#seaAction').textContent==='지금 낚아채기!');
  await A.click('#seaAction');
  check(await A.evaluate(()=>{const s=MC.app.camp.sea;return s.boating&&!s.fishing&&!!s.catch?.name;}),'배 위에서도 물고기를 낚고 놓아준 뒤 보트에 머문다');
  await A.click('#seaAction');
  await A.click('#seaStop');
  check(await A.evaluate(()=>MC.app.camp.sea.boating&&!MC.app.camp.sea.fishing),'보트에서도 거두기 버튼으로 낚시를 멈춘다');
  await A.click('#seaAction');
  try {
    await A.keyboard.down('ArrowRight');
    check(await until(A,()=>{const c=MC.app.camp;return c.moving&&!c.sea.fishing&&!c.sea.canFish()&&c.pup.paintedRowing&&document.querySelector('#seaAction').disabled;}),'이동하면 낚싯대를 거두고 직접 노를 젓는다');
  } finally { await A.keyboard.up('ArrowRight'); }
  await until(A,()=>!MC.app.camp.moving);
  const limits=await A.evaluate(()=>{
    const c=MC.app.camp,S=MC.CampSea;
    return !c.walkable(S.shoreX(800)+10,800)&&!c.walkable(S.deck.x0+40,1041)&&!c.walkable(3690,800)&&c.walkable(3350,800);
  });
  check(limits,'보트는 땅·잔교·지도 밖을 통과하지 못한다');
  const returned=await A.evaluate(()=>{
    const c=MC.app.camp,S=MC.CampSea;
    c.pup.x=S.pier.x0+180;c.pup.y=850;c.target=null;c.route=[];
    c.sea.cast();
    c.sea.returnToBerth();
    const reeled=!c.sea.fishing;
    for(let i=0;i<1100;i++)c.update(1/60);
    return {reeled,near:c.sea.canLand(),distance:Math.hypot(c.pup.x-S.launch.x,c.pup.y-S.launch.y),land:c.sea.land(),deck:c.sea.onDeck(c.pup.x,c.pup.y)};
  });
  check(returned.reeled&&returned.near&&returned.land&&returned.deck,'낚싯대를 거둔 뒤 북쪽 바다에서도 잔교를 돌아 선착장으로 와서 내린다',returned);
  const westReturn=await A.evaluate(()=>{
    const c=MC.app.camp,S=MC.CampSea;
    c.sea.board();c.pup.x=S.berth.x-150;c.pup.y=1220;c.target=null;c.route=[];
    c.sea.returnToBerth();for(let i=0;i<600;i++)c.update(1/60);
    return c.sea.canLand()&&c.sea.land();
  });
  check(westReturn,'선착장 왼쪽 바다에서도 연결 데크를 피해 돌아온다');
  const back=await A.evaluate(()=>{
    const c=MC.app.camp,S=MC.CampSea,goal={x:S.pier.x0-100,y:1041};
    const t=c.toScreen(goal.x,goal.y);c.tap(t.x,t.y);
    for(let i=0;i<800;i++)c.update(1/60);
    return Math.hypot(c.pup.x-goal.x,c.pup.y-goal.y);
  });
  check(back<15,'보트에서 내린 뒤 연결 잔교를 따라 마을로 돌아온다',back);
  const invalid=await A.evaluate(()=>MC.netClean({p:'water',x:0,y:0,bt:1,ba:999,fs:2}));
  check(!invalid.bt&&!invalid.fs&&!invalid.ba,'바닷가 활동 상태는 마을에서만 전해진다');
  const moving=await A.evaluate(()=>MC.netClean({p:'map',x:3300,y:1300,bt:1,w:1,fs:2}));
  check(moving.bt&&!moving.fs,'이동 중인 보트의 낚시 상태는 전송하지 않는다');
  const phone=await person({phone:true});cleanup(()=>phone.close());
  const P=phone.page;await P.goto(srv.url);await until(P,()=>!!MC.app?.camp?.ground);
  await P.evaluate(()=>{const c=MC.app.camp,S=MC.CampSea;c.pup.x=S.deck.x0+90;c.pup.y=1041;c.cam.x=c.pup.x;c.cam.y=c.pup.y-100;c.clampCam();});
  await until(P,()=>!document.querySelector('#seaControls').hidden);
  const mobile=await P.evaluate(()=>{const r=document.querySelector('#seaControls').getBoundingClientRect(),t=document.querySelector('.camp-tools').getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,toolsTop:t.top,width:innerWidth,scroll:document.documentElement.scrollWidth};});
  check(mobile.left>=0&&mobile.right<=mobile.width&&mobile.bottom<mobile.toolsTop&&mobile.scroll===mobile.width,'휴대폰 낚시 버튼은 화면 안에서 아래 도구와 겹치지 않는다',mobile);
  await shot(P,'harbor-mobile');
  await P.evaluate(()=>{const c=MC.app.camp,S=MC.CampSea;c.pup.x=S.berth.x;c.pup.y=S.berth.y;c.cam.x=c.pup.x;c.cam.y=c.pup.y-40;c.clampCam();});
  await until(P,()=>document.querySelector('#seaAction').textContent==='보트 타기');
  await P.click('#seaAction');
  await until(P,()=>document.querySelector('#seaAction').textContent==='낚싯대 던지기');
  await P.click('#seaAction');
  await until(P,()=>!!MC.app.camp.sea.fishing&&!document.querySelector('#seaStop').hidden&&!document.querySelector('#seaTravel').hidden);
  const boatMobile=await P.evaluate(()=>{
    const buttons=[...document.querySelectorAll('.sea-buttons button')].filter(b=>!b.hidden).map(b=>b.getBoundingClientRect());
    const tools=document.querySelector('.camp-tools').getBoundingClientRect();
    return buttons.length===3&&buttons.every(r=>r.left>=0&&r.right<=innerWidth&&r.bottom<tools.top)&&document.documentElement.scrollWidth===innerWidth;
  });
  check(boatMobile,'휴대폰에서 보트 낚시·거두기·선착장 버튼이 잘리지 않는다');
  await shot(P,'harbor-boat-fishing-mobile');
  await P.click('#seaTravel');
  check(await until(P,()=>!MC.app.camp.sea.boating&&!MC.app.camp.sea.fishing),'보트 낚시 중에도 선착장에서 버튼을 눌러 바로 내린다');
  check(!one.errors.length&&!two.errors.length&&!phone.errors.length,'바닷가 활동 중 오류 없음',one.errors.concat(two.errors,phone.errors));
});
