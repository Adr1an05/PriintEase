const $=id=>document.getElementById(id);
let authMode='login';
let users=JSON.parse(localStorage.getItem('printEaseUsers')||'[]');
let orders=JSON.parse(localStorage.getItem('printEaseOrders')||'[]');
let transactions=JSON.parse(localStorage.getItem('printEaseTransactions')||'[]');
let currentUser=localStorage.getItem('printEaseCurrent')||'';
let currentRole=localStorage.getItem('printEaseRole')||'Customer';

const pageData={
 dashboard:['Dashboard','Manage your printing orders in one place.'],
 order:['New Print Order','Create and submit a printing request.'],
 orders:['My Orders','Track your printing requests.'],
 transactions:['Transactions','View your completed payment records.'],
 roles:['User Type','Choose the role for the current session.'],
 profile:['Profile','Manage your account information.'],
 settings:['Settings','Customize your PrintEase experience.']
};

function toast(text){const t=$('toast');t.textContent=text;t.style.display='block';setTimeout(()=>t.style.display='none',2500)}
function saveAll(){localStorage.setItem('printEaseUsers',JSON.stringify(users));localStorage.setItem('printEaseOrders',JSON.stringify(orders));localStorage.setItem('printEaseTransactions',JSON.stringify(transactions));}
function statusBadge(s){return `<span class="status ${s.toLowerCase()}">${s}</span>`}
function getProfile(){return JSON.parse(localStorage.getItem('printEaseProfile_'+currentUser)||'{}')}
function saveProfileData(d){localStorage.setItem('printEaseProfile_'+currentUser,JSON.stringify(d))}
function getMyOrders(){return currentRole==='Admin'?orders:orders.filter(o=>o.owner===currentUser)}

document.querySelectorAll('.auth-tab').forEach(b=>b.onclick=()=>{
 authMode=b.dataset.mode;document.querySelectorAll('.auth-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');
 $('registerNameWrap').classList.toggle('hidden',authMode!=='register');$('authSubmit').textContent=authMode==='login'?'Login':'Create Account';$('authMsg').textContent='';
});
$('togglePass').onclick=()=>{$('authPass').type=$('authPass').type==='password'?'text':'password'};

$('authForm').onsubmit=e=>{
 e.preventDefault();const u=$('authUser').value.trim(),p=$('authPass').value.trim(),name=$('authName').value.trim();
 if(authMode==='register'){
   if(users.some(x=>x.u===u)){ $('authMsg').textContent='Username already exists.';return}
   users.push({u,p,name:name||u});saveAll();toast('Account created! You can now login.');authMode='login';document.querySelector('[data-mode="login"]').click();return;
 }
 const account=users.length?users.find(x=>x.u===u&&x.p===p):(u==='admin'&&p==='admin'?{u,name:'Administrator'}:null);
 if(!account){$('authMsg').textContent='Invalid username or password.';return}
 currentUser=u;currentRole='Customer';localStorage.setItem('printEaseCurrent',u);localStorage.setItem('printEaseRole',currentRole);openApp();
};

function openApp(){ $('authScreen').classList.add('hidden');$('app').classList.remove('hidden');const p=getProfile();$('currentUser').textContent=p.name||users.find(x=>x.u===currentUser)?.name||currentUser;$('roleText').textContent=currentRole;$('avatar').textContent=(p.name||currentUser).slice(0,2).toUpperCase();loadProfileForm();render();}
function logout(){localStorage.removeItem('printEaseCurrent');currentUser='';$('app').classList.add('hidden');$('authScreen').classList.remove('hidden');toast('Logged out successfully')}
$('logoutBtn').onclick=logout;

function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));$(id).classList.add('active');document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===id));$('pageTitle').textContent=pageData[id][0];$('pageSubtitle').textContent=pageData[id][1];$('.sidebar')?.classList.remove('open');render();}
document.querySelectorAll('.nav-btn[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>showPage(b.dataset.go));
$('quickOrder').onclick=()=>showPage('order');
$('mobileMenu').onclick=()=>document.querySelector('.sidebar').classList.toggle('open');

function price(){const copies=Math.max(1,+$('copies').value||1);const color=$('color').value;const type=$('type').value;let base=color==='Colored'?15:10;if(['Poster','Tarpaulin'].includes(type))base+=20;if(type==='Photo')base+=10;const total=copies*base;$('estimatedPrice').textContent=total.toFixed(2);return total}
$('plus').onclick=()=>{$('copies').value=+$('copies').value+1;price()};
$('minus').onclick=()=>{$('copies').value=Math.max(1,+$('copies').value-1);price()};
['copies','color','type'].forEach(id=>$(id).oninput=price);
$('file').onchange=e=>{$('fileName').textContent=e.target.files[0]?`Selected: ${e.target.files[0].name}`:''};

$('orderForm').onsubmit=e=>{e.preventDefault();const id='PE-'+String(Date.now()).slice(-6);const total=price();orders.unshift({id,type:$('type').value,copies:+$('copies').value,status:'Processing',owner:currentUser,size:$('size').value,color:$('color').value,paper:$('paper').value,notes:$('notes').value,amount:total,date:new Date().toLocaleDateString()});saveAll();e.target.reset();$('copies').value=1;price();toast('Order submitted successfully!');showPage('orders')};

function updateStatus(index){const o=orders[index];if(o.status==='Processing'){o.status='Ready';toast('Order marked as Ready')}else if(o.status==='Ready'){o.status='Completed';transactions.unshift({id:'TX-'+String(Date.now()).slice(-6),order:o.id,type:o.type,amount:o.amount,status:'Paid',date:new Date().toLocaleDateString()});toast('Order completed and transaction created!')}saveAll();render()}
window.updateStatus=updateStatus;

function render(){
 const mine=getMyOrders();$('activeCount').textContent=mine.filter(o=>o.status!=='Completed').length;$('completedCount').textContent=mine.filter(o=>o.status==='Completed').length;$('transactionCount').textContent=transactions.length;$('orderBadge').textContent=mine.filter(o=>o.status!=='Completed').length;
 $('recentTable').innerHTML=mine.length?mine.slice(0,5).map(o=>`<tr><td><b>${o.id}</b></td><td>${o.type}</td><td>${o.copies}</td><td>${statusBadge(o.status)}</td></tr>`).join(''):`<tr><td colspan="4" class="empty">No orders yet. Create your first order!</td></tr>`;
 const search=($('searchOrders')?.value||'').toLowerCase(),filter=$('filterStatus')?.value||'All';
 const filtered=mine.filter(o=>(filter==='All'||o.status===filter)&&(`${o.id} ${o.type}`.toLowerCase().includes(search)));
 $('ordersTable').innerHTML=filtered.length?filtered.map(o=>`<tr><td><b>${o.id}</b></td><td>${o.type}</td><td>${o.copies} copies · ${o.size}<br><small>${o.color}</small></td><td>₱${o.amount.toFixed(2)}</td><td>${statusBadge(o.status)}</td><td>${o.status==='Completed'?'<span class="status completed">Done</span>':(currentRole==='Customer'?'<span class="status processing">Waiting</span>':`<button class="action-small" onclick="updateStatus(${orders.indexOf(o)})">Update</button>`)}</td></tr>`).join(''):`<tr><td colspan="6" class="empty">No matching orders found.</td></tr>`;
 $('transTable').innerHTML=transactions.length?transactions.map(t=>`<tr><td><b>${t.id}</b></td><td>${t.order}</td><td>${t.type}</td><td>₱${t.amount.toFixed(2)}</td><td>${statusBadge(t.status)}</td><td>${t.date}</td></tr>`).join(''):`<tr><td colspan="6" class="empty">No transactions yet.</td></tr>`;
 $('totalTransactions').textContent=transactions.length;$('totalSales').textContent=transactions.reduce((a,t)=>a+t.amount,0).toFixed(2);
 $('welcomeName').textContent=`${mine.length?'Ready to manage your orders?':'Ready to print something?'}`;
}
$('searchOrders').oninput=render;$('filterStatus').onchange=render;

document.querySelectorAll('.role-card').forEach(b=>b.onclick=()=>{currentRole=b.dataset.role;localStorage.setItem('printEaseRole',currentRole);document.querySelectorAll('.role-card').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('roleText').textContent=currentRole;toast(currentRole+' role selected');render();if(currentRole==='Customer')showPage('order');else if(currentRole==='Admin')showPage('orders');else showPage('transactions')});

function loadProfileForm(){const p=getProfile();$('profileUser').value=currentUser;$('profileName').value=p.name||users.find(x=>x.u===currentUser)?.name||'';$('profileContact').value=p.contact||'';$('profileEmail').value=p.email||'';$('profileDisplay').textContent=$('profileName').value||currentUser;$('bigAvatar').textContent=($('profileName').value||currentUser).slice(0,2).toUpperCase();}
$('profileForm').onsubmit=e=>{e.preventDefault();const p={name:$('profileName').value||currentUser,contact:$('profileContact').value,email:$('profileEmail').value};saveProfileData(p);$('currentUser').textContent=p.name;$('profileDisplay').textContent=p.name;$('avatar').textContent=p.name.slice(0,2).toUpperCase();$('bigAvatar').textContent=p.name.slice(0,2).toUpperCase();toast('Profile saved successfully!')};
$('changeAvatar').onclick=()=>toast('Avatar uses your initials automatically.');

$('darkMode').onchange=e=>{document.body.classList.toggle('dark',e.target.checked);localStorage.setItem('printEaseDark',e.target.checked)};
$('language').onchange=()=>toast('Language preference saved.');
if(localStorage.getItem('printEaseDark')==='true'){$('darkMode').checked=true;document.body.classList.add('dark')}
price();
if(currentUser)openApp();
