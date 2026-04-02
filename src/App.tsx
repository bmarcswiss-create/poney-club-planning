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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [anneeActuelle, setAnneeActuelle] = useState(2026);
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
  const [staffForm, setStaffForm] = useState({ id: null, nom: '', role: 'Palefrenier', repos: [], quotaVacances: 25 });
  const [evtForm, setEvtForm] = useState({ dateDebut: todayStr, titre: '', type: 'club' });
  const [noteText, setNoteText] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [dirPinInput, setDirPinInput] = useState("");

  const syncAll = async (m, c, n, e, man) => {
    await supabase.from('app_state').upsert([
      { id: 'poney_equipe', data: m }, { id: 'poney_conges', data: c },
      { id: 'poney_notes', data: n }, { id: 'poney_evts_perso', data: e },
      { id: 'poney_manual_final_persist', data: man }, { id: 'poney_annee', data: anneeActuelle.toString() }
    ]);
  };

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

  const calendrierRender = useMemo(() => {
    return ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"].map((mois, mIdx) => {
      const first = new Date(anneeActuelle, mIdx, 1);
      const jours = [];
      let offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
      for (let i = 0; i < offset; i++) jours.push(null);
      let date = new Date(first);
      while (date.getMonth() === mIdx) { jours.push(new Date(date)); date.setDate(date.getDate() + 1); }
      return (
        <div key={mois} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden flex flex-col relative z-10 w-full mb-6">
          <div className="bg-[#EBF2E1] py-2 text-center font-bold text-[#1B2A49] text-xs uppercase tracking-widest">{mois}</div>
          <div className="p-2 grid grid-cols-7 gap-1 w-full box-border">
            {['L','M','M','J','V','S','D'].map(day => <div key={day} className="text-center text-[9px] md:text-[10px] font-bold text-gray-400 pb-1">{day}</div>)}
            {jours.map((dateObj, idx) => {
              if (!dateObj) return <div key={idx} className="aspect-square"></div>;
              const dStr = dateObj.toLocaleDateString('en-CA');
              const pres = getDayPresence(dStr);
              const isToday = dStr === todayStr;
              const isPast = dStr < todayStr;
              const abs = filtreEmploye ? (congesParDate[dStr] || []).filter(a => String(a.userId) === String(filtreEmploye)) : (congesParDate[dStr] || []);
              const absVis = abs.filter(a => a.category !== 'maladie');
              return (
                <div key={dStr} onClick={() => { setSelectedDate(dStr); setModalChoiceOpen(dStr); }}
                  className={`aspect-square rounded-lg flex items-center justify-center relative cursor-pointer overflow-hidden border border-transparent
                  ${pres.total < 4 ? 'bg-red-600' : isToday ? 'bg-amber-100 border-orange-500 ring-2 ring-orange-500/30 z-10' : isPast ? 'bg-[#E2E8F0]' : 'bg-[#F4F6F9]'}`}>
                  {absVis.length > 0 && pres.total >= 4 && (
                    <div className="absolute inset-0 flex flex-col">
                      {[0, 1].map(h => {
                        const m = absVis.find(a => (h === 0 ? ['matin','jour'].includes(a.periode) : ['apres-midi','jour'].includes(a.periode)));
                        if (!m) return <div key={h} className="h-1/2"></div>;
                        const isProv = m.statut === 'provisoire';
                        const col = m.category === 'deplacement' ? '#0891b2' : (isProv ? 'transparent' : '#1B2A49');
                        return (
                          <div key={h} className="h-1/2 w-full relative" style={{ backgroundColor: col }}>
                            {isProv && m.category === 'conge' && <div className="absolute inset-0" style={{ background: `repeating-linear-gradient(45deg, #15803d, #15803d 2.5px, #1B2A49 2.5px, #1B2A49 5px)` }}></div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  { (OFFICIAL_EVENTS_2026[dStr] || evenementsPerso[dStr]) && (
                    <div className="absolute bottom-0 w-full flex flex-col">
                      {OFFICIAL_EVENTS_2026[dStr] && <div className="h-[2px] bg-purple-600 w-full"></div>}
                      {evenementsPerso[dStr] && <div className="h-[2px] bg-blue-500 w-full"></div>}
                    </div>
                  )}
                  {notes[dStr] && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-bl-full shadow-sm"></div>}
                  <span className={`z-10 font-bold text-[10px] md:text-[12px] ${(pres.total < 4 || (absVis.length > 0 && pres.total >= 4)) ? 'text-white' : isPast ? 'text-gray-500' : 'text-[#1B2A49]'}`}>{dateObj.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  }, [anneeActuelle, congesParDate, filtreEmploye, membresBase, manualPresence, todayStr, notes, evenementsPerso]);

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F0F4F8] text-[#1B2A49] overflow-hidden font-sans relative">
      
      {/* BOUTON BURGER MOBILE */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden fixed top-3 left-3 z-[150] p-2 bg-[#1B2A49] text-white rounded-lg shadow-lg">
        {sidebarOpen ? <X size={20}/> : <Menu size={20}/>}
      </button>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 w-72 md:w-80 bg-[#1B2A49] flex flex-col shrink-0 shadow-2xl text-white text-center z-[100] overflow-hidden`}>
        <div className="p-6 bg-[#141D36] flex flex-col items-center justify-center border-b-4 border-[#8DC63F]">
          <img src={LOGO_URL} alt="Logo" className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-full p-1 mb-2" />
          <div className="flex flex-col items-center">
             <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[9px] font-extrabold uppercase bg-[#8DC63F] text-[#1B2A49] px-2 py-0.5 rounded">Équipe Écurie</h2>
                <button onClick={() => { setPinInput(""); setModalPinOpen(true); }} className={`p-1 rounded ${isAdmin ? 'bg-green-500' : 'bg-red-500'}`}><Unlock size={14}/></button>
             </div>
             <h1 className="text-sm md:text-xl font-black uppercase tracking-tight">Poney Club Presinge</h1>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
           {isAdmin && (
             <div className="flex flex-col gap-2">
                <button onClick={() => { setFormData({ ...formData, dateDebut: selectedDate, dateFin: selectedDate, category: 'conge' }); setModalCongeOpen(true); setSidebarOpen(false); }} className="w-full bg-[#8DC63F] text-[#1B2A49] font-black py-3 rounded-xl flex items-center justify-center gap-2 uppercase text-[10px] md:text-xs shadow-lg"><Plus size={16}/> Absence</button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setEvtForm({ ...evtForm, dateDebut: selectedDate }); setModalEvtOpen(true); setSidebarOpen(false); }} className="bg-blue-600 text-white py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1"><Calendar size={12}/> Event</button>
                  <button onClick={() => { setNoteText(notes[selectedDate] || ""); setModalNoteOpen(true); setSidebarOpen(false); }} className="bg-yellow-400 text-[#1B2A49] py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1"><StickyNote size={12}/> Post-it</button>
                </div>
             </div>
           )}
           <button onClick={() => { setFiltreEmploye(null); setSidebarOpen(false); }} className={`w-full bg-white/10 text-white font-bold py-2.5 rounded-xl text-[10px] md:text-xs ${!filtreEmploye ? 'ring-2 ring-[#8DC63F]' : ''}`}><FilterX size={14} className="inline mr-1"/> TOUTE L'ÉQUIPE</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left">
           {["Palefrenier", "Apprentie", "Monitrice", "Aide WE", "Aide ponctuel"].map(role => {
             const mm = membresBase.filter(m => m.role === role);
             if (!mm.length) return null;
             return (
               <div key={role}>
                 <h4 className="text-[10px] opacity-40 uppercase font-black tracking-widest border-b border-white/10 mb-2">{role}s</h4>
                 {mm.map(m => (
                   <div key={m.id} onClick={() => { setFiltreEmploye(filtreEmploye === m.id ? null : m.id); setSidebarOpen(false); }} className={`p-3 rounded-xl mb-1 cursor-pointer transition-all ${filtreEmploye === m.id ? 'bg-[#8DC63F] text-[#1B2A49] font-bold' : 'bg-[#213459] text-white/80'}`}>
                     <span className="text-sm font-bold block">{m.nom}</span>
                     <div className="flex gap-1 mt-1 font-mono text-[9px] font-black uppercase">{['L','M','M','J','V','S','D'].map((l, i) => <span key={i} className={m.repos?.includes(JOURS_SEMAINE[i]) ? "text-red-400" : "text-green-400"}>{l}</span>)}</div>
                   </div>
                 ))}
               </div>
             );
           })}
        </div>
        <div className="p-4 border-t border-white/10 space-y-2 shrink-0">
          {isAdmin && <button onClick={() => { setModalStaffOpen(true); setSidebarOpen(false); }} className="w-full p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] uppercase font-bold flex items-center justify-center gap-2"><UserCog size={12}/> Staff</button>}
          <button onClick={() => { setDirPinInput(""); setIsDirAuth(false); setModalDirOpen(true); setSidebarOpen(false); }} className="w-full p-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-[9px] uppercase font-bold flex items-center justify-center gap-2"><ShieldCheck size={12}/> Direction</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* BANDEAU SUPÉRIEUR */}
        <header className="bg-white border-b flex flex-col items-center justify-center px-4 py-4 md:h-44 shrink-0 gap-2">
          <div className="flex items-center gap-4">
            <button onClick={() => setAnneeActuelle(a => a-1)} className="p-2 border rounded-lg bg-gray-50"><ChevronLeft size={18}/></button>
            <h2 className="text-xl md:text-2xl font-black text-[#1B2A49]">{anneeActuelle}</h2>
            <button onClick={() => setAnneeActuelle(a => a+1)} className="p-2 border rounded-lg bg-gray-50"><ChevronRight size={18}/></button>
          </div>
          
          <div className={`w-full max-w-xl rounded-2xl border-2 flex flex-col justify-center items-center p-3 shadow-lg ${selectedDate === todayStr ? 'border-orange-500' : 'border-[#D0D7E1]'} ${getDayPresence(selectedDate).total < 4 ? 'bg-red-600 text-white animate-pulse' : 'bg-white'}`}>
            <h3 className="text-[10px] md:text-sm font-black uppercase text-center mb-1">{new Date(selectedDate).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}</h3>
            
            <div className="flex flex-wrap justify-center gap-2 mb-1">
                {[...(OFFICIAL_EVENTS_2026[selectedDate] || []), ...(evenementsPerso[selectedDate] || [])].map((e, i) => (
                  <span key={i} className="text-[9px] font-black uppercase text-red-600">🚩 {e.titre}</span>
                ))}
            </div>

            <div className="flex flex-col items-center w-full">
                <div className="flex items-center gap-4 bg-[#1B2A49] px-6 py-1.5 rounded-full text-white shadow-md mb-2">
                   <span className="text-[#8DC63F] font-black text-xl md:text-2xl">{getDayPresence(selectedDate).total}</span>
                   <div className="text-[9px] md:text-xs font-bold leading-tight flex flex-wrap gap-x-1">
                      {getDayPresence(selectedDate).scheduled.map((p, i) => <span key={p.id}>{p.nom}{i < getDayPresence(selectedDate).scheduled.length - 1 || getDayPresence(selectedDate).ponctuel.length > 0 || getDayPresence(selectedDate).malades.length > 0 ? ',' : ''}</span>)}
                      {getDayPresence(selectedDate).ponctuel.map((p, i) => <span key={p.id} className="text-cyan-300 italic font-black"> (+ {p.nom}){i < getDayPresence(selectedDate).ponctuel.length - 1 || getDayPresence(selectedDate).malades.length > 0 ? ',' : ''}</span>)}
                      {getDayPresence(selectedDate).malades.map((p, i) => <span key={p.id} className="text-orange-400 font-black uppercase"> (- {p.nom}){i < getDayPresence(selectedDate).malades.length - 1 ? ',' : ''}</span>)}
                   </div>
                </div>
                
                {getDayPresence(selectedDate).absentsPlanifies.length > 0 && (
                   <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 italic">
                      <Info size={12}/> Absences planifiées : {getDayPresence(selectedDate).absentsPlanifies.map((a, i) => <span key={i}>{a.nom} ({a.type === 'conge' ? '🏝️' : '✈️'}){i < getDayPresence(selectedDate).absentsPlanifies.length - 1 ? ', ' : ''}</span>)}
                   </div>
                )}
            </div>
          </div>
        </header>

        <div className="bg-white px-4 py-2 flex justify-center gap-3 md:gap-8 border-b text-[8px] md:text-[9px] font-black uppercase tracking-wider shrink-0 overflow-x-auto whitespace-nowrap">
          <div className="flex items-center gap-1 text-cyan-600 italic"><CheckCircle2 size={10}/> Ponctuel</div>
          <div className="flex items-center gap-1 text-orange-500">Maladie</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3" style={{ background: 'repeating-linear-gradient(45deg, #15803d, #15803d 2px, #1B2A49 2px, #1B2A49 4px)' }}></div> Provisoire</div>
          <div className="flex items-center gap-1"><div className="w-4 h-[2px] bg-purple-600"></div> Fériés</div>
          <div className="flex items-center gap-1"><div className="w-4 h-[2px] bg-blue-500"></div> Club</div>
        </div>
        
        {/* GRILLE CALENDRIER SÉCURISÉE */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 bg-slate-50 w-full box-border pb-10">
          {calendrierRender}
        </div>
      </main>

      {/* MODALE SELECTION JOUR */}
      {modalChoiceOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500] p-4 text-[#1B2A49]">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-5 space-y-4 border-t-8 border-[#8DC63F] shadow-2xl relative text-center max-h-[90vh] overflow-y-auto">
            <h4 className="font-black uppercase text-xs border-b pb-2">{new Date(modalChoiceOpen).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}</h4>
            <div className="grid grid-cols-2 gap-2 text-left bg-gray-50 p-3 rounded-xl overflow-y-auto">
               {membresBase.map(m => {
                  const pres = getDayPresence(modalChoiceOpen);
                  const isPresent = pres.scheduled.some(p => p.id === m.id) || pres.ponctuel.some(p => p.id === m.id);
                  const isMalade = pres.malades.some(p => p.id === m.id);
                  return (<label key={m.id} className={`flex items-center gap-2 p-2 hover:bg-white rounded transition-all ${isMalade ? 'opacity-30' : 'cursor-pointer'}`}><input type="checkbox" disabled={isMalade} className="w-4 h-4 accent-[#8DC63F]" checked={isPresent} onChange={async () => { const dOver = manualPresence[modalChoiceOpen] || {}; const newMan = { ...manualPresence, [modalChoiceOpen]: { ...dOver, [m.id]: !isPresent } }; setManualPresence(newMan); await syncAll(membresBase, conges, notes, evenementsPerso, newMan); }} /><span className={`text-[10px] font-bold truncate ${isMalade ? 'line-through text-orange-600' : ''}`}>{m.nom}</span></label>)
               })}
            </div>
            {isAdmin && (
              <div className="space-y-2 pt-2">
                  <button onClick={() => { setFormData({ ...formData, dateDebut: modalChoiceOpen, dateFin: modalChoiceOpen, category: 'conge' }); setModalCongeOpen(true); setModalChoiceOpen(null); }} className="w-full py-4 bg-[#8DC63F] text-[#1B2A49] font-black rounded-2xl uppercase text-[10px] shadow-md">Absence / Maladie</button>
                  <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => { setEvtForm({ ...evtForm, dateDebut: modalChoiceOpen }); setModalEvtOpen(true); setModalChoiceOpen(null); }} className="bg-blue-600 text-white py-3 rounded-xl text-[9px] font-black uppercase">Event</button>
                     <button onClick={() => { setNoteText(notes[modalChoiceOpen] || ""); setModalNoteOpen(true); setModalChoiceOpen(null); }} className="bg-yellow-400 text-[#1B2A49] py-3 rounded-xl text-[9px] font-black uppercase">Post-it</button>
                  </div>
              </div>
            )}
            <button onClick={() => setModalChoiceOpen(null)} className="w-full text-gray-400 font-bold text-[10px] uppercase py-2">Fermer</button>
          </div>
        </div>
      )}

      {/* MODALE DIRECTION */}
      {modalDirOpen && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[1000] p-4 text-[#1B2A49]">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border-t-8 border-purple-600">
            <div className="p-4 md:p-6 bg-purple-600 text-white flex justify-between items-center shrink-0">
              <h2 className="text-xs md:text-xl font-black uppercase flex items-center gap-2"><ShieldCheck size={18}/> Direction 2026</h2>
              <X onClick={() => { setIsDirAuth(false); setModalDirOpen(false); }} className="cursor-pointer" size={24}/>
            </div>
            
            {!isDirAuth ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 text-center bg-white">
                <Lock size={48} className="text-purple-200 mb-2"/>
                <input autoFocus type="password" placeholder="Mot de passe" className="w-full max-w-xs text-center text-xl border-b-4 border-purple-600 p-3 outline-none" value={dirPinInput} onChange={e => setDirPinInput(e.target.value)} onKeyDown={e => { if(e.key==='Enter' && dirPinInput === PIN_DIRECTION) setIsDirAuth(true); }}/>
                <button onClick={() => { if(dirPinInput === PIN_DIRECTION) setIsDirAuth(true); else alert("Accès refusé"); }} className="w-full max-w-xs bg-purple-600 text-white py-4 rounded-xl font-bold uppercase transition-all">Accéder</button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 space-y-6 md:space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-white p-6 rounded-2xl border shadow-sm">
                      <div className="text-[9px] font-black uppercase mb-4 flex items-center gap-2 text-red-600"><AlertTriangle size={16}/> Risque par Jour</div>
                      <div className="space-y-3">
                         {JOURS_SEMAINE.map((jour, idx) => {
                            const manques = [12, 5, 8, 18, 4, 25, 30][idx];
                            return (
                               <div key={jour} className="flex items-center gap-4">
                                  <span className="w-16 text-[8px] font-black uppercase opacity-60">{jour}</span>
                                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                     <div className={`h-full ${manques > 20 ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${manques}%`}}></div>
                                  </div>
                                  <span className="text-[8px] font-black">{manques}%</span>
                               </div>
                            )
                         })}
                      </div>
                   </div>

                   <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col">
                      <div className="text-[9px] font-black uppercase mb-6 flex justify-between items-center">Présence (%) <TrendingUp size={14}/></div>
                      <div className="flex-1 flex items-end gap-2 md:gap-4 h-32 px-2 border-b">
                         {[85, 88, 92, 70, 95, 85, 90, 80, 75, 88, 85, 90].map((v, i) => (
                           <div key={i} className="flex-1 bg-[#8DC63F] rounded-t-md relative group transition-all" style={{height: `${v}%`}}>
                             <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black bg-black text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">{v}%</div>
                           </div>
                         ))}
                      </div>
                      <div className="flex justify-between mt-3 text-[8px] font-black opacity-30 uppercase px-1">
                        <span>Jan</span><span>Mar</span><span>Mai</span><span>Juil</span><span>Sep</span><span>Nov</span>
                      </div>
                   </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className="text-[9px] uppercase opacity-50 font-black border-b bg-gray-50/50">
                          <th className="p-4">Employé</th>
                          <th className="p-4 text-center">Quota</th>
                          <th className="p-4 text-center">Pris</th>
                          <th className="p-4 text-center">Solde</th>
                          <th className="p-4 text-center text-orange-600">Maladie</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-[11px]">
                        {membresBase.map(m => {
                          const vacPrises = conges.filter(c => String(c.userId) === String(m.id) && c.category === 'conge').length;
                          const malJours = conges.filter(c => String(c.userId) === String(m.id) && c.category === 'maladie').length;
                          const solde = (m.quotaVacances || 25) - vacPrises;
                          return (
                            <tr key={m.id} className="hover:bg-purple-50/30 transition-colors">
                              <td className="p-4 border-r">{m.nom}</td>
                              <td className="p-4 text-center border-r">
                                <input type="number" className="w-12 border rounded p-1 text-center bg-gray-50" value={m.quotaVacances || 25} onChange={async (e) => { 
                                  const val = parseInt(e.target.value) || 0;
                                  const upd = membresBase.map(x => x.id === m.id ? {...x, quotaVacances: val} : x);
                                  setMembresBase(upd); await syncAll(upd, conges, notes, evenementsPerso, manualPresence);
                                }}/>
                              </td>
                              <td className="p-4 text-center border-r text-red-600">{vacPrises}j</td>
                              <td className={`p-4 text-center border-r ${solde < 5 ? 'text-red-600' : 'text-green-600'}`}>{solde}j</td>
                              <td className="p-4 text-center bg-orange-50 text-orange-700 font-black">{malJours}j</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUTRES MODALES - PIN ADMIN */}
      {modalPinOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[700] p-4 text-[#1B2A49]"><div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl"><Lock className="mx-auto mb-4" size={40} /><form onSubmit={(e) => { e.preventDefault(); if (pinInput.toLowerCase() === PIN_ADMIN) { setIsAdmin(true); setModalPinOpen(false); setPinInput(""); } else { alert("Code incorrect"); } }} className="space-y-4"><input autoFocus type="password" placeholder="PIN" className="w-full text-center text-3xl border-b-4 border-[#1B2A49] p-3 outline-none" value={pinInput} onChange={e => setPinInput(e.target.value)} /><button type="submit" className="w-full py-4 bg-[#1B2A49] text-white rounded-xl font-bold uppercase active:scale-95 transition-all">Valider</button></form></div></div>
      )}

    </div>
  );
}