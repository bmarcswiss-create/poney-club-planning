// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, X, Plus, Edit, Lock, Unlock, Calendar, StickyNote, UserCog, CheckCircle2, Menu, Download, Info, Plane
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'sb_publishable_azT_rAkqeE-zsnvolYSY9w_7MtlnBVI';
const supabase = createClient(supabaseUrl, supabaseKey);

const PIN_ADMIN = "poney"; 
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
    let s = new Date(start);
    let e = new Date(end);
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
  const [modalNoteOpen, setModalNoteOpen] = useState(false);
  const [modalEvtOpen, setModalEvtOpen] = useState(false);
  
  const [formData, setFormData] = useState({ userId: '', dateDebut: todayStr, dateFin: todayStr, periode: 'jour', statut: 'provisoire', category: 'conge' });
  const [staffForm, setStaffForm] = useState({ id: null, nom: '', role: 'Palefrenier', repos: [], quotaVacances: 25 });
  const [evtForm, setEvtForm] = useState({ dateDebut: todayStr, titre: '', type: 'club' });
  const [noteText, setNoteText] = useState("");
  const [pinInput, setPinInput] = useState("");

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
        setMembresBase(map.poney_equipe || []); 
        setConges(map.poney_conges || []);
        setNotes(map.poney_notes || {}); 
        setEvenementsPerso(map.poney_evts_perso || {});
        setManualPresence(map.poney_manual_final_persist || {});
      }
      setIsLoaded(true);
    } load();
  }, []);

  const congesParDate = useMemo(() => {
    const map = {}; 
    (conges || []).forEach(c => { if (c?.date) { if (!map[c.date]) map[c.date] = []; map[c.date].push(c); } });
    return map;
  }, [conges]);

  const getDayPresence = (dateStr) => {
    if (!dateStr || !membresBase) return { total: 0, scheduled: [], ponctuel: [], malades: [], absentsPlanifies: [] };
    const d = new Date(dateStr);
    const nomJour = JOURS_SEMAINE[d.getDay() === 0 ? 6 : d.getDay() - 1];
    const allAbs = congesParDate[dateStr] || [];
    const absPlanifies = allAbs.filter(a => a.category !== 'maladie');
    const malAbs = allAbs.filter(a => a.category === 'maladie');
    const malIds = new Set(malAbs.map(a => String(a.userId)));
    const absPlanifiesIds = new Set(absPlanifies.map(a => String(a.userId)));
    let scheduled = [], ponctuel = [], malades = [];
    membresBase.forEach(m => {
        const mId = String(m.id);
        const override = manualPresence[dateStr]?.[mId];
        const isNormallyHere = !(Array.isArray(m.repos) && m.repos.includes(nomJour)) && !absPlanifiesIds.has(mId) && m.role !== "Aide ponctuel";
        if (malIds.has(mId)) { malades.push(m); return; }
        if (override === true) { if (isNormallyHere) scheduled.push(m); else ponctuel.push(m); }
        else if (override === false) { }
        else { if (isNormallyHere) scheduled.push(m); }
    });
    return { total: scheduled.length + ponctuel.length, scheduled, ponctuel, malades, absentsPlanifies: absPlanifies.map(a => ({ nom: membresBase.find(m => String(m.id) === String(a.userId))?.nom, type: a.category })) };
  };

  const exportToCSV = () => {
    let csv = "--- BILAN INDIVIDUEL ---\n";
    csv += "Nom,Role,Quota Annuel,Conges Pris,Solde,Jours Maladie\n";
    membresBase.forEach(m => {
      const vacPrises = conges.filter(c => String(c.userId) === String(m.id) && c.category === 'conge').length;
      const malJours = conges.filter(c => String(c.userId) === String(m.id) && c.category === 'maladie').length;
      csv += `${m.nom},${m.role},${m.quotaVacances || 25},${vacPrises},${(m.quotaVacances || 25) - vacPrises},${malJours}\n`;
    });

    csv += "\n--- NOMBRE D'EMPLOYES PAR JOUR (2026) ---\n";
    csv += "Date,Nombre de presents\n";
    let d = new Date('2026-01-01');
    while(d.getFullYear() === 2026) {
      const dStr = d.toLocaleDateString('en-CA');
      const pres = getDayPresence(dStr);
      csv += `${dStr},${pres.total}\n`;
      d.setDate(d.getDate() + 1);
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `export_poney_club_2026.csv`;
    link.click();
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
        <div key={mois} className="bg-white rounded-[2.5rem] shadow-sm border border-white overflow-hidden flex flex-col h-fit transition-all hover:shadow-md">
          <div className="bg-gray-50/50 py-4 text-center font-black text-[#1B2A49] text-[10px] uppercase tracking-[0.2em] border-b border-gray-100">{mois}</div>
          <div className="p-4 grid grid-cols-7 gap-2 flex-1 w-full box-border">
            {['L','M','M','J','V','S','D'].map(day => <div key={day} className="text-center text-[10px] font-bold text-gray-300 pb-1">{day}</div>)}
            {jours.map((dateObj, idx) => {
              if (!dateObj) return <div key={idx} className="aspect-square"></div>;
              const dStr = dateObj.toLocaleDateString('en-CA');
              const pres = getDayPresence(dStr);
              const isToday = dStr === todayStr;
              const allAbsCase = congesParDate[dStr] || [];
              const absVis = allAbsCase.filter(a => a.category !== 'maladie');
              const isAlerte = pres.total < 4;
              return (
                <div key={dStr} onClick={() => { setSelectedDate(dStr); setModalChoiceOpen(dStr); }}
                  className={`aspect-square min-h-[35px] rounded-xl flex items-center justify-center relative cursor-pointer overflow-hidden transition-all border border-transparent
                  ${isAlerte ? 'bg-red-600' : isToday ? 'bg-amber-100 border-orange-500 ring-2 ring-orange-500/30 z-10' : 'bg-[#F4F6F9]'}`}>
                  {absVis.length > 0 && !isAlerte && (
                    <div className="absolute inset-0 flex flex-col">
                      {[0, 1].map(h => {
                        const m = absVis.find(a => (h === 0 ? ['matin','jour'].includes(a.periode) : ['apres-midi','jour'].includes(a.periode)));
                        if (!m) return <div key={h} className="h-1/2"></div>;
                        const isProv = m.statut === 'provisoire' && m.category === 'conge';
                        const col = m.category === 'deplacement' ? '#0891b2' : (isProv ? 'transparent' : '#1B2A49');
                        return ( <div key={h} className="h-1/2 w-full relative" style={{ backgroundColor: col }}>{isProv && <div className="absolute inset-0" style={{ background: `repeating-linear-gradient(45deg, #15803d, #15803d 2.5px, #1B2A49 2.5px, #1B2A49 5px)` }}></div>}</div> );
                      })}
                    </div>
                  )}
                  { (OFFICIAL_EVENTS_2026[dStr] || evenementsPerso[dStr]) && ( <div className="absolute bottom-0 w-full h-[2px] bg-purple-600"></div> )}
                  {notes[dStr] && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-bl-full shadow-sm"></div>}
                  <span className={`z-10 font-bold text-xs ${ (isAlerte || (absVis.length > 0 && !isAlerte)) ? 'text-white' : 'text-[#1B2A49]'}`}>{dateObj.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  }, [congesParDate, manualPresence, membresBase, todayStr, notes, evenementsPerso]);

  return (
    <div className="flex h-screen bg-[#F2F2F7] text-[#1B2A49] overflow-hidden font-sans">
      
      {/* MOBILE HAMBURGER */}
      <div className="lg:hidden fixed top-4 left-4 z-[100]">
        <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-[#1B2A49] text-white rounded-full shadow-xl">
          <Menu size={24} />
        </button>
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-[110] lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-80 bg-[#1B2A49] flex flex-col shrink-0 shadow-2xl text-white z-[120] transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-8 bg-[#141D36] flex flex-col items-center border-b-4 border-[#8DC63F] text-center relative">
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden absolute top-4 right-4 text-white/50"><X size={20}/></button>
          <img src={LOGO_URL} alt="Logo" className="w-20 h-20 bg-white rounded-full p-1 mb-4 shadow-xl" />
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
                <h2 className="text-[10px] font-black uppercase bg-[#8DC63F] text-[#1B2A49] px-2 py-0.5 rounded tracking-tighter">Équipe Écurie</h2>
                <button onClick={() => { setPinInput(""); setModalPinOpen(true); }} className={`p-1 rounded ${isAdmin ? 'bg-green-500' : 'bg-red-500'}`}><Unlock size={14}/></button>
             </div>
             <h1 className="text-xl font-black uppercase leading-tight tracking-tighter">Poney Club Presinge</h1>
          </div>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto flex-1 scrollbar-hide">
           {isAdmin && (
             <div className="space-y-2">
                <button onClick={() => { setFormData({ ...formData, dateDebut: selectedDate, dateFin: selectedDate, category: 'conge', statut: 'provisoire' }); setModalCongeOpen(true); }} className="w-full bg-[#8DC63F] text-[#1B2A49] font-black py-4 rounded-xl flex items-center justify-center gap-2 uppercase text-xs shadow-lg"><Plus size={18}/> Absence</button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setModalEvtOpen(true)} className="bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"><Calendar size={12}/> Event</button>
                  <button onClick={() => { setNoteText(notes[selectedDate] || ""); setModalNoteOpen(true); }} className="bg-yellow-400 text-[#1B2A49] py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"><StickyNote size={12}/> Post-it</button>
                </div>
             </div>
           )}
           <button onClick={() => setFiltreEmploye(null)} className={`w-full bg-white/10 text-white font-bold py-3 rounded-xl text-xs ${!filtreEmploye ? 'ring-2 ring-[#8DC63F]' : ''}`}>TOUTE L'ÉQUIPE</button>
           <div className="space-y-6 pt-4 border-t border-white/5 text-left text-sm font-bold">
              {["Palefrenier", "Apprentie", "Monitrice", "Aide WE"].map(role => {
                const mm = membresBase.filter(m => m.role === role);
                if (!mm.length) return null;
                return (
                  <div key={role}>
                    <h4 className="text-[10px] opacity-40 uppercase font-black tracking-widest mb-3 border-b border-white/10 pb-1">{role}s</h4>
                    {mm.map(m => (
                      <div key={m.id} onClick={() => { setFiltreEmploye(filtreEmploye === m.id ? null : m.id); setIsSidebarOpen(false); }} className={`p-3 rounded-xl mb-2 cursor-pointer transition-all ${filtreEmploye === m.id ? 'bg-[#8DC63F] text-[#1B2A49]' : 'bg-[#213459]'}`}>
                        <span className="block mb-1">{m.nom}</span>
                        <div className="flex gap-1 font-mono text-[10px]">
                           {['L','M','M','J','V','S','D'].map((l, i) => <span key={i} className={m.repos?.includes(JOURS_SEMAINE[i]) ? "text-red-400" : "text-green-400"}>{l}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
           </div>
        </div>
        <div className="p-4 border-t border-white/10 space-y-2">
           {isAdmin && (
             <>
                <button onClick={() => setModalStaffOpen(true)} className="w-full py-3 bg-white/5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"><UserCog size={16}/> Équipe</button>
                <button onClick={exportToCSV} className="w-full py-3 bg-cyan-600/30 text-cyan-400 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-cyan-600/50 transition-colors border border-cyan-500/30"><Download size={16}/> Export Chiffres</button>
             </>
           )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F2F2F7] overflow-y-auto relative p-6 md:p-12 scrollbar-hide">
        <div className="max-w-7xl mx-auto w-full space-y-12">
          
          <header className="flex flex-col items-center">
            <div className={`w-full max-w-3xl rounded-[3rem] border-4 flex flex-col justify-center items-center p-8 transition-all shadow-xl ${selectedDate === todayStr ? 'border-orange-500 ring-8 ring-orange-50' : 'border-white bg-white'} ${getDayPresence(selectedDate).total < 4 ? 'bg-red-600 text-white animate-pulse border-red-600' : ''}`}>
              <h3 className="text-2xl font-black uppercase text-center mb-4 leading-tight tracking-tighter">
                  {new Date(selectedDate).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}
              </h3>
              
              <div className="flex flex-col items-center w-full">
                  <div className="flex items-center gap-6 bg-[#1B2A49] px-8 py-4 rounded-full text-white shadow-2xl">
                    <span className="text-[#8DC63F] font-black text-4xl">{getDayPresence(selectedDate).total}</span>
                    <div className="text-[11px] font-bold leading-tight flex flex-wrap gap-x-2 border-l border-white/20 pl-6 text-left min-w-[150px]">
                        <span className="opacity-40 uppercase tracking-widest w-full text-[9px] mb-1">Présents :</span>
                        {getDayPresence(selectedDate).scheduled.map((p, i) => <span key={p.id}>{p.nom}{i < getDayPresence(selectedDate).scheduled.length - 1 || getDayPresence(selectedDate).ponctuel.length > 0 ? ',' : ''} </span>)}
                        {getDayPresence(selectedDate).ponctuel.map((p, i) => <span key={p.id} className="text-cyan-300 italic font-black"> (+ {p.nom}){i < getDayPresence(selectedDate).ponctuel.length - 1 ? ',' : ''}</span>)}
                    </div>
                  </div>

                  {/* BANDEAU D'INFORMATION DÉTAILLÉ */}
                  <div className="mt-8 w-full grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                     {/* COLONNE GAUCHE : ABSENCES PAR TYPE */}
                     <div className="space-y-3">
                        {getDayPresence(selectedDate).malades.length > 0 && (
                          <div className="bg-orange-50 p-3 rounded-2xl border border-orange-100">
                             <span className="text-[9px] font-black uppercase text-orange-400 block mb-1">🤒 Maladie</span>
                             <div className="flex flex-wrap gap-2 text-[10px] font-bold text-orange-700">
                               {getDayPresence(selectedDate).malades.map(m => <span key={m.id}>{m.nom}</span>)}
                             </div>
                          </div>
                        )}
                        {getDayPresence(selectedDate).absentsPlanifies.filter(a => a.type === 'conge').length > 0 && (
                          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                             <span className="text-[9px] font-black uppercase text-[#1B2A49] opacity-40 block mb-1">🏝️ Congés / Vacances</span>
                             <div className="flex flex-wrap gap-2 text-[10px] font-bold text-[#1B2A49]">
                               {getDayPresence(selectedDate).absentsPlanifies.filter(a => a.type === 'conge').map((a, i) => <span key={i}>{a.nom}</span>)}
                             </div>
                          </div>
                        )}
                        {getDayPresence(selectedDate).absentsPlanifies.filter(a => a.type === 'deplacement').length > 0 && (
                          <div className="bg-cyan-50 p-3 rounded-2xl border border-cyan-100">
                             <span className="text-[9px] font-black uppercase text-cyan-500 block mb-1">✈️ Déplacement Pro</span>
                             <div className="flex flex-wrap gap-2 text-[10px] font-bold text-cyan-700">
                               {getDayPresence(selectedDate).absentsPlanifies.filter(a => a.type === 'deplacement').map((a, i) => <span key={i}>{a.nom}</span>)}
                             </div>
                          </div>
                        )}
                     </div>

                     {/* COLONNE DROITE : ÉVÉNEMENTS & NOTES */}
                     <div className="space-y-3">
                        {(OFFICIAL_EVENTS_2026[selectedDate] || evenementsPerso[selectedDate] || notes[selectedDate]) && (
                          <div className="bg-purple-50 p-3 rounded-2xl border border-purple-100 h-full">
                             <span className="text-[9px] font-black uppercase opacity-40 block mb-1">Événements & Notes</span>
                             <div className="space-y-1.5">
                               {OFFICIAL_EVENTS_2026[selectedDate]?.map((e, i) => <div key={i} className="text-[10px] font-black text-purple-700 uppercase flex items-center gap-1"><Info size={10}/> {e.titre}</div>)}
                               {evenementsPerso[selectedDate]?.map((e, i) => <div key={i} className="text-[10px] font-black text-blue-700 uppercase flex items-center gap-1"><Calendar size={10}/> {e.titre}</div>)}
                               {notes[selectedDate] && <div className="text-[10px] font-bold text-amber-700 italic border-t border-amber-100 pt-1 mt-1 flex items-start gap-1"><StickyNote size={10} className="shrink-0 mt-0.5"/> "{notes[selectedDate]}"</div>}
                             </div>
                          </div>
                        )}
                     </div>
                  </div>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
            {calendrierRender}
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white flex flex-wrap justify-center gap-6 md:gap-10 text-[10px] font-black uppercase tracking-widest shadow-sm">
            <div className="flex items-center gap-2 text-cyan-600 italic font-black"><CheckCircle2 size={16}/> Ponctuel</div>
            <div className="flex items-center gap-2 text-orange-500 uppercase font-black">🤒 Maladie</div>
            <div className="flex items-center gap-2 text-[#1B2A49]"><div className="w-4 h-4 bg-[#1B2A49] rounded shadow-sm"></div> Absence Validée</div>
            <div className="flex items-center gap-2 text-[#1B2A49]"><div className="w-4 h-4 rounded shadow-sm" style={{ background: `repeating-linear-gradient(45deg, #15803d, #15803d 2px, #1B2A49 2px, #1B2A49 4px)` }}></div> Congé Provisoire</div>
            <div className="flex items-center gap-2 text-purple-600"><div className="w-5 h-[3px] bg-purple-600"></div> Fériés / GE</div>
          </div>
        </div>
      </main>

      {/* MODALES */}
      {modalChoiceOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500] p-4 text-[#1B2A49]">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-6 space-y-4 border-t-8 border-[#8DC63F] shadow-2xl text-center">
            <h4 className="font-black uppercase text-base border-b pb-2">{new Date(modalChoiceOpen).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}</h4>
            <div className="grid grid-cols-2 gap-2 text-left bg-gray-50 p-3 rounded-xl max-h-60 overflow-y-auto">
               {membresBase.map(m => {
                  const pres = getDayPresence(modalChoiceOpen);
                  const isPresent = pres.scheduled.some(p => p.id === m.id) || pres.ponctuel.some(p => p.id === m.id);
                  const isMalade = pres.malades.some(p => p.id === m.id);
                  return (<label key={m.id} className={`flex items-center gap-2 p-2 hover:bg-white rounded transition-all cursor-pointer ${isMalade ? 'opacity-30' : ''}`}><input type="checkbox" disabled={isMalade} className="w-5 h-5 accent-[#8DC63F]" checked={isPresent} onChange={async () => { const dOver = manualPresence[modalChoiceOpen] || {}; const newMan = { ...manualPresence, [modalChoiceOpen]: { ...dOver, [m.id]: !isPresent } }; setManualPresence(newMan); await syncAll(membresBase, conges, notes, evenementsPerso, newMan); }} /><span className={`text-[11px] font-bold truncate ${isMalade ? 'line-through text-orange-600' : ''}`}>{m.nom}</span></label>)
               })}
            </div>
            {isAdmin && (
              <div className="space-y-2 pt-2">
                  <button onClick={() => { setFormData({ ...formData, dateDebut: modalChoiceOpen, dateFin: modalChoiceOpen, category: 'conge', statut: 'provisoire' }); setModalCongeOpen(true); setModalChoiceOpen(null); }} className="w-full py-4 bg-[#8DC63F] text-[#1B2A49] font-black rounded-2xl uppercase text-xs shadow-md">Absence / Maladie</button>
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

      {modalCongeOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[600] p-4 text-[#1B2A49]">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border-2 border-[#1B2A49]">
            <div className="p-6 bg-[#1B2A49] text-white flex justify-between items-center font-black uppercase text-sm">Nouvelle Absence<X onClick={() => setModalCongeOpen(false)} className="cursor-pointer" size={20}/></div>
            <form onSubmit={async (e) => { 
              e.preventDefault(); 
              const nC = [...conges]; 
              const s = new Date(formData.dateDebut);
              const en = new Date(formData.dateFin || formData.dateDebut); 
              for (let d = new Date(s); d <= en; d.setDate(d.getDate() + 1)) { nC.push({ id: Math.random(), userId: formData.userId, date: d.toLocaleDateString('en-CA'), category: formData.category, periode: formData.periode, statut: formData.statut }); } 
              setConges(nC); setModalCongeOpen(false); await syncAll(membresBase, nC, notes, evenementsPerso, manualPresence); 
            }} className="p-8 space-y-6 text-left">
              <select className="w-full border-4 border-gray-50 p-5 rounded-2xl font-black text-sm" value={formData.category} onChange={e => { const cat = e.target.value; const stat = (cat === 'maladie' || cat === 'deplacement') ? 'valide' : 'provisoire'; setFormData({...formData, category: cat, statut: stat}); }}>
                <option value="conge">🏝️ Vacances / Congé</option>
                <option value="maladie">🤒 Maladie</option>
                <option value="deplacement">✈️ Déplacement Pro</option>
              </select>
              {formData.category === 'conge' && (
                  <select className="w-full border-4 border-gray-50 p-5 rounded-2xl font-black text-sm" value={formData.statut} onChange={e => setFormData({...formData, statut: e.target.value})}>
                  <option value="provisoire">🟠 Statut : Provisoire</option>
                  <option value="valide">🔵 Statut : Validé</option>
                </select>
              )}
              <div className="grid grid-cols-2 gap-4"><input type="date" className="border-4 border-gray-50 p-5 rounded-2xl font-bold text-sm" value={formData.dateDebut} onChange={e => setFormData({...formData, dateDebut: e.target.value})} required/><input type="date" className="border-4 border-gray-50 p-5 rounded-2xl font-bold text-sm" value={formData.dateFin} onChange={e => setFormData({...formData, dateFin: e.target.value})}/></div>
              <select className="w-full border-4 border-gray-50 p-5 rounded-2xl font-black text-sm" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})} required><option value="">-- Choisir employé --</option>{membresBase.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}</select>
              <button type="submit" className="w-full bg-[#1B2A49] text-white py-5 rounded-2xl font-black uppercase text-sm shadow-xl">Enregistrer</button>
            </form>
          </div>
        </div>
      )}

      {modalStaffOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[600] p-4 text-[#1B2A49]">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 bg-[#1B2A49] text-white flex justify-between items-center font-black uppercase text-sm">Gestion Équipe<X onClick={() => setModalStaffOpen(false)} className="cursor-pointer" size={20}/></div>
            <div className="p-8 flex flex-col md:flex-row gap-8 max-h-[80vh] overflow-y-auto">
              <form onSubmit={async (e) => {
                e.preventDefault();
                const newId = staffForm.id || Date.now().toString();
                const updated = staffForm.id ? membresBase.map(m => m.id === staffForm.id ? staffForm : m) : [...membresBase, { ...staffForm, id: newId }];
                setMembresBase(updated);
                setStaffForm({ id: null, nom: '', role: 'Palefrenier', repos: [], quotaVacances: 25 });
                await syncAll(updated, conges, notes, evenementsPerso, manualPresence);
              }} className="flex-1 space-y-4 text-left font-bold">
                <input className="w-full border-2 p-4 rounded-xl" placeholder="Nom" value={staffForm.nom} onChange={e => setStaffForm({...staffForm, nom: e.target.value})} required/>
                <select className="w-full border-2 p-4 rounded-xl" value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})}>
                  {["Palefrenier", "Apprentie", "Monitrice", "Aide WE", "Aide ponctuel"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <div className="space-y-2">
                  <span className="text-[10px] uppercase opacity-40">Repos fixes :</span>
                  <div className="flex flex-wrap gap-1">
                    {JOURS_SEMAINE.map(j => (
                      <button key={j} type="button" onClick={() => {
                        const nr = staffForm.repos.includes(j) ? staffForm.repos.filter(x => x !== j) : [...staffForm.repos, j];
                        setStaffForm({...staffForm, repos: nr});
                      }} className={`px-2 py-1 rounded-full text-[9px] border ${staffForm.repos.includes(j) ? 'bg-red-500 border-red-500 text-white' : 'border-gray-200 text-gray-400'}`}>{j}</button>
                    ))}
                  </div>
                </div>
                <input type="number" className="w-full border-2 p-4 rounded-xl" placeholder="Quota Vacances" value={staffForm.quotaVacances} onChange={e => setStaffForm({...staffForm, quotaVacances: parseInt(e.target.value)})}/>
                <button type="submit" className="w-full bg-[#1B2A49] text-white py-4 rounded-xl font-black uppercase text-xs">Sauvegarder</button>
              </form>
              <div className="flex-1 border-l pl-8 space-y-2 overflow-y-auto">
                {membresBase.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                    <div className="text-left font-bold text-sm">{m.nom}</div>
                    <div className="flex gap-1"><button onClick={() => setStaffForm(m)} className="p-2 text-blue-600"><Edit size={16}/></button><button onClick={async () => { if(confirm("Supprimer ?")) { const u = membresBase.filter(x => x.id !== m.id); setMembresBase(u); await syncAll(u, conges, notes, evenementsPerso, manualPresence); }}} className="p-2 text-red-600"><Trash2 size={16}/></button></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalPinOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[1000] p-4 text-[#1B2A49]">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl border-b-[12px] border-black">
            <Lock className="mx-auto mb-4" size={40} />
            <form onSubmit={(e) => { e.preventDefault(); if (pinInput.toLowerCase() === PIN_ADMIN) { setIsAdmin(true); setModalPinOpen(false); setPinInput(""); } else { alert("Code incorrect"); } }} className="space-y-4">
              <input autoFocus type="password" placeholder="PIN" className="w-full text-center text-3xl border-b-4 border-black p-3 outline-none font-black" value={pinInput} onChange={e => setPinInput(e.target.value)} />
              <button type="submit" className="w-full py-4 bg-black text-white rounded-xl font-bold uppercase text-xs">Déverrouiller</button>
            </form>
            <button onClick={() => setModalPinOpen(false)} className="mt-4 text-gray-400 text-xs">Annuler</button>
          </div>
        </div>
      )}

      {modalNoteOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[601] p-4 text-[#1B2A49]">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden border-4 border-yellow-400 shadow-2xl text-center">
            <div className="p-4 bg-yellow-400 font-black flex justify-between uppercase text-[10px]">Note<X onClick={() => setModalNoteOpen(false)} size={18}/></div>
            <form onSubmit={async (e) => { e.preventDefault(); const nx = { ...notes }; if (!noteText.trim()) delete nx[selectedDate]; else nx[selectedDate] = noteText; setNotes(nx); setModalNoteOpen(false); await syncAll(membresBase, conges, nx, evenementsPerso, manualPresence); }} className="p-6 space-y-4">
               <textarea autoFocus className="w-full border-2 p-5 rounded-2xl bg-yellow-50 outline-none h-40 font-bold" value={noteText} onChange={e => setNoteText(e.target.value)}/>
               <button type="submit" className="w-full bg-yellow-400 text-[#1B2A49] font-black py-4 rounded-xl uppercase text-xs shadow-md">Enregistrer</button>
            </form>
          </div>
        </div>
      )}

      {modalEvtOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[601] p-4 text-[#1B2A49]">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative text-center">
             <X className="absolute top-6 right-6 cursor-pointer text-gray-400" onClick={() => setModalEvtOpen(false)} size={20}/>
             <h3 className="font-black uppercase mb-8 text-base tracking-tighter">Événement</h3>
             <form onSubmit={async (e) => { e.preventDefault(); const nx = { ...evenementsPerso }; const date = evtForm.dateDebut; nx[date] = [...(nx[date] || []), { id: Date.now(), titre: evtForm.titre, type: evtForm.type }]; setEvenementsPerso(nx); setModalEvtOpen(false); await syncAll(membresBase, conges, notes, nx, manualPresence); }} className="space-y-4 text-left">
                <input type="date" className="w-full border-2 p-4 rounded-xl font-bold" value={evtForm.dateDebut} onChange={e => setEvtForm({...evtForm, dateDebut: e.target.value})}/>
                <input type="text" className="w-full border-2 p-4 rounded-xl font-black" placeholder="Titre" value={evtForm.titre} onChange={e => setEvtForm({...evtForm, titre: e.target.value})} required/>
                <button type="submit" className="w-full bg-[#1B2A49] text-white py-4 rounded-xl font-black uppercase text-xs shadow-md">Ajouter</button>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}