// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Trash2, X, Plus, Settings, Edit, FilterX, Lock, Unlock, Printer, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'sb_publishable_azT_rAkqeE-zsnvolYSY9w_7MtlnBVI';
const supabase = createClient(supabaseUrl, supabaseKey);

const PIN_DIRECTION = "poney"; 
const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const LOGO_URL = "https://lnwvlyswsmtafyoepovq.supabase.co/storage/v1/object/public/logo/logo.png";

// --- DATES OFFICIELLES GENEVE (Fériés & Vacances) ---
const getOfficialEvents = (year) => {
  const evts = {};
  const add = (date, type, titre) => { if (!evts[date]) evts[date] = []; evts[date].push({ id: Math.random(), type, titre }); };
  if (year === 2026) {
    add('2026-01-01', 'jour_ferie', 'Nouvel An');
    add('2026-04-03', 'jour_ferie', 'Vendredi-Saint');
    add('2026-04-06', 'jour_ferie', 'Lundi de Pâques');
    add('2026-05-14', 'jour_ferie', 'Jeudi de l\'Ascension');
    add('2026-05-25', 'jour_ferie', 'Lundi de Pentecôte');
    add('2026-08-01', 'jour_ferie', 'Fête nationale');
    add('2026-09-10', 'jour_ferie', 'Jeûne genevois');
    add('2026-12-25', 'jour_ferie', 'Noël');
    add('2026-12-31', 'jour_ferie', 'Restauration République');
    for(let d=23; d<=27; d++) add(`2026-02-${d}`, 'vacances_ge', 'Relâches');
    for(let d=7; d<=17; d++) add(`2026-04-${d.toString().padStart(2,'0')}`, 'vacances_ge', 'Pâques');
    add('2026-05-15', 'vacances_ge', 'Pont Ascension');
    add('2026-06-29', 'vacances_ge', 'Été');
    for(let d=19; d<=23; d++) add(`2026-10-${d}`, 'vacances_ge', 'Automne');
  }
  return evts;
};

// Formateur de date ISO local pour éviter les décalages de jour
const toISOLocal = (d) => {
  const z = d.getTimezoneOffset() * 60 * 1000;
  const local = new Date(d - z);
  return local.toISOString().split('T')[0];
};

export default function App() {
  const todayStr = toISOLocal(new Date());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [anneeActuelle, setAnneeActuelle] = useState(2026);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [membresBase, setMembresBase] = useState([]);
  const [conges, setConges] = useState([]);
  const [notes, setNotes] = useState({});
  const [aidesPonctuelles, setAidesPonctuelles] = useState({}); 
  const [filtreEmploye, setFiltreEmploye] = useState(null);

  const [modalCongeOpen, setModalCongeOpen] = useState(false);
  const [modalStaffOpen, setModalStaffOpen] = useState(false);
  const [modalChoiceOpen, setModalChoiceOpen] = useState(null);
  const [modalPinOpen, setModalPinOpen] = useState(false);
  
  const [formData, setFormData] = useState({ userId: '', dateDebut: todayStr, dateFin: todayStr, periode: 'jour', statut: 'provisoire', category: 'conge' });
  const [staffForm, setStaffForm] = useState({ id: null, nom: '', role: 'Palefrenier', total: 25, repos: [] });
  const [pinInput, setPinInput] = useState("");

  const evenements = useMemo(() => getOfficialEvents(anneeActuelle), [anneeActuelle]);

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
          setAidesPonctuelles(map.poney_aides_v14 || {});
          if (map.poney_annee) setAnneeActuelle(Number(map.poney_annee));
        }
      } catch (e) { console.error(e); }
      setIsLoaded(true);
    } load();
  }, []);

  useEffect(() => {
    if (!isLoaded || membresBase.length === 0) return;
    const timer = setTimeout(() => {
      supabase.from('app_state').upsert([
        { id: 'poney_equipe', data: membresBase },
        { id: 'poney_conges', data: conges },
        { id: 'poney_notes', data: notes },
        { id: 'poney_aides_v14', data: aidesPonctuelles },
        { id: 'poney_annee', data: anneeActuelle.toString() }
      ]).then();
    }, 1500); return () => clearTimeout(timer);
  }, [membresBase, conges, notes, aidesPonctuelles, isLoaded, anneeActuelle]);

  const handleAuth = () => { if (isAdmin) setIsAdmin(false); else setModalPinOpen(true); };
  const checkPin = (e) => { e.preventDefault(); if (pinInput.toLowerCase() === PIN_DIRECTION) { setIsAdmin(true); setModalPinOpen(false); setPinInput(""); } else { alert("Code incorrect"); setPinInput(""); } };

  const handleSaveStaff = (e) => {
    e.preventDefault();
    const newId = staffForm.id || Date.now().toString();
    const updated = staffForm.id ? membresBase.map(m => String(m.id) === String(staffForm.id) ? staffForm : m) : [...membresBase, { ...staffForm, id: newId }];
    setMembresBase(updated); setModalStaffOpen(false);
    setStaffForm({ id: null, nom: '', role: 'Palefrenier', total: 25, repos: [] });
  };

  const handleSaveConge = (e) => {
    e.preventDefault();
    const start = new Date(formData.dateDebut); const end = new Date(formData.dateFin || formData.dateDebut);
    const nouveaux = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      nouveaux.push({ id: Math.random().toString(36).substr(2, 9), userId: String(formData.userId), date: toISOLocal(d), statut: formData.statut, category: formData.category, periode: 'jour' });
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
    return ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"].map((mois, mIdx) => {
      const first = new Date(anneeActuelle, mIdx, 1);
      const jours = [];
      let offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
      for (let i = 0; i < offset; i++) jours.push(null);
      let date = new Date(first);
      while (date.getMonth() === mIdx) { jours.push(new Date(date)); date.setDate(date.getDate() + 1); }

      return (
        <div key={mois} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden break-inside-avoid relative z-10">
          <div className="bg-[#EBF2E1] py-1.5 text-center font-bold text-[#1B2A49] text-xs uppercase">{mois}</div>
          <div className="p-2 grid grid-cols-7 gap-1">
            {['L','M','M','J','V','S','D'].map(day => <div key={day} className="text-center text-[9px] font-bold text-gray-400">{day}</div>)}
            {jours.map((dateObj, idx) => {
              if (!dateObj) return <div key={idx} className="h-8"></div>;
              const dStr = toISOLocal(dateObj);
              const isToday = dStr === todayStr;
              const absRaw = congesParDate[dStr] || [];
              const abs = filtreEmploye ? absRaw.filter(a => String(a.userId) === String(filtreEmploye)) : absRaw;
              const evts = evenements[dStr] || [];
              const isAlerte = !filtreEmploye && absRaw.filter(c => membresBase.find(u=>String(u.id)===String(c.userId))?.role === 'Palefrenier').length > 2;

              return (
                <div key={dStr} onClick={() => { setSelectedDate(dStr); setModalChoiceOpen(dStr); }}
                  className={`h-8 rounded flex items-center justify-center relative cursor-pointer overflow-hidden transition-all 
                  ${isAlerte ? 'bg-red-500 text-white font-bold' : isToday ? 'bg-amber-100 ring-4 ring-amber-500 z-10' : 'bg-[#F4F6F9]'}`}>
                  {abs.length > 0 && (
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
                  {evts.length > 0 && <div className="absolute bottom-0 left-0 right-0 flex flex-col">{evts.map((e, i) => <div key={i} className={`h-[3px] w-full ${e.type === 'vacances_ge' ? 'bg-blue-500' : 'bg-purple-600'}`}></div>)}</div>}
                  <span className={`z-10 font-bold text-[11px] ${abs.length > 0 || isAlerte ? 'text-white' : 'text-[#1B2A49]'}`}>{dateObj.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  }, [anneeActuelle, congesParDate, filtreEmploye, membresBase, evenements, todayStr]);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-[#1B2A49] font-sans relative overflow-hidden">
      
      {/* FILIGRANE LOGO */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.05]">
        <img src={LOGO_URL} className="w-[60%]" alt="" />
      </div>

      <style>{`
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          aside, header, .legend, .print-hide { display: none !important; }
          main { display: block !important; width: 100% !important; padding: 0 !important; }
          .grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; }
        }
      `}</style>

      <div className="flex h-screen overflow-hidden print:block relative z-10">
        <aside className="w-80 bg-[#1B2A49] flex flex-col shrink-0 shadow-xl text-white text-center print:hidden">
          <div className="p-6 bg-[#141D36] flex flex-col items-center border-b-4 border-[#8DC63F]">
            <img src={LOGO_URL} alt="Logo" className="w-24 h-24 mb-3 bg-white rounded-full p-2 shadow-lg" />
            <div className="flex items-center gap-2 mb-2">
               <h2 className="text-[10px] font-extrabold uppercase bg-[#8DC63F] text-[#1B2A49] px-2 py-1 rounded tracking-tighter">Organisation des équipes écuries</h2>
               <button onClick={handleAuth} className={`p-1 rounded ${isAdmin ? 'bg-green-500' : 'bg-red-500'}`}><Unlock size={14}/></button>
            </div>
            <h1 className="text-xl font-bold uppercase mt-1 leading-none tracking-tighter">Poney Club<br/>Presinge</h1>
          </div>

          <div className="p-4 space-y-3">
             {isAdmin && <button onClick={() => setModalCongeOpen(true)} className="w-full bg-[#8DC63F] text-[#1B2A49] font-black py-3 rounded-xl flex items-center justify-center gap-2 uppercase text-xs shadow-lg hover:scale-105 transition-transform"><Plus size={18}/> Saisir Absence</button>}
             <button onClick={() => setFiltreEmploye(null)} className={`w-full bg-[#8DC63F]/20 text-[#8DC63F] font-bold py-2 rounded-xl text-xs ${!filtreEmploye ? 'ring-1 ring-[#8DC63F]' : ''}`}><FilterX size={14} className="inline mr-1"/> TOUTE L'ÉQUIPE</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             {["Palefrenier", "Apprentie", "Monitrice", "Aide WE", "Aide ponctuel"].map(role => {
               const mm = membresBase.filter(m => m.role === role);
               if (!mm.length) return null;
               return (
                 <div key={role} className="text-left">
                   <h4 className="text-[10px] opacity-40 uppercase font-bold mb-2 border-b border-white/5">{role}s</h4>
                   {mm.map(m => (
                     <div key={m.id} onClick={() => setFiltreEmploye(filtreEmploye === m.id ? null : m.id)}
                       className={`p-3 rounded-xl mb-1 cursor-pointer transition-all ${filtreEmploye === m.id ? 'bg-[#8DC63F] text-[#1B2A49] font-bold' : 'bg-[#213459] text-white/80'}`}>
                       <div className="flex flex-col">
                         <span className="text-sm font-bold">{m.nom}</span>
                         {m.role !== "Aide ponctuel" && (
                           <div className="flex gap-1.5 mt-1 font-mono text-[10px] font-black uppercase">
                              {['L','M','M','J','V','S','D'].map((lettre, idx) => (
                                <span key={idx} className={m.repos?.includes(JOURS_SEMAINE[idx]) ? "text-red-400" : "text-green-400"}>{lettre}</span>
                              ))}
                           </div>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               );
             })}
          </div>
          {isAdmin && <button onClick={() => setModalStaffOpen(true)} className="p-4 opacity-30 text-[10px] uppercase font-black tracking-widest">Configuration Équipe</button>}
        </aside>

        <main className="flex-1 flex flex-col relative z-10">
          <header className="h-44 bg-white/90 backdrop-blur-md border-b flex flex-col md:flex-row items-center justify-between px-6 py-4 gap-4 shadow-sm print:h-auto print:border-none">
            <div className="flex items-center gap-3 print:hidden">
              <button onClick={() => setAnneeActuelle(a => a-1)} className="p-2 border rounded"><ChevronLeft/></button>
              <h2 className="text-3xl font-black">{anneeActuelle}</h2>
              <button onClick={() => setAnneeActuelle(a => a+1)} className="p-2 border rounded"><ChevronRight/></button>
            </div>
            
            <div className={`flex-1 w-full max-w-2xl min-h-36 rounded-2xl border-2 flex flex-col justify-center items-center p-4 shadow-sm ${congesParDate[selectedDate]?.length > 2 ? 'bg-red-600 text-white border-red-700' : 'bg-white border-[#D0D7E1]'}`}>
              <h3 className="text-xl font-black uppercase text-center">{new Date(selectedDate).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}</h3>
              {evenements[selectedDate] && <div className="text-red-600 font-black uppercase text-sm mt-1">🚩 {evenements[selectedDate].map(e => e.titre).join(' / ')}</div>}
              
              <div className="mt-3 flex items-center gap-4 bg-[#1B2A49] px-6 py-2 rounded-full shadow-lg border border-white/10 print:bg-white print:border-gray-200">
                 <span className="text-[#8DC63F] font-black text-2xl print:text-black">{presentsDuJour.total}</span>
                 <div className="text-[11px] font-bold text-white/90 leading-tight print:text-black">
                    {presentsDuJour.fixe.map(p => p.nom).join(', ')}
                    {presentsDuJour.aides.length > 0 && <span className="text-cyan-300 italic"> (+ {presentsDuJour.aides.map(p => p.nom).join(', ')})</span>}
                 </div>
              </div>
            </div>
            <button onClick={() => window.print()} className="p-4 bg-[#1B2A49] text-[#8DC63F] rounded-2xl shadow-xl hover:scale-105 transition-transform print:hidden"><Printer size={24}/></button>
          </header>

          <div className="bg-white/80 backdrop-blur-md px-8 py-2.5 flex justify-center gap-8 border-b text-[10px] font-black uppercase tracking-wider print-hide relative z-10 flex-wrap legend">
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
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
              <h3 className="font-bold uppercase mb-4 text-lg">Accès Direction</h3>
              <input autoFocus type="password" placeholder="PIN" className="w-full text-center text-3xl border-2 p-3 rounded-xl mb-4" value={pinInput} onChange={e => setPinInput(e.target.value)} />
              <div className="flex gap-2"><button onClick={() => setModalPinOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold uppercase">Annuler</button><button onClick={checkPin} className="flex-1 py-3 bg-[#1B2A49] text-white rounded-xl font-bold uppercase">Valider</button></div>
            </div>
          </div>
        )}

        {modalChoiceOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 space-y-4 border-t-8 border-[#8DC63F] shadow-2xl relative text-center">
              <h4 className="font-black border-b pb-4 uppercase text-lg tracking-tighter">{new Date(modalChoiceOpen).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}</h4>
              <div className="bg-gray-50 p-3 rounded-xl border text-left"><p className="text-[10px] font-black uppercase mb-2 opacity-50 text-center">Aides Ponctuelles :</p><div className="flex flex-wrap justify-center gap-3">
                 {membresBase.filter(m => m.role === "Aide ponctuel").map(m => (
                   <label key={m.id} className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded-lg border shadow-sm group">
                      <input type="checkbox" className="accent-[#8DC63F]" checked={(aidesPonctuelles[modalChoiceOpen] || []).includes(String(m.id))} onChange={() => {const c = aidesPonctuelles[modalChoiceOpen] || []; const n = c.includes(String(m.id)) ? c.filter(id => id !== String(m.id)) : [...c, String(m.id)]; setAidesPonctuelles({...aidesPonctuelles, [modalChoiceOpen]: n});}} /><span className="text-[11px] font-bold">{m.nom}</span>
                   </label>
                 ))}
              </div></div>
              {isAdmin ? (
                <div className="space-y-3"><button onClick={() => { setFormData({ ...formData, dateDebut: modalChoiceOpen, dateFin: modalChoiceOpen, userId: membresBase[0]?.id || '' }); setModalCongeOpen(true); setModalChoiceOpen(null); }} className="w-full py-5 bg-[#8DC63F] text-[#1B2A49] font-black rounded-2xl uppercase text-xs">Saisir Absence</button><div className="pt-4 max-h-40 overflow-y-auto space-y-2">{(congesParDate[modalChoiceOpen] || []).map(a => (<button key={a.id} onClick={() => { if(confirm("Supprimer ?")) {setConges(conges.filter(x => x.id !== a.id)); setModalChoiceOpen(null);} }} className="w-full bg-red-50 text-red-700 text-[10px] py-3 rounded-xl border font-black uppercase tracking-widest"><Trash2 size={12} className="inline mr-1"/> {membresBase?.find(u=>String(u.id)===String(a.userId))?.nom}</button>))}</div></div>
              ) : (
                <button onClick={() => setModalPinOpen(true)} className="w-full py-3 bg-[#1B2A49] text-white rounded-xl font-bold uppercase text-[10px]">Déverrouiller</button>
              )}
              <button onClick={() => setModalChoiceOpen(null)} className="w-full py-2 text-gray-400 font-black uppercase text-[10px]">Fermer</button>
            </div>
          </div>
        )}

        {modalStaffOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[250] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border-b-8 border-[#8DC63F]">
              <div className="bg-[#1B2A49] p-5 text-white flex justify-between items-center uppercase font-bold">Équipe PCP<X className="cursor-pointer" onClick={() => setModalStaffOpen(false)}/></div>
              <div className="flex flex-col md:flex-row max-h-[80vh] overflow-y-auto text-left p-8 gap-8">
                 <form onSubmit={handleSaveStaff} className="flex-1 space-y-4 text-left"><input type="text" className="w-full border-2 p-4 rounded-2xl font-bold outline-none" value={staffForm.nom} onChange={e => setStaffForm({...staffForm, nom: e.target.value})} required placeholder="Nom"/><select className="w-full border-2 p-4 rounded-2xl font-black bg-white outline-none" value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})}>{["Palefrenier", "Apprentie", "Stagiaire", "Monitrice", "Aide WE", "Aide ponctuel"].map(r => <option key={r} value={r}>{r}</option>)}</select><div className="space-y-2 text-[10px] font-black uppercase text-gray-400">Repos<div className="grid grid-cols-4 gap-1">{JOURS_SEMAINE.map(j => <button key={j} type="button" onClick={() => {const c = staffForm.repos || []; setStaffForm({...staffForm, repos: c.includes(j) ? c.filter(d => d !== j) : [...c, j]});}} className={`py-2 rounded-xl border-2 ${staffForm.repos?.includes(j) ? 'bg-[#8DC63F] border-[#8DC63F] text-[#1B2A49]' : 'bg-white text-gray-300'}`}>{j.substring(0,3)}</button>)}</div></div><button type="submit" className="w-full bg-[#1B2A49] text-white py-4 rounded-xl font-black uppercase shadow-lg">Enregistrer</button></form>
                 <div className="p-8 md:w-1/2 overflow-y-auto bg-white">{membresBase.map(m => (<div key={m.id} className="flex justify-between items-center p-3 border rounded-xl mb-2 font-black text-sm">{m.nom}<div className="flex gap-2"><button onClick={() => setStaffForm(m)} className="text-blue-600 p-2"><Edit size={16}/></button><button onClick={() => { if(confirm("Supprimer ?")) setMembresBase(membresBase.filter(x => String(x.id) !== String(m.id))) }} className="text-red-600 p-2"><Trash2 size={16}/></button></div></div>))}</div>
              </div>
            </div>
          </div>
        )}

        {modalCongeOpen && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border-2 border-[#1B2A49]">
              <div className="p-5 bg-[#1B2A49] text-white flex justify-between items-center font-black uppercase text-sm">Enregistrement<X className="cursor-pointer" onClick={() => setModalCongeOpen(false)}/></div>
              <form onSubmit={handleSaveConge} className="p-8 space-y-5 text-left"><select className="w-full border-2 p-4 rounded-2xl font-black outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option value="conge">🏝️ Congé (Décompté)</option><option value="deplacement">✈️ Déplacement (Maintenu)</option></select><div className="grid grid-cols-2 gap-3"><input type="date" className="border-2 p-4 rounded-2xl font-bold outline-none" value={formData.dateDebut} onChange={e => setFormData({...formData, dateDebut: e.target.value})} required/><input type="date" className="border-2 p-4 rounded-2xl font-bold outline-none" value={formData.dateFin} onChange={e => setFormData({...formData, dateFin: e.target.value})}/></div><select className="w-full border-2 p-4 rounded-2xl font-black outline-none" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})} required><option value="">-- Choisir employé --</option>{membresBase.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}</select><div className="flex gap-4 p-4 bg-gray-50 rounded-2xl justify-around border-2 border-dashed border-gray-200 text-[10px] font-black uppercase"><label className="cursor-pointer font-black text-blue-900"><input type="radio" checked={formData.statut === 'provisoire'} onChange={() => setFormData({...formData, statut:'provisoire'})}/> Provisoire</label><label className="cursor-pointer text-green-700 font-black"><input type="radio" checked={formData.statut === 'valide'} onChange={() => setFormData({...formData, statut:'valide'})}/> Validé</label></div><button type="submit" className="w-full bg-[#1B2A49] text-white py-5 rounded-2xl font-black uppercase text-sm shadow-xl">Confirmer</button></form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}