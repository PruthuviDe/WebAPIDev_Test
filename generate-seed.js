const fs = require('fs');
const path = require('path');
const seedPath = path.join(__dirname, 'seed.json');
const db = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const firstNames = ['Kasun','Nuwan','Dinesh','Chamara','Priyantha','Saman','Ruwan','Thilina','Asanka','Janaka','Amali','Dilrukshi','Sanduni','Nadeeka','Kumari','Malsha','Hiruni','Sachini','Tharushi','Nilmini','Mohamed','Ismail','Fathima','Riyaz','Ashraf','Hashim','Yasmin','Nishantha','Roshan','Suresh','Kavinda','Lahiru','Dasun','Shehan','Sampath','Gayan','Eranga','Prasad','Udara','Harsha','Buddhika','Chaminda','Nadeesha','Oshadi','Sewwandi','Ruchira','Sachith','Ishara','Dulani','Vimantha'];
const lastNames  = ['Perera','Silva','Fernando','Jayawardena','Wickramasinghe','Gunawardena','Rathnayake','Bandara','Dissanayake','Rajapaksa','Senanayake','Wijesinghe','Karunaratne','Jayasuriya','De Silva','Cooray','Weerasinghe','Mendis','Kumara','Pathirana','Liyanage','Ranasinghe','Gunasekara','Madushanka','Herath','Premaratne','Jayasinghe','Kodithuwakku','Siriwardena','Amarasinghe'];
const LOCS = [{lat:6.9271,lng:79.8612},{lat:6.9147,lng:79.8725},{lat:6.9355,lng:79.8487},{lat:7.0000,lng:79.9000},{lat:7.2906,lng:80.6337},{lat:7.3153,lng:80.5927},{lat:6.0535,lng:80.2210},{lat:6.0320,lng:80.2196},{lat:7.2082,lng:79.8358},{lat:7.1900,lng:79.8400},{lat:9.6615,lng:80.0255},{lat:9.6800,lng:80.0100},{lat:8.5874,lng:81.2152},{lat:8.5600,lng:81.2300},{lat:5.9549,lng:80.5550},{lat:5.9400,lng:80.5400},{lat:7.4818,lng:80.3609},{lat:7.4600,lng:80.3800},{lat:6.6828,lng:80.3992},{lat:6.6700,lng:80.4100}];
const DRSTATUSES=['on-duty','off-duty','on-duty','on-duty','on-trip'];
const rand=(a)=>a[Math.floor(Math.random()*a.length)];
const randN=(mn,mx)=>Math.floor(Math.random()*(mx-mn+1))+mn;

const drivers=[];
for(let i=1;i<=50;i++) drivers.push({id:i,first_name:rand(firstNames),last_name:rand(lastNames),license_number:'B-'+String(1000000+i*7).slice(0,7),phone:'+9477'+String(randN(1000000,9999999)),vehicle_id:i,status:rand(DRSTATUSES)});

const passengers=[];
for(let i=1;i<=100;i++) passengers.push({id:i,name:rand(firstNames)+' '+rand(lastNames),phone:'+9477'+String(randN(1000000,9999999))});

const allSt=[...Array(260).fill('completed'),...Array(20).fill('in-progress'),...Array(20).fill('cancelled')];
for(let i=allSt.length-1;i>0;i--){const j=randN(0,i);[allSt[i],allSt[j]]=[allSt[j],allSt[i]];}
const BASE=new Date('2026-06-21T00:00:00.000Z');
const trips=[];
for(let i=1;i<=300;i++){
  const vid=randN(1,50),did=vid,pid=randN(1,100),st=allSt[i-1];
  const pl=rand(LOCS);let dl=rand(LOCS);while(dl===pl)dl=rand(LOCS);
  const pt=new Date(BASE.getTime()+randN(0,14*24*60)*60000);
  const dt=new Date(pt.getTime()+randN(10,90)*60000);
  const done=st==='completed';
  trips.push({id:i,vehicle_id:vid,driver_id:did,passenger_id:pid,pickup_lat:pl.lat,pickup_lng:pl.lng,dropoff_lat:done?dl.lat:null,dropoff_lng:done?dl.lng:null,pickup_time:pt.toISOString(),dropoff_time:done?dt.toISOString():null,fare:done?randN(200,5000):null,status:st});
}

db.drivers=drivers; db.passengers=passengers; db.trips=trips;
fs.writeFileSync(seedPath,JSON.stringify(db,null,2),'utf8');

const vIds=new Set(db.vehicles.map(v=>v.id)),dIds=new Set(drivers.map(d=>d.id)),pIds=new Set(passengers.map(p=>p.id));
let errs=0;
drivers.forEach(d=>{if(!vIds.has(d.vehicle_id)){console.error('Driver FK err:',d.id);errs++;}});
trips.forEach(t=>{if(!vIds.has(t.vehicle_id)||!dIds.has(t.driver_id)||!pIds.has(t.passenger_id)){console.error('Trip FK err:',t.id);errs++;}});

console.log('drivers:',drivers.length,'passengers:',passengers.length,'trips:',trips.length);
console.log('statuses:',trips.reduce((a,t)=>{a[t.status]=(a[t.status]||0)+1;return a;},{}));
console.log('FK errors:',errs);
console.log('Sample driver:',JSON.stringify(drivers[0]));
console.log('Sample passenger:',JSON.stringify(passengers[0]));
console.log('Sample trip:',JSON.stringify(trips[0]));
