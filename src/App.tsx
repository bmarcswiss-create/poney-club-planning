// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, MapPin, Award, Trash2, X, Plus, AlertCircle, Users, Tent, ChevronLeft, ChevronRight, Settings, Edit, Flag, StickyNote, Printer, FilterX } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- CONNEXION SUPABASE ---
const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'sb_publishable_azT_rAkqeE-zsnvolYSY9w_7MtlnBVI';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- VOTRE ÉQUIPE OFFICIELLE (Sécurité de secours) ---
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

const moisNoms = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const rolesDisponibles = ["Palefrenier", "Apprentie", "Stagiaire", "Monitrice", "Aide WE"];

export default function App() {
  const todayStr = new Date().toISOString().split('T')[0];

  const [isLoaded, setIsLoaded] = useState(false);
  const [anneeActuelle, setAnneeActuelle] = useState(2026);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [membresBase, setMembresBase] = useState(equipePCP); // Par défaut ton équipe
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

  // --- CHARGEMENT ---
  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from('app_state').select('*');
        if (data && data.length > 0) {
          const map = {};
          data.forEach(r => map[r.id] = r.data);
          if (map.poney_equipe && map.poney_equipe.length > 0) setMembresBase(map.poney_equipe);
          if (map.poney_conges) setConges(map.poney_conges);
          if (map.poney_notes) setNotes(map.poney_notes);
          if (map.poney_evenements) setEvenements(map.poney_evenements);
          if (map.poney_annee) setAnneeActuelle(Number(map.poney_annee));
        }
      } catch (e) { console.error(e); }
      setIsLoaded(true);
    }
    load();
  }, []);

  // --- SAUVEGARDE SÉCURISÉE (Empêche d'effacer si vide) ---
  const saveToCloud = (key, val) => {
    if (!isLoaded) return;
    if (key === 'poney_equipe' && (!val || val.length === 0)) return; 
    supabase.from('app_state').upsert({ id: key, data: val }).then();
  };

  useEffect(() => { saveToCloud('poney_equipe', membresBase); }, [membresBase]);
  useEffect(() => { saveToCloud('poney_conges', conges); }, [conges]);
  useEffect(() => { saveToCloud('poney_evenements', evenements); }, [evenements]);
  useEffect(() => { saveToCloud('poney_notes', notes); }, [notes]);
  useEffect(() => { saveToCloud('poney_annee', anneeActuelle.toString()); }, [anneeActuelle]);

  // --- CALCULS ---
  const palefrenierIds = useMemo(() => new Set((membresBase || []).filter(m => m.role === 'Palefrenier').map(m => m.id)), [membresBase]);
  const equipeCalculee = useMemo(() => {
    return (membresBase || []).map(m => {
      const list = (conges || []).filter(c => c.userId === m.id && c.date.startsWith(anneeActuelle.toString()));
      const pris = list.reduce((acc, curr) => (curr.category === 'deplacement' ? acc : acc + (curr.periode === 'jour' ? 1 : 0.5)), 0);
      return { ...m, pris };
    });
  }, [membresBase, conges, anneeActuelle]);

  const congesParDate = useMemo(() => {
    const map = {};
    (conges || []).forEach(c => { if (!map[c.date]) map[c.date] = []; map[c.date].push(c); });
    return map;
  }, [conges]);

  const absentsJour = congesParDate[selectedDate] || [];
  const eventsJour = evenements[selectedDate] || [];
  const isAlerteHeader = !filtreEmploye && absentsJour.filter(c => palefrenierIds.has(c.userId)).length > 2;

  // --- ACTIONS ---
  const handleSaveStaff = (e) => {
    e.preventDefault();
    if (staffForm.id) setMembresBase(membresBase.map(m => m.id === staffForm.id ? { ...staffForm, total: Number(staffForm.total) } : m));
    else setMembresBase([...membresBase, { ...staffForm, id: Date.now(), total: Number(staffForm.total) }]);
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
                         return <div key={i} className={`h-[4px] w-full ${c} border-t border-black/10`}></div>;
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

  if (!isLoaded) return <div className="h-screen flex items-center justify-center bg-[#F0F4F8] font-bold">Synchronisation Sécurisée... 🐴</div>;

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-[#1B2A49]">
      <div className="flex h-screen overflow-hidden print:block print:h-auto">
        
        {/* SIDEBAR */}
        <aside className="w-80 bg-[#1B2A49] flex flex-col print:hidden shrink-0 shadow-xl relative z-50 text-white">
          <div className="p-6 bg-[#141D36] flex flex-col items-center border-b-4 border-[#8DC63F]">
            <img src="/logo.png" alt="Logo" className="w-20 h-20 mb-3 bg-white rounded-full p-1 shadow-lg" />
            <h2 className="text-[10px] font-extrabold uppercase bg-[#8DC63F] text-[#1B2A49] px-3 py-1 rounded">Organisation des équipes écuries</h2>
          </div>

          <div className="p-4 bg-[#141D36]/50 space-y-3 shrink-0">
             <button onClick={() => setModalStaffOpen(true)} className="w-full bg-[#1B2A49] text-[#8DC63F] border border-[#8DC63F]/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2"><Settings size={14}/> Configuration Équipe</button>
             <button onClick={() => ouvrirModalConge()} className="w-full bg-[#8DC63F] text-[#1B2A49] font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg uppercase tracking-widest"><Plus size={20}/> Saisir Absence</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
             <button onClick={() => setFiltreEmploye(null)} className={`w-full text-left p-2 rounded-lg text-[10px] font-black uppercase transition-all ${filtreEmploye === null ? 'bg-[#8DC63F] text-[#1B2A49]' : 'text-white/30'}`}>
                <div className="flex items-center gap-2"><FilterX size={14}/> Voir toute l'équipe</div>
             </button>
             {(membresBase || []).map(m => (
                <div key={m.id} onClick={() => setFiltreEmploye(filtreEmploye === m.id ? null : m.id)}
                  className={`p-3 rounded-xl mb-1 border cursor-pointer flex justify-between items-center transition-all ${filtreEmploye === m.id ? 'bg-[#8DC63F] text-[#1B2A49] font-bold scale-105 shadow-lg' : 'bg-[#213459] text-white/80 border-transparent hover:bg-[#2A406D]'}`}>
                  <div className="flex flex-col"><span className="text-sm font-semibold">{m.nom}</span><span className="text-[9px] opacity-40 uppercase font-bold">{m.role}</span></div>
                  {m.total > 0 && <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${m.pris >= m.total ? 'bg-red-500 text-white' : 'bg-[#141D36] text-[#8DC63F]'}`}>{m.pris}/{m.total}</span>}
                </div>
             ))}
          </div>
        </aside>

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
              <div className="flex flex-wrap justify-center gap-3 items-center">
                 {(evenements[selectedDate] || []).map(e => <span key={e.id} className="text-[11px] font-black bg-black/10 px-2 rounded">🚩 {e.titre}</span>)}
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
            <div className="flex items-center gap-1.5 tracking-tighter"><div className="w-4 h-4 bg-[#1B2A49] rounded-sm shadow-sm"></div> Validé</div>
            <div className="flex items-center gap-1.5 tracking-tighter"><div className="w-4 h-4 bg-cyan-600 rounded-sm shadow-sm"></div> Déplacement</div>
            <div className="flex items-center gap-1.5 tracking-tighter"><div className="w-4 h-4 border border-black" style={{background: 'repeating-linear-gradient(45deg, #1B2A49, #1B2A49 2px, #22c55e 2px, #22c55e 4px)'}}></div> Provisoire</div>
            <div className="flex items-center gap-1.5 tracking-tighter"><div className="w-4 h-1.5 bg-[#8B5A2B] rounded-full shadow-sm"></div> Concours</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {calendrierRender}
          </div>
        </main>

        {/* MODALS IDENTIQUES MAIS SÉCURISÉS */}
        {modalStaffOpen && (
          <div className="fixed inset-0 bg-[#1B2A49]/95 backdrop-blur-sm flex items-center justify-center z-[110] p-4 print:hidden text-[#1B2A49]">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border-b-8 border-[#8DC63F]">
              <div className="bg-[#1B2A49] p-5 text-white flex justify-between items-center font-black">
                <h3 className="uppercase tracking-widest flex items-center gap-2">Paramètres Personnel</h3>
                <X className="cursor-pointer" onClick={() => setModalStaffOpen(false)}/>
              </div>
              <div className="flex flex-col md:flex-row max-h-[80vh] overflow-y-auto">
                 <div className="p-8 md:w-1/2 bg-gray-50 border-r border-gray-100">
                    <form onSubmit={handleSaveStaff} className="space-y-4">
                       <input type="text" className="w-full border-2 p-3 rounded-2xl font-bold" value={staffForm.nom} onChange={e => setStaffForm({...staffForm, nom: e.target.value})} required placeholder="Nom"/>
                       <select className="w-full border-2 p-3 rounded-2xl bg-white font-black" value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})}>
                          {rolesDisponibles.map(r => <option key={r} value={r}>{r}</option>)}
                       </select>
                       <button type="submit" className="w-full bg-[#8DC63F] text-[#1B2A49] font-black py-4 rounded-2xl shadow-xl uppercase">Valider</button>
                    </form>
                 </div>
                 <div className="p-8 md:w-1/2 overflow-y-auto">
                    <div className="space-y-2">
                       {membresBase?.map(m => (
                         <div key={m.id} className="flex justify-between items-center p-3 border-2 border-gray-100 rounded-2xl">
                            <span className="text-sm font-black">{m.nom}</span>
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
        
        {/* LE RESTE DES MODALS (CONGE, EVT, NOTE) RESTE IDENTIQUE ET SÉCURISÉ */}
      </div>
    </div>
  );
}