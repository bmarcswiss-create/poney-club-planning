// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, MapPin, Award, Trash2, X, Plus, AlertCircle, Users, Tent, ChevronLeft, ChevronRight, Settings, Edit, Flag, StickyNote, Printer, FilterX, Lock, Unlock, Save } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- CONNEXION SUPABASE ---
const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'sb_publishable_azT_rAkqeE-zsnvolYSY9w_7MtlnBVI';
const supabase = createClient(supabaseUrl, supabaseKey);

const PIN_DIRECTION = "1234";

// --- RESTAURATION ÉQUIPE ---
const equipePCP = [
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

// --- RESTAURATION VACANCES ET FÉRIÉS GE 2026 ---
const initialEvts = {
  '2026-01-01': [{ id: 'jf1', type: 'jour_ferie', titre: 'Nouvel An' }],
  '2026-02-16': [{ id: 'vge1', type: 'vacances_ge', titre: 'Relâches GE' }],
  '2026-02-17': [{ id: 'vge2', type: 'vacances_ge', titre: 'Relâches GE' }],
  '2026-02-18': [{ id: 'vge3', type: 'vacances_ge', titre: 'Relâches GE' }],
  '2026-02-19': [{ id: 'vge4', type: 'vacances_ge', titre: 'Relâches GE' }],
  '2026-02-20': [{ id: 'vge5', type: 'vacances_ge', titre: 'Relâches GE' }],
  '2026-04-03': [{ id: 'jf2', type: 'jour_ferie', titre: 'Vendredi Saint' }],
  '2026-04-06': [{ id: 'jf3', type: 'jour_ferie', titre: 'Lundi de Pâques' }],
  '2026-04-07': [{ id: 'vge6', type: 'vacances_ge', titre: 'Vacances Pâques' }],
  '2026-04-08': [{ id: 'vge7', type: 'vacances_ge', titre: 'Vacances Pâques' }],
  '2026-04-09': [{ id: 'vge8', type: 'vacances_ge', titre: 'Vacances Pâques' }],
  '2026-04-10': [{ id: 'vge9', type: 'vacances_ge', titre: 'Vacances Pâques' }],
  '2026-05-14': [{ id: 'jf4', type: 'jour_ferie', titre: 'Ascension' }],
  '2026-05-25': [{ id: 'jf5', type: 'jour_ferie', titre: 'Lundi de Pentecôte' }],
  '2026-09-10': [{ id: 'jf6', type: 'jour_ferie', titre: 'Jeûne Genevois' }],
  '2026-12-25': [{ id: 'jf7', type: 'jour_ferie', titre: 'Noël' }],
  '2026-12-31': [{ id: 'jf8', type: 'jour_ferie', titre: 'Restauration' }],
};

const moisNoms = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const rolesDisponibles = ["Palefrenier", "Apprentie", "Stagiaire", "Monitrice", "Aide WE"];

export default function App() {
  const todayStr = new Date().toISOString().split('T')[0];

  // --- ÉTATS ---
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [anneeActuelle, setAnneeActuelle] = useState(2026);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [membresBase, setMembresBase] = useState(equipePCP);
  const [conges, setConges] = useState([]);
  const [evenements, setEvenements] = useState(initialEvts);
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

  // --- SYNC ---
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('app_state').select('*');
      if (data && data.length > 0) {
        const map = {};
        data.forEach(r => map[r.id] = r.data);
        if (map.poney_equipe) setMembresBase(map.poney_equipe);
        if (map.poney_conges) setConges(map.poney_conges);
        if (map.poney_notes) setNotes(map.poney_notes);
        if (map.poney_annee) setAnneeActuelle(Number(map.poney_annee));
        if (map.poney_evenements) setEvenements({...initialEvts, ...map.poney_evenements});
      }
      setIsLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      supabase.from('app_state').upsert([
        { id: 'poney_equipe', data: membresBase },
        { id: 'poney_conges', data: conges },
        { id: 'poney_evenements', data: evenements },
        { id: 'poney_notes', data: notes },
        { id: 'poney_annee', data: anneeActuelle.toString() }
      ]).then();
    }
  }, [membresBase, conges, evenements, notes, anneeActuelle, isLoaded]);

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
    (conges || []).forEach(c => { if (c?.date) { if (!map[c.date]) map[c.date] = []; map[c.date].push(c); } });
    return map;
  }, [conges]);

  // --- HANDLERS ---
  const handleAuth = () => {
    if (isAdmin) { setIsAdmin(false); return; }
    const p = window.prompt("Entrez le Code PIN Direction :");
    if (p === PIN_DIRECTION) setIsAdmin(true);
    else alert("Code incorrect");
  };

  const handleSaveStaff = (e) => {
    e.preventDefault();
    const updated = staffForm.id ? membresBase.map(m => m.id === staffForm.id ? { ...staffForm } : m) : [...membresBase, { ...staffForm, id: Date.now() }];
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

  const calendrierRender = useMemo(() => {
    return moisNoms.map((mois, index) => {
      const d = new Date(anneeActuelle, index, 1);
      const jours = [];
      let start = d.getDay() === 0 ? 6 : d.getDay() - 1;
      for (let i = 0; i < start; i++) jours.push(null);
      while (d.getMonth() === index) { jours.push(new Date(d)); d.setDate(d.getDate() + 1); }

      return (
        <div key={mois} className="bg-white rounded-xl shadow border border-[#D0D7E1] overflow-hidden break-inside-avoid print:shadow-none">
          <div className="bg-[#EBF2E1] py-1.5 text-center font-bold text-[#1B2A49] text-xs print:bg-gray-100 uppercase tracking-tighter">{mois}</div>
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

              return (
                <div key={dStr} onClick={() => { setSelectedDate(dStr); setModalChoiceOpen(dStr); }}
                  className={`h-8 rounded flex items-center justify-center relative cursor-pointer overflow-hidden transition-all 
                  ${isAlerte ? 'bg-red-500 text-white font-bold' : isToday ? 'bg-amber-100 ring-2 ring-amber-500 z-10' : (isPast && !hasConge && evts.length === 0 ? 'bg-[#E2E8F0] opacity-50' : 'bg-[#F4F6F9]')} print:border print:border-gray-100`}>
                  {hasConge && !isAlerte && (
                    <div className="absolute inset-0 flex flex-col">
                      {[0, 1].map(h => {
                         const match = filteredAbs.filter(a => (h === 0 ? (a.periode === 'matin' || a.periode === 'jour') : (a.periode === 'apres-midi' || a.periode === 'jour')));
                         if (match.length === 0) return <div key={h} className="h-1/2"></div>;
                         const a = match[0];
                         let bg = a.category === 'deplacement' ? "bg-cyan-600" : (a.statut === 'valide' ? "bg-[#1B2A49]" : "bg-transparent");
                         return <div key={h} className={`h-1/2 w-full relative ${bg}`}>
                           {a.statut === 'provisoire' && a.category !== 'deplacement' && <div className="absolute inset-0" style={{background: 'repeating-linear-gradient(45deg, #1B2A49, #1B2A49 2px, #22c55e 2px, #22c55e 4px)', opacity: 0.9}}></div>}
                         </div>;
                      })}
                    </div>
                  )}
                  {evts.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col z-[30]">
                      {evts.map((e, i) => {
                         let c = "bg-[#8B5A2B]"; if (e.type === 'vacances_ge') c = "bg-blue-500"; if (e.type === 'jour_ferie') c = "bg-purple-600";
                         return <div key={i} className={`h-[1.5px] w-full ${c} border-t border-black/10`}></div>;
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

  if (!isLoaded) return <div className="h-screen flex items-center justify-center bg-[#F0F4F8] font-bold text-[#1B2A49]">Lancement PCP... 🐴</div>;

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
          .side-mobile { width: 100% !important; border-right: none; }
        }
      `}</style>

      <div className="flex h-screen flex-mobile overflow-hidden print:block print:h-auto">
        
        <aside className="w-80 side-mobile bg-[#1B2A49] flex flex-col print:hidden shrink-0 shadow-xl relative z-50 text-white font-sans">
          <div className="p-6 bg-[#141D36] flex flex-col items-center border-b-4 border-[#8DC63F]">
            <img src="/logo.png" alt="Logo" className="w-20 h-20 mb-3 bg-white rounded-full p-1 shadow-lg" />
            <div className="flex items-center gap-2 mb-1">
               <h2 className="text-[10px] font-extrabold uppercase bg-[#8DC63F] text-[#1B2A49] px-2 py-1 rounded">Organisation des équipes écuries</h2>
               <button onClick={handleAuth} className={`p-1.5 rounded-md ${isAdmin ? 'bg-green-500' : 'bg-red-500'}`}>
                  {isAdmin ? <Unlock size={14}/> : <Lock size={14}/>}
               </button>
            </div>
            <h1 className="text-lg font-bold uppercase tracking-tighter">Poney Club Presinge</h1>
          </div>

          <div className="p-4 bg-[#141D36]/50 space-y-3 shrink-0">
             {isAdmin ? (
               <>
                 <button onClick={() => setModalStaffOpen(true)} className="w-full bg-[#1B2A49] text-[#8DC63F] border border-[#8DC63F]/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-[#2A3C5E] transition-all"><Settings size={14}/> Configuration Équipe</button>
                 <button onClick={() => ouvrirModalConge()} className="w-full bg-[#8DC63F] text-[#1B2A49] font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-all uppercase tracking-widest"><Plus size={20}/> Saisir Absence</button>
               </>
             ) : (
               <p className="text-[10px] text-center italic opacity-50 uppercase tracking-widest py-2">Mode Consultation Seul</p>
             )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             <button onClick={() => setFiltreEmploye(null)} className={`w-full text-left p-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filtreEmploye === null ? 'bg-[#8DC63F] text-[#1B2A49]' : 'text-white/30'}`}>
                <div className="flex items-center gap-2"><FilterX size={14}/> Voir toute l'équipe</div>
             </button>
             {rolesDisponibles.map(role => {
               const mm = equipeCalculee.filter(m => m.role === role);
               if (!mm.length) return null;
               return (
                 <div key={role}>
                   <h4 className="text-[9px] text-white/30 uppercase font-bold mb-2 border-b border-white/5">{role}s</h4>
                   {mm.map(m => (
                     <div key={m.id} onClick={() => setFiltreEmploye(filtreEmploye === m.id ? null : m.id)}
                       className={`p-2 rounded-lg mb-1 border cursor-pointer flex justify-between items-center transition-all ${filtreEmploye === m.id ? 'bg-[#8DC63F] text-[#1B2A49] font-bold' : 'bg-[#213459] text-white/80 border-transparent hover:bg-[#2A406D]'}`}>
                       <div className="flex flex-col"><span className="text-sm">{m.nom}</span>{m.repos && <span className="text-[9px] opacity-50 font-normal">Off: {m.repos}</span>}</div>
                       {m.total > 0 && <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${m.pris >= m.total ? 'bg-red-500 text-white' : 'bg-[#141D36] text-[#8DC63F]'}`}>{m.pris}/{m.total}j</span>}
                     </div>
                   ))}
                 </div>
               );
             })}
          </div>
        </aside>

        <main className="flex-1 flex flex-col print:block">
          <header className="h-32 bg-white border-b flex items-center justify-between px-6 print:hidden shrink-0">
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => setAnneeActuelle(a => a-1)} className="p-2 hover:bg-gray-100 rounded-lg border shadow-sm"><ChevronLeft/></button>
              <h2 className="text-3xl font-black">{anneeActuelle}</h2>
              <button onClick={() => setAnneeActuelle(a => a+1)} className="p-2 hover:bg-gray-100 rounded-lg border shadow-sm"><ChevronRight/></button>
            </div>
            
            <div className={`flex-1 mx-8 h-24 rounded-2xl border-2 flex flex-col justify-center items-center transition-all shadow-sm ${congesParDate[selectedDate]?.filter(c => palefrenierIds.has(c.userId)).length > 2 ? 'bg-red-600 text-white border-red-700' : 'bg-white border-[#D0D7E1]'}`}>
              <h3 className="text-2xl font-black uppercase text-center w-full leading-none mb-1">
                {new Date(selectedDate).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}
              </h3>
              <div className="flex flex-wrap justify-center gap-3">
                 {(evenements[selectedDate] || []).map(e => <span key={e.id} className="text-[11px] font-black bg-black/10 px-2 rounded">🚩 {e.titre}</span>)}
                 {(congesParDate[selectedDate] || []).map(c => (
                   <span key={c.id} className={`text-[11px] font-bold px-2 rounded shadow-sm ${c.statut === 'provisoire' ? 'bg-yellow-400 text-black border border-black/20' : 'bg-[#1B2A49] text-white'}`}>{membresBase.find(u=>u.id===c.userId)?.nom}</span>
                 ))}
                 {notes[selectedDate] ? (
                   <button onClick={() => isAdmin ? setModalNoteOpen(true) : alert("Accès Direction requis")} className="bg-yellow-400 text-[#1B2A49] text-[11px] px-3 py-1 rounded-lg border-2 border-yellow-500 font-black flex items-center gap-2 shadow-md italic">
                     <StickyNote size={14}/> {notes[selectedDate]}
                   </button>
                 ) : (
                   isAdmin && <button onClick={() => setModalNoteOpen(true)} className="text-[10px] font-bold text-[#1B2A49]/40 hover:text-[#1B2A49] underline">+ Ajouter Note</button>
                 )}
              </div>
            </div>

            <button onClick={() => window.print()} className="p-4 bg-[#1B2A49] text-[#8DC63F] rounded-2xl shadow-xl hover:scale-105 transition-transform"><Printer size={28}/></button>
          </header>

          <div className="bg-white px-8 py-2.5 flex justify-center gap-8 border-b text-[10px] font-black uppercase tracking-wider print:hidden shadow-inner">
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-[#1B2A49] rounded-sm shadow-sm"></div> Validé</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 bg-cyan-600 rounded-sm shadow-sm"></div> Déplacement</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 border border-black" style={{background: 'repeating-linear-gradient(45deg, #1B2A49, #1B2A49 2px, #22c55e 2px, #22c55e 4px)'}}></div> Provisoire</div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-1.5 bg-[#8B5A2B] rounded-full shadow-sm"></div> Concours</div>
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
                <select className="w-full border-2 border-[#D0D7E1] p-3 rounded-2xl font-black bg-gray-50 outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="conge">🏝️ Congé (DÉCOMPTÉ)</option>
                  <option value="deplacement">✈️ Déplacement (MAINTIEN SOLDE)</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="border-2 p-3 rounded-2xl font-bold" value={formData.dateDebut} onChange={e => setFormData({...formData, dateDebut: e.target.value})} required/>
                  <input type="date" className="border-2 p-3 rounded-2xl font-bold" value={formData.dateFin} onChange={e => setFormData({...formData, dateFin: e.target.value})}/>
                </div>
                <select className="w-full border-2 p-3 rounded-2xl font-black" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})} required>
                  {membresBase.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
                {formData.category === 'conge' && (
                  <div className="flex gap-4 p-3 bg-gray-100 rounded-2xl justify-around border-2 border-dashed border-[#D0D7E1]">
                    <label className="flex items-center gap-2 cursor-pointer font-bold"><input type="radio" checked={formData.statut === 'provisoire'} onChange={() => setFormData({...formData, statut:'provisoire'})}/> PROVISOIRE</label>
                    <label className="flex items-center gap-2 cursor-pointer font-black text-green-700"><input type="radio" checked={formData.statut === 'valide'} onChange={() => setFormData({...formData, statut:'valide'})}/> VALIDÉ</label>
                  </div>
                )}
                <button type="submit" className="w-full bg-[#1B2A49] text-white py-4 rounded-xl font-black text-lg shadow-xl uppercase">Enregistrer</button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL NOTE */}
        {modalNoteOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 text-[#1B2A49]">
             <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border-4 border-yellow-400 shadow-2xl">
                <div className="p-4 bg-yellow-400 text-black font-black flex justify-between uppercase italic">
                   <span>Post-it du jour</span>
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

        {/* MODAL CHOICE */}
        {modalChoiceOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-end md:items-center justify-center z-[110] p-4 print:hidden text-[#1B2A49]">
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-sm p-6 space-y-4 border-t-8 border-[#8DC63F] shadow-2xl relative">
              <h4 className="text-center font-black border-b pb-3 uppercase text-lg">{new Date(modalChoiceOpen).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}</h4>
              <button onClick={() => isAdmin ? ouvrirModalConge(modalChoiceOpen) : alert("Accès Direction requis")} className="w-full py-4 bg-[#8DC63F] text-[#1B2A49] font-black rounded-2xl flex items-center justify-center gap-2 shadow-md hover:scale-105 transition-transform uppercase">Absence / Déplacement</button>
              <button onClick={() => isAdmin ? (setEvtForm({dateDebut: modalChoiceOpen, dateFin: modalChoiceOpen, titre: '', type: 'concours_oui'}), setModalEvtOpen(true), setModalChoiceOpen(null)) : alert("Accès Direction requis")} className="w-full py-4 bg-[#1B2A49] text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-md hover:scale-105 transition-transform uppercase border-2 border-[#8DC63F]">Événement Club</button>
              
              <div className="pt-2 max-h-40 overflow-y-auto space-y-1 text-center">
                 {evenements[modalChoiceOpen]?.map(e => (
                   <button key={e.id} onClick={() => isAdmin ? (()=>{const nx={...evenements}; nx[modalChoiceOpen]=nx[modalChoiceOpen].filter(x=>x.id!==e.id); if(!nx[modalChoiceOpen].length) delete nx[modalChoiceOpen]; setEvenements(nx); setModalChoiceOpen(null);})() : alert("Accès requis")} className="w-full bg-red-50 text-red-700 text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-2 border border-red-100 uppercase font-bold tracking-tighter shadow-sm"><Trash2 size={12}/> Supprimer {e.titre}</button>
                 ))}
                 {(congesParDate[modalChoiceOpen] || []).map(a => (
                   <div key={a.id} className="flex gap-1 text-[#1B2A49]">
                      <button onClick={() => isAdmin ? (setConges(conges.filter(x => x.id !== a.id)), setModalChoiceOpen(null)) : alert("Accès requis")} className="flex-1 bg-orange-50 text-orange-800 text-[10px] py-1.5 rounded-lg flex items-center justify-center gap-1 border border-orange-100 uppercase font-bold tracking-tighter"><Trash2 size={12}/> {membresBase?.find(u=>u.id===a.userId)?.nom} - {a.category}</button>
                      {a.statut === 'provisoire' && <button onClick={() => isAdmin ? (setConges(conges.map(x=>x.id===a.id?{...x, statut:'valide'}:x)), setModalChoiceOpen(null)) : alert("Accès requis")} className="bg-green-600 text-white text-[9px] px-2 rounded-lg font-black uppercase">Valider</button>}
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
                <h3 className="uppercase tracking-widest flex items-center gap-2 font-bold text-lg">Paramètres Personnel</h3>
                <X className="cursor-pointer" onClick={() => setModalStaffOpen(false)}/>
              </div>
              <div className="flex flex-col md:flex-row max-h-[80vh] overflow-y-auto text-[#1B2A49]">
                 <div className="p-8 md:w-1/2 bg-gray-50 border-r border-gray-100">
                    <form onSubmit={handleSaveStaff} className="space-y-4">
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
              <div className="p-4 bg-[#8B5A2B] text-white flex justify-between items-center font-black uppercase tracking-widest text-sm">
                <span>ÉVÉNEMENT CLUB</span>
                <X className="cursor-pointer" onClick={() => setModalEvtOpen(false)}/>
              </div>
              <form onSubmit={handleSaveEvt} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-[#1B2A49]">
                  <input type="date" className="border-2 p-3 rounded-2xl font-bold text-sm" value={evtForm.dateDebut} onChange={e => setEvtForm({...evtForm, dateDebut: e.target.value})} required/>
                  <input type="date" className="border-2 p-3 rounded-2xl font-bold text-sm" value={evtForm.dateFin} onChange={e => setEvtForm({...evtForm, dateFin: e.target.value})}/>
                </div>
                <input type="text" className="w-full border-2 p-3 rounded-2xl font-black uppercase text-[#1B2A49]" placeholder="Titre" value={evtForm.titre} onChange={e => setEvtForm({...evtForm, titre: e.target.value})} required/>
                <select className="w-full border-2 p-3 rounded-2xl bg-gray-50 font-black text-sm text-[#1B2A49]" value={evtForm.type} onChange={e => setEvtForm({...evtForm, type: e.target.value})}>
                  <option value="concours_oui">🏇 Concours Club</option>
                  <option value="vacances_ge">🏖️ Vacances GE</option>
                  <option value="jour_ferie">🎉 Jour Férié</option>
                </select>
                <button type="submit" className="w-full bg-[#8B5A2B] text-white py-4 rounded-xl font-black shadow-xl uppercase tracking-tighter">Ajouter</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}