// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, MapPin, Award, Trash2, X, Plus, AlertCircle, 
  Users, Tent, ChevronLeft, ChevronRight, Settings, Edit, Flag, 
  StickyNote, Printer, FilterX, Briefcase, CheckCircle2 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- CONNEXION SUPABASE ---
const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'sb_publishable_azT_rAkqeE-zsnvolYSY9w_7MtlnBVI';
const supabase = createClient(supabaseUrl, supabaseKey);

const defaultEquipe = [
  { id: 1, nom: "Benjamin", role: "Palefrenier", total: 25, repos: "Jeudi" },
  { id: 2, nom: "Jean Baptiste", role: "Palefrenier", total: 25, repos: "Mercredi" },
  { id: 3, nom: "Gaelle", role: "Palefrenier", total: 25, repos: "Samedi" },
  { id: 4, nom: "Deborah", role: "Palefrenier", total: 25, repos: "Lundi, Samedi" },
  { id: 5, nom: "Aurelie", role: "Apprentie", total: 25, repos: "" },
  { id: 6, nom: "Jade", role: "Apprentie", total: 25, repos: "" },
  { id: 7, nom: "Laura", role: "Monitrice", total: 0, repos: "" },
  { id: 8, nom: "Clara", role: "Monitrice", total: 0, repos: "" },
  { id: 9, nom: "Clélia", role: "Monitrice", total: 0, repos: "" },
  { id: 10, nom: "Hermine", role: "Monitrice", total: 0, repos: "" },
  { id: 11, nom: "Gabriel", role: "Aide WE", total: 0, repos: "" },
  { id: 12, nom: "Steve", role: "Aide WE", total: 0, repos: "" },
  { id: 13, nom: "Lou", role: "Aide WE", total: 0, repos: "" },
];

const moisNoms = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const rolesDisponibles = ["Palefrenier", "Apprentie", "Stagiaire", "Monitrice", "Aide WE", "Aide ponctuel"];

export default function App() {
  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  // --- ÉTATS ---
  const [isLoaded, setIsLoaded] = useState(false);
  const [anneeActuelle, setAnneeActuelle] = useState(2026);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [membresBase, setMembresBase] = useState(defaultEquipe);
  const [conges, setConges] = useState([]);
  const [evenements, setEvenements] = useState({});
  const [notes, setNotes] = useState({});
  const [filtreEmploye, setFiltreEmploye] = useState(null);

  const [modalCongeOpen, setModalCongeOpen] = useState(false);
  const [modalStaffOpen, setModalStaffOpen] = useState(false);
  const [modalEvtOpen, setModalEvtOpen] = useState(false);
  const [modalNoteOpen, setModalNoteOpen] = useState(false);
  const [modalChoiceOpen, setModalChoiceOpen] = useState(null);
  
  const [formData, setFormData] = useState({ id: null, userId: '', dateDebut: '', dateFin: '', periode: 'jour', statut: 'provisoire', category: 'conge' });
  const [staffForm, setStaffForm] = useState({ id: null, nom: '', role: 'Palefrenier', total: 25, repos: '' });
  const [evtForm, setEvtForm] = useState({ dateDebut: '', dateFin: '', titre: '', type: 'concours_oui' });
  const [noteText, setNoteText] = useState("");

  // --- CHARGEMENT INITIAL ---
  useEffect(() => {
    async function loadData() {
      try {
        const { data } = await supabase.from('app_state').select('*');
        if (data && data.length > 0) {
          const map = {};
          data.forEach(r => map[r.id] = r.data);
          if (map.poney_equipe) setMembresBase(map.poney_equipe);
          if (map.poney_conges) setConges(map.poney_conges || []);
          if (map.poney_notes) setNotes(map.poney_notes || {});
          if (map.poney_annee) setAnneeActuelle(Number(map.poney_annee));
          if (map.poney_evenements) setEvenements(map.poney_evenements || {});
        }
      } catch (e) { console.error("Erreur Sync", e); }
      setIsLoaded(true);
    }
    loadData();
  }, []);

  // --- SAUVEGARDES (SÉCURISÉES) ---
  useEffect(() => { 
    if (isLoaded && membresBase?.length > 0) {
      supabase.from('app_state').upsert({ id: 'poney_equipe', data: membresBase }).then();
    }
  }, [membresBase, isLoaded]);

  useEffect(() => { if (isLoaded) supabase.from('app_state').upsert({ id: 'poney_conges', data: conges }).then(); }, [conges, isLoaded]);
  useEffect(() => { if (isLoaded) supabase.from('app_state').upsert({ id: 'poney_evenements', data: evenements }).then(); }, [evenements, isLoaded]);
  useEffect(() => { if (isLoaded) supabase.from('app_state').upsert({ id: 'poney_notes', data: notes }).then(); }, [notes, isLoaded]);
  useEffect(() => { if (isLoaded) supabase.from('app_state').upsert({ id: 'poney_annee', data: anneeActuelle.toString() }).then(); }, [anneeActuelle, isLoaded]);

  // --- CALCULS ---
  const palefrenierIds = useMemo(() => new Set((membresBase || []).filter(m => m.role === 'Palefrenier').map(m => m.id)), [membresBase]);
  
  const equipeCalculee = useMemo(() => {
    return (membresBase || []).map(m => {
      const list = (conges || []).filter(c => c.userId === m.id && c.date?.startsWith(anneeActuelle.toString()));
      const pris = list.reduce((acc, curr) => (curr.category === 'deplacement' ? acc : acc + (curr.periode === 'jour' ? 1 : 0.5)), 0);
      return { ...m, pris };
    });
  }, [membresBase, conges, anneeActuelle]);

  const congesParDate = useMemo(() => {
    const map = {};
    (conges || []).forEach(c => {
      if (c?.date) {
        if (!map[c.date]) map[c.date] = [];
        map[c.date].push(c);
      }
    });
    return map;
  }, [conges]);

  const absentsJour = congesParDate[selectedDate] || [];
  const eventsJour = evenements[selectedDate] || [];
  const isAlerteHeader = !filtreEmploye && absentsJour.filter(c => palefrenierIds.has(c.userId)).length > 2;

  // --- FONCTIONS ACTIONS ---
  const ouvrirModalConge = (dateStr = '') => {
    setFormData({ id: null, userId: membresBase?.[0]?.id || '', dateDebut: dateStr || todayStr, dateFin: dateStr || todayStr, periode: 'jour', statut: 'provisoire', category: 'conge' });
    setModalCongeOpen(true);
  };

  const handleSaveStaff = (e) => {
    e.preventDefault();
    const updated = staffForm.id 
      ? membresBase.map(m => m.id === staffForm.id ? { ...staffForm, total: Number(staffForm.total) } : m)
      : [...membresBase, { ...staffForm, id: Date.now(), total: Number(staffForm.total) }];
    setMembresBase(updated);
    setStaffForm({ id: null, nom: '', role: 'Palefrenier', total: 25, repos: '' });
    setModalStaffOpen(false);
  };

  const handleSaveConge = (e) => {
    e.preventDefault();
    const batch = [];
    const gId = Date.now().toString();
    let cur = new Date(formData.dateDebut);
    const end = new Date(formData.dateFin || formData.dateDebut);
    while (cur <= end) {
      const d = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      batch.push({ id: Math.random().toString(36).substr(2,9), groupId: gId, userId: Number(formData.userId), date: d, periode: formData.periode, statut: formData.category === 'deplacement' ? 'valide' : formData.statut, category: formData.category });
      cur.setDate(cur.getDate() + 1);
    }
    setConges([...conges, ...batch]);
    setModalCongeOpen(false);
  };

  const handleSaveEvt = (e) => {
    e.preventDefault();
    const nx = { ...evenements };
    let cur = new Date(evtForm.dateDebut);
    const end = new Date(evtForm.dateFin || evtForm.dateDebut);
    while (cur <= end) {
      const d = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      const newE = { id: Date.now() + Math.random(), type: evtForm.type, titre: evtForm.titre };
      nx[d] = nx[d] ? [...nx[d], newE] : [newE];
      cur.setDate(cur.getDate() + 1);
    }
    setEvenements(nx);
    setModalEvtOpen(false);
  };

  const handleSaveNote = (e) => {
    e.preventDefault();
    const next = { ...notes };
    if (!noteText.trim()) delete next[selectedDate];
    else next[selectedDate] = noteText;
    setNotes(next);
    setModalNoteOpen(false);
  };

  // --- RENDU CALENDRIER ---
  const calendrierRender = useMemo(() => {
    return moisNoms.map((mois, index) => {
      const d = new Date(anneeActuelle, index, 1);
      const jours = [];
      let start = d.getDay() === 0 ? 6 : d.getDay() - 1;
      for (let i = 0; i < start; i++) jours.push(null);
      while (d.getMonth() === index) { jours.push(new Date(d)); d.setDate(d.getDate() + 1); }

      return (
        <div key={mois} className="bg-white rounded-xl shadow border border-[#D0D7E1] overflow-hidden break-inside-avoid print:shadow-none">
          <div className="bg-[#EBF2E1] py-1.5 text-center font-bold text-[#1B2A49] text-xs print:bg-gray-100">{mois}</div>
          <div className="p-2 grid grid-cols-7 gap-1">
            {['L','M','M','J','V','S','D'].map(day => <div key={day} className="text-center text-[9px] font-bold text-gray-400">{day}</div>)}
            {jours.map((j, idx) => {
              if (!j) return <div key={idx} className="h-8"></div>;
              const dStr = `${j.getFullYear()}-${String(j.getMonth() + 1).padStart(2, '0')}-${String(j.getDate()).padStart(2, '0')}`;
              const isToday = dStr === todayStr;
              const isPast = dStr < todayStr;
              const evts = evenements[dStr] || [];
              const abs = congesParDate[dStr] || [];
              const filteredAbs = filtreEmploye ? abs.filter(a => a.userId === filtreEmploye) : abs;
              const hasConge = filteredAbs.length > 0;
              const isAlerte = !filtreEmploye && abs.filter(c => palefrenierIds.has(c.userId)).length > 2;

              let baseClass = "bg-[#F4F6F9]";
              if (isPast && !hasConge && evts.length === 0 && !isAlerte) baseClass = "bg-[#E2E8F0] opacity-50";

              return (
                <div key={dStr} onClick={() => { setSelectedDate(dStr); setModalChoiceOpen(dStr); }}
                  className={`h-8 rounded flex items-center justify-center relative cursor-pointer overflow-hidden transition-all 
                  ${isAlerte ? 'bg-red-500 text-white font-bold' : isToday ? 'bg-amber-100 ring-2 ring-amber-500 z-10 shadow-sm' : baseClass} print:border print:border-gray-100`}>
                  
                  {hasConge && !isAlerte && (
                    <div className="absolute inset-0 flex flex-col opacity-100">
                      {[0, 1].map(h => {
                         const match = filteredAbs.filter(a => (h === 0 ? (a.periode === 'matin' || a.periode === 'jour') : (a.periode === 'apres-midi' || a.periode === 'jour')));
                         if (match.length === 0) return <div key={h} className="h-1/2"></div>;
                         const a = match[0];
                         let bg = a.category === 'deplacement' ? "bg-cyan-600" : (a.statut === 'valide' ? "bg-[#1B2A49]" : "bg-transparent");
                         return <div key={h} className={`h-1/2 w-full relative ${bg}`}>
                           {a.statut === 'provisoire' && a.category !== 'deplacement' && (
                             <div className="absolute inset-0" style={{background: 'repeating-linear-gradient(45deg, #1B2A49, #1B2A49 2px, #22c55e 2px, #22c55e 4px)', opacity: 0.9}}></div>
                           )}
                         </div>;
                      })}
                    </div>
                  )}
                  {evts.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col z-[30]">
                      {evts.map((e, i) => {
                         let color = "bg-[#8B5A2B]"; 
                         if (e.type === 'vacances_ge') color = "bg-blue-500";
                         if (e.type === 'jour_ferie') color = "bg-purple-600";
                         return <div key={i} className={`h-[4px] w-full ${color} border-t border-black/10`}></div>;
                      })}
                    </div>
                  )}
                  <span className={`z-10 font-bold ${filteredAbs.some(a => a.statut === 'valide') || isAlerte ? 'text-white' : 'text-[#1B2A49]'}`}>{j.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    });
  }, [anneeActuelle, evenements, congesParDate, filtreEmploye, todayStr, palefrenierIds]);

  if (!isLoaded) return <div className="h-screen flex items-center justify-center bg-[#F0F4F8] font-bold text-[#1B2A49]">Synchronisation PCP... 🐴</div>;

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-[#1B2A49]">
      <style>{`
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          body, .min-h-screen, #root { background: white !important; height: auto !important; overflow: visible !important; display: block !important; }
          .print\\:hidden { display: none !important; }
          .grid-print { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 10px !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        @media (max-width: 1024px) {
          .flex-mobile { flex-direction: column !important; height: auto !important; overflow-y: auto !important; }
          .side-mobile { width: 100% !important; border-right: none; border-bottom: 4px solid #8DC63F !important; }
        }
      `}</style>

      <div className="flex h-screen flex-mobile overflow-hidden print:block print:h-auto">
        
        {/* SIDEBAR */}
        <aside className="w-80 side-mobile bg-[#1B2A49] flex flex-col print:hidden shrink-0 shadow-xl relative z-50 text-white">
          <div className="p-6 bg-[#141D36] flex flex-col items-center border-b-4 border-[#8DC63F]">
            <img src="/logo.png" alt="Logo" className="w-20 h-20 mb-3 bg-white rounded-full p-1 shadow-lg" />
            <h2 className="text-[10px] font-extrabold uppercase bg-[#8DC63F] text-[#1B2A49] px-3 py-1 rounded">Organisation des équipes écuries</h2>
            <h1 className="text-xl font-bold uppercase tracking-tighter text-center leading-none">Poney Club<br/>Presinge</h1>
          </div>

          <div className="p-4 bg-[#141D36]/50 space-y-3 shrink-0 text-white">
             <button onClick={() => setModalStaffOpen(true)} className="w-full bg-[#1B2A49] text-[#8DC63F] border border-[#8DC63F]/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-[#2A3C5E] transition-all"><Settings size={14}/> Configuration Équipe</button>
             <button onClick={() => ouvrirModalConge()} className="w-full bg-[#8DC63F] text-[#1B2A49] font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-all uppercase tracking-widest"><Plus size={20}/> Saisir Absence</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             <button onClick={() => setFiltreEmploye(null)} className={`w-full text-left p-2 rounded-lg text-[10px] font-black uppercase transition-all ${filtreEmploye === null ? 'bg-[#8DC63F] text-[#1B2A49]' : 'text-white/30'}`}>
                <div className="flex items-center gap-2"><FilterX size={14}/> Toute l'équipe</div>
             </button>
             {rolesDisponibles.map(role => {
               const mm = equipeCalculee.filter(m => m.role === role);
               if (!mm.length) return null;
               return (
                 <div key={role}>
                   <h4 className="text-[10px] text-white/30 uppercase font-bold mb-2 border-b border-white/5">{role}s</h4>
                   {mm.map(m => (
                     <div key={m.id} onClick={() => setFiltreEmploye(filtreEmploye === m.id ? null : m.id)}
                       className={`p-3 rounded-xl mb-1 border cursor-pointer flex justify-between items-center transition-all ${filtreEmploye === m.id ? 'bg-[#8DC63F] text-[#1B2A49] font-bold scale-105 shadow-lg' : 'bg-[#213459] text-white/80 border-transparent hover:bg-[#2A406D]'}`}>
                       <div className="flex flex-col"><span className="text-sm font-semibold">{m.nom}</span><span className="text-[9px] opacity-40 font-bold uppercase">{m.role}</span></div>
                       {m.total > 0 && <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${m.pris >= m.total ? 'bg-red-500 text-white' : 'bg-[#141D36] text-[#8DC63F]'}`}>{m.pris}/{m.total}</span>}
                     </div>
                   ))}
                 </div>
               );
             })}
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 flex flex-col print:block">
          <header className="h-32 bg-white border-b flex items-center justify-between px-6 print:hidden shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setAnneeActuelle(a => a-1)} className="p-2 hover:bg-gray-100 rounded-lg border shadow-sm"><ChevronLeft/></button>
              <h2 className="text-3xl font-black">{anneeActuelle}</h2>
              <button onClick={() => setAnneeActuelle(a => a+1)} className="p-2 hover:bg-gray-100 rounded-lg border shadow-sm"><ChevronRight/></button>
            </div>
            
            <div className={`flex-1 mx-8 h-24 rounded-2xl border-2 flex flex-col justify-center items-center transition-all shadow-sm ${isAlerteHeader ? 'bg-red-600 text-white border-red-700' : 'bg-white border-[#D0D7E1]'}`}>
              <h3 className="text-2xl font-black uppercase text-center w-full leading-none mb-1">
                {new Date(selectedDate).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}
              </h3>
              <div className="flex flex-wrap justify-center gap-3">
                 {eventsJour.map(e => <span key={e.id} className="text-[11px] font-black bg-black/10 px-2 rounded">🚩 {e.titre}</span>)}
                 {absentsJour.map(c => (
                   <span key={c.id} className={`text-[11px] font-bold px-2 rounded shadow-sm ${c.statut === 'provisoire' ? 'bg-yellow-400 text-black border border-black/20' : 'bg-[#1B2A49] text-white'}`}>{membresBase.find(u=>u.id===c.userId)?.nom}</span>
                 ))}
                 {notes[selectedDate] ? (
                   <button onClick={() => { setNoteText(notes[selectedDate]); setModalNoteOpen(true); }} className="bg-yellow-400 text-[#1B2A49] text-[11px] px-3 py-1 rounded-lg border-2 border-yellow-500 font-black flex items-center gap-2 shadow-md italic">
                     <StickyNote size={14}/> {notes[selectedDate]}
                   </button>
                 ) : (
                   <button onClick={() => { setNoteText(''); setModalNoteOpen(true); }} className="text-[10px] font-bold text-[#1B2A49]/40 hover:text-[#1B2A49] underline">+ Ajouter Note</button>
                 )}
              </div>
            </div>

            <button onClick={() => window.print()} className="p-4 bg-[#1B2A49] text-[#8DC63F] rounded-2xl shadow-xl hover:scale-105 transition-transform"><Printer size={28}/></button>
          </header>

          <div className="bg-white px-8 py-2.5 flex justify-center gap-8 border-b text-[10px] font-black uppercase tracking-wider print:hidden shadow-inner">
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-[#1B2A49] rounded-sm shadow-sm"></div> Validé</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-cyan-600 rounded-sm shadow-sm"></div> Déplacement</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 border border-[#1B2A49]" style={{background: 'repeating-linear-gradient(45deg, #1B2A49, #1B2A49 2px, #22c55e 2px, #22c55e 4px)'}}></div> Provisoire</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-1.5 bg-[#8B5A2B] rounded-full shadow-sm"></div> Concours</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-1.5 bg-blue-500 rounded-full shadow-sm"></div> Vacances GE</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-1.5 bg-purple-600 rounded-full shadow-sm"></div> J. Férié</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 grid-print">
            {calendrierRender}
          </div>
        </main>

        {/* MODAL ABSENCE */}
        {modalCongeOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border-4 border-[#1B2A49]">
              <div className="p-4 bg-[#1B2A49] text-white flex justify-between items-center font-black">
                <span>ENREGISTREMENT</span>
                <X className="cursor-pointer" onClick={() => setModalCongeOpen(false)}/>
              </div>
              <form onSubmit={handleSaveConge} className="p-6 space-y-4 text-[#1B2A49]">
                <select className="w-full border-2 border-[#D0D7E1] p-3 rounded-2xl font-black bg-gray-50" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="conge">🏝️ Congé (DÉCOMPTÉ)</option>
                  <option value="deplacement">✈️ Déplacement (MAINTIEN SOLDE)</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="border-2 p-3 rounded-2xl font-bold" value={formData.dateDebut} onChange={e => setFormData({...formData, dateDebut: e.target.value})} required/>
                  <input type="date" className="border-2 p-3 rounded-2xl font-bold" value={formData.dateFin} onChange={e => setFormData({...formData, dateFin: e.target.value})}/>
                </div>
                <select className="w-full border-2 p-3 rounded-2xl font-black" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})} required>
                  {membresBase?.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
                {formData.category === 'conge' && (
                  <div className="flex gap-4 p-3 bg-gray-100 rounded-2xl justify-around">
                    <label className="flex items-center gap-2 cursor-pointer font-bold"><input type="radio" checked={formData.statut === 'provisoire'} onChange={() => setFormData({...formData, statut:'provisoire'})}/> PROVISOIRE</label>
                    <label className="flex items-center gap-2 cursor-pointer font-black text-green-700"><input type="radio" checked={formData.statut === 'valide'} onChange={() => setFormData({...formData, statut:'valide'})}/> VALIDÉ</label>
                  </div>
                )}
                <button type="submit" className="w-full bg-[#1B2A49] text-white py-4 rounded-xl font-black text-lg shadow-xl uppercase tracking-tighter">Enregistrer</button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL NOTE AVEC SUPPRESSION */}
        {modalNoteOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-[#1B2A49]">
             <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border-4 border-yellow-400 shadow-2xl">
                <div className="p-4 bg-yellow-400 text-black font-black flex justify-between uppercase italic">
                   <span>Post-it</span>
                   <X className="cursor-pointer" onClick={() => setModalNoteOpen(false)}/>
                </div>
                <form onSubmit={handleSaveNote} className="p-6 space-y-4">
                   <textarea autoFocus className="w-full border-2 border-yellow-100 p-4 rounded-2xl bg-yellow-50 outline-none h-32 font-bold" 
                    value={noteText || ""} onChange={e => setNoteText(e.target.value)} placeholder="Taper ici..."/>
                   <div className="flex gap-2">
                     <button type="button" onClick={() => { setNoteText(""); setNotes(p=>{const n={...p};delete n[selectedDate];return n;}); setModalNoteOpen(false); }} className="p-4 bg-red-100 text-red-600 rounded-2xl hover:bg-red-200 transition-colors shadow-sm"><Trash2/></button>
                     <button type="submit" className="flex-1 bg-yellow-400 text-black py-4 rounded-2xl font-black shadow-lg uppercase tracking-tighter">Valider</button>
                   </div>
                </form>
             </div>
          </div>
        )}

        {/* MODAL CHOICE / CLIC JOUR AVEC SUPPRESSION */}
        {modalChoiceOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-[110] p-4 print:hidden text-[#1B2A49]">
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-sm p-6 space-y-4 border-t-8 border-[#8DC63F] shadow-2xl relative">
              <h4 className="text-center font-black border-b pb-3 uppercase text-lg">{new Date(modalChoiceOpen).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}</h4>
              <button onClick={() => ouvrirModalConge(modalChoiceOpen)} className="w-full py-4 bg-[#8DC63F] text-[#1B2A49] font-black rounded-2xl flex items-center justify-center gap-2 shadow-md hover:scale-105 transition-transform uppercase">Absence / Déplacement</button>
              <button onClick={() => { setEvtForm({dateDebut: modalChoiceOpen, dateFin: modalChoiceOpen, titre: '', type: 'concours_oui'}); setModalEvtOpen(true); setModalChoiceOpen(null); }} className="w-full py-4 bg-[#1B2A49] text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-md hover:scale-105 transition-transform uppercase border-2 border-[#8DC63F]">Événement Club</button>
              
              <div className="pt-2 max-h-40 overflow-y-auto space-y-1 text-center">
                 {evenements[modalChoiceOpen]?.map(e => (
                   <button key={e.id} onClick={() => { const nx = {...evenements}; nx[modalChoiceOpen] = nx[modalChoiceOpen].filter(x => x.id !== e.id); if(!nx[modalChoiceOpen].length) delete nx[modalChoiceOpen]; setEvenements(nx); setModalChoiceOpen(null); }} className="w-full bg-red-50 text-red-700 text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-2 border border-red-100 uppercase font-bold tracking-tighter shadow-sm"><Trash2 size={12}/> Supprimer {e.titre}</button>
                 ))}
                 {(congesParDate[modalChoiceOpen] || []).map(a => (
                   <div key={a.id} className="flex gap-1">
                      <button onClick={() => { setConges(conges.filter(x => x.id !== a.id)); setModalChoiceOpen(null); }} className="flex-1 bg-orange-50 text-orange-800 text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-1 border border-orange-100 uppercase font-bold tracking-tighter"><Trash2 size={12}/> {membresBase?.find(u=>u.id===a.userId)?.nom} - {a.category}</button>
                      {a.groupId && <button onClick={() => { if(window.confirm("Supprimer toute la période ?")){ setConges(conges.filter(x=>x.groupId!==a.groupId)); setModalChoiceOpen(null); } }} className="bg-red-700 text-white text-[9px] px-2 rounded-lg font-black uppercase shadow-sm">Période</button>}
                   </div>
                 ))}
              </div>
              <button onClick={() => setModalChoiceOpen(null)} className="w-full py-2 text-gray-400 font-black uppercase text-[10px]">Fermer</button>
            </div>
          </div>
        )}

        {/* MODAL STAFF */}
        {modalStaffOpen && (
          <div className="fixed inset-0 bg-[#1B2A49]/95 backdrop-blur-sm flex items-center justify-center z-[110] p-4 print:hidden text-[#1B2A49]">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border-b-8 border-[#8DC63F]">
              <div className="bg-[#1B2A49] p-5 text-white flex justify-between items-center font-black">
                <h3 className="uppercase tracking-widest flex items-center gap-2 text-lg font-bold">Paramètres Personnel</h3>
                <X className="cursor-pointer" onClick={() => setModalStaffOpen(false)}/>
              </div>
              <div className="flex flex-col md:flex-row max-h-[80vh] overflow-y-auto">
                 <div className="p-8 md:w-1/2 bg-gray-50 border-r border-gray-100">
                    <form onSubmit={handleSaveStaff} className="space-y-4 text-[#1B2A49]">
                       <input type="text" className="w-full border-2 p-3 rounded-2xl font-bold outline-none" value={staffForm.nom} onChange={e => setStaffForm({...staffForm, nom: e.target.value})} required placeholder="Nom"/>
                       <select className="w-full border-2 p-3 rounded-2xl bg-white font-black" value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})}>
                          {rolesDisponibles.map(r => <option key={r} value={r}>{r}</option>)}
                       </select>
                       <button type="submit" className="w-full bg-[#8DC63F] text-[#1B2A49] font-black py-4 rounded-2xl shadow-xl uppercase">Valider</button>
                    </form>
                 </div>
                 <div className="p-8 md:w-1/2 overflow-y-auto">
                    <div className="space-y-2">
                       {membresBase?.map(m => (
                         <div key={m.id} className="flex justify-between items-center p-3 border-2 border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">
                            <span className="text-sm font-black text-[#1B2A49]">{m.nom}</span>
                            <div className="flex gap-1">
                               <button onClick={() => setStaffForm(m)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={14}/></button>
                               <button onClick={() => { if(window.confirm(`Supprimer ${m.nom} ?`)) setMembresBase(membresBase.filter(x => x.id !== m.id)); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL ÉVÉNEMENT */}
        {modalEvtOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-[#1B2A49]">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border-4 border-[#8B5A2B]">
              <div className="p-4 bg-[#8B5A2B] text-white flex justify-between items-center font-black uppercase">
                <span>ÉVÉNEMENT CLUB</span>
                <X className="cursor-pointer" onClick={() => setModalEvtOpen(false)}/>
              </div>
              <form onSubmit={handleSaveEvt} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="border-2 p-3 rounded-2xl font-bold text-sm" value={evtForm.dateDebut} onChange={e => setEvtForm({...evtForm, dateDebut: e.target.value})} required/>
                  <input type="date" className="border-2 p-3 rounded-2xl font-bold text-sm" value={evtForm.dateFin} onChange={e => setEvtForm({...evtForm, dateFin: e.target.value})}/>
                </div>
                <input type="text" className="w-full border-2 p-3 rounded-2xl font-black uppercase" placeholder="Titre" value={evtForm.titre} onChange={e => setEvtForm({...evtForm, titre: e.target.value})} required/>
                <select className="w-full border-2 p-3 rounded-2xl bg-gray-50 font-black text-sm" value={evtForm.type} onChange={e => setEvtForm({...evtForm, type: e.target.value})}>
                  <option value="concours_oui">🏇 Concours Club</option>
                  <option value="vacances_ge">🏖️ Vacances GE</option>
                  <option value="jour_ferie">🎉 Jour Férié</option>
                </select>
                <button type="submit" className="w-full bg-[#8B5A2B] text-white py-4 rounded-xl font-black shadow-xl uppercase">Ajouter</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}