// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, X, Plus, Edit, FilterX, Lock, Unlock, ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, StickyNote, Calendar
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'sb_publishable_azT_rAkqeE-zsnvolYSY9w_7MtlnBVI';
const supabase = createClient(supabaseUrl, supabaseKey);

const PIN_DIRECTION = "poney"; 
const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const LOGO_URL = "https://lnwvlyswsmtafyoepovq.supabase.co/storage/v1/object/public/logo/logo.png";

const OFFICIAL_EVENTS = {
  '2026-01-01': [{ titre: 'Nouvel An', type: 'jour_ferie' }],
  '2026-04-03': [{ titre: 'Vendredi-Saint', type: 'jour_ferie' }],
  '2026-04-06': [{ titre: 'Lundi de Pâques', type: 'jour_ferie' }],
  '2026-05-14': [{ titre: 'Ascension', type: 'jour_ferie' }],
  '2026-05-25': [{ titre: 'Pentecôte', type: 'jour_ferie' }],
  '2026-08-01': [{ titre: 'Fête nationale', type: 'jour_ferie' }],
  '2026-09-10': [{ titre: 'Jeûne genevois', type: 'jour_ferie' }],
  '2026-12-25': [{ titre: 'Noël', type: 'jour_ferie' }],
  '2026-12-31': [{ titre: 'Restauration République', type: 'jour_ferie' }],
};

export default function App() {
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [anneeActuelle, setAnneeActuelle] = useState(2026);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [membresBase, setMembresBase] = useState([]);
  const [conges, setConges] = useState([]);
  const [notes, setNotes] = useState({});
  const [evenementsPerso, setEvenementsPerso] = useState({});
  const [manualPresence, setManualPresence] = useState({}); 
  const [filtreEmploye, setFiltreEmploye] = useState(null);
  const [history, setHistory] = useState([]);

  const [modalCongeOpen, setModalCongeOpen] = useState(false);
  const [modalStaffOpen, setModalStaffOpen] = useState(false);
  const [modalChoiceOpen, setModalChoiceOpen] = useState(null);
  const [modalPinOpen, setModalPinOpen] = useState(false);
  const [modalNoteOpen, setModalNoteOpen] = useState(false);
  const [modalEvtOpen, setModalEvtOpen] = useState(false);
  
  const [formData, setFormData] = useState({ userId: '', dateDebut: todayStr, dateFin: todayStr, periode: 'jour', statut: 'provisoire', category: 'conge' });
  const [staffForm, setStaffForm] = useState({ id: null, nom: '', role: 'Palefrenier', repos: [] });
  const [evtForm, setEvtForm] = useState({ dateDebut: todayStr, dateFin: todayStr, titre: '', type: 'concours_oui' });
  const [noteText, setNoteText] = useState("");
  const [pinInput, setPinInput] = useState("");

  const syncAll = async (m, c, n, e, man) => {
    await supabase.from('app_state').upsert([
      { id: 'poney_equipe', data: m }, { id: 'poney_conges', data: c },
      { id: 'poney_notes', data: n }, { id: 'poney_evts_perso', data: e },
      { id: 'poney_manual_final_persist', data: man }, { id: 'poney_annee', data: anneeActuelle.toString() }
    ]);
  };

  const handleSaveConge = async (e) => {
    e.preventDefault();
    pushToHistory();
    const newC = [...conges];
    const start = new Date(formData.dateDebut);
    const end = new Date(formData.dateFin || formData.dateDebut);
    const gId = Date.now();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      newC.push({ id: Math.random(), groupId: gId, userId: formData.userId, date: d.toLocaleDateString('en-CA'), statut: formData.statut, category: formData.category, periode: formData.periode });
    }
    setConges(newC);
    setModalCongeOpen(false);
    await syncAll(membresBase, newC, notes, evenementsPerso, manualPresence);
  };

  const pushToHistory = () => {
    const snapshot = JSON.parse(JSON.stringify({ membresBase, conges, notes, evenementsPerso, manualPresence }));
    setHistory(prev => [snapshot, ...prev].slice(0, 10));
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[0];
    setMembresBase(last.membresBase); setConges(last.conges); setNotes(last.notes);
    setEvenementsPerso(last.evenementsPerso); setManualPresence(last.manualPresence);
    setHistory(prev => prev.slice(1));
  };

  const congesParDate = useMemo(() => {
    const map = {}; (conges || []).forEach(c => { if (c?.date) { if (!map[c.date]) map[c.date] = []; map[c.date].push(c); } });
    return map;
  }, [conges]);

  const getDayPresence = (dateStr) => {
    if (!dateStr || !membresBase) return { total: 0, scheduled: [], ponctuel: [] };
    const d = new Date(dateStr);
    const nomJour = JOURS_SEMAINE[d.getDay() === 0 ? 6 : d.getDay() - 1];
    const absentsIds = new Set((congesParDate[dateStr] || []).map(a => String(a.userId)));
    let scheduled = [], ponctuel = [];
    membresBase.forEach(m => {
        const mId = String(m.id);
        const override = manualPresence[dateStr]?.[mId];
        const isNormallyHere = !(Array.isArray(m.repos) && m.repos.includes(nomJour)) && !absentsIds.has(mId) && m.role !== "Aide ponctuel";
        if (override === true) { if (isNormallyHere) scheduled.push(m); else ponctuel.push(m); }
        else if (override === false) { }
        else { if (isNormallyHere) scheduled.push(m); }
    });
    return { total: scheduled.length + ponctuel.length, scheduled, ponctuel };
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
        <div key={mois} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden relative z-10">
          <div className="bg-[#EBF2E1] py-1 text-center font-bold text-[#1B2A49] text-[10px] uppercase">{mois}</div>
          <div className="p-2 grid grid-cols-7 gap-1">
            {['L','M','M','J','V','S','D'].map(day => <div key={day} className="text-center text-[9px] font-bold text-gray-400">{day}</div>)}
            {jours.map((dateObj, idx) => {
              if (!dateObj) return <div key={idx} className="h-8"></div>;
              const dStr = dateObj.toLocaleDateString('en-CA');
              const pres = getDayPresence(dStr);
              const isToday = dStr === todayStr;
              const isPast = dStr < todayStr;
              const abs = filtreEmploye ? (congesParDate[dStr] || []).filter(a => String(a.userId) === String(filtreEmploye)) : (congesParDate[dStr] || []);
              
              const isAlerte = pres.total < 4;
              const hasAbs = abs.length > 0;
              const hasNote = notes[dStr];

              return (
                <div key={dStr} onClick={() => { setSelectedDate(dStr); setModalChoiceOpen(dStr); }}
                  className={`h-8 rounded flex items-center justify-center relative cursor-pointer overflow-hidden transition-all
                  ${isAlerte ? 'bg-red-600' : isToday ? 'bg-amber-100 ring-2 ring-orange-500 z-10' : isPast ? 'bg-[#E2E8F0]' : 'bg-[#F4F6F9]'}`}>
                  
                  {hasAbs && !isAlerte && (
                    <div className="absolute inset-0 flex flex-col">
                      {[0, 1].map(h => {
                        const m = abs.find(a => (h === 0 ? ['matin','jour'].includes(a.periode) : ['apres-midi','jour'].includes(a.periode)));
                        if (!m) return <div key={h} className="h-1/2"></div>;
                        const isProv = m.statut === 'provisoire';
                        const colorProv = '#15803d'; // Vert émeraude
                        const colorValide = m.category === 'deplacement' ? '#0891b2' : '#1B2A49'; 
                        
                        return (
                          <div key={h} className="h-1/2 w-full relative" style={{ backgroundColor: isProv ? 'transparent' : colorValide }}>
                            {isProv && (
                              <div className="absolute inset-0" style={{ background: `repeating-linear-gradient(45deg, ${colorProv}, ${colorProv} 2.5px, #1B2A49 2.5px, #1B2A49 5px)` }}></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  { (OFFICIAL_EVENTS[dStr] || evenementsPerso[dStr]) && (
                    <div className="absolute bottom-0 w-full flex flex-col gap-[1px]">
                      {OFFICIAL_EVENTS[dStr] && <div className="h-[2.5px] bg-purple-600 w-full"></div>}
                      {evenementsPerso[dStr] && <div className="h-[2.5px] bg-blue-500 w-full"></div>}
                    </div>
                  )}
                  {hasNote && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-bl-full"></div>}
                  <span className={`z-10 font-bold text-[11px] ${(isAlerte || (hasAbs && !isAlerte)) ? 'text-white' : isPast ? 'text-gray-500' : 'text-[#1B2A49]'}`}>{dateObj.getDate()}</span>
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
    <div className="min-h-screen bg-[#F0F4F8] text-[#1B2A49] font-sans">
      <div className="flex h-screen overflow-hidden flex-layout">
        <aside className="w-80 bg-[#1B2A49] flex flex-col shrink-0 shadow-xl text-white text-center">
          <div className="p-6 bg-[#141D36] flex flex-col items-center border-b-4 border-[#8DC63F]">
            <img src={LOGO_URL} alt="Logo" className="w-24 h-24 mb-3 bg-white rounded-full p-1" />
            <div className="flex items-center gap-2 mb-2">
               <h2 className="text-[10px] font-extrabold uppercase bg-[#8DC63F] text-[#1B2A49] px-2 py-1 rounded tracking-tighter">Organisation des équipes</h2>
               <button onClick={() => isAdmin ? setIsAdmin(false) : setModalPinOpen(true)} className={`p-1 rounded ${isAdmin ? 'bg-green-500' : 'bg-red-500'}`}><Unlock size={14}/></button>
            </div>
            <h1 className="text-xl font-bold uppercase mt-1 leading-none tracking-tighter">Poney Club<br/>Presinge</h1>
          </div>
          <div className="p-4 space-y-3">
             {isAdmin && (
               <>
                <button onClick={() => { setFormData({ ...formData, dateDebut: selectedDate, dateFin: selectedDate }); setModalCongeOpen(true); }} className="w-full bg-[#8DC63F] text-[#1B2A49] font-black py-4 rounded-3xl flex items-center justify-center gap-2 uppercase text-sm shadow-xl"><Plus size={20}/> Saisir Absence</button>
                <div className="grid grid-cols-2 gap-2">
                   <button onClick={() => setModalEvtOpen(true)} className="bg-blue-600 text-white py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"><Calendar size={12}/> Événement</button>
                   <button onClick={() => { setNoteText(notes[selectedDate] || ""); setModalNoteOpen(true); }} className="bg-yellow-400 text-[#1B2A49] py-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1"><StickyNote size={12}/> Post-it</button>
                </div>
               </>
             )}
             <button onClick={() => setFiltreEmploye(null)} className={`w-full bg-[#8DC63F]/10 text-[#8DC63F] font-bold py-2 rounded-xl text-xs ${!filtreEmploye ? 'ring-1 ring-[#8DC63F]' : ''}`}><FilterX size={14} className="inline mr-1"/> TOUTE L'ÉQUIPE</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left">
             {["Palefrenier", "Apprentie", "Monitrice", "Aide WE", "Aide ponctuel"].map(role => {
               const mm = membresBase.filter(m => m.role === role);
               if (!mm.length) return null;
               return (
                 <div key={role}>
                   <h4 className="text-[10px] opacity-40 uppercase font-black tracking-widest border-b border-white/10 mb-2">{role}s</h4>
                   {mm.map(m => (
                     <div key={m.id} onClick={() => setFiltreEmploye(filtreEmploye === m.id ? null : m.id)} className={`p-3 rounded-xl mb-1 cursor-pointer transition-all ${filtreEmploye === m.id ? 'bg-[#8DC63F] text-[#1B2A49] font-bold' : 'bg-[#213459] text-white/80'}`}>
                       <span className="text-sm font-bold block">{m.nom}</span>
                       <div className="flex gap-1.5 mt-1 font-mono text-[10px] font-black uppercase">
                          {['L','M','M','J','V','S','D'].map((l, i) => <span key={i} className={m.repos?.includes(JOURS_SEMAINE[i]) ? "text-red-400" : "text-green-400"}>{l}</span>)}
                       </div>
                     </div>
                   ))}
                 </div>
               );
             })}
          </div>
          {isAdmin && <button onClick={() => setModalStaffOpen(true)} className="p-4 opacity-30 text-[10px] uppercase font-black">Paramètres Équipe</button>}
        </aside>

        <main className="flex-1 flex flex-col relative overflow-hidden">
          <header className="h-44 bg-white border-b flex items-center justify-between px-6 py-4 gap-4 shadow-sm">
            <div className="flex items-center gap-3"><button onClick={() => setAnneeActuelle(a => a-1)} className="p-2 border rounded"><ChevronLeft/></button><h2 className="text-3xl font-black">{anneeActuelle}</h2><button onClick={() => setAnneeActuelle(a => a+1)} className="p-2 border rounded"><ChevronRight/></button></div>
            <div className={`flex-1 w-full max-w-2xl min-h-36 rounded-2xl border-4 flex flex-col justify-center items-center p-4 transition-all shadow-sm ${selectedDate === todayStr ? 'border-orange-500' : 'border-[#D0D7E1]'} ${getDayPresence(selectedDate).total < 4 ? 'bg-red-600 text-white animate-pulse' : 'bg-white'}`}>
              <h3 className="text-xl font-black uppercase">{new Date(selectedDate).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}</h3>
              {(OFFICIAL_EVENTS[selectedDate] || evenementsPerso[selectedDate]) && (
                <div className="text-[10px] font-black uppercase mt-1 text-center text-[#1B2A49]">
                  🚩 {[...(OFFICIAL_EVENTS[selectedDate] || []), ...(evenementsPerso[selectedDate] || [])].map(e => e.titre).join(' / ')}
                </div>
              )}
              <div className="mt-3 flex items-center gap-4 bg-[#1B2A49] px-6 py-2 rounded-full text-white">
                 <span className="text-[#8DC63F] font-black text-2xl">{getDayPresence(selectedDate).total}</span>
                 <div className="text-[11px] font-bold">
                    {getDayPresence(selectedDate).scheduled.map((p, i) => <span key={p.id}>{p.nom}{i < getDayPresence(selectedDate).scheduled.length - 1 || getDayPresence(selectedDate).ponctuel.length > 0 ? ', ' : ''}</span>)}
                    {getDayPresence(selectedDate).ponctuel.map((p, i) => <span key={p.id} className="text-cyan-300 italic font-black"> (+ {p.nom}){i < getDayPresence(selectedDate).ponctuel.length - 1 ? ', ' : ''}</span>)}
                 </div>
              </div>
              {notes[selectedDate] && <div className="mt-2 bg-yellow-100 text-[#1B2A49] px-4 py-1 rounded-lg text-[10px] font-bold border border-yellow-400 italic">" {notes[selectedDate]} "</div>}
            </div>
            <div className="flex gap-2">
               {history.length > 0 && <button onClick={handleUndo} className="p-4 bg-orange-500 text-white rounded-2xl shadow-xl hover:scale-105 transition-transform"><RotateCcw size={24}/></button>}
            </div>
          </header>

          <div className="bg-white/95 backdrop-blur-md px-8 py-2 flex justify-center gap-6 border-b text-[9px] font-black uppercase tracking-wider relative z-10 flex-wrap legend text-center">
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-red-600 rounded-sm"></div> Alerte (<span className="text-red-600">{"<"} 4</span>)</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 border-2 border-orange-500 bg-amber-50 rounded-sm shadow-sm"></div> Aujourd'hui</div>
            <div className="flex items-center gap-1.5 text-cyan-600 italic font-black uppercase"><CheckCircle2 size={12}/> (+ Nom) Présence ponctuelle</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4" style={{ background: 'repeating-linear-gradient(45deg, #15803d, #15803d 2px, #1B2A49 2px, #1B2A49 4px)' }}></div> Provisoire</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-[4px] bg-blue-500"></div> Événement Club</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-[#E2E8F0] border rounded-sm"></div> Jours passés</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {calendrierRender}
          </div>
        </main>

        {/* MODALE SELECTION JOUR */}
        {modalChoiceOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[400] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 space-y-4 border-t-8 border-[#8DC63F] shadow-2xl relative text-center">
              <h4 className="font-black uppercase text-lg border-b pb-2">{new Date(modalChoiceOpen).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}</h4>
              <div className="grid grid-cols-2 gap-2 text-left bg-gray-50 p-3 rounded-xl max-h-48 overflow-y-auto">
                 {membresBase.map(m => {
                    const isPresent = getDayPresence(modalChoiceOpen).scheduled.some(p => p.id === m.id) || getDayPresence(modalChoiceOpen).ponctuel.some(p => p.id === m.id);
                    return (<label key={m.id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-white rounded transition-all"><input type="checkbox" className="accent-[#8DC63F]" checked={isPresent} onChange={async () => { pushToHistory(); const dayOver = manualPresence[modalChoiceOpen] || {}; const newManual = { ...manualPresence, [modalChoiceOpen]: { ...dayOver, [m.id]: !isPresent } }; setManualPresence(newManual); await syncAll(membresBase, conges, notes, evenementsPerso, newManual); }} /><span className="text-[11px] font-bold truncate">{m.nom}</span></label>)
                 })}
              </div>
              {isAdmin ? (
                <div className="space-y-2 pt-2">
                    <button onClick={() => { setFormData({ ...formData, dateDebut: modalChoiceOpen, dateFin: modalChoiceOpen }); setModalCongeOpen(true); setModalChoiceOpen(null); }} className="w-full py-5 bg-[#8DC63F] text-[#1B2A49] font-black rounded-2xl uppercase text-xs shadow-md">Saisir Absence</button>
                    <div className="grid grid-cols-2 gap-2">
                       <button onClick={() => { setEvtForm({ ...evtForm, dateDebut: modalChoiceOpen, dateFin: modalChoiceOpen }); setModalEvtOpen(true); setModalChoiceOpen(null); }} className="bg-[#1B2A49] text-white py-3 rounded-xl text-[10px] font-black uppercase">Événement Club</button>
                       <button onClick={() => { setNoteText(notes[modalChoiceOpen] || ""); setModalNoteOpen(true); setModalChoiceOpen(null); }} className="bg-yellow-400 text-[#1B2A49] py-3 rounded-xl text-[10px] font-black uppercase">Note (Post-it)</button>
                    </div>
                    <div className="max-h-40 overflow-y-auto border-t pt-2 space-y-2">
                       {(congesParDate[modalChoiceOpen] || []).map(a => (
                         <div key={a.id} className="flex gap-1">
                            <button onClick={async () => { if(confirm("Supprimer la période ?")) { const upd = conges.filter(x => x.groupId !== a.groupId); setConges(upd); setModalChoiceOpen(null); await syncAll(membresBase, upd, notes, evenementsPerso, manualPresence); }}} className="flex-1 bg-red-50 text-red-700 text-[10px] py-2.5 rounded-xl border font-black uppercase tracking-widest flex items-center justify-center gap-1"><Trash2 size={10}/> {membresBase.find(u=>u.id===a.userId)?.nom}</button>
                            {a.statut === 'provisoire' && (
                              <button onClick={async () => { pushToHistory(); const upd = conges.map(c => c.groupId === a.groupId ? {...c, statut:'valide'} : c); setConges(upd); setModalChoiceOpen(null); await syncAll(membresBase, upd, notes, evenementsPerso, manualPresence); }} className="bg-green-600 text-white text-[10px] px-3 py-2.5 rounded-xl font-black uppercase">Valider</button>
                            )}
                         </div>
                       ))}
                    </div>
                </div>
              ) : (<button onClick={() => setModalPinOpen(true)} className="w-full py-3 bg-[#1B2A49] text-white rounded-xl font-bold uppercase text-[10px]">Déverrouiller (Admin)</button>)}
              <button onClick={() => setModalChoiceOpen(null)} className="w-full text-gray-400 font-bold text-xs uppercase">Fermer</button>
            </div>
          </div>
        )}

        {/* MODALE ABSENCE */}
        {modalCongeOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[600] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border-2 border-[#1B2A49]">
              <div className="p-5 bg-[#1B2A49] text-white flex justify-between items-center font-black uppercase text-sm">Nouvelle Absence<X className="cursor-pointer" onClick={() => setModalCongeOpen(false)}/></div>
              <form onSubmit={handleSaveConge} className="p-8 space-y-5">
                <select className="w-full border-2 p-4 rounded-2xl font-black text-[#1B2A49]" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option value="conge">🏝️ Congé (Décompté)</option><option value="deplacement">✈️ Déplacement (Maintenu)</option></select>
                <div className="grid grid-cols-2 gap-3"><input type="date" className="border-2 p-4 rounded-2xl font-bold text-[#1B2A49]" value={formData.dateDebut} onChange={e => setFormData({...formData, dateDebut: e.target.value})} required/><input type="date" className="border-2 p-4 rounded-2xl font-bold text-[#1B2A49]" value={formData.dateFin} onChange={e => setFormData({...formData, dateFin: e.target.value})}/></div>
                <select className="w-full border-2 p-4 rounded-2xl font-black text-[#1B2A49]" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})} required><option value="">-- Choisir employé --</option>{membresBase.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}</select>
                <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl justify-around border-2 border-dashed border-gray-200 text-[10px] font-black uppercase shadow-inner text-[#1B2A49]"><label className="cursor-pointer font-black text-blue-900"><input type="radio" checked={formData.statut === 'provisoire'} onChange={() => setFormData({...formData, statut:'provisoire'})}/> Provisoire</label><label className="cursor-pointer text-green-700 font-black"><input type="radio" checked={formData.statut === 'valide'} onChange={() => setFormData({...formData, statut:'valide'})}/> Validé</label></div>
                <button type="submit" className="w-full bg-[#1B2A49] text-white py-5 rounded-2xl font-black uppercase text-sm">Enregistrer l'absence</button>
              </form>
            </div>
          </div>
        )}

        {/* MODALE NOTE (POST-IT) */}
        {modalNoteOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[600] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden border-4 border-yellow-400 shadow-2xl text-center">
              <div className="p-4 bg-yellow-400 font-black flex justify-between uppercase italic text-xs text-[#1B2A49]">Note du jour<X className="cursor-pointer" onClick={() => setModalNoteOpen(false)}/></div>
              <form onSubmit={async (e) => { e.preventDefault(); pushToHistory(); const nx = { ...notes }; if (!noteText.trim()) delete nx[selectedDate]; else nx[selectedDate] = noteText; setNotes(nx); setModalNoteOpen(false); await syncAll(membresBase, conges, nx, evenementsPerso, manualPresence); }} className="p-6 space-y-4">
                <textarea autoFocus className="w-full border-2 border-yellow-100 p-5 rounded-2xl bg-yellow-50 outline-none h-40 font-bold text-[#1B2A49]" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Votre message..."/>
                <div className="flex gap-2"><button type="button" onClick={() => setNoteText("")} className="p-4 bg-red-100 text-red-600 rounded-xl"><Trash2 size={20}/></button><button type="submit" className="flex-1 bg-yellow-400 text-[#1B2A49] font-black py-4 rounded-xl uppercase text-xs">Enregistrer</button></div>
              </form>
            </div>
          </div>
        )}

        {/* MODALE EVT CLUB */}
        {modalEvtOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[600] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
              <X className="absolute top-4 right-4 cursor-pointer text-gray-400" onClick={() => setModalEvtOpen(false)}/>
              <h3 className="font-black uppercase mb-6 text-center text-[#1B2A49]">Événement Club</h3>
              <form onSubmit={async (e) => { e.preventDefault(); pushToHistory(); const nx = { ...evenementsPerso }; const date = evtForm.dateDebut; nx[date] = [...(nx[date] || []), { id: Date.now(), titre: evtForm.titre, type: evtForm.type }]; setEvenementsPerso(nx); setModalEvtOpen(false); await syncAll(membresBase, conges, notes, nx, manualPresence); }} className="space-y-4">
                <input type="date" className="w-full border-2 p-4 rounded-2xl font-bold" value={evtForm.dateDebut} onChange={e => setEvtForm({...evtForm, dateDebut: e.target.value})}/>
                <input type="text" className="w-full border-2 p-4 rounded-2xl font-black text-[#1B2A49]" placeholder="Titre de l'événement" value={evtForm.titre} onChange={e => setEvtForm({...evtForm, titre: e.target.value})} required/>
                <button type="submit" className="w-full bg-[#1B2A49] text-[#8DC63F] py-4 rounded-xl font-black uppercase">Valider l'événement</button>
              </form>
            </div>
          </div>
        )}

        {/* MODALE PIN */}
        {modalPinOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center">
              <Lock className="mx-auto mb-4 text-[#1B2A49]" size={48} /><form onSubmit={(e) => { e.preventDefault(); if (pinInput.toLowerCase() === PIN_DIRECTION) { setIsAdmin(true); setModalPinOpen(false); setPinInput(""); } else { alert("Code incorrect"); } }} className="space-y-4"><input autoFocus type="password" placeholder="Code PIN" className="w-full text-center text-3xl border-2 p-3 rounded-xl text-[#1B2A49]" value={pinInput} onChange={e => setPinInput(e.target.value)} /><button type="submit" className="w-full py-3 bg-[#1B2A49] text-white rounded-xl font-bold uppercase">Valider</button></form>
            </div>
          </div>
        )}

        {/* MODALE PARAMETRES STAFF */}
        {modalStaffOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[500] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border-b-8 border-[#8DC63F]">
              <div className="bg-[#1B2A49] p-5 text-white flex justify-between items-center uppercase font-bold tracking-widest text-sm">Gestion Personnel<X className="cursor-pointer" onClick={() => setModalStaffOpen(false)}/></div>
              <div className="flex p-6 gap-6">
                 <form onSubmit={async (e) => { e.preventDefault(); const nId = staffForm.id || Date.now().toString(); const upd = staffForm.id ? membresBase.map(m => m.id === staffForm.id ? staffForm : m) : [...membresBase, { ...staffForm, id: nId }]; setMembresBase(upd); setModalStaffOpen(false); await syncAll(upd, conges, notes, evenementsPerso, manualPresence); }} className="flex-1 space-y-4">
                   <input className="w-full border-2 p-4 rounded-2xl font-bold text-[#1B2A49]" value={staffForm.nom} onChange={e => setStaffForm({...staffForm, nom: e.target.value})} required placeholder="Nom Prénom"/>
                   <select className="w-full border-2 p-4 rounded-2xl font-black text-[#1B2A49]" value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})}>{["Palefrenier", "Apprentie", "Monitrice", "Aide WE", "Aide ponctuel"].map(r => <option key={r} value={r}>{r}</option>)}</select>
                   <button type="submit" className="w-full bg-[#1B2A49] text-white py-4 rounded-xl font-black uppercase">Enregistrer</button>
                 </form>
                 <div className="md:w-1/2 overflow-y-auto max-h-64 border-l pl-4 text-left">
                   {membresBase.map(m => (
                     <div key={m.id} className="flex justify-between items-center p-2 border-b">
                       <span className="text-sm font-bold text-[#1B2A49]">{m.nom}</span>
                       <div className="flex gap-2"><button onClick={() => setStaffForm(m)} className="text-blue-600"><Edit size={16}/></button><button onClick={async () => { if(confirm("Supprimer ?")) { const upd = membresBase.filter(x => x.id !== m.id); setMembresBase(upd); await syncAll(upd, conges, notes, evenementsPerso, manualPresence); }}} className="text-red-600"><Trash2 size={16}/></button></div>
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}