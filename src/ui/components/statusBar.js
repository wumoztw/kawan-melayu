export function statusBar(parent,state){const p=document.createElement('p');p.className='progress';p.textContent=`第 ${state.day} 天 · Lv.${state.level} · ${state.cash} RM`;parent.append(p);return p}
