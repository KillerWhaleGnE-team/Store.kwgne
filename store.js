// ---- Wishlist (localStorage, no accounts needed) ----
function getWishlist(){ try{ return JSON.parse(localStorage.getItem('kwge_wishlist')||'[]'); }catch(e){ return []; } }
function setWishlist(list){ try{ localStorage.setItem('kwge_wishlist', JSON.stringify(list)); }catch(e){} updateWishlistCount(); }
function toggleWishlist(id,title){
  let list = getWishlist();
  const i = list.findIndex(x=>x.id===id);
  if(i>-1){ list.splice(i,1); showToast(title+' removed from wishlist'); }
  else{ list.push({id,title}); showToast(title+' added to wishlist'); }
  setWishlist(list);
  renderWishlistDrawer();
  document.querySelectorAll('[data-wish-id="'+id+'"]').forEach(b=>b.classList.toggle('active', list.some(x=>x.id===id)));
}
function updateWishlistCount(){
  const n = getWishlist().length;
  document.querySelectorAll('#wishlist-count').forEach(el=>{ el.textContent = n; el.style.display = n? 'inline-block':'none'; });
}
function renderWishlistDrawer(){
  const box = document.getElementById('wishlist-items'); if(!box) return;
  const list = getWishlist();
  box.innerHTML = list.length ? list.map(i=>'<div class="drawer-item">'+i.title+'</div>').join('') : '<div class="drawer-empty">Nothing saved yet.</div>';
}

// ---- Cart (visual only, no real checkout yet) ----
function addToCart(title){ showToast(title+' — checkout coming soon'); }

// ---- Toast ----
let toastTimer;
function showToast(msg){
  const t = document.getElementById('toast'); if(!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2400);
}

// ---- Drawers ----
function openDrawer(id){ document.getElementById(id).classList.add('open'); document.getElementById('drawer-overlay').classList.add('open'); }
function closeDrawers(){ document.querySelectorAll('.drawer').forEach(d=>d.classList.remove('open')); document.getElementById('drawer-overlay').classList.remove('open'); }

// ---- Banner rotation ----
function initBanner(){
  const slides = document.querySelectorAll('.banner-slide');
  const dotsBox = document.querySelector('.banner-dots');
  if(!slides.length) return;
  let idx = 0;
  if(dotsBox){
    slides.forEach((s,i)=>{
      const d = document.createElement('button');
      if(i===0) d.className='active';
      d.addEventListener('click',()=>go(i));
      dotsBox.appendChild(d);
    });
  }
  function go(i){
    slides[idx].classList.remove('show');
    if(dotsBox) dotsBox.children[idx].classList.remove('active');
    idx = (i+slides.length)%slides.length;
    slides[idx].classList.add('show');
    if(dotsBox) dotsBox.children[idx].classList.add('active');
  }
  const prev = document.querySelector('.banner-arrow.prev');
  const next = document.querySelector('.banner-arrow.next');
  if(prev) prev.addEventListener('click',()=>go(idx-1));
  if(next) next.addEventListener('click',()=>go(idx+1));
  setInterval(()=>go(idx+1), 5000);
}

// ---- Sidebar tag chip toggling + simple filtering ----
function initTagFilters(){
  document.querySelectorAll('.tag-chip').forEach(chip=>{
    chip.addEventListener('click',()=>{
      chip.classList.toggle('active');
      applyFilters();
    });
  });
  document.querySelectorAll('.sidebar input[type="checkbox"]').forEach(cb=>{
    cb.addEventListener('change', applyFilters);
  });
}
function applyFilters(){
  // Within a filter group = OR, across groups = AND.
  const selections = [];
  document.querySelectorAll('.sidebar .filter-group').forEach(g=>{
    const vals = Array.from(g.querySelectorAll('input[type="checkbox"]:checked')).map(c=>c.value)
      .concat(Array.from(g.querySelectorAll('.tag-chip.active')).map(c=>c.dataset.tag));
    if(vals.length) selections.push(vals);
  });
  document.querySelectorAll('.tile-grid .tile').forEach(tile=>{
    const attrs = (tile.dataset.tags||'').split(',').concat([tile.dataset.cat||'']);
    tile.style.display = selections.every(vals=>vals.some(v=>attrs.includes(v))) ? '' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  updateWishlistCount();
  renderWishlistDrawer();
  initBanner();
  initTagFilters();
  document.querySelectorAll('[data-wish-id]').forEach(b=>{
    if(getWishlist().some(x=>x.id===b.dataset.wishId)) b.classList.add('active');
    b.addEventListener('click',(e)=>{ e.preventDefault(); toggleWishlist(b.dataset.wishId, b.dataset.wishTitle); });
  });
  document.querySelectorAll('[data-cart-title]').forEach(b=>{
    b.addEventListener('click',(e)=>{ e.preventDefault(); addToCart(b.dataset.cartTitle); });
  });
  const overlay = document.getElementById('drawer-overlay');
  if(overlay) overlay.addEventListener('click', closeDrawers);
});
