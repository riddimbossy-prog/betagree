import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,join,normalize} from 'node:path';

const PORT=Number(process.env.PORT||8080), ROOT=join(process.cwd(),'dist');
const REGIONS=['gh','ng','ke','zm']; let cache={at:0,data:null};
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
const markets=[1,18,29];

async function sporty(region,market,today){
  const q=new URLSearchParams({sportId:'sr:sport:1',marketId:String(market),pageSize:'100',pageNum:'1'}); if(today)q.set('todayGames','true');
  const url=`https://www.sportybet.com/api/${region}/factsCenter/pcUpcomingEvents?${q}`;
  const r=await fetch(url,{headers:{'User-Agent':UA,Accept:'application/json',Origin:'https://www.sportybet.com',Referer:`https://www.sportybet.com/${region}/sport/football`},signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error(`SportyBet ${region} ${r.status}`); return r.json();
}
function outcome(m,re){const o=(m?.outcomes||[]).find(x=>re.test(String(x.desc)));const n=Number(o?.odds);return Number.isFinite(n)?n:null}
function parse(book){const out=[];for(const t of book?.data?.tournaments||[])for(const e of t.events||[])out.push({e,t});return out}
async function matches(){
  if(cache.data&&Date.now()-cache.at<120000)return cache.data;
  let region, books; for(const r of REGIONS){try{books=await Promise.all(markets.flatMap(m=>[sporty(r,m,true),sporty(r,m,false)]));region=r;break}catch(e){console.warn(e.message)}}
  if(!books)throw new Error('SportyBet is temporarily unavailable');
  const by=new Map(); books.flatMap(parse).forEach(({e,t})=>{const id=e.eventId;if(!id)return;const row=by.get(id)||{id,home:e.homeTeamName,away:e.awayTeamName,kickoff:new Date(Number(e.estimateStartTime)).toISOString(),league:t.name||e.sport?.category?.tournament?.name||'Football',homeLogo:e.homeTeamIcon||null,awayLogo:e.awayTeamIcon||null,markets:{}};for(const m of e.markets||[]){const mid=String(m.id);if(mid==='1')Object.assign(row.markets,{homeWin:outcome(m,/^home$/i),draw:outcome(m,/^draw$/i),awayWin:outcome(m,/^away$/i)});if(mid==='29')Object.assign(row.markets,{bttsYes:outcome(m,/yes|gg/i),bttsNo:outcome(m,/no|ng/i)});if(mid==='18'){const line=String(m.specifier||'').match(/total=([\d.]+)/)?.[1];if(line==='2.5')Object.assign(row.markets,{over25:outcome(m,/^over/i),under25:outcome(m,/^under/i)})}}by.set(id,row)});
  const data={source:'SportyBet',region,fetchedAt:new Date().toISOString(),matches:[...by.values()].filter(x=>new Date(x.kickoff).getTime()>Date.now()-3600000).sort((a,b)=>a.kickoff.localeCompare(b.kickoff))};cache={at:Date.now(),data};return data;
}
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
createServer(async(req,res)=>{try{if(req.url?.startsWith('/api/matches')){const body=JSON.stringify(await matches());res.writeHead(200,{'content-type':'application/json','cache-control':'public,max-age=60'});return res.end(body)}if(req.url==='/api/health'){res.writeHead(200,{'content-type':'application/json'});return res.end('{"ok":true}')};let p=normalize(decodeURIComponent((req.url||'/').split('?')[0])).replace(/^(\.\.(\/|\\|$))+/, '');if(p==='/'||!extname(p))p='/index.html';let file=join(ROOT,p);try{await stat(file)}catch{file=join(ROOT,'index.html')}res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(await readFile(file))}catch(e){res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({error:e.message}))}}).listen(PORT,'0.0.0.0',()=>console.log(`BetAgree on ${PORT}`));
