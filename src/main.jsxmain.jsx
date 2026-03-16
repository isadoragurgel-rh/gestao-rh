import { useState, useEffect, useCallback } from "react";

const CLIENT_ID = "305248555775-2p7ev3efhkgtoo4mq6ihq7v6u5ararb9.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";
const SHEET_NAME = "GestaoRH";

const genId = () => `${Date.now()}-${Math.random().toString(36).substr(2,6)}`;
const fmt = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—';
const daysTo = d => d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : null;
const todayStr = () => new Date().toISOString().split('T')[0];
const money = v => v ? `R$ ${parseFloat(v).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—';
const occClr = t => t==='Hora Extra'?'success':t.includes('Falta')?'danger':'warning';
const sitClr = {Ativo:'success',Férias:'info',Afastado:'warning','Afastado INSS':'warning',Demitido:'danger'};

const EMP_FIELDS = ['id','nome','cpf','rg','nasc','sexo','tel','email','cep','rua','num','comp','bairro','cidade','uf','admissao','tipo','fimContrato','sit','demissao','motivo','cargo','funcao','salario','cliente','vr','vrVal','vt','vtVal','fretado','ac','acVal','ferias','ferIni','ferFim','ferDias','banco','agencia','conta','tipoConta','pix','obs','createdAt'];
const OCC_FIELDS = ['id','empId','tipo','data','qtd','obs','createdAt'];

const TIPOS = ['CLT','Temporário','Terceirizado','Estágio','PJ'];
const SITS = ['Ativo','Férias','Afastado','Afastado INSS','Demitido'];
const OCC_TIPOS = ['Falta','Falta Justificada','Atraso','Hora Extra','Advertência','Suspensão','Observação'];

const S = {p:'#4f46e5',bg:'#f1f5f9',card:'#fff',border:'#e2e8f0',text:'#1e293b',muted:'#64748b',success:'#10b981',warning:'#f59e0b',danger:'#ef4444',info:'#3b82f6',sidebar:'#1e1b4b'};
const iSt = {width:'100%',padding:'8px 10px',border:`1px solid ${S.border}`,borderRadius:8,fontSize:14,color:S.text,background:'#fff',outline:'none',fontFamily:'inherit',boxSizing:'border-box'};

function rowToEmp(row) {
  const e = {};
  EMP_FIELDS.forEach((f,i) => { e[f] = row[i]||''; });
  ['vr','vt','fretado','ac','ferias'].forEach(k => { e[k] = e[k]==='true'; });
  return e;
}
function empToRow(e) { return EMP_FIELDS.map(f => e[f]===undefined?'':String(e[f])); }
function rowToOcc(row) { const o={}; OCC_FIELDS.forEach((f,i)=>{ o[f]=row[i]||''; }); return o; }
function occToRow(o) { return OCC_FIELDS.map(f => o[f]===undefined?'':String(o[f])); }

function Btn({children,onClick,v='primary',sz='md',disabled=false,type='button',style={}}) {
  const vs={primary:{background:S.p,color:'#fff',border:'none'},secondary:{background:'#fff',color:S.text,border:`1px solid ${S.border}`},danger:{background:S.danger,color:'#fff',border:'none'},success:{background:S.success,color:'#fff',border:'none'},ghost:{background:'transparent',color:S.muted,border:'none'}};
  const ss={sm:{padding:'5px 10px',fontSize:12},md:{padding:'8px 16px',fontSize:14},lg:{padding:'11px 24px',fontSize:15}};
  return <button type={type} disabled={disabled} onClick={onClick} style={{...vs[v],...ss[sz],borderRadius:8,fontWeight:600,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,...style}}>{children}</button>;
}
function Field({label,children,error,span2=false}) {
  return <div style={{gridColumn:span2?'1/-1':undefined,marginBottom:2}}>
    <label style={{display:'block',fontSize:12,fontWeight:500,color:S.muted,marginBottom:4}}>{label}</label>
    {children}
    {error&&<p style={{margin:'3px 0 0',fontSize:11,color:S.danger}}>{error}</p>}
  </div>;
}
function Inp(props) { return <input style={iSt} {...props} />; }
function Tx(props) { return <textarea style={{...iSt,resize:'vertical'}} {...props} />; }
function Sel({options=[],style={},...props}) {
  return <select style={{...iSt,cursor:'pointer',...style}} {...props}>
    {options.map(o=>typeof o==='string'?<option key={o} value={o}>{o}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}
  </select>;
}
function Tog({checked,onChange,label}) {
  return <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',userSelect:'none'}}>
    <div onClick={()=>onChange(!checked)} style={{width:38,height:20,borderRadius:10,cursor:'pointer',position:'relative',background:checked?S.p:S.border,transition:'background 0.2s'}}>
      <div style={{position:'absolute',top:2,left:checked?20:2,width:16,height:16,borderRadius:'50%',background:'white',transition:'left 0.2s'}} />
    </div>
    {label&&<span style={{fontSize:14,color:S.text}}>{label}</span>}
  </label>;
}
function Card({children,style={}}) { return <div style={{background:S.card,border:`1px solid ${S.border}`,borderRadius:12,padding:20,...style}}>{children}</div>; }
function Badge({children,color='default'}) {
  const cs={default:['#f1f5f9','#475569'],success:['#d1fae5','#065f46'],warning:['#fef3c7','#92400e'],danger:['#fee2e2','#991b1b'],info:['#dbeafe','#1e40af']};
  const [bg,tc]=cs[color]||cs.default;
  return <span style={{display:'inline-block',padding:'2px 8px',borderRadius:12,fontSize:12,fontWeight:600,background:bg,color:tc,whiteSpace:'nowrap'}}>{children}</span>;
}
function Toast({msg,type='success'}) {
  const tc={success:S.success,error:S.danger,info:S.info,warning:S.warning};
  return <div style={{position:'fixed',bottom:24,right:24,background:tc[type]||S.success,color:'#fff',padding:'12px 20px',borderRadius:10,fontSize:14,fontWeight:500,boxShadow:'0 4px 16px rgba(0,0,0,0.15)',zIndex:9999}}>{msg}</div>;
}
function Modal({title,children,onClose}) {
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
    <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:480,maxHeight:'90vh',overflow:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',borderBottom:`1px solid ${S.border}`}}>
        <h3 style={{margin:0,fontSize:16,fontWeight:700,color:S.text}}>{title}</h3>
        <button onClick={onClose} style={{border:'none',background:'none',fontSize:22,cursor:'pointer',color:S.muted}}>×</button>
      </div>
      <div style={{padding:20}}>{children}</div>
    </div>
  </div>;
}

function Sidebar({page,nav,alertCnt,user,onLogout}) {
  const items=[{id:'dashboard',icon:'⊞',label:'Dashboard'},{id:'list',icon:'👥',label:'Funcionários'},{id:'occurrences',icon:'📋',label:'Ocorrências'},{id:'alerts',icon:'🔔',label:'Alertas',badge:alertCnt}];
  return <div style={{width:220,background:S.sidebar,display:'flex',flexDirection:'column',flexShrink:0}}>
    <div style={{padding:'16px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
        <div style={{width:34,height:34,background:S.p,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏢</div>
        <div><div style={{color:'#fff',fontWeight:700,fontSize:13}}>GestãoRH</div><div style={{color:'rgba(255,255,255,0.45)',fontSize:11}}>Mão de Obra</div></div>
      </div>
      <div style={{background:'rgba(255,255,255,0.08)',borderRadius:8,padding:'8px 10px',display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:28,height:28,borderRadius:'50%',background:'#4f46e5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff',fontWeight:600,flexShrink:0}}>
          {user?.name?user.name[0].toUpperCase():'U'}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:'#fff',fontSize:12,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name||'Usuário'}</div>
          <div style={{color:'rgba(255,255,255,0.45)',fontSize:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.email||''}</div>
        </div>
      </div>
    </div>
    <nav style={{flex:1,padding:'10px 8px'}}>
      {items.map(item=>{
        const active=page===item.id;
        return <button key={item.id} onClick={()=>nav(item.id)} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'9px 12px',marginBottom:2,border:'none',cursor:'pointer',background:active?'rgba(255,255,255,0.14)':'transparent',color:active?'#fff':'rgba(255,255,255,0.6)',borderRadius:8,fontSize:14,fontWeight:active?600:400,textAlign:'left'}}>
          <span style={{fontSize:15}}>{item.icon}</span>
          <span style={{flex:1}}>{item.label}</span>
          {item.badge>0&&<span style={{background:S.danger,color:'#fff',borderRadius:10,fontSize:11,fontWeight:700,padding:'1px 6px',minWidth:18,textAlign:'center'}}>{item.badge}</span>}
        </button>;
      })}
    </nav>
    <div style={{padding:14,borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',gap:8}}>
      <button onClick={()=>nav('form',null)} style={{width:'100%',padding:9,background:S.p,color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontSize:14,fontWeight:600}}>+ Novo Funcionário</button>
      <button onClick={onLogout} style={{width:'100%',padding:7,background:'transparent',color:'rgba(255,255,255,0.45)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,cursor:'pointer',fontSize:12}}>Sair da conta</button>
    </div>
  </div>;
}

const EMPTY = {id:'',nome:'',cpf:'',rg:'',nasc:'',sexo:'M',tel:'',email:'',cep:'',rua:'',num:'',comp:'',bairro:'',cidade:'',uf:'',admissao:'',tipo:'CLT',fimContrato:'',sit:'Ativo',demissao:'',motivo:'',cargo:'',funcao:'',salario:'',cliente:'',vr:false,vrVal:'',vt:false,vtVal:'',fretado:false,ac:false,acVal:'',ferias:false,ferIni:'',ferFim:'',ferDias:'',banco:'',agencia:'',conta:'',tipoConta:'Corrente',pix:'',obs:''};

function Dashboard({employees,occurrences,nav}) {
  const ativos=employees.filter(e=>e.sit==='Ativo').length;
  const emFerias=employees.filter(e=>e.sit==='Férias').length;
  const afastados=employees.filter(e=>e.sit.startsWith('Afastado')).length;
  const vencendo=employees.filter(e=>{if(!e.fimContrato||e.sit==='Demitido')return false;const d=daysTo(e.fimContrato);return d!==null&&d>=0&&d<=30;});
  const vencidos=employees.filter(e=>{if(!e.fimContrato||e.sit==='Demitido')return false;const d=daysTo(e.fimContrato);return d!==null&&d<0;});
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);
  const recOccs=occurrences.filter(o=>new Date(o.data)>=cutoff);
  const stats=[{label:'Total Cadastrados',value:employees.length,icon:'👥',color:S.p},{label:'Ativos',value:ativos,icon:'✅',color:S.success},{label:'Em Férias',value:emFerias,icon:'🌴',color:S.info},{label:'Afastados',value:afastados,icon:'⚕️',color:S.warning}];
  return <div>
    <h2 style={{margin:'0 0 20px',fontSize:22,fontWeight:700,color:S.text}}>Dashboard</h2>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
      {stats.map(s=><Card key={s.label} style={{padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><p style={{margin:'0 0 4px',fontSize:12,color:S.muted}}>{s.label}</p><p style={{margin:0,fontSize:30,fontWeight:700,color:s.color}}>{s.value}</p></div>
          <span style={{fontSize:26}}>{s.icon}</span>
        </div>
      </Card>)}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
      <Card>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <h3 style={{margin:0,fontSize:14,fontWeight:600,color:S.text}}>⚠️ Vencendo em 30 dias</h3>
          <Badge color={vencendo.length>0?'warning':'success'}>{vencendo.length}</Badge>
        </div>
        {vencendo.length===0?<p style={{color:S.muted,fontSize:13,margin:0}}>Nenhum contrato vencendo em breve.</p>:vencendo.slice(0,5).map(e=><div key={e.id} onClick={()=>nav('detail',e)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:`1px solid ${S.border}`,cursor:'pointer'}}>
          <div><p style={{margin:0,fontSize:14,fontWeight:500,color:S.text}}>{e.nome}</p><p style={{margin:0,fontSize:11,color:S.muted}}>{[e.cargo,e.cliente].filter(Boolean).join(' • ')}</p></div>
          <Badge color='warning'>{daysTo(e.fimContrato)}d</Badge>
        </div>)}
      </Card>
      <Card>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <h3 style={{margin:0,fontSize:14,fontWeight:600,color:S.text}}>🔴 Contratos vencidos</h3>
          <Badge color={vencidos.length>0?'danger':'success'}>{vencidos.length}</Badge>
        </div>
        {vencidos.length===0?<p style={{color:S.muted,fontSize:13,margin:0}}>Nenhum contrato vencido.</p>:vencidos.slice(0,5).map(e=><div key={e.id} onClick={()=>nav('detail',e)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:`1px solid ${S.border}`,cursor:'pointer'}}>
          <div><p style={{margin:0,fontSize:14,fontWeight:500,color:S.text}}>{e.nome}</p><p style={{margin:0,fontSize:11,color:S.muted}}>{[e.cargo,e.cliente].filter(Boolean).join(' • ')}</p></div>
          <Badge color='danger'>Vencido {fmt(e.fimContrato)}</Badge>
        </div>)}
      </Card>
    </div>
    <Card>
      <h3 style={{margin:'0 0 10px',fontSize:14,fontWeight:600,color:S.text}}>📋 Ocorrências recentes — {recOccs.length} registros (30 dias)</h3>
      {recOccs.length===0?<p style={{color:S.muted,fontSize:13,margin:0}}>Nenhuma ocorrência nos últimos 30 dias.</p>:recOccs.slice(0,8).map(o=>{const emp=employees.find(e=>e.id===o.empId);return <div key={o.id} style={{display:'flex',gap:10,alignItems:'center',padding:'7px 0',borderBottom:`1px solid ${S.border}`}}>
        <Badge color={occClr(o.tipo)}>{o.tipo}</Badge>
        <div style={{flex:1}}><span style={{fontSize:14,color:S.text,fontWeight:500}}>{emp?.nome||'—'}</span>{o.obs&&<span style={{fontSize:12,color:S.muted}}> — {o.obs}</span>}</div>
        <span style={{fontSize:12,color:S.muted}}>{fmt(o.data)}</span>
      </div>;})}
    </Card>
  </div>;
}

function EmpList({employees,nav,onDelete}) {
  const [search,setSearch]=useState('');
  const [sit,setSit]=useState('all');
  const flt=employees.filter(e=>{const s=search.toLowerCase();return(!s||[e.nome,e.cpf,e.cargo,e.cliente].some(v=>(v||'').toLowerCase().includes(s)))&&(sit==='all'||e.sit===sit);});
  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
      <h2 style={{margin:0,fontSize:22,fontWeight:700,color:S.text}}>Funcionários <span style={{fontSize:14,fontWeight:400,color:S.muted}}>({flt.length}/{employees.length})</span></h2>
      <Btn onClick={()=>nav('form',null)}>+ Novo Funcionário</Btn>
    </div>
    <Card style={{marginBottom:14,padding:'12px 16px'}}>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Buscar nome, CPF, cargo, empresa..." style={{flex:1,minWidth:200,...iSt}} />
        <Sel value={sit} onChange={e=>setSit(e.target.value)} style={{width:180}} options={[{v:'all',l:'Todas as situações'},...SITS.map(s=>({v:s,l:s}))]} />
      </div>
    </Card>
    <Card style={{padding:0,overflow:'hidden'}}>
      {flt.length===0?<div style={{padding:40,textAlign:'center',color:S.muted}}><div style={{fontSize:40,marginBottom:8}}>👥</div><p style={{margin:'0 0 12px'}}>Nenhum funcionário encontrado.</p><Btn onClick={()=>nav('form',null)}>Cadastrar funcionário</Btn></div>:<table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr style={{background:'#f8fafc',borderBottom:`2px solid ${S.border}`}}>
          {['Nome','CPF','Cargo','Empresa Cliente','Situação','Contrato',''].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:12,fontWeight:600,color:S.muted}}>{h}</th>)}
        </tr></thead>
        <tbody>{flt.map(e=><tr key={e.id} onClick={()=>nav('detail',e)} style={{borderBottom:`1px solid ${S.border}`,cursor:'pointer'}} onMouseEnter={x=>x.currentTarget.style.background='#f8fafc'} onMouseLeave={x=>x.currentTarget.style.background='transparent'}>
          <td style={{padding:'9px 12px',fontSize:14,fontWeight:500,color:S.text}}>{e.nome}</td>
          <td style={{padding:'9px 12px',fontSize:13,color:S.muted}}>{e.cpf||'—'}</td>
          <td style={{padding:'9px 12px',fontSize:13,color:S.text}}>{e.cargo||'—'}</td>
          <td style={{padding:'9px 12px',fontSize:13,color:S.text}}>{e.cliente||'—'}</td>
          <td style={{padding:'9px 12px'}}><Badge color={sitClr[e.sit]}>{e.sit}</Badge></td>
          <td style={{padding:'9px 12px',fontSize:12,color:S.muted}}>{e.tipo}{e.fimContrato?` • ${fmt(e.fimContrato)}`:''}</td>
          <td style={{padding:'9px 12px'}} onClick={ev=>ev.stopPropagation()}><div style={{display:'flex',gap:4}}><Btn sz='sm' v='secondary' onClick={()=>nav('form',e)}>✏️</Btn><Btn sz='sm' v='secondary' onClick={()=>onDelete(e)}>🗑️</Btn></div></td>
        </tr>)}</tbody>
      </table>}
    </Card>
  </div>;
}

function EmpForm({emp,onSave,onCancel,saving}) {
  const [d,setD]=useState({...EMPTY,...emp});
  const [tab,setTab]=useState(0);
  const [errs,setErrs]=useState({});
  const set=(k,v)=>setD(x=>({...x,[k]:v}));
  const TABS=['👤 Pessoal','🏠 Endereço','📄 Contrato','🎁 Benefícios','🏦 Banco','📝 Obs.'];
  function save(){const e={};if(!d.nome.trim())e.nome='Obrigatório';if(!d.admissao)e.admissao='Obrigatório';if(Object.keys(e).length){setErrs(e);setTab(0);return;}onSave(d);}
  const G={display:'grid',gridTemplateColumns:'1fr 1fr',gap:16};
  return <div>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}><Btn v='ghost' onClick={onCancel}>← Voltar</Btn><h2 style={{margin:0,fontSize:20,fontWeight:700,color:S.text}}>{d.id?`Editar — ${d.nome}`:'Novo Funcionário'}</h2></div>
    <Card>
      <div style={{display:'flex',gap:0,marginBottom:20,borderBottom:`1px solid ${S.border}`,overflowX:'auto'}}>
        {TABS.map((t,i)=><button key={i} onClick={()=>setTab(i)} style={{padding:'8px 14px',border:'none',background:'transparent',cursor:'pointer',borderBottom:tab===i?`2px solid ${S.p}`:'2px solid transparent',color:tab===i?S.p:S.muted,fontWeight:tab===i?600:400,fontSize:13,whiteSpace:'nowrap',marginBottom:-1}}>{t}</button>)}
      </div>
      <div style={G}>
        {tab===0&&<><Field label="Nome Completo *" error={errs.nome} span2><Inp value={d.nome} onChange={e=>set('nome',e.target.value)} placeholder="Nome completo" /></Field>
          <Field label="CPF"><Inp value={d.cpf} onChange={e=>set('cpf',e.target.value)} placeholder="000.000.000-00" /></Field>
          <Field label="RG"><Inp value={d.rg} onChange={e=>set('rg',e.target.value)} placeholder="00.000.000-X" /></Field>
          <Field label="Data de Nascimento"><Inp type="date" value={d.nasc} onChange={e=>set('nasc',e.target.value)} /></Field>
          <Field label="Sexo"><Sel value={d.sexo} onChange={e=>set('sexo',e.target.value)} options={[{v:'M',l:'Masculino'},{v:'F',l:'Feminino'},{v:'O',l:'Outro'}]} /></Field>
          <Field label="Telefone"><Inp value={d.tel} onChange={e=>set('tel',e.target.value)} placeholder="(00) 00000-0000" /></Field>
          <Field label="E-mail" span2><Inp type="email" value={d.email} onChange={e=>set('email',e.target.value)} placeholder="email@exemplo.com" /></Field></>}
        {tab===1&&<><Field label="CEP"><Inp value={d.cep} onChange={e=>set('cep',e.target.value)} placeholder="00000-000" /></Field>
          <Field label="Estado (UF)"><Inp value={d.uf} onChange={e=>set('uf',e.target.value)} placeholder="SP" maxLength={2} /></Field>
          <Field label="Logradouro" span2><Inp value={d.rua} onChange={e=>set('rua',e.target.value)} placeholder="Rua, Avenida..." /></Field>
          <Field label="Número"><Inp value={d.num} onChange={e=>set('num',e.target.value)} placeholder="123" /></Field>
          <Field label="Complemento"><Inp value={d.comp} onChange={e=>set('comp',e.target.value)} placeholder="Apto, Bloco..." /></Field>
          <Field label="Bairro"><Inp value={d.bairro} onChange={e=>set('bairro',e.target.value)} placeholder="Bairro" /></Field>
          <Field label="Cidade"><Inp value={d.cidade} onChange={e=>set('cidade',e.target.value)} placeholder="Cidade" /></Field></>}
        {tab===2&&<><Field label="Empresa Cliente" span2><Inp value={d.cliente} onChange={e=>set('cliente',e.target.value)} placeholder="Nome da empresa onde o funcionário trabalha" /></Field>
          <Field label="Data de Admissão *" error={errs.admissao}><Inp type="date" value={d.admissao} onChange={e=>set('admissao',e.target.value)} /></Field>
          <Field label="Tipo de Contrato"><Sel value={d.tipo} onChange={e=>set('tipo',e.target.value)} options={TIPOS} /></Field>
          <Field label="Fim do Contrato"><Inp type="date" value={d.fimContrato} onChange={e=>set('fimContrato',e.target.value)} /></Field>
          <Field label="Situação"><Sel value={d.sit} onChange={e=>set('sit',e.target.value)} options={SITS} /></Field>
          <Field label="Cargo"><Inp value={d.cargo} onChange={e=>set('cargo',e.target.value)} placeholder="Ex: Operador de Produção" /></Field>
          <Field label="Função"><Inp value={d.funcao} onChange={e=>set('funcao',e.target.value)} placeholder="Ex: Auxiliar de Linha" /></Field>
          <Field label="Salário (R$)"><Inp type="number" value={d.salario} onChange={e=>set('salario',e.target.value)} placeholder="0.00" /></Field>
          {d.sit==='Demitido'&&<><Field label="Data de Demissão"><Inp type="date" value={d.demissao} onChange={e=>set('demissao',e.target.value)} /></Field>
            <Field label="Motivo da Demissão"><Inp value={d.motivo} onChange={e=>set('motivo',e.target.value)} /></Field></>}</>}
        {tab===3&&<div style={{gridColumn:'1/-1',display:'flex',flexDirection:'column',gap:16}}>
          <div><Tog checked={d.vr} onChange={v=>set('vr',v)} label="Vale Refeição (VR)" />{d.vr&&<div style={{marginTop:8,paddingLeft:48}}><Field label="Valor VR (R$/dia)"><Inp type="number" value={d.vrVal} onChange={e=>set('vrVal',e.target.value)} placeholder="0.00" /></Field></div>}</div>
          <div><Tog checked={d.vt} onChange={v=>set('vt',v)} label="Vale Transporte (VT)" />{d.vt&&<div style={{marginTop:8,paddingLeft:48}}><Field label="Valor VT (R$/dia)"><Inp type="number" value={d.vtVal} onChange={e=>set('vtVal',e.target.value)} placeholder="0.00" /></Field></div>}</div>
          <Tog checked={d.fretado} onChange={v=>set('fretado',v)} label="Fretado" />
          <div><Tog checked={d.ac} onChange={v=>set('ac',v)} label="Ajuda de Custo" />{d.ac&&<div style={{marginTop:8,paddingLeft:48}}><Field label="Valor (R$)"><Inp type="number" value={d.acVal} onChange={e=>set('acVal',e.target.value)} placeholder="0.00" /></Field></div>}</div>
          <div style={{borderTop:`1px solid ${S.border}`,paddingTop:14}}>
            <Tog checked={d.ferias} onChange={v=>set('ferias',v)} label="Férias agendadas" />
            {d.ferias&&<div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
              <Field label="Início"><Inp type="date" value={d.ferIni} onChange={e=>set('ferIni',e.target.value)} /></Field>
              <Field label="Fim"><Inp type="date" value={d.ferFim} onChange={e=>set('ferFim',e.target.value)} /></Field>
              <Field label="Dias"><Inp type="number" value={d.ferDias} onChange={e=>set('ferDias',e.target.value)} placeholder="30" /></Field>
            </div>}
          </div>
        </div>}
        {tab===4&&<><div style={{gridColumn:'1/-1',padding:'8px 12px',background:'#fef9c3',borderRadius:8,fontSize:13,color:'#92400e'}}>⚠️ Estes dados são apenas para referência interna. Pagamentos são gerenciados externamente.</div>
          <Field label="Banco"><Inp value={d.banco} onChange={e=>set('banco',e.target.value)} placeholder="Bradesco, Itaú, Nubank..." /></Field>
          <Field label="Agência"><Inp value={d.agencia} onChange={e=>set('agencia',e.target.value)} placeholder="0000-0" /></Field>
          <Field label="Número da Conta"><Inp value={d.conta} onChange={e=>set('conta',e.target.value)} placeholder="00000-0" /></Field>
          <Field label="Tipo de Conta"><Sel value={d.tipoConta} onChange={e=>set('tipoConta',e.target.value)} options={['Corrente','Poupança','Salário']} /></Field>
          <Field label="Chave PIX" span2><Inp value={d.pix} onChange={e=>set('pix',e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" /></Field></>}
        {tab===5&&<div style={{gridColumn:'1/-1'}}><Field label="Observações gerais"><Tx value={d.obs} onChange={e=>set('obs',e.target.value)} rows={8} placeholder="Informações adicionais, histórico, anotações..." /></Field></div>}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:20,paddingTop:16,borderTop:`1px solid ${S.border}`}}>
        <div style={{display:'flex',gap:8}}>{tab>0&&<Btn v='secondary' onClick={()=>setTab(tab-1)}>← Anterior</Btn>}{tab<TABS.length-1&&<Btn v='secondary' onClick={()=>setTab(tab+1)}>Próximo →</Btn>}</div>
        <div style={{display:'flex',gap:8}}><Btn v='secondary' onClick={onCancel}>Cancelar</Btn><Btn v='success' disabled={saving} onClick={save}>{saving?'Salvando...':'💾 Salvar'}</Btn></div>
      </div>
    </Card>
  </div>;
}

function EmpDetail({emp,occurrences,nav,onDelete,onSaveOcc,onDeleteOcc}) {
  const [showForm,setShowForm]=useState(false);
  const [occ,setOcc]=useState({tipo:'Falta',data:todayStr(),qtd:'1',obs:'',empId:emp.id});
  function IR({label,value,hi=false}){return <div style={{padding:'5px 0',borderBottom:`1px solid ${S.border}`,display:'flex',gap:8}}><span style={{width:130,fontSize:12,color:S.muted,fontWeight:500,flexShrink:0}}>{label}</span><span style={{fontSize:14,color:hi?S.p:S.text}}>{value||'—'}</span></div>;}
  function ST({t}){return <div style={{fontSize:11,fontWeight:700,color:S.muted,textTransform:'uppercase',letterSpacing:'0.07em',margin:'14px 0 6px',paddingBottom:4,borderBottom:`2px solid ${S.border}`}}>{t}</div>;}
  async function saveOcc(){if(!occ.data)return;await onSaveOcc({...occ,empId:emp.id});setOcc({tipo:'Falta',data:todayStr(),qtd:'1',obs:'',empId:emp.id});setShowForm(false);}
  const sorted=[...occurrences].sort((a,b)=>b.data.localeCompare(a.data));
  return <div>
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap'}}>
      <Btn v='ghost' onClick={()=>nav('list')}>← Lista</Btn>
      <div style={{flex:1}}><h2 style={{margin:0,fontSize:22,fontWeight:700,color:S.text}}>{emp.nome}</h2><p style={{margin:'2px 0 0',color:S.muted,fontSize:13}}>{[emp.cargo,emp.funcao,emp.cliente].filter(Boolean).join(' • ')}</p></div>
      <Badge color={sitClr[emp.sit]}>{emp.sit}</Badge>
      <Btn v='secondary' sz='sm' onClick={()=>nav('form',emp)}>✏️ Editar</Btn>
      <Btn v='danger' sz='sm' onClick={()=>onDelete(emp)}>🗑️ Excluir</Btn>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'7fr 4fr',gap:16}}>
      <div><Card>
        <ST t="Dados Pessoais" />
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
          <div><IR label="CPF" value={emp.cpf}/></div><div><IR label="RG" value={emp.rg}/></div>
          <div><IR label="Nascimento" value={fmt(emp.nasc)}/></div><div><IR label="Sexo" value={{M:'Masculino',F:'Feminino',O:'Outro'}[emp.sexo]}/></div>
          <div><IR label="Telefone" value={emp.tel}/></div><div><IR label="E-mail" value={emp.email}/></div>
        </div>
        <ST t="Endereço" />
        <IR label="Logradouro" value={[emp.rua,emp.num,emp.comp].filter(Boolean).join(', ')}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
          <div><IR label="Bairro" value={emp.bairro}/></div><div><IR label="CEP" value={emp.cep}/></div>
          <div><IR label="Cidade" value={emp.cidade}/></div><div><IR label="UF" value={emp.uf}/></div>
        </div>
        <ST t="Contrato" />
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
          <div><IR label="Empresa Cliente" value={emp.cliente} hi/></div><div><IR label="Tipo" value={emp.tipo}/></div>
          <div><IR label="Admissão" value={fmt(emp.admissao)}/></div><div><IR label="Fim do Contrato" value={emp.fimContrato?fmt(emp.fimContrato):'Indeterminado'}/></div>
          <div><IR label="Cargo" value={emp.cargo}/></div><div><IR label="Função" value={emp.funcao}/></div>
          <div><IR label="Salário" value={money(emp.salario)} hi/></div>
          {emp.sit==='Demitido'&&<><div><IR label="Demissão" value={fmt(emp.demissao)}/></div><div><IR label="Motivo" value={emp.motivo}/></div></>}
        </div>
        <ST t="Benefícios" />
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
          <div><IR label="Vale Refeição" value={emp.vr?`Sim — R$ ${emp.vrVal}/dia`:'Não'}/></div>
          <div><IR label="Vale Transporte" value={emp.vt?`Sim — R$ ${emp.vtVal}/dia`:'Não'}/></div>
          <div><IR label="Fretado" value={emp.fretado?'Sim':'Não'}/></div>
          <div><IR label="Ajuda de Custo" value={emp.ac?`Sim — R$ ${emp.acVal}`:'Não'}/></div>
          {emp.ferias&&<><div><IR label="Férias" value={`${fmt(emp.ferIni)} a ${fmt(emp.ferFim)}`}/></div><div><IR label="Dias" value={emp.ferDias}/></div></>}
        </div>
        {emp.obs&&<><ST t="Observações"/><p style={{margin:0,fontSize:14,color:S.text,whiteSpace:'pre-wrap',lineHeight:1.6}}>{emp.obs}</p></>}
      </Card></div>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <Card>
          <h3 style={{margin:'0 0 4px',fontSize:14,fontWeight:600,color:S.text}}>🏦 Dados Bancários</h3>
          <p style={{margin:'0 0 10px',fontSize:11,color:S.warning,fontWeight:500}}>⚠️ Somente para referência</p>
          {[['Banco',emp.banco],['Agência',emp.agencia],['Conta',emp.conta?`${emp.conta} (${emp.tipoConta})`:null],['PIX',emp.pix]].map(([l,v])=>v?<div key={l} style={{marginBottom:8}}><p style={{margin:'0 0 1px',fontSize:11,color:S.muted,fontWeight:500}}>{l}</p><p style={{margin:0,fontSize:14,color:S.text}}>{v}</p></div>:null)}
          {!emp.banco&&!emp.pix&&<p style={{color:S.muted,fontSize:13,margin:0}}>Dados bancários não cadastrados.</p>}
        </Card>
        <Card>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <h3 style={{margin:0,fontSize:14,fontWeight:600,color:S.text}}>📋 Ocorrências ({occurrences.length})</h3>
            <Btn sz='sm' onClick={()=>setShowForm(!showForm)}>+</Btn>
          </div>
          {showForm&&<div style={{background:'#f8fafc',borderRadius:8,padding:12,marginBottom:12}}>
            <Field label="Tipo"><Sel value={occ.tipo} onChange={e=>setOcc(o=>({...o,tipo:e.target.value}))} options={OCC_TIPOS} /></Field>
            <Field label="Data"><Inp type="date" value={occ.data} onChange={e=>setOcc(o=>({...o,data:e.target.value}))} /></Field>
            <Field label="Qtd (horas ou dias)"><Inp type="number" step="0.5" value={occ.qtd} onChange={e=>setOcc(o=>({...o,qtd:e.target.value}))} /></Field>
            <Field label="Observação"><Tx value={occ.obs} onChange={e=>setOcc(o=>({...o,obs:e.target.value}))} rows={2} /></Field>
            <div style={{display:'flex',gap:6,marginTop:8}}><Btn sz='sm' v='success' onClick={saveOcc}>✓ Salvar</Btn><Btn sz='sm' v='secondary' onClick={()=>setShowForm(false)}>Cancelar</Btn></div>
          </div>}
          {sorted.length===0?<p style={{color:S.muted,fontSize:13,margin:0}}>Sem ocorrências registradas.</p>:sorted.map(o=><div key={o.id} style={{padding:'7px 0',borderBottom:`1px solid ${S.border}`,display:'flex',gap:6,alignItems:'flex-start'}}>
            <Badge color={occClr(o.tipo)}>{o.tipo}</Badge>
            <div style={{flex:1,minWidth:0}}><p style={{margin:0,fontSize:11,color:S.muted}}>{fmt(o.data)}{o.qtd?` • ${o.qtd}h/d`:''}</p>{o.obs&&<p style={{margin:'1px 0 0',fontSize:12,color:S.text}}>{o.obs}</p>}</div>
            <button onClick={()=>onDeleteOcc(o.id)} style={{border:'none',background:'none',color:S.muted,cursor:'pointer',fontSize:16,padding:'0 2px'}}>×</button>
          </div>)}
        </Card>
      </div>
    </div>
  </div>;
}

function OccsPage({employees,occurrences,onSave,onDelete}) {
  const [empId,setEmpId]=useState('');
  const [form,setForm]=useState({tipo:'Falta',data:todayStr(),qtd:'1',obs:''});
  const [fEmp,setFEmp]=useState('');
  const [fType,setFType]=useState('');
  const flt=[...occurrences].filter(o=>(!fEmp||o.empId===fEmp)&&(!fType||o.tipo===fType)).sort((a,b)=>b.data.localeCompare(a.data));
  async function save(){if(!empId)return;await onSave({...form,empId});setForm({tipo:'Falta',data:todayStr(),qtd:'1',obs:''});}
  return <div>
    <h2 style={{margin:'0 0 20px',fontSize:22,fontWeight:700,color:S.text}}>Ocorrências</h2>
    <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:16}}>
      <Card>
        <h3 style={{margin:'0 0 14px',fontSize:15,fontWeight:600,color:S.text}}>+ Registrar</h3>
        <Field label="Funcionário"><Sel value={empId} onChange={e=>setEmpId(e.target.value)} options={[{v:'',l:'Selecione...'}, ...employees.filter(e=>e.sit!=='Demitido').sort((a,b)=>a.nome.localeCompare(b.nome)).map(e=>({v:e.id,l:e.nome}))]} /></Field>
        <Field label="Tipo"><Sel value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} options={OCC_TIPOS} /></Field>
        <Field label="Data"><Inp type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} /></Field>
        <Field label="Quantidade"><Inp type="number" step="0.5" value={form.qtd} onChange={e=>setForm(f=>({...f,qtd:e.target.value}))} /></Field>
        <Field label="Observação"><Tx value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} rows={3} placeholder="Detalhes..." /></Field>
        <Btn style={{width:'100%',marginTop:4}} onClick={save} disabled={!empId}>Registrar</Btn>
      </Card>
      <Card style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'12px 14px',borderBottom:`1px solid ${S.border}`,display:'flex',gap:8,flexWrap:'wrap'}}>
          <select value={fEmp} onChange={e=>setFEmp(e.target.value)} style={{flex:1,minWidth:150,...iSt,padding:'6px 10px'}}>
            <option value="">Todos os funcionários</option>
            {employees.sort((a,b)=>a.nome.localeCompare(b.nome)).map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <select value={fType} onChange={e=>setFType(e.target.value)} style={{...iSt,padding:'6px 10px',width:160}}>
            <option value="">Todos os tipos</option>
            {OCC_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{overflow:'auto',maxHeight:520}}>
          {flt.length===0?<p style={{padding:24,color:S.muted,textAlign:'center',margin:0}}>Nenhuma ocorrência encontrada.</p>:flt.map(o=>{const emp=employees.find(e=>e.id===o.empId);return <div key={o.id} style={{display:'flex',gap:10,alignItems:'center',padding:'10px 14px',borderBottom:`1px solid ${S.border}`}}>
            <Badge color={occClr(o.tipo)}>{o.tipo}</Badge>
            <div style={{flex:1}}><p style={{margin:0,fontSize:14,fontWeight:500,color:S.text}}>{emp?.nome||'—'}</p><p style={{margin:0,fontSize:12,color:S.muted}}>{fmt(o.data)}{o.qtd?` • ${o.qtd}h/d`:''}{o.obs?` — ${o.obs}`:''}</p></div>
            <button onClick={()=>onDelete(o.id)} style={{border:'none',background:'none',color:S.muted,cursor:'pointer',fontSize:18,padding:'2px 6px'}}>×</button>
          </div>;})}
        </div>
      </Card>
    </div>
  </div>;
}

function AlertsPage({employees,nav}) {
  const sections=[
    {title:'🔴 Contratos vencidos',color:'danger',items:employees.filter(e=>{if(!e.fimContrato||e.sit==='Demitido')return false;const d=daysTo(e.fimContrato);return d!==null&&d<0;})},
    {title:'⚠️ Vencendo em 30 dias',color:'warning',items:employees.filter(e=>{if(!e.fimContrato||e.sit==='Demitido')return false;const d=daysTo(e.fimContrato);return d!==null&&d>=0&&d<=30;})},
    {title:'ℹ️ Vencendo entre 31–60 dias',color:'info',items:employees.filter(e=>{if(!e.fimContrato||e.sit==='Demitido')return false;const d=daysTo(e.fimContrato);return d!==null&&d>30&&d<=60;})},
    {title:'🌴 Em Férias',color:'info',items:employees.filter(e=>e.sit==='Férias')},
    {title:'⚕️ Afastados',color:'warning',items:employees.filter(e=>e.sit.startsWith('Afastado'))},
  ];
  return <div>
    <h2 style={{margin:'0 0 20px',fontSize:22,fontWeight:700,color:S.text}}>Alertas</h2>
    {sections.map(s=><Card key={s.title} style={{marginBottom:14}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><h3 style={{margin:0,fontSize:15,fontWeight:600,color:S.text}}>{s.title}</h3><Badge color={s.color}>{s.items.length}</Badge></div>
      {s.items.length===0?<p style={{color:S.muted,fontSize:13,margin:0}}>Nenhum registro.</p>:s.items.map(e=><div key={e.id} onClick={()=>nav('detail',e)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:`1px solid ${S.border}`,cursor:'pointer'}} onMouseEnter={x=>x.currentTarget.style.background='#f8fafc'} onMouseLeave={x=>x.currentTarget.style.background='transparent'}>
        <div><p style={{margin:0,fontSize:14,fontWeight:500,color:S.text}}>{e.nome}</p><p style={{margin:0,fontSize:12,color:S.muted}}>{[e.cargo,e.cliente,e.tipo].filter(Boolean).join(' • ')}</p></div>
        <div style={{textAlign:'right'}}>
          {e.fimContrato&&<Badge color={s.color}>{daysTo(e.fimContrato)<0?`Venceu ${fmt(e.fimContrato)}`:`${daysTo(e.fimContrato)} dias`}</Badge>}
        </div>
      </div>)}
    </Card>)}
  </div>;
}

export default function App() {
  const [token,setToken]=useState(null);
  const [user,setUser]=useState(null);
  const [sheetId,setSheetId]=useState(null);
  const [employees,setEmps]=useState([]);
  const [occurrences,setOccs]=useState([]);
  const [status,setStatus]=useState('idle');
  const [page,setPage]=useState('dashboard');
  const [activeEmp,setActiveEmp]=useState(null);
  const [toast,setToast]=useState(null);
  const [confirmDel,setConfirmDel]=useState(null);
  const [saving,setSaving]=useState(false);

  const notify=(msg,type='success')=>{setToast({msg,type});setTimeout(()=>setToast(null),3500);};

  const api = useCallback(async (path, method='GET', body=null) => {
    const opts = {method, headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}};
    if(body) opts.body = JSON.stringify(body);
    const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets${path}`,opts);
    if(!r.ok) { const e=await r.json(); throw new Error(e.error?.message||'Erro na API'); }
    return r.json();
  }, [token]);

  async function initSheet(tok) {
    const listR = await fetch('https://www.googleapis.com/drive/v3/files?q=name="GestaoRH-Sistema"&mimeType="application/vnd.google-apps.spreadsheet"',{headers:{Authorization:`Bearer ${tok}`}});
    const listD = await listR.json();
    if(listD.files?.length>0) {
      return listD.files[0].id;
    }
    const createR = await fetch('https://sheets.googleapis.com/v4/spreadsheets',{method:'POST',headers:{Authorization:`Bearer ${tok}`,'Content-Type':'application/json'},body:JSON.stringify({properties:{title:'GestaoRH-Sistema'},sheets:[{properties:{title:'Funcionarios'}},{properties:{title:'Ocorrencias'}}]})});
    const sheet = await createR.json();
    const sid = sheet.spreadsheetId;
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/Funcionarios!A1:${String.fromCharCode(65+EMP_FIELDS.length-1)}1:append?valueInputOption=RAW`,{method:'POST',headers:{Authorization:`Bearer ${tok}`,'Content-Type':'application/json'},body:JSON.stringify({values:[EMP_FIELDS]})});
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/Ocorrencias!A1:${String.fromCharCode(65+OCC_FIELDS.length-1)}1:append?valueInputOption=RAW`,{method:'POST',headers:{Authorization:`Bearer ${tok}`,'Content-Type':'application/json'},body:JSON.stringify({values:[OCC_FIELDS]})});
    return sid;
  }

  async function loadData(tok, sid) {
    const [er,or] = await Promise.all([
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/Funcionarios`,{headers:{Authorization:`Bearer ${tok}`}}).then(r=>r.json()),
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/Ocorrencias`,{headers:{Authorization:`Bearer ${tok}`}}).then(r=>r.json())
    ]);
    const eRows=(er.values||[]).slice(1).filter(r=>r[0]);
    const oRows=(or.values||[]).slice(1).filter(r=>r[0]);
    setEmps(eRows.map(rowToEmp));
    setOccs(oRows.map(rowToOcc));
  }

  function login() {
    const params = new URLSearchParams({client_id:CLIENT_ID,redirect_uri:window.location.href.split('?')[0].split('#')[0],response_type:'token',scope:SCOPES,prompt:'select_account'});
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  function logout() { setToken(null);setUser(null);setSheetId(null);setEmps([]);setOccs([]);setStatus('idle'); }

  useEffect(()=>{
    const hash = window.location.hash;
    if(hash.includes('access_token')) {
      const p = new URLSearchParams(hash.substring(1));
      const tok = p.get('access_token');
      window.location.hash = '';
      if(tok) {
        setToken(tok);
        setStatus('loading');
        fetch('https://www.googleapis.com/oauth2/v1/userinfo',{headers:{Authorization:`Bearer ${tok}`}})
          .then(r=>r.json()).then(u=>setUser({name:u.name,email:u.email}));
        initSheet(tok).then(sid=>{
          setSheetId(sid);
          return loadData(tok,sid);
        }).then(()=>setStatus('ready')).catch(e=>{notify(e.message,'error');setStatus('error');});
      }
    }
  },[]);

  async function saveEmployee(emp) {
    setSaving(true);
    try {
      if(emp.id) {
        const getR = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Funcionarios`,{headers:{Authorization:`Bearer ${token}`}});
        const getData = await getR.json();
        const rows = getData.values||[];
        const rowIdx = rows.findIndex((r,i)=>i>0&&r[0]===emp.id);
        if(rowIdx>=0) {
          const col = String.fromCharCode(65+EMP_FIELDS.length-1);
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Funcionarios!A${rowIdx+1}:${col}${rowIdx+1}?valueInputOption=RAW`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values:[empToRow(emp)]})});
        }
        setEmps(prev=>prev.map(e=>e.id===emp.id?emp:e));
        notify('Funcionário atualizado no Google Sheets!');
      } else {
        const newEmp = {...emp,id:genId(),createdAt:new Date().toISOString()};
        const col = String.fromCharCode(65+EMP_FIELDS.length-1);
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Funcionarios!A:${col}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values:[empToRow(newEmp)]})});
        setEmps(prev=>[...prev,newEmp]);
        notify('Funcionário salvo no Google Sheets!');
      }
      nav('list');
    } catch(e) { notify(e.message,'error'); }
    setSaving(false);
  }

  async function deleteEmployee(id) {
    try {
      const getR = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Funcionarios`,{headers:{Authorization:`Bearer ${token}`}});
      const getData = await getR.json();
      const rows = getData.values||[];
      const rowIdx = rows.findIndex((r,i)=>i>0&&r[0]===id);
      if(rowIdx>=0) {
        const sheetInfoR = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,{headers:{Authorization:`Bearer ${token}`}});
        const sheetInfo = await sheetInfoR.json();
        const sh = sheetInfo.sheets.find(s=>s.properties.title==='Funcionarios');
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({requests:[{deleteDimension:{range:{sheetId:sh.properties.sheetId,dimension:'ROWS',startIndex:rowIdx,endIndex:rowIdx+1}}}]})});
      }
      setEmps(prev=>prev.filter(e=>e.id!==id));
      setOccs(prev=>prev.filter(o=>o.empId!==id));
      setConfirmDel(null);
      notify('Funcionário removido.','info');
      if(page==='detail') nav('list');
    } catch(e) { notify(e.message,'error'); }
  }

  async function saveOccurrence(occ) {
    try {
      const newOcc = {...occ,id:genId(),createdAt:new Date().toISOString()};
      const col = String.fromCharCode(65+OCC_FIELDS.length-1);
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Ocorrencias!A:${col}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values:[occToRow(newOcc)]})});
      setOccs(prev=>[...prev,newOcc]);
      notify('Ocorrência registrada!');
    } catch(e) { notify(e.message,'error'); }
  }

  async function deleteOccurrence(id) {
    try {
      const getR = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Ocorrencias`,{headers:{Authorization:`Bearer ${token}`}});
      const getData = await getR.json();
      const rows = getData.values||[];
      const rowIdx = rows.findIndex((r,i)=>i>0&&r[0]===id);
      if(rowIdx>=0) {
        const sheetInfoR = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,{headers:{Authorization:`Bearer ${token}`}});
        const sheetInfo = await sheetInfoR.json();
        const sh = sheetInfo.sheets.find(s=>s.properties.title==='Ocorrencias');
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({requests:[{deleteDimension:{range:{sheetId:sh.properties.sheetId,dimension:'ROWS',startIndex:rowIdx,endIndex:rowIdx+1}}}]})});
      }
      setOccs(prev=>prev.filter(o=>o.id!==id));
      notify('Ocorrência removida.','info');
    } catch(e) { notify(e.message,'error'); }
  }

  function nav(p,emp=undefined){setPage(p);if(emp!==undefined)setActiveEmp(emp);}
  const alertCnt=employees.filter(e=>{if(!e.fimContrato||e.sit==='Demitido')return false;const d=daysTo(e.fimContrato);return d!==null&&d<=30;}).length;
  const curEmp=activeEmp?employees.find(e=>e.id===activeEmp.id)||activeEmp:null;

  if(!token||status==='idle') return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:S.bg,fontFamily:'system-ui'}}>
      <div style={{background:'#fff',borderRadius:16,padding:40,maxWidth:400,width:'100%',textAlign:'center',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
        <div style={{width:56,height:56,background:S.p,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 16px'}}>🏢</div>
        <h1 style={{margin:'0 0 8px',fontSize:24,fontWeight:700,color:S.text}}>GestãoRH</h1>
        <p style={{margin:'0 0 8px',color:S.muted,fontSize:15}}>Sistema de gestão de mão de obra</p>
        <p style={{margin:'0 0 28px',color:S.muted,fontSize:13,padding:'10px 14px',background:'#f0fdf4',borderRadius:8,color:'#166534'}}>✅ Dados salvos diretamente no seu Google Sheets</p>
        <button onClick={login} style={{width:'100%',padding:'12px 20px',background:'#4285f4',color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Entrar com Google
        </button>
        <p style={{margin:'16px 0 0',fontSize:12,color:S.muted}}>Seus dados ficam na sua conta Google.<br/>Acesse de qualquer computador.</p>
      </div>
    </div>
  );

  if(status==='loading') return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:S.bg,fontFamily:'system-ui'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:44,height:44,border:'4px solid #e2e8f0',borderTopColor:S.p,borderRadius:'50%',animation:'spin 0.7s linear infinite',margin:'0 auto 14px'}} />
        <p style={{color:S.muted,margin:'0 0 6px',fontWeight:500}}>Conectando ao Google Sheets...</p>
        <p style={{color:S.muted,margin:0,fontSize:13}}>Criando ou abrindo a planilha GestaoRH-Sistema</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  const pageLabels={dashboard:'🏠 Início',list:'👥 Funcionários',form:curEmp?.id?'✏️ Editar':'➕ Novo Funcionário',detail:`👤 ${curEmp?.nome||'Detalhe'}`,occurrences:'📋 Ocorrências',alerts:'🔔 Alertas'};

  return <div style={{display:'flex',height:'100vh',fontFamily:"system-ui,-apple-system,sans-serif",background:S.bg,overflow:'hidden'}}>
    <style>{`*{box-sizing:border-box}button,input,select,textarea{font-family:inherit}`}</style>
    <Sidebar page={page} nav={nav} alertCnt={alertCnt} user={user} onLogout={logout} />
    <div style={{flex:1,overflow:'auto',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#fff',borderBottom:`1px solid ${S.border}`,padding:'11px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
        <span style={{fontSize:13,color:S.muted,fontWeight:500}}>{pageLabels[page]||''}</span>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:13,color:S.muted}}>{employees.filter(e=>e.sit==='Ativo').length} ativos · {employees.length} total</span>
          <span style={{fontSize:11,color:'#166534',background:'#f0fdf4',padding:'3px 8px',borderRadius:6,fontWeight:500}}>✅ Google Sheets</span>
        </div>
      </div>
      <div style={{flex:1,padding:24,overflow:'auto'}}>
        {page==='dashboard'&&<Dashboard employees={employees} occurrences={occurrences} nav={nav} />}
        {page==='list'&&<EmpList employees={employees} nav={nav} onDelete={setConfirmDel} />}
        {page==='form'&&<EmpForm emp={curEmp||{...EMPTY}} onSave={saveEmployee} onCancel={()=>nav('list')} saving={saving} />}
        {page==='detail'&&curEmp&&<EmpDetail emp={curEmp} occurrences={occurrences.filter(o=>o.empId===curEmp.id)} nav={nav} onDelete={setConfirmDel} onSaveOcc={saveOccurrence} onDeleteOcc={deleteOccurrence} />}
        {page==='occurrences'&&<OccsPage employees={employees} occurrences={occurrences} onSave={saveOccurrence} onDelete={deleteOccurrence} />}
        {page==='alerts'&&<AlertsPage employees={employees} nav={nav} />}
      </div>
    </div>
    {toast&&<Toast msg={toast.msg} type={toast.type} />}
    {confirmDel&&<Modal title="Confirmar exclusão" onClose={()=>setConfirmDel(null)}>
      <p style={{margin:'0 0 20px',color:S.text}}>Deseja remover <strong>{confirmDel.nome}</strong>? Todas as ocorrências também serão excluídas.</p>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}><Btn v='secondary' onClick={()=>setConfirmDel(null)}>Cancelar</Btn><Btn v='danger' onClick={()=>deleteEmployee(confirmDel.id)}>Confirmar exclusão</Btn></div>
    </Modal>}
  </div>;
}
