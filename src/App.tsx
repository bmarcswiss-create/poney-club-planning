// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, X, Plus, Edit, FilterX, Lock, Unlock, ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, StickyNote, Calendar, ShieldCheck, UserCog, Activity, AlertTriangle, Info, TrendingUp, Menu
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'sb_publishable_azT_rAkqeE-zsnvolYSY9w_7MtlnBVI';
const supabase = createClient(supabaseUrl, supabaseKey);

const PIN_ADMIN = "poney"; 
const PIN_DIRECTION = "poneyaurelieschaller";
const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const LOGO_URL = "https://lnwvlyswsmtafyoepovq.supabase.co/storage/v1/object/public/logo/logo.png";

const getOfficialEvents = () => {
  const evts = {};
  const add = (date, type, titre) => { if (!evts[date]) evts[date] = []; evts[date].push({ titre, type }); };
  add('2026-01-01', 'jour_ferie', 'Nouvel An');
  add('2026-04-03', 'jour_ferie', 'Vendredi-Saint');
  add('2026-04-06', 'jour_ferie', 'Lundi de Pâques');
  add('2026-05-14', 'jour_ferie', 'Ascension');
  add('2026-05-25', 'jour_ferie', 'Pentecôte');
  add('2026-08-01', 'jour_ferie', 'Fête nationale');
  add('2026-09-10', 'jour_ferie', 'Jeûne genevois');
  add('2026-12-25', 'jour_ferie', 'Noël');
  add('2026-12-31', 'jour_ferie', 'Restauration République');
  const range = (start, end, titre) => {
    let s = new Date(start); let e = new Date(end);
    while(s <= e) { add(s.toLocaleDateString('en-CA'), 'vacances_ge', titre); s.setDate(s.getDate()+1); }
  };
  range('2026-01-01', '2026-01-02', 'Vacances Noël');
  range('2026-02-23', '2026-02-27', 'Relâches');
  range('2026-04-03', '2026-04-17', 'Vacances Pâques');
  range('2026-06-29', '2026-08-21', 'Grandes Vacances');
  range('2026-10-19', '2026-10-23', 'Automne');
  range('2026-12-24', '2026-12-31', 'Vacances Noël');
  return evts;
};

const OFFICIAL_EVENTS_2026 = getOfficialEvents();

export default function App() {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDirAuth, setIsDirAuth] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [membresBase, setMembresBase] = useState([]);
  const [conges, setConges] = useState([]);
  const [notes, setNotes] = useState({});
  const [evenementsPerso, setEvenementsPerso] = useState({});
  const [manualPresence, setManualPresence] = useState({}); 
  const [filtreEmploye, setFiltreEmploye] = useState(null);

  const [modalCongeOpen, setModalCongeOpen] = useState(false);
  const [modalStaffOpen, setModalStaffOpen] = useState(false);
  const [modalChoiceOpen, setModalChoiceOpen] = useState(null);
  const [modalPinOpen, setModalPinOpen] = useState(false);
  const [modalDirOpen, setModalDirOpen] = useState(false);
  const [modalNoteOpen, setModalNoteOpen] = useState(false);
  const [modalEvtOpen, setModalEvtOpen] = useState(false);
  
  const [formData, setFormData] = useState({ userId: '', dateDebut: todayStr, dateFin: todayStr, periode: 'jour', statut: 'provisoire', category: 'conge' });
  const [evtForm, setEvtForm] = useState({ dateDebut: todayStr, titre: '', type: 'club' });
  const [noteText, setNoteText] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [dirPinInput, setDirPinInput] = useState("");

  const syncAll = async (m, c, n, e, man) => {
    await supabase.from('app_state').upsert([
      { id: 'poney_equipe', data: m }, { id: 'poney_conges', data: c },
      { id: 'poney_notes', data: n }, { id: 'poney_evts_perso', data: e },
      { id: 'poney_manual_final_persist', data: man }
    ]);
  };

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('app_state').select('*');
      if (data) {
        const map = {}; data.forEach(r => map[r.id] = r.data);
        setMembresBase(map.poney_equipe || []); setConges(map.poney_conges || []);
        setNotes(map.poney_notes || {}); setEvenementsPerso(map.poney_evts_perso || {});
        setManualPresence(map.poney_manual_final_persist || {});
      }
      setIsLoaded(true);
    } load();
  }, []);

  const congesParDate = useMemo(() => {
    const map = {}; (conges || []).forEach(c => { if (c?.date) { if (!map[c.date]) map[c.date] = []; map[c.date].push(c); } });
    return map;
  }, [conges]);

  const getDayPresence = (dateStr) => {
    if (!dateStr || !membresBase) return { total: 0, scheduled: [], ponctuel: [], malades: [], absentsPlanifies: [] };
    const d = new Date(dateStr);
    const nomJour = JOURS_SEMAINE[d.getDay() === 0 ? 6 : d.getDay() - 1];
    const allAbs = congesParDate[dateStr] || [];
    const absPlanifies = allAbs.filter(a => a.category !== 'maladie');
    const absPlanifiesIds = new Set(absPlanifies.map(a => String(a.userId)));
    const malIds = new Set(allAbs.filter(a => a.category === 'maladie').map(a => String(a.userId)));

    let scheduled = [], ponctuel = [], malades = [], listAbsPlan = [];
    membresBase.forEach(m => {
        const mId = String(m.id);
        const override = manualPresence[dateStr]?.[mId];
        const isNormallyHere = !(Array.isArray(m.repos) && m.repos.includes(nomJour)) && !absPlanifiesIds.has(mId) && m.role !== "Aide ponctuel";
        if (malIds.has(mId)) { malades.push(m); return; }
        if (absPlanifiesIds.has(mId)) { listAbsPlan.push({ nom: m.nom, type: absPlanifies.find(a => String(a.userId) === mId).category }); return; }
        if (override === true) { if (isNormallyHere) scheduled.push(m); else ponctuel.push(m); }
        else if (override === false) { }
        else { if (isNormallyHere) scheduled.push(m); }
    });
    return { total: scheduled.length + ponctuel.length, scheduled, ponctuel, malades, absentsPlanifies: listAbsPlan };
  };

  const calendrierRender = useMemo(() => {
    return ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"].map((mois, mIdx) => {
      const first = new Date(2026, mIdx, 1);
      const jours = [];
      let offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
      for (let i = 0; i < offset; i++) jours.push(null);
      let date = new Date(first);
      while (date.getMonth() === mIdx) { jours.push(new Date(date)); date.setDate(date.getDate() + 1); }
      return (
        <div key={mois} className="bg-white rounded-xl shadow border border-gray-200 flex flex-col h-fit">
          <div className="bg-[#EBF2E1] py-2 text-center font-bold text-[#1B2A49] text-xs uppercase tracking-widest">{mois}</div>
          <div className="p-2 grid grid-cols-7 grid-rows-6 gap-1 flex-1">
            {['L','M','M','J','V','S','D'].map(day => <div key={day} className="text-center text-[10px] font-bold text-gray-400 pb-1">{day}</div>)}
            {jours.map((dateObj, idx) => {
              if (!dateObj) return <div key={idx} className="aspect-square"></div>;
              const dStr = dateObj.toLocaleDateString('en-CA');
              const pres = getDayPresence(dStr);
              const isToday = dStr === todayStr;
              const absVis = (congesParDate[dStr] || []).filter(a => a.category !== 'maladie');

              return (
                <div key={dStr} onClick={() => { setSelectedDate(dStr); setModalChoiceOpen(dStr); }}
                  className={`aspect-square min-h-[40px] rounded-lg flex items-center justify-center relative cursor-pointer overflow-hidden transition-all border border-transparent
                  ${pres.total < 4 ? 'bg-red-600' : isToday ? 'bg-amber-100 border-orange-500 ring-2 ring-orange-500/30 z-10' : 'bg-[#F4F6F9]'}`}>
                  {absVis.length > 0 && pres.total >= 4 && (
                    <div className="absolute inset-0 flex flex-col">
                      {[0, 1].map(h => {
                        const m = absVis.find(a => (h === 0 ? ['matin','jour'].includes(a.periode) : ['apres-midi','jour'].includes(a.periode)));
                        if (!m) return <div key={h} className="h-1/2"></div>;
                        const col = m.statut === 'provisoire' ? 'transparent' : '#1B2A49';
                        return (
                          <div key={h} className="h-1/2 w-full relative" style={{ backgroundColor: col }}>
                            {m.statut === 'provisoire' && <div className="absolute inset-0" style={{ background: `repeating-linear-gradient(45deg, #15803d, #15803d 2.5px, #1B2A49 2.5px, #1B2A49 5px)` }}></div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {(OFFICIAL_EVENTS_2026[dStr] || evenementsPerso[dStr]) && (
                    <div className="absolute bottom-0 w-full flex flex-col gap-[0.5px]">
                      {OFFICIAL_EVENTS_2026[dStr] && <div className="h-[2px] bg-purple-600 w-full"></div>}
                      {evenementsPerso[dStr] && <div className="h-[2px] bg-blue-500 w-full"></div>}
                    </div>
                  )}
                  {notes[dStr] && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-bl-full shadow-sm"></div>}
                  <span className={`z-10 font-bold text-xs ${ (pres.total < 4 || (absVis.length > 0 && pres.total >= 4)) ? 'text-white' : 'text-[#1B2A49]'}`}>{dateObj.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  }, [congesParDate, filtreEmploye, membresBase, manualPresence, todayStr, notes, evenementsPerso]);

  return (
    <div className="flex h-screen bg-[#F0F4F8] text-[#1B2A49] overflow-hidden font-sans">
      
      {/* SIDEBAR - RESTAURATION COMPLÈTE */}
      <aside className="w-80 bg-[#1B2A49] flex flex-col shrink-0 shadow-2xl text-white z-30">
        <div className="p-8 bg-[#141D36] flex flex-col items-center border-b-4 border-[#8DC63F] text-center">
          <img src={LOGO_URL} alt="Logo" className="w-24 h-24 bg-white rounded-full p-1 mb-4 shadow-xl" />
          <div className="flex flex-col items-center">
             <div className="flex items-center gap-2 mb-2">
                <h2 className="text-[10px] font-black uppercase bg-[#8DC63F] text-[#1B2A49] px-2 py-0.5 rounded">Équipe Écurie</h2>
                <button onClick={() => { setPinInput(""); setModalPinOpen(true); }} className={`p-1 rounded ${isAdmin ? 'bg-green-500' : 'bg-red-500'}`}><Unlock size={14}/></button>
             </div>
             <h1 className="text-xl font-black uppercase tracking-tight">Poney Club Presinge</h1>
          </div>
        </div>
        
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
           {isAdmin && (
             <div className="space-y-2">
                <button onClick={() => { setFormData({ ...formData, dateDebut: selectedDate, dateFin: selectedDate }); setModalCongeOpen(true); }} className="w-full bg-[#8DC63F] text-[#1B2A49] font-black py-4 rounded-xl flex items-center justify-center gap-2 uppercase text-xs"><Plus size={18}/> Absence</button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setModalEvtOpen(true)} className="bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"><Calendar size={12}/> Event</button>
                  <button onClick={() => { setNoteText(notes[selectedDate] || ""); setModalNoteOpen(true); }} className="bg-yellow-400 text-[#1B2A49] py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"><StickyNote size={12}/> Post-it</button>
                </div>
             </div>
           )}
           
           <button onClick={() => setFiltreEmploye(null)} className={`w-full py-3 rounded-xl text-xs font-bold uppercase transition-all bg-white/10 ${!filtreEmploye ? 'ring-2 ring-[#8DC63F]' : ''}`}>Voir toute l'équipe</button>

           <div className="space-y-6 pt-4 border-t border-white/5 text-left">
              {["Palefrenier", "Apprentie", "Monitrice", "Aide WE"].map(role => {
                const mm = membresBase.filter(m => m.role === role);
                if (!mm.length) return null;
                return (
                  <div key={role}>
                    <h4 className="text-[10px] opacity-40 uppercase font-black tracking-widest mb-3 border-b border-white/10 pb-1">{role}s</h4>
                    {mm.map(m => (
                      <div key={m.id} onClick={() => setFiltreEmploye(filtreEmploye === m.id ? null : m.id)} className={`p-3 rounded-xl mb-2 cursor-pointer transition-all ${filtreEmploye === m.id ? 'bg-[#8DC63F] text-[#1B2A49]' : 'bg-[#213459]'}`}>
                        <span className="text-sm font-bold block mb-1">{m.nom}</span>
                        <div className="flex gap-1.5 font-mono text-[10px] font-black">
                           {['L','M','M','J','V','S','D'].map((l, i) => <span key={i} className={m.repos?.includes(JOURS_SEMAINE[i]) ? "text-red-400" : "text-green-400"}>{l}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
           </div>
        </div>

        <div className="p-4 border-t border-white/10">
           <button onClick={() => { setDirPinInput(""); setModalDirOpen(true); }} className="w-full py-3 bg-purple-600/30 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-purple-600/50 transition-colors">
             <ShieldCheck size={16}/> Accès Direction
           </button>
        </div>
      </aside>

      {/* ZONE CALENDRIER - SCROLLABLE SANS COUPURE */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden relative">
        <header className="bg-white border-b p-8 flex flex-col items-center shrink-0 shadow-sm min-h-fit">
          <div className={`w-full max-w-2xl rounded-[2.5rem] border-4 flex flex-col justify-center items-center p-8 transition-all shadow-xl ${selectedDate === todayStr ? 'border-orange-500 ring-8 ring-orange-50' : 'border-[#D0D7E1]'} ${getDayPresence(selectedDate).total < 4 ? 'bg-red-600 text-white animate-pulse' : 'bg-white'}`}>
            <h3 className="text-2xl font-black uppercase text-center mb-2 leading-tight">
                {new Date(selectedDate).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
            </h3>
            
            <div className="flex flex-col items-center w-full mt-4">
                <div className="flex items-center gap-6 bg-[#1B2A49] px-10 py-4 rounded-full text-white shadow-2xl mb-4">
                   <span className="text-[#8DC63F] font-black text-4xl">{getDayPresence(selectedDate).total}</span>
                   <div className="text-sm font-bold leading-tight flex flex-wrap gap-x-2 border-l border-white/20 pl-6">
                      <span className="opacity-40 uppercase tracking-widest w-full text-[10px] mb-1">Présents :</span>
                      {getDayPresence(selectedDate).scheduled.map((p, i) => <span key={p.id}>{p.nom}{i < getDayPresence(selectedDate).scheduled.length - 1 || getDayPresence(selectedDate).ponctuel.length > 0 ? ',' : ''} </span>)}
                      {getDayPresence(selectedDate).ponctuel.map((p, i) => <span key={p.id} className="text-cyan-300 italic font-black"> (+ {p.nom})</span>)}
                   </div>
                </div>
                {getDayPresence(selectedDate).absentsPlanifies.length > 0 && (
                   <div className="flex items-center gap-2 text-xs font-bold text-gray-400 italic bg-gray-50 px-6 py-2 rounded-full border border-dashed">
                      <Info size={14}/> Absences : {getDayPresence(selectedDate).absentsPlanifies.map((a, i) => <span key={i}>{a.nom} ({a.type === 'conge' ? '🏝️' : '✈️'}){i < getDayPresence(selectedDate).absentsPlanifies.length - 1 ? ', ' : ''}</span>)}
                   </div>
                )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {calendrierRender}
        </div>

        <div className="bg-white px-8 py-4 border-t flex justify-center gap-12 text-[11px] font-black uppercase tracking-widest shrink-0">
          <div className="flex items-center gap-2 text-cyan-600 italic font-black"><CheckCircle2 size={16}/> Ponctuel</div>
          <div className="flex items-center gap-2 text-orange-500 uppercase font-black">🤒 Maladie</div>
          <div className="flex items-center gap-2 text-[#1B2A49]"><div className="w-5 h-5 bg-[#1B2A49] rounded"></div> Absence Validée</div>
          <div className="flex items-center gap-2 text-purple-600"><div className="w-6 h-[4px] bg-purple-600"></div> Fériés / GE</div>
        </div>
      </main>

      {/* MODALES D'ORIGINE */}
      {modalChoiceOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500] p-4 text-[#1B2A49]">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-6 space-y-4 border-t-8 border-[#8DC63F] shadow-2xl text-center">
            <h4 className="font-black uppercase text-base border-b pb-2">{new Date(modalChoiceOpen).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}</h4>
            <div className="grid grid-cols-2 gap-2 text-left bg-gray-50 p-3 rounded-xl max-h-60 overflow-y-auto">
               {membresBase.map(m => {
                  const pres = getDayPresence(modalChoiceOpen);
                  const isPresent = pres.scheduled.some(p => p.id === m.id) || pres.ponctuel.some(p => p.id === m.id);
                  return (<label key={m.id} className="flex items-center gap-2 p-2 hover:bg-white rounded transition-all cursor-pointer"><input type="checkbox" className="w-5 h-5 accent-[#8DC63F]" checked={isPresent} onChange={async () => { const dOver = manualPresence[modalChoiceOpen] || {}; const newMan = { ...manualPresence, [modalChoiceOpen]: { ...dOver, [m.id]: !isPresent } }; setManualPresence(newMan); await syncAll(membresBase, conges, notes, evenementsPerso, newMan); }} /><span className="text-[11px] font-bold truncate">{m.nom}</span></label>)
               })}
            </div>
            {isAdmin && (
              <div className="space-y-2 pt-2">
                  <button onClick={() => { setFormData({ ...formData, dateDebut: modalChoiceOpen, dateFin: modalChoiceOpen }); setModalCongeOpen(true); setModalChoiceOpen(null); }} className="w-full py-4 bg-[#8DC63F] text-[#1B2A49] font-black rounded-2xl uppercase text-xs shadow-md">Absence / Maladie</button>
                  <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => { setModalEvtOpen(true); setModalChoiceOpen(null); }} className="bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase">Event</button>
                     <button onClick={() => { setNoteText(notes[modalChoiceOpen] || ""); setModalNoteOpen(true); setModalChoiceOpen(null); }} className="bg-yellow-400 text-[#1B2A49] py-3 rounded-xl text-[10px] font-black uppercase">Post-it</button>
                  </div>
              </div>
            )}
            <button onClick={() => setModalChoiceOpen(null)} className="w-full text-gray-400 font-bold text-xs uppercase py-2">Fermer</button>
          </div>
        </div>
      )}

      {/* MODALE NOTE */}
      {modalNoteOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[600] p-4 text-[#1B2A49]">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden border-4 border-yellow-400 shadow-2xl">
            <div className="p-4 bg-yellow-400 font-black flex justify-between uppercase italic text-[10px]">Post-it Écurie<X onClick={() => setModalNoteOpen(false)} className="cursor-pointer" size={18}/></div>
            <form onSubmit={async (e) => { e.preventDefault(); const nx = { ...notes }; if (!noteText.trim()) delete nx[selectedDate]; else nx[selectedDate] = noteText; setNotes(nx); setModalNoteOpen(false); await syncAll(membresBase, conges, nx, evenementsPerso, manualPresence); }} className="p-6 space-y-4 text-center">
               <textarea autoFocus className="w-full border-2 border-yellow-100 p-5 rounded-2xl bg-yellow-50 outline-none h-40 font-bold text-[#1B2A49] text-sm" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Écrire une note..."/>
               <button type="submit" className="w-full bg-yellow-400 text-[#1B2A49] font-black py-4 rounded-xl uppercase active:scale-95 text-xs">Enregistrer</button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE EVENT */}
      {modalEvtOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[600] p-4 text-[#1B2A49]">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative text-center">
             <X className="absolute top-6 right-6 cursor-pointer text-gray-400" onClick={() => setModalEvtOpen(false)} size={20}/>
             <h3 className="font-black uppercase mb-8 text-base">Événement Écurie</h3>
             <form onSubmit={async (e) => { e.preventDefault(); const nx = { ...evenementsPerso }; const date = evtForm.dateDebut; nx[date] = [...(nx[date] || []), { id: Date.now(), titre: evtForm.titre, type: evtForm.type }]; setEvenementsPerso(nx); setModalEvtOpen(false); await syncAll(membresBase, conges, notes, nx, manualPresence); }} className="space-y-4 text-left">
                <input type="date" className="w-full border-2 p-4 rounded-xl font-bold text-[#1B2A49] text-sm" value={evtForm.dateDebut} onChange={e => setEvtForm({...evtForm, dateDebut: e.target.value})}/>
                <input type="text" className="w-full border-2 p-4 rounded-xl font-black text-[#1B2A49] text-sm uppercase" placeholder="Titre de l'événement" value={evtForm.titre} onChange={e => setEvtForm({...evtForm, titre: e.target.value})} required/>
                <button type="submit" className="w-full bg-[#1B2A49] text-white py-4 rounded-xl font-black uppercase text-xs">Ajouter au calendrier</button>
             </form>
          </div>
        </div>
      )}

      {/* MODALE PIN ADMIN */}
      {modalPinOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[700] p-4 text-[#1B2A49]">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl border-b-[12px] border-black">
            <Lock className="mx-auto mb-4 text-gray-200" size={48} />
            <form onSubmit={(e) => { e.preventDefault(); if (pinInput.toLowerCase() === PIN_ADMIN) { setIsAdmin(true); setModalPinOpen(false); setPinInput(""); } else { alert("Code incorrect"); } }} className="space-y-4">
               <input autoFocus type="password" placeholder="PIN" className="w-full text-center text-3xl border-b-4 border-black p-3 outline-none font-black" value={pinInput} onChange={e => setPinInput(e.target.value)} />
               <button type="submit" className="w-full py-4 bg-black text-white rounded-xl font-bold uppercase text-xs">Valider</button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CONGE */}
      {modalCongeOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[600] p-4 text-[#1B2A49]">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border-2 border-[#1B2A49]">
            <div className="p-6 bg-[#1B2A49] text-white flex justify-between items-center font-black uppercase text-sm">Nouvelle Absence<X onClick={() => setModalCongeOpen(false)} className="cursor-pointer" size={20}/></div>
            <form onSubmit={async (e) => { e.preventDefault(); const nC = [...conges]; const s = new Date(formData.dateDebut); const en = new Date(formData.dateFin || formData.dateDebut); for (let d = new Date(s); d <= en; d.setDate(d.getDate() + 1)) { nC.push({ id: Math.random(), userId: formData.userId, date: d.toLocaleDateString('en-CA'), category: formData.category, periode: formData.periode, statut: 'valide' }); } setConges(nC); setModalCongeOpen(false); await syncAll(membresBase, nC, notes, evenementsPerso, manualPresence); }} className="p-8 space-y-6 text-left">
              <select className="w-full border-4 border-gray-50 p-5 rounded-2xl font-black text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option value="conge">🏝️ Vacances / Congé</option>
                <option value="maladie">🤒 Maladie</option>
                <option value="deplacement">✈️ Déplacement Pro</option>
              </select>
              <div className="grid grid-cols-2 gap-4"><input type="date" className="border-4 border-gray-50 p-5 rounded-2xl font-bold text-sm" value={formData.dateDebut} onChange={e => setFormData({...formData, dateDebut: e.target.value})} required/><input type="date" className="border-4 border-gray-50 p-5 rounded-2xl font-bold text-sm" value={formData.dateFin} onChange={e => setFormData({...formData, dateFin: e.target.value})}/></div>
              <select className="w-full border-4 border-gray-50 p-5 rounded-2xl font-black text-sm" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})} required><option value="">-- Choisir employé --</option>{membresBase.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}</select>
              <button type="submit" className="w-full bg-[#1B2A49] text-white py-5 rounded-2xl font-black uppercase text-sm shadow-xl">Enregistrer</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}