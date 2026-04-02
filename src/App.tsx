// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Trash2, X, Plus, Settings, Edit, FilterX, Lock, Unlock, Printer, ChevronLeft, ChevronRight, StickyNote, CheckCircle2, RotateCcw 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'sb_publishable_azT_rAkqeE-zsnvolYSY9w_7MtlnBVI';
const supabase = createClient(supabaseUrl, supabaseKey);

const PIN_DIRECTION = "poney"; 
const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const LOGO_URL = "https://lnwvlyswsmtafyoepovq.supabase.co/storage/v1/object/public/logo/logo.png";

// --- DATES OFFICIELLES GENEVE ---
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
  '2026-01-02': [{ titre: 'Vacances Noël', type: 'vacances_ge' }],
  '2026-02-23': [{ titre: 'Relâches', type: 'vacances_ge' }], '2026-02-24': [{ titre: 'Relâches', type: 'vacances_ge' }], '2026-02-25': [{ titre: 'Relâches', type: 'vacances_ge' }], '2026-02-26': [{ titre: 'Relâches', type: 'vacances_ge' }], '2026-02-27': [{ titre: 'Relâches', type: 'vacances_ge' }],
  '2026-05-15': [{ titre: 'Pont Ascension', type: 'vacances_ge' }],
  '2026-06-29': [{ titre: 'Vacances été', type: 'vacances_ge' }],
  '2026-10-19': [{ titre: 'Automne', type: 'vacances_ge' }], '2026-10-20': [{ titre: 'Automne', type: 'vacances_ge' }], '2026-10-21': [{ titre: 'Automne', type: 'vacances_ge' }], '2026-10-22': [{ titre: 'Automne', type: 'vacances_ge' }], '2026-10-23': [{ titre: 'Automne', type: 'vacances_ge' }],
};

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [anneeActuelle, setAnneeActuelle] = useState(2026);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [membresBase, setMembresBase] = useState([]);
  const [conges, setConges] = useState([]);
  const [notes, setNotes] = useState({});
  const [evenementsPerso, setEvenementsPerso] = useState({});
  const [aidesPonctuelles, setAidesPonctuelles] = useState({}); 
  const [filtreEmploye, setFiltreEmploye] = useState(null);
  const [history, setHistory] = useState([]);

  const [modalCongeOpen, setModalCongeOpen] = useState(false);
  const [modalStaffOpen, setModalStaffOpen] = useState(false);
  const [modalChoiceOpen, setModalChoiceOpen] = useState(null);
  const [modalPinOpen, setModalPinOpen] = useState(false);
  const [modalNoteOpen, setModalNoteOpen] = useState(false);
  const [modalEvtOpen, setModalEvtOpen] = useState(false);
  
  const [formData, setFormData] = useState({ userId: '', dateDebut: '', dateFin: '', periode: 'jour', statut: 'provisoire', category: 'conge' });
  const [staffForm, setStaffForm] = useState({ id: null, nom: '', role: 'Palefrenier', total: 25, repos: [] });
  const [evtForm, setEvtForm] = useState({ dateDebut: '', dateFin: '', titre: '', type: 'concours_oui' });
  const [noteText, setNoteText] = useState("");
  const [pinInput, setPinInput] = useState("");

  const eventsMerged = useMemo(() => {
    const result = { ...OFFICIAL_EVENTS };
    Object.keys(evenementsPerso).forEach(d => {
        if (d.startsWith(anneeActuelle.toString())) {
            result[d] = [...(result[d] || []), ...evenementsPerso[d]];
        }
    });
    return result;
  }, [anneeActuelle, evenementsPerso]);

  const pushToHistory = () => {
    const snapshot = {
      membresBase: JSON.parse(JSON.stringify(membresBase)),
      conges: JSON.parse(JSON.stringify(conges)),
      notes: JSON.parse(JSON.stringify(notes)),
      evenementsPerso: JSON.parse(JSON.stringify(evenementsPerso)),
      aidesPonctuelles: JSON.parse(JSON.stringify(aidesPonctuelles))
    };
    setHistory(prev => [snapshot, ...prev].slice(0, 10));
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[0];
    setMembresBase(last.membresBase); setConges(last.conges); setNotes(last.notes);
    setEvenementsPerso(last.evenementsPerso); setAidesPonctuelles(last.aidesPonctuelles);
    setHistory(prev => prev.slice(1));
  };

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from('app_state').select('*');
        if (data) {
          const map = {}; data.forEach(r => map[r.id] = r.data);
          const cleanEquipe = (map.poney_equipe || []).map(m => ({ ...m, repos: Array.isArray(m.repos) ? m.repos : [] }));
          setMembresBase(cleanEquipe);
          setConges(Array.isArray(map.poney_conges) ? map.poney_conges : []);
          setNotes(map.poney_notes || {});
          setEvenementsPerso(map.poney_evts_perso || {});
          setAidesPonctuelles(map.poney_aides_vfinal || {});
          if (map.poney_annee) setAnneeActuelle(Number(map.poney_annee));
        }
      } catch (e) { console.error(e); } setIsLoaded(true);
    } load();
  }, []);

  useEffect(() => {
    if (!isLoaded || membresBase.length === 0) return;
    const t = setTimeout(() => {
      supabase.from('app_state').upsert([
        { id: 'poney_equipe', data: membresBase },
        { id: 'poney_conges', data: conges },
        { id: 'poney_notes', data: notes },
        { id: 'poney_evts_perso', data: evenementsPerso },
        { id: 'poney_aides_vfinal', data: aidesPonctuelles },
        { id: 'poney_annee', data: anneeActuelle.toString() }
      ]).then();
    }, 1500); return () => clearTimeout(t);
  }, [membresBase, conges, notes, evenementsPerso, aidesPonctuelles, anneeActuelle, isLoaded]);

  const handleAuth = () => { if (isAdmin) setIsAdmin(false); else setModalPinOpen(true); };
  const checkPin = (e) => { e.preventDefault(); if (pinInput.toLowerCase() === PIN_DIRECTION) { setIsAdmin(true); setModalPinOpen(false); setPinInput(""); } else { alert("Code incorrect"); setPinInput(""); } };

  const handleSaveStaff = (e) => {
    e.preventDefault(); pushToHistory();
    const newId = staffForm.id || Date.now().toString();
    const updated = staffForm.id ? membresBase.map(m => String(m.id) === String(staffForm.id) ? staffForm : m) : [...membresBase, { ...staffForm, id: newId }];
    setMembresBase(updated); setModalStaffOpen(false); setStaffForm({ id: null, nom: '', role: 'Palefrenier', total: 25, repos: [] });
  };

  const handleSaveConge = (e) => {
    e.preventDefault(); pushToHistory();
    const start = new Date(formData.dateDebut); const end = new Date(formData.dateFin || formData.dateDebut);
    const gId = Math.random().toString(36).substr(2, 9);
    const nouveaux = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      nouveaux.push({ id: Math.random().toString(36).substr(2, 9), groupId: gId, userId: String(formData.userId), date: d.toLocaleDateString('en-CA'), statut: formData.statut, category: formData.category, periode: 'jour' });
    }
    setConges([...conges, ...nouveaux]); setModalCongeOpen(false);
  };

  const congesParDate = useMemo(() => {
    const map = {}; conges.forEach(c => { if (c.date) { if (!map[c.date]) map[c.date] = []; map[c.date].push(c); } });
    return map;
  }, [conges]);

  const presentsDuJour = useMemo(() => {
    if (!selectedDate || membresBase.length === 0) return { total: 0, fixe: [], aides: [] };
    const d = new Date(selectedDate);
    const nomJour = JOURS_SEMAINE[d.getDay() === 0 ? 6 : d.getDay() - 1];
    const absIds = new Set((congesParDate[selectedDate] || []).map(a => String(a.userId)));
    const fixe = membresBase.filter(m => m.role !== "Aide ponctuel" && !absIds.has(String(m.id)) && !(m.repos?.includes(nomJour)));
    const aides = membresBase.filter(m => m.role === "Aide ponctuel" && (aidesPonctuelles[selectedDate] || []).includes(String(m.id)));
    return { total: fixe.length + aides.length, fixe, aides };
  }, [selectedDate, membresBase, congesParDate, aidesPonctuelles]);

  const calendrierRender = useMemo(() => {
    const moisList = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    return moisList.map((mois, mIdx) => {
      const first = new Date(anneeActuelle, mIdx, 1);
      const jours = [];
      let offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
      for (let i = 0; i < offset; i++) jours.push(null);
      let date = new Date(first);
      while (date.getMonth() === mIdx) { jours.push(new Date(date)); date.setDate(date.getDate() + 1); }

      return (
        <div key={mois} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden break-inside-avoid relative z-10">
          <div className="bg-[#EBF2E1] py-1.5 text-center font-bold text-[#1B2A49] text-xs uppercase tracking-widest">{mois}</div>
          <div className="p-2 grid grid-cols-7 gap-1">
            {['L','M','M','J','V','S','D'].map(day => <div key={day} className="text-center text-[9px] font-bold text-gray-400">{day}</div>)}
            {jours.map((dateObj, idx) => {
              if (!dateObj) return <div key={idx} className="h-8"></div>;
              const dStr = dateObj.toLocaleDateString('en-CA');
              const absRaw = congesParDate[dStr] || [];
              const abs = filtreEmploye ? absRaw.filter(a => String(a.userId) === String(filtreEmploye)) : absRaw;
              const evts = eventsMerged[dStr] || [];
              const isToday = dStr === new Date().toLocaleDateString('en-CA');
              const isAlerte = !filtreEmploye && absRaw.filter(c => membresBase.find(u=>String(u.id)===String(c.userId))?.role === 'Palefrenier').length > 2;

              return (
                <div key={dStr} onClick={() => { setSelectedDate(dStr); setModalChoiceOpen(dStr); }}
                  className={`h-8 rounded flex items-center justify-center relative cursor-pointer overflow-hidden transition-all 
                  ${isAlerte ? 'bg-red-500 text-white font-black' : isToday ? 'bg-amber-100 ring-4 ring-amber-500 z-10' : 'bg-[#F4F6F9]'}`}>
                  {abs.length > 0 && !isAlerte && (
                    <div className="absolute inset-0 flex flex-col">
                      {[0, 1].map(h => {
                         const match = abs.filter(a => (h === 0 ? (a.periode === 'matin' || a.periode === 'jour') : (a.periode === 'apres-midi' || a.periode === 'jour')))[0];
                         if (!match) return <div key={h} className="h-1/2"></div>;
                         let bg = match.category === 'deplacement' ? "bg-cyan-600" : (match.statut === 'valide' ? "bg-[#1B2A49]" : "bg-transparent");
                         return <div key={h} className={`h-1/2 w-full relative ${bg}`}>
                           {match.statut === 'provisoire' && match.category !== 'deplacement' && <div className="absolute inset-0 opacity-100" style={{background: 'repeating-linear-gradient(45deg, #15803d, #15803d 2px, #1b2a49 2px, #1b2a49 4px)'}}></div>}
                         </div>;
                      })}
                    </div>
                  )}
                  <span className={`z-10 font-bold text-[11px] ${isAlerte || (abs.length > 0 && !isAlerte) ? 'text-white' : 'text-[#1B2A49]'}`}>{dateObj.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  }, [anneeActuelle, congesParDate, filtreEmploye, membresBase, eventsMerged]);

  if (!isLoaded) return <div className="h-screen flex items-center justify-center font-bold">Chargement PCP...</div>;

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-[#1B2A49] font-sans relative overflow-hidden">
      
      <style>{`
        @media (max-width: 1024px) {
          .flex-layout { flex-direction: column !important; overflow-y: auto !important; height: auto !important; }
          aside { width: 100% !important; height: auto !important; position: relative !important; }
          main { height: auto !important; overflow: visible !important; }
        }
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          body { background: white !important; }
          aside, header, .legend, .print-hide { display: none !important; }
          main { display: block !important; width: 100% !important; padding: 0 !important; }
          .grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 5px !important; }
        }
      `}</style>

      <div className="flex h-screen overflow-hidden print:block flex-layout">
        <aside className="w-80 bg-[#1B2A49] flex flex-col shrink-0 shadow-xl text-white text-center print:hidden">
          <div className="p-6 bg-[#141D36] flex flex-col items-center border-b-4 border-[#8DC63F]">
            <img src={LOGO_URL} alt="Logo" className="w-24 h-24 mb-3 bg-white rounded-full p-2 shadow-lg object-contain" />
            <div className="flex items-center gap-2 mb-2">
               <h2 className="text-[10px] font-extrabold uppercase bg-[#8DC63F] text-[#1B2A49] px-2 py-1 rounded tracking-tighter">Organisation des équipes écuries</h2>
               <button onClick={handleAuth} className={`p-1 rounded-md ${isAdmin ? 'bg-green-500' : 'bg-red-500'}`}><Unlock size={14}/></button>
            </div>
            <h1 className="text-xl font-black uppercase mt-1 leading-none tracking-tighter">Poney Club<br/>Presinge</h1>
          </div>
          <div className="p-4 space-y-3">
             {isAdmin && <button onClick={() => { setFormData({ ...formData, dateDebut: selectedDate, dateFin: selectedDate }); setModalCongeOpen(true); }} className="w-full bg-[#8DC63F] text-[#1B2A49] font-black py-4 rounded-3xl flex items-center justify-center gap-2 uppercase text-sm shadow-xl hover:scale-105 transition-transform"><Plus size={20}/> Saisir Absence</button>}
             <button onClick={() => setFiltreEmploye(null)} className={`w-full bg-[#8DC63F]/10 text-[#8DC63F] font-bold py-2 rounded-xl text-xs ${!filtreEmploye ? 'ring-1 ring-[#8DC63F]' : ''}`}><FilterX size={14} className="inline mr-1"/> TOUTE L'ÉQUIPE</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-left">
             {["Palefrenier", "Apprentie", "Monitrice", "Aide WE", "Aide ponctuel"].map(role => {
               const mm = membresBase.filter(m => m.role === role);
               if (!mm.length) return null;
               return (
                 <div key={role}>
                   <h4 className="text-[10px] opacity-40 uppercase font-black tracking-widest border-b border-white/10 mb-2">{role}s</h4>
                   {mm.map(m => {
                     const isSel = String(filtreEmploye) === String(m.id);
                     return (
                       <div key={m.id} onClick={() => setFiltreEmploye(isSel ? null : m.id)}
                         className={`p-3 rounded-xl mb-1 cursor-pointer transition-all ${isSel ? 'bg-[#8DC63F] text-[#1B2A49] font-bold' : 'bg-[#213459] text-white/80'}`}>
                         <span className="text-sm font-bold block">{m.nom}</span>
                         {m.role !== "Aide ponctuel" && (
                           <div className="flex gap-1.5 mt-1 font-mono text-[10px] font-black uppercase leading-none">
                              {['L','M','M','J','V','S','D'].map((l, i) => <span key={i} className={m.repos?.includes(JOURS_SEMAINE[i]) ? "text-red-400" : "text-green-400"}>{l}</span>)}
                           </div>
                         )}
                       </div>
                     )
                   })}
                 </div>
               );
             })}
          </div>
          {isAdmin && <button onClick={() => setModalStaffOpen(true)} className="p-4 opacity-30 text-[10px] uppercase font-black">Paramètres</button>}
        </aside>

        <main className="flex-1 flex flex-col relative">
          <header className="h-44 bg-white border-b flex flex-col md:flex-row items-center justify-between px-6 py-4 gap-4 shadow-sm print:h-auto print:border-none">
            <div className="flex items-center gap-3 print:hidden">
              <button onClick={() => setAnneeActuelle(a => a-1)} className="p-2 border rounded"><ChevronLeft/></button>
              <h2 className="text-3xl font-black">{anneeActuelle}</h2>
              <button onClick={() => setAnneeActuelle(a => a+1)} className="p-2 border rounded"><ChevronRight/></button>
            </div>
            <div className={`flex-1 w-full max-w-2xl min-h-36 rounded-2xl border-2 flex flex-col justify-center items-center p-4 transition-all shadow-sm ${congesParDate[selectedDate]?.length > 2 ? 'bg-red-600 text-white border-red-700' : 'bg-white border-[#D0D7E1]'}`}>
              <h3 className="text-xl font-black uppercase text-center">{new Date(selectedDate).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}</h3>
              {eventsMerged[selectedDate] && <div className="text-red-600 font-black uppercase text-sm mt-1 print:text-black">🚩 {eventsMerged[selectedDate].map(e => e.titre).join(' / ')}</div>}
              {notes[selectedDate] && <div className="bg-yellow-50 text-[#8B5A2B] italic text-xs px-2 py-0.5 rounded border border-yellow-200 mt-1">"{notes[selectedDate]}"</div>}
              <div className="mt-3 flex items-center gap-4 bg-[#1B2A49] px-6 py-2 rounded-full shadow-lg border border-white/10 print:bg-white print:text-black">
                 <span className="text-[#8DC63F] font-black text-2xl print:text-black">{presentsDuJour.total}</span>
                 <div className="text-[11px] font-bold text-white/90 leading-tight print:text-black">
                    {presentsDuJour.fixe.map(p => p.nom).join(', ')}
                    {presentsDuJour.aides.length > 0 && <span className="text-cyan-300 italic font-black"> (+ {presentsDuJour.aides.map(p => p.nom).join(', ')})</span>}
                 </div>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
               {history.length > 0 && (
                 <button onClick={handleUndo} className="p-4 bg-orange-500 text-white rounded-2xl shadow-xl hover:scale-105 flex flex-col items-center justify-center">
                   <RotateCcw size={20}/>
                   <span className="text-[8px] font-black uppercase mt-1">Annuler</span>
                 </button>
               )}
               <button onClick={() => window.print()} className="p-4 bg-[#1B2A49] text-[#8DC63F] rounded-2xl shadow-xl hover:scale-105 transition-transform print:hidden"><Printer size={24}/></button>
            </div>
          </header>

          <div className="bg-white/80 backdrop-blur-md px-8 py-2 flex justify-center gap-8 border-b text-[10px] font-black uppercase tracking-wider relative z-10 flex-wrap legend print:hidden">
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-[#1B2A49] rounded-sm shadow-sm"></div> Validé</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-cyan-600 rounded-sm shadow-sm"></div> Déplacement</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 border border-green-700/50" style={{background: 'repeating-linear-gradient(45deg, #15803d, #15803d 2px, #1b2a49 2px, #1b2a49 4px)'}}></div> Provisoire</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-1 bg-[#8B5A2B] rounded-full shadow-sm"></div> Concours</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-1 bg-blue-500 rounded-full shadow-sm"></div> Vacances GE</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-1 bg-purple-600 rounded-full shadow-sm"></div> Férié</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:grid-cols-4">
            {calendrierRender}
          </div>
        </main>

        {modalPinOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center border-b-8 border-[#8DC63F]">
              <Lock className="mx-auto mb-4 text-[#1B2A49]" size={48} />
              <h3 className="font-bold uppercase mb-4 text-lg">Direction</h3>
              <input autoFocus type="password" placeholder="PIN" className="w-full text-center text-3xl border-2 p-3 rounded-xl mb-4 text-[#1B2A49]" value={pinInput} onChange={e => setPinInput(e.target.value)} />
              <div className="flex gap-2"><button onClick={() => setModalPinOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold uppercase text-xs">Annuler</button><button onClick={checkPin} className="flex-1 py-3 bg-[#1B2A49] text-white rounded-xl font-bold uppercase text-[#8DC63F]">Valider</button></div>
            </div>
          </div>
        )}

        {modalChoiceOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[400] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 space-y-4 border-t-8 border-[#8DC63F] shadow-2xl relative text-center max-h-[90vh] overflow-y-auto">
              <h4 className="font-black border-b pb-4 uppercase text-lg tracking-tighter">{new Date(modalChoiceOpen).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}</h4>
              <div className="bg-gray-50 p-3 rounded-xl border text-left"><p className="text-[10px] font-black uppercase mb-2 opacity-50 text-center">Aides Ponctuelles :</p><div className="flex flex-wrap justify-center gap-2">
                 {membresBase.filter(m => m.role === "Aide ponctuel").map(m => (
                   <label key={m.id} className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded border shadow-sm group">
                      <input type="checkbox" className="accent-[#8DC63F]" checked={(aidesPonctuelles[modalChoiceOpen] || []).includes(String(m.id))} onChange={() => { pushToHistory(); const c = aidesPonctuelles[modalChoiceOpen] || []; const n = c.includes(String(m.id)) ? c.filter(id => id !== String(m.id)) : [...c, String(m.id)]; setAidesPonctuelles({...aidesPonctuelles, [modalChoiceOpen]: n});}} /><span className="text-xs font-bold">{m.nom}</span>
                   </label>
                 ))}
              </div></div>
              {isAdmin ? (
                <div className="space-y-3">
                    <button onClick={() => { setFormData({ ...formData, dateDebut: modalChoiceOpen, dateFin: modalChoiceOpen, userId: membresBase[0]?.id || '' }); setModalCongeOpen(true); setModalChoiceOpen(null); }} className="w-full py-5 bg-[#8DC63F] text-[#1B2A49] font-black rounded-2xl uppercase text-xs shadow-md">Saisir Absence</button>
                    <button onClick={() => { setEvtForm({ dateDebut: modalChoiceOpen, dateFin: modalChoiceOpen, titre: '', type: 'concours_oui' }); setModalEvtOpen(true); setModalChoiceOpen(null); }} className="w-full py-4 bg-[#1B2A49] text-white font-black rounded-2xl uppercase text-xs">Événement Club</button>
                    <button onClick={() => { setNoteText(notes[modalChoiceOpen] || ""); setModalNoteOpen(true); setModalChoiceOpen(null); }} className="w-full py-4 bg-yellow-400 text-[#1B2A49] font-black rounded-2xl uppercase text-xs">Note (Post-it)</button>
                    <div className="pt-4 max-h-40 overflow-y-auto space-y-2 border-t mt-4 text-center">
                      {(congesParDate[modalChoiceOpen] || []).map(a => (
                         <div key={a.id} className="flex gap-1 items-center">
                            <button onClick={() => { if(confirm("Supprimer toute la période ?")) { pushToHistory(); setConges(conges.filter(x => x.groupId !== a.groupId)); setModalChoiceOpen(null); } }} className="flex-1 bg-red-50 text-red-700 text-[10px] py-2.5 rounded-xl border font-black uppercase tracking-widest"><Trash2 size={12} className="inline mr-1"/> {membresBase?.find(u=>String(u.id)===String(a.userId))?.nom}</button>
                            {a.statut === 'provisoire' && (
                              <button onClick={() => { pushToHistory(); setConges(conges.map(c => c.groupId === a.groupId ? {...c, statut:'valide'} : c)); setModalChoiceOpen(null); }} className="bg-green-600 text-white text-[10px] px-3 py-2.5 rounded-xl font-black uppercase shadow-sm">Valider Période</button>
                            )}
                         </div>
                      ))}
                    </div>
                </div>
              ) : (
                <button onClick={() => setModalPinOpen(true)} className="w-full py-3 bg-[#1B2A49] text-white rounded-xl font-bold uppercase text-[10px] shadow-lg">Déverrouiller</button>
              )}
              <button onClick={() => setModalChoiceOpen(null)} className="w-full py-2 text-gray-400 font-black uppercase text-[10px]">Fermer</button>
            </div>
          </div>
        )}

        {modalStaffOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[500] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border-b-8 border-[#8DC63F] max-h-[90vh] overflow-y-auto">
              <div className="bg-[#1B2A49] p-5 text-white flex justify-between items-center uppercase font-bold tracking-widest text-sm">Paramètres Équipe<X className="cursor-pointer" onClick={() => setModalStaffOpen(false)}/></div>
              <div className="flex flex-col md:flex-row p-6 gap-6 text-left">
                 <form onSubmit={handleSaveStaff} className="flex-1 space-y-4 text-left"><input type="text" className="w-full border-2 p-4 rounded-2xl font-bold outline-none" value={staffForm.nom} onChange={e => setStaffForm({...staffForm, nom: e.target.value})} required placeholder="Nom"/><select className="w-full border-2 p-4 rounded-2xl font-black bg-white outline-none" value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})}>{["Palefrenier", "Apprentie", "Stagiaire", "Monitrice", "Aide WE", "Aide ponctuel"].map(r => <option key={r} value={r}>{r}</option>)}</select><div className="space-y-2 text-[10px] font-black uppercase text-gray-400">Repos<div className="grid grid-cols-4 gap-1">{JOURS_SEMAINE.map(j => <button key={j} type="button" onClick={() => {const c = staffForm.repos || []; setStaffForm({...staffForm, repos: c.includes(j) ? c.filter(d => d !== j) : [...c, j]});}} className={`py-2 rounded-xl border-2 ${staffForm.repos?.includes(j) ? 'bg-[#8DC63F] border-[#8DC63F] text-[#1B2A49]' : 'bg-white text-gray-300'}`}>{j.substring(0,3)}</button>)}</div></div><button type="submit" className="w-full bg-[#1B2A49] text-white py-4 rounded-xl font-black uppercase">Enregistrer</button></form>
                 <div className="p-8 md:w-1/2 overflow-y-auto bg-white">{membresBase.map(m => (<div key={m.id} className="flex justify-between items-center p-3 border rounded-xl mb-2 font-black text-sm text-left">{m.nom}<div className="flex gap-2"><button onClick={() => setStaffForm(m)} className="text-blue-600 p-2"><Edit size={16}/></button><button onClick={() => { if(confirm("Supprimer ?")) { pushToHistory(); setMembresBase(membresBase.filter(x => String(x.id) !== String(m.id))); } }} className="text-red-600 p-2"><Trash2 size={16}/></button></div></div>))}</div>
              </div>
            </div>
          </div>
        )}

        {modalCongeOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[600] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border-2 border-[#1B2A49]">
              <div className="p-5 bg-[#1B2A49] text-white flex justify-between items-center font-black uppercase text-sm">Enregistrement<X className="cursor-pointer" onClick={() => setModalCongeOpen(false)}/></div>
              <form onSubmit={handleSaveConge} className="p-8 space-y-5 text-left"><select className="w-full border-2 p-4 rounded-2xl font-black outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option value="conge">🏝️ Congé (Décompté)</option><option value="deplacement">✈️ Déplacement (Maintenu)</option></select><div className="grid grid-cols-2 gap-3"><input type="date" className="border-2 p-4 rounded-2xl font-bold outline-none" value={formData.dateDebut} onChange={e => setFormData({...formData, dateDebut: e.target.value})} required/><input type="date" className="border-2 p-4 rounded-2xl font-bold outline-none" value={formData.dateFin} onChange={e => setFormData({...formData, dateFin: e.target.value})}/></div><select className="w-full border-2 p-4 rounded-2xl font-black outline-none" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})} required><option value="">-- Choisir employé --</option>{membresBase.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}</select><div className="flex gap-4 p-4 bg-gray-50 rounded-2xl justify-around border-2 border-dashed border-gray-200 text-[10px] font-black uppercase shadow-inner"><label className="cursor-pointer font-black text-blue-900"><input type="radio" checked={formData.statut === 'provisoire'} onChange={() => setFormData({...formData, statut:'provisoire'})}/> Provisoire</label><label className="cursor-pointer text-green-700 font-black"><input type="radio" checked={formData.statut === 'valide'} onChange={() => setFormData({...formData, statut:'valide'})}/> Validé</label></div><button type="submit" className="w-full bg-[#1B2A49] text-white py-5 rounded-2xl font-black uppercase text-sm shadow-xl">Confirmer</button></form>
            </div>
          </div>
        )}

        {modalEvtOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[600] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl text-center relative">
              <X className="absolute top-4 right-4 cursor-pointer text-gray-400" onClick={() => setModalEvtOpen(false)}/>
              <h3 className="font-black uppercase mb-4 text-[#1B2A49]">Événement Club</h3>
              <form onSubmit={(e) => { e.preventDefault(); pushToHistory(); const nx = { ...evenementsPerso }; nx[modalChoiceOpen] = [...(nx[modalChoiceOpen] || []), { id: Date.now(), type: evtForm.type, titre: evtForm.titre }]; setEvenementsPerso(nx); setModalEvtOpen(false); }} className="space-y-4">
                 <input type="text" className="w-full border-2 p-4 rounded-2xl font-black outline-none text-[#1B2A49]" value={evtForm.titre} onChange={e => setEvtForm({...evtForm, titre: e.target.value})} required placeholder="Titre (ex: Maréchal)"/>
                 <select className="w-full border-2 p-4 rounded-2xl font-black bg-white" value={evtForm.type} onChange={e => setEvtForm({...evtForm, type: e.target.value})}>
                    <option value="concours_oui">🏇 Événement</option>
                    <option value="jour_ferie">🎉 Spécial</option>
                 </select>
                 <button type="submit" className="w-full bg-[#1B2A49] text-[#8DC63F] py-4 rounded-xl font-black uppercase">Valider</button>
              </form>
            </div>
          </div>
        )}

        {modalNoteOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[600] p-4 text-[#1B2A49]">
             <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden border-4 border-yellow-400 shadow-2xl text-center">
                <div className="p-4 bg-yellow-400 font-black flex justify-between uppercase italic text-xs text-[#1B2A49]"><span>Note du jour</span><X className="cursor-pointer" onClick={() => setModalNoteOpen(false)}/></div>
                <form onSubmit={(e) => { e.preventDefault(); pushToHistory(); const nx = { ...notes }; if (!noteText.trim()) delete nx[modalChoiceOpen]; else nx[modalChoiceOpen] = noteText; setNotes(nx); setModalNoteOpen(false); }} className="p-6 space-y-4"><textarea autoFocus className="w-full border-2 border-yellow-100 p-5 rounded-2xl bg-yellow-50 outline-none h-40 font-bold shadow-inner text-[#1B2A49]" value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Message..."/><button type="submit" className="w-full bg-yellow-400 text-[#1B2A49] font-black py-4 rounded-xl shadow-lg uppercase text-xs">Valider</button></form>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}