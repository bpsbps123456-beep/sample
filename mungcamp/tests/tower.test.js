// 두 번째 불멍: 마을에서 들어가기, 장작의 수직 쌓기·착지·상한·타고 내려앉기, 함께 모이기.
'use strict';
const { main } = require('./lib');

main(async ({ check, presenceServer, person, enter, until, sleep, cleanup, shot }) => {
  const srv = await presenceServer(); cleanup(() => srv.close());
  const one = await person(), two = await person({ nick: '몽글' });
  cleanup(() => one.close()); cleanup(() => two.close());
  const A=one.page, B=two.page;
  await enter(A, srv.url, 'firetower');
  check(await A.evaluate(() => MC.app.state.sceneObj.tower && MC.app.state.sceneObj.logs.length === 4), '별도 탑불멍 장소에 장작탑 네 단');
  check(await A.isVisible('[data-act=log]') && !(await A.isVisible('[data-act=worry]')), '장작 쌓기 버튼');
  const heights=[];
  for (let i=0;i<8;i++) {
    await A.click('[data-act=log]');
    await until(A, () => !MC.app.state.sceneObj.flying.length);
    heights.push(await A.evaluate(() => MC.app.state.sceneObj.towerHeight()));
  }
  const tower=await A.evaluate(() => {
    const s=MC.app.state.sceneObj;
    return { count:s.logs.length, x:s.logs.map(l=>l.x), y:s.logs.map(l=>l.y), top:s.by-s.flameHeight()*s.s, capped:!s.addLog() };
  });
  check(heights.every((h,i)=>!i||h>heights[i-1]+20) && tower.y.every((y,i)=>!i||y<tower.y[i-1]-20), '던질 때마다 위로 한 단씩 쌓인다', heights);
  check(tower.x.every(x=>Math.abs(x)<=5) && tower.count===12 && tower.capped, '옆으로 퍼지지 않는 열두 단 장작탑', tower.count);
  check(tower.top>=60, '높은 불꽃도 화면 안에 들어온다', Math.round(tower.top));
  await shot(A,'tower-desktop');
  await enter(B, srv.url, 'firetower');
  await A.bringToFront();
  check(await until(A, () => MC.app.net.mine.p === 'firetower' && MC.app.state.sceneObj.crowd.visitors.size===1, null, 10000), '탑불멍에도 다른 사람과 모여 앉는다');
  check(await A.evaluate(() => MC.netClean({p:'firetower',x:0,y:0})?.p==='firetower'), '탑불멍 상태를 보내고 받는다');
  const settled=await A.evaluate(() => {
    const s=MC.app.state.sceneObj; s.logs[0].fuel=0.1;
    for(let i=0;i<120;i++)s.update(1/60);
    return s.logs.length===11 && Math.abs(s.logs[0].y+14)<1 && s.addLog();
  });
  check(settled,'밑단이 타면 내려앉고 다시 장작을 올릴 수 있다');
  await A.click('#exitBtn'); await until(A,()=>MC.app.state.view==='home');
  check(await A.evaluate(()=>{const c=MC.app.camp,s=MC.CAMP_SPOTS.find(q=>q.id==='firetower');return Math.hypot(c.pup.x-s.x,c.pup.y-s.y)<180;}),'마을의 탑불멍 앞으로 돌아온다');
  await A.evaluate(()=>{MC.app.camp.placeAt('fire');MC.app.enterScene('fire');});
  await until(A,()=>MC.app.state.scene==='fire');
  check(await A.evaluate(()=>!MC.app.state.sceneObj.tower && MC.app.state.sceneObj.logs.length===4) && await A.isVisible('[data-act=worry]'),'기존 모닥불과 걱정 태우기도 그대로 작동한다');
  const phone=await person({phone:true});cleanup(()=>phone.close());
  await enter(phone.page,srv.url,'firetower');
  const mobile=await phone.page.evaluate(()=>{
    const s=MC.app.state.sceneObj;
    for(let i=4;i<12;i++)s.logs.push(s.towerLog(i));
    const b=document.querySelector('[data-act=log]').getBoundingClientRect();
    return {top:s.by-s.flameHeight()*s.s,visible:b.left>=0&&b.right<=innerWidth&&b.bottom<=innerHeight};
  });
  check(mobile.top>=60 && mobile.visible,'휴대폰에서도 장작탑과 쌓기 버튼이 화면에 들어온다',mobile);
  await sleep(600); await shot(phone.page,'tower-mobile');
  check(!one.errors.length&&!two.errors.length&&!phone.errors.length,'오류 없음',one.errors.concat(two.errors,phone.errors).slice(0,3));
});
