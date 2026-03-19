// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, MapPin, Award, Trash2, X, Plus, AlertCircle, Users, Tent, ChevronLeft, ChevronRight, Settings, Edit, Flag, StickyNote, Printer, Briefcase } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION SUPABASE ---
const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'sb_publishable_azT_rAkqeE-zsnvolYSY9w_7MtlnBVI';
const supabase = createClient(supabaseUrl, supabaseKey);

const defaultEquipe = [
  { id: 1, nom: "Marc", role: "Palefrenier", total: 25, repos: "Lundi, Mardi" },
  { id: 2, nom: "Sophie", role: "Palefrenier", total: 25, repos: "Mercredi" },
  { id: 3, nom: "Chloé", role: "Apprentie", total: 25, repos: "Dimanche" },
  { id: 4, nom: "Julie", role: "Monitrice", total: 0, repos: "" },
];

const moisNoms = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const rolesDisponibles = ["Palefrenier", "Apprentie", "Stagiaire", "Monitrice", "Aide WE", "Aide ponctuel"];

export default function App() {
  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  const [isLoaded, setIsLoaded] = useState(false);
  const [anneeActuelle, setAnneeActuelle] = useState(2026);
  const [dateDuJour, setDateDuJour] = useState("");
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

  useEffect(() => {
    async function chargerDonnees() {
      const { data, error } = await supabase.from('app_state').select('*');
      if (data && !error) {
        const stateMap = {};
        data.forEach(row => { stateMap[row.id] = row.data; });
        if (stateMap['poney_equipe']) setMembresBase(stateMap['poney_equipe']);
        if (stateMap['poney_conges']) setConges(stateMap['poney_conges']);
        if (stateMap['poney_notes']) setNotes(stateMap['poney_notes']);
        if (stateMap['poney_annee']) setAnneeActuelle(Number(stateMap['poney_annee']));
        if (stateMap['poney_evenements']) {
          const evtsData = stateMap['poney_evenements'];
          const formattedEvts = {};
          Object.keys(evtsData).forEach(date => {
            formattedEvts[date] = Array.isArray(evtsData[date]) ? evtsData[date] : [evtsData[date]];
          });
          setEvenements(formattedEvts);
        }
      }
      setIsLoaded(true);
    }
    chargerDonnees();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setDateDuJour(new Date().toLocaleDateString('fr-CH', options));
  }, []);

  useEffect(() => { if (isLoaded) supabase.from('app_state').upsert({ id: 'poney_equipe', data: membresBase }).then(); }, [membresBase, isLoaded]);
  useEffect(() => { if (isLoaded) supabase.from('app_state').upsert({ id: 'poney_conges', data: conges }).then(); }, [conges, isLoaded]);
  useEffect(() => { if (isLoaded) supabase.from('app_state').upsert({ id: 'poney_evenements', data: evenements }).then(); }, [evenements, isLoaded]);
  useEffect(() => { if (isLoaded) supabase.from('app_state').upsert({ id: 'poney_notes', data: notes }).then(); }, [notes, isLoaded]);
  useEffect(() => { if (isLoaded) supabase.from('app_state').upsert({ id: 'poney_annee', data: anneeActuelle.toString() }).then(); }, [anneeActuelle, isLoaded]);

  const palefrenierIds = useMemo(() => new Set(membresBase.filter(m => m.role === 'Palefrenier').map(m => m.id)), [membresBase]);

  const equipeCalculee = useMemo(() => {
    return membresBase.map(membre => {
      const sesAbsences = conges.filter(c => c.userId === membre.id && c.date.startsWith(anneeActuelle.toString()));
      // LOGIQUE METIER : Seuls les 'conge' décomptent du solde
      const joursPris = sesAbsences.reduce((total, entry) => {
        if (entry.category === 'deplacement') return total; 
        return total + (entry.periode === 'jour' ? 1 : 0.5);
      }, 0);
      return { ...membre, pris: joursPris };
    });
  }, [membresBase, conges, anneeActuelle]);

  const congesParDate = useMemo(() => {
    const map = {};
    conges.forEach(c => { if (!map[c.date]) map[c.date] = []; map[c.date].push(c); });
    return map;
  }, [conges]);

  const absentsDuJourSelectionne = congesParDate[selectedDate] || [];
  const palefreniersAbsentsSel = absentsDuJourSelectionne.filter(c => palefrenierIds.has(c.userId));
  const isAlertePalefrenierHeader = palefreniersAbsentsSel.length > 2;
  const evtsSelectionnes = evenements[selectedDate] || [];

  // --- HANDLERS ---
  const sauvegarderStaff = (e) => {
    e.preventDefault();
    if (staffForm.id) setMembresBase(membresBase.map(m => m.id === staffForm.id ? { ...staffForm, total: Number(staffForm.total) } : m));
    else setMembresBase([...membresBase, { ...staffForm, id: Date.now(), total: Number(staffForm.total) }]);
    setStaffForm({ id: null, nom: '', role: 'Palefrenier', total: 25, repos: '' });
  };

  const ouvrirModalConge = (dateStr = '', congeExistant = null) => {
    if (congeExistant) setFormData({ ...congeExistant, dateDebut: congeExistant.date, dateFin: congeExistant.date, category: congeExistant.category || 'conge' });
    else setFormData({ id: null, userId: membresBase[0]?.id || '', dateDebut: dateStr, dateFin: dateStr, periode: 'jour', statut: 'provisoire', category: 'conge' });
    setModalCongeOpen(true);
  };

  const sauvegarderConge = (e) => {
    e.preventDefault();
    if (formData.id) {
      setConges(conges.map(c => c.id === formData.id ? { ...formData, userId: Number(formData.userId), date: formData.dateDebut } : c));
    } else {
      const nouveauxConges = [];
      let dateCourante = new Date(formData.dateDebut);
      const dateFinObj = new Date(formData.dateFin || formData.dateDebut);
      while (dateCourante <= dateFinObj) {
        const dateStr = `${dateCourante.getFullYear()}-${String(dateCourante.getMonth() + 1).padStart(2, '0')}-${String(dateCourante.getDate()).padStart(2, '0')}`;
        nouveauxConges.push({ id: Date.now() + Math.random(), userId: Number(formData.userId), date: dateStr, periode: formData.dateDebut !== formData.dateFin ? 'jour' : formData.periode, statut: formData.statut, category: formData.category });
        dateCourante.setDate(dateCourante.getDate() + 1);
      }
      setConges([...conges, ...nouveauxConges]);
    }
    setModalCongeOpen(false);
  };

  const supprimerConge = () => {
    if (window.confirm("Supprimer cette entrée ?")) {
      setConges(conges.filter(c => c.id !== formData.id));
      setModalCongeOpen(false);
    }
  };

  const sauvegarderEvenement = (e) => {
    e.preventDefault();
    const nouveauxEvts = { ...evenements };
    let dateCourante = new Date(evtForm.dateDebut);
    const dateFinObj = new Date(evtForm.dateFin || evtForm.dateDebut);
    while (dateCourante <= dateFinObj) {
      const dateStr = `${dateCourante.getFullYear()}-${String(dateCourante.getMonth() + 1).padStart(2, '0')}-${String(dateCourante.getDate()).padStart(2, '0')}`;
      const evtToAdd = { id: Date.now().toString() + Math.random(), type: evtForm.type, titre: evtForm.titre };
      nouveauxEvts[dateStr] = nouveauxEvts[dateStr] ? [...nouveauxEvts[dateStr], evtToAdd] : [evtToAdd];
      dateCourante.setDate(dateCourante.getDate() + 1);
    }
    setEvenements(nouveauxEvts);
    setModalEvtOpen(false);
  };

  const calendrierMemoise = useMemo(() => {
    return moisNoms.map((mois, index) => {
      const date = new Date(anneeActuelle, index, 1);
      const jours = [];
      let jourSemaine = date.getDay() === 0 ? 6 : date.getDay() - 1;
      for (let i = 0; i < jourSemaine; i++) jours.push(null);
      while (date.getMonth() === index) { jours.push(new Date(date)); date.setDate(date.getDate() + 1); }

      return (
        <div key={mois} className="bg-white rounded-xl shadow-sm border border-[#D0D7E1] overflow-hidden break-inside-avoid print:border-gray-300 print:shadow-none">
          <div className="bg-[#EBF2E1] py-2 text-center font-bold text-[#1B2A49] print:bg-gray-100 print:border-b print:border-gray-300">{mois}</div>
          <div className="p-2">
            <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-[#6B7A99] mb-1 print:text-black">
              <div>LU</div><div>MA</div><div>ME</div><div>JE</div><div>VE</div><div>SA</div><div>DI</div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {jours.map((jour, jIndex) => {
                if (!jour) return <div key={`empty-${jIndex}`} className="h-8 print:h-6"></div>;
                const dateStr = `${jour.getFullYear()}-${String(jour.getMonth() + 1).padStart(2, '0')}-${String(jour.getDate()).padStart(2, '0')}`;
                const isToday = dateStr === todayStr;
                const evtsDuJour = evenements[dateStr] || [];
                let congesDuJour = congesParDate[dateStr] || [];
                if (filtreEmploye) congesDuJour = congesDuJour.filter(c => c.userId === filtreEmploye);
                
                const hasConge = congesDuJour.length > 0;
                const isAlertePalefrenierCell = !filtreEmploye && (congesParDate[dateStr] || []).filter(c => palefrenierIds.has(c.userId)).length > 2;

                let baseClass = "bg-[#F4F6F9] text-[#1B2A49]";
                let borderClass = "border border-transparent";

                if (isAlertePalefrenierCell) baseClass = "bg-red-500 text-white font-bold z-10 shadow-md";
                else if (isToday) { baseClass = "bg-[#FFF8D6] text-[#8B5A2B] font-extrabold z-10 scale-[1.02]"; borderClass = "border-2 border-[#8DC63F]"; }

                return (
                  <div key={jIndex} onClick={() => { setSelectedDate(dateStr); setModalChoiceOpen(dateStr); }}
                    className={`h-8 print:h-7 rounded flex items-center justify-center text-[11px] relative cursor-pointer overflow-hidden transition-all hover:bg-white ${baseClass} ${borderClass} print:border-gray-200`}
                  >
                    {hasConge && !isAlertePalefrenierCell && (
                      <div className="absolute inset-0 flex flex-col opacity-90">
                        {/* Logic visuelle pour Congé vs Déplacement */}
                        {[0, 1].map(half => {
                           const active = congesDuJour.filter(c => (half === 0 ? (c.periode === 'jour' || c.periode === 'matin') : (c.periode === 'jour' || c.periode === 'apres-midi')));
                           if (active.length === 0) return <div key={half} className="h-1/2 w-full"></div>;
                           const isDepl = active.some(c => c.category === 'deplacement');
                           const isValid = active.some(c => c.statut === 'valide');
                           return <div key={half} className={`h-1/2 w-full ${isDepl ? 'bg-cyan-600' : (isValid ? 'bg-[#3A5A22]' : 'bg-[#D0D7E1]')}`}></div>
                        })}
                      </div>
                    )}
                    {evtsDuJour.length > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 flex flex-col opacity-90 print:opacity-100">
                        {evtsDuJour.map((e, idx) => <div key={idx} className={`h-[2px] w-full ${getColorClassForEvent(e.type)}`}></div>)}
                      </div>
                    )}
                    <span className="z-10 drop-shadow-sm">{jour.getDate()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    });
  }, [anneeActuelle, evenements, congesParDate, filtreEmploye, todayStr]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          body { background: white !important; height: auto !important; overflow: visible !important; }
          .print\\:hidden { display: none !important; }
          main { height: auto !important; overflow: visible !important; display: block !important; }
          .grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 10px !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        @media (max-width: 768px) {
           .mobile-stack { flex-direction: column !important; overflow-y: auto !important; }
           .mobile-sidebar { width: 100% !important; height: auto !important; border-right: none !important; border-bottom: 2px solid #8DC63F; }
           .mobile-grid { grid-template-columns: 1fr !important; }
        }
      `}} />

      <div className="flex h-screen mobile-stack bg-[#F0F4F8] font-sans overflow-hidden print:bg-white print:h-auto print:overflow-visible">
        
        {/* SIDEBAR */}
        <aside className="w-80 mobile-sidebar bg-[#1B2A49] shadow-2xl flex flex-col z-20 print:hidden shrink-0">
          <div className="p-4 bg-[#141D36] text-white flex flex-col items-center border-b-[4px] border-[#8DC63F]">
            <img src="/logo.png" alt="Logo" className="w-20 h-20 mb-2 object-contain bg-white rounded-full p-1" />
            <h1 className="text-sm font-bold text-center uppercase tracking-tighter text-[#8DC63F]">Organisation Écurie</h1>
            <p className="text-xs opacity-70">Poney Club de Presinge</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {rolesDisponibles.map(role => {
              const membres = equipeCalculee.filter(m => m.role === role);
              if (membres.length === 0) return null;
              return (
                <div key={role}>
                  <h4 className="text-[10px] font-bold text-white/40 uppercase mb-2 tracking-widest">{role}s</h4>
                  {membres.map(m => (
                    <div key={m.id} onClick={() => setFiltreEmploye(filtreEmploye === m.id ? null : m.id)}
                      className={`p-2 rounded-lg mb-1 border cursor-pointer transition-all flex justify-between items-center ${filtreEmploye === m.id ? 'bg-[#8DC63F] text-[#1B2A49]' : 'bg-[#213459] border-transparent text-white/90'}`}>
                      <div className="flex flex-col">
                         <span className="text-sm font-bold">{m.nom}</span>
                         {m.repos && <span className="text-[9px] opacity-60">Off: {m.repos}</span>}
                      </div>
                      {m.total > 0 && <span className="text-[10px] font-mono">{m.pris}/{m.total}</span>}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          <div className="p-4 bg-[#141D36] space-y-2">
             <button onClick={() => ouvrirModalConge()} className="w-full bg-[#8DC63F] text-[#1B2A49] font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg"><Plus size={18}/> Saisir Absence</button>
             <button onClick={() => setModalStaffOpen(true)} className="w-full bg-white/10 text-white py-2 rounded-xl flex items-center justify-center gap-2 border border-white/20"><Settings size={16}/> Config. Équipe</button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col relative print:p-0">
          <header className="h-20 bg-white/80 backdrop-blur-md border-b border-[#D0D7E1] flex items-center justify-between px-4 shrink-0 print:hidden">
            <div className="flex items-center gap-2">
               <button onClick={() => setAnneeActuelle(a => a-1)} className="p-2 bg-gray-100 rounded-lg"><ChevronLeft size={20}/></button>
               <h2 className="text-xl font-black">{anneeActuelle}</h2>
               <button onClick={() => setAnneeActuelle(a => a+1)} className="p-2 bg-gray-100 rounded-lg"><ChevronRight size={20}/></button>
            </div>
            
            <div className={`flex-1 mx-4 p-2 rounded-xl border text-center transition-all ${isAlertePalefrenierHeader ? 'bg-red-500 text-white' : 'bg-white border-[#D0D7E1]'}`}>
               <p className="text-[10px] font-bold uppercase opacity-60">{new Date(selectedDate).toLocaleDateString('fr-CH', {day:'numeric', month:'long'})}</p>
               <div className="flex flex-wrap justify-center gap-2 text-xs font-bold">
                  {absentsDuJourSelectionne.length === 0 ? "Effectif complet" : absentsDuJourSelectionne.map(c => {
                    const m = membresBase.find(u => u.id === c.userId);
                    return <span key={c.id} className="bg-black/10 px-2 py-0.5 rounded flex items-center gap-1">{m?.nom} {c.category === 'deplacement' ? '✈️' : ''}</span>
                  })}
               </div>
            </div>

            <button onClick={() => window.print()} className="p-3 bg-white border rounded-full shadow-sm text-[#1B2A49]"><Printer size={20}/></button>
          </header>

          {/* LÉGENDE */}
          <div className="bg-white px-4 py-2 border-b flex flex-wrap gap-4 text-[10px] font-bold print:hidden">
             <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#3A5A22] rounded-sm"></div> Congé Validé</div>
             <div className="flex items-center gap-1"><div className="w-3 h-3 bg-cyan-600 rounded-sm"></div> Déplacement (Hors Solde)</div>
             <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#D0D7E1] rounded-sm"></div> Provisoire</div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 mobile-grid grid grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
            {calendrierMemoise}
          </div>
        </main>

        {/* MODAL ABSENCE (AJOUT TYPE DEPLACEMENT) */}
        {modalCongeOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-4 bg-[#1B2A49] text-white flex justify-between">
                   <h3 className="font-bold flex items-center gap-2"><CalendarIcon size={18}/> Saisir une période</h3>
                   <X className="cursor-pointer" onClick={() => setModalCongeOpen(false)}/>
                </div>
                <form onSubmit={sauvegarderConge} className="p-6 space-y-4">
                   <div>
                      <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Nature de l'absence</label>
                      <select className="w-full border p-3 rounded-xl bg-gray-50 font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                         <option value="conge">🏝️ Congé (décompté du solde)</option>
                         <option value="deplacement">✈️ Déplacement Extérieur (travail hors site)</option>
                      </select>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                      <input type="date" className="border p-3 rounded-xl" value={formData.dateDebut} onChange={e => setFormData({...formData, dateDebut: e.target.value})} required/>
                      <input type="date" className="border p-3 rounded-xl" value={formData.dateFin} onChange={e => setFormData({...formData, dateFin: e.target.value})}/>
                   </div>
                   <div>
                      <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Collaborateur</label>
                      <select className="w-full border p-3 rounded-xl" value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})} required>
                         {membresBase.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                      </select>
                   </div>
                   <div className="flex gap-4">
                      <label className="flex items-center gap-2"><input type="radio" checked={formData.statut === 'provisoire'} onChange={() => setFormData({...formData, statut:'provisoire'})}/> Provisoire</label>
                      <label className="flex items-center gap-2 text-green-700 font-bold"><input type="radio" checked={formData.statut === 'valide'} onChange={() => setFormData({...formData, statut:'valide'})}/> Validé</label>
                   </div>
                   <div className="flex gap-2 pt-4">
                      {formData.id && <button type="button" onClick={supprimerConge} className="p-3 text-red-500"><Trash2/></button>}
                      <button type="submit" className="flex-1 bg-[#1B2A49] text-white py-3 rounded-xl font-bold">Enregistrer</button>
                   </div>
                </form>
             </div>
          </div>
        )}

        {/* MODAL CHOIX (Amélioration ergonomie mobile) */}
        {modalChoiceOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 p-4">
             <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-sm p-6 space-y-3">
                <h4 className="text-center font-black border-b pb-2">{new Date(modalChoiceOpen).toLocaleDateString('fr-CH', {weekday:'long', day:'numeric', month:'long'})}</h4>
                <button onClick={() => { ouvrirModalConge(modalChoiceOpen); setModalChoiceOpen(null); }} className="w-full py-4 bg-[#8DC63F] text-[#1B2A49] font-bold rounded-2xl flex items-center justify-center gap-2"><Plus/> Absence / Déplacement</button>
                <button onClick={() => { ouvrirModalEvt(modalChoiceOpen); setModalChoiceOpen(null); }} className="w-full py-4 bg-[#1B2A49] text-white font-bold rounded-2xl flex items-center justify-center gap-2"><Flag/> Événement Club</button>
                <button onClick={() => setModalChoiceOpen(null)} className="w-full py-3 text-gray-400 font-bold uppercase text-xs">Annuler</button>
             </div>
          </div>
        )}

      </div>
    </>
  );
}

function getColorClassForEvent(type) {
  if (type === 'concours_oui') return "bg-[#8B5A2B]";
  if (type === 'concours_non') return "bg-gray-400";
  if (type === 'vacances_ge') return "bg-blue-500";
  if (type === 'jour_ferie') return "bg-purple-500";
  return "bg-black";
}