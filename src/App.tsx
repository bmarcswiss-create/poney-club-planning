// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, MapPin, Award, Trash2, X, Plus, AlertCircle, Users, Tent, ChevronLeft, ChevronRight, Settings, Edit, Flag, StickyNote, Printer } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- CONNEXION À SUPABASE ---
const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'sb_publishable_azT_rAkqeE-zsnvolYSY9w_7MtlnBVI';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- DONNÉES PAR DÉFAUT ---
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

  // --- ÉTATS ---
  const [isLoaded, setIsLoaded] = useState(false);
  const [anneeActuelle, setAnneeActuelle] = useState(2026);
  const [dateDuJour, setDateDuJour] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  
  const [membresBase, setMembresBase] = useState(defaultEquipe);
  const [conges, setConges] = useState([]);
  const [evenements, setEvenements] = useState({});
  const [notes, setNotes] = useState({});

  // NOUVEAU : Filtre par employé
  const [filtreEmploye, setFiltreEmploye] = useState(null);

  const [modalCongeOpen, setModalCongeOpen] = useState(false);
  const [modalStaffOpen, setModalStaffOpen] = useState(false);
  const [modalEvtOpen, setModalEvtOpen] = useState(false);
  const [modalNoteOpen, setModalNoteOpen] = useState(false);
  const [modalChoiceOpen, setModalChoiceOpen] = useState(null);
  
  const [formData, setFormData] = useState({ id: null, userId: '', dateDebut: '', dateFin: '', periode: 'jour', statut: 'provisoire' });
  const [staffForm, setStaffForm] = useState({ id: null, nom: '', role: 'Palefrenier', total: 25, repos: '' });
  const [evtForm, setEvtForm] = useState({ dateDebut: '', dateFin: '', titre: '', type: 'concours_oui' });
  const [noteText, setNoteText] = useState("");

  // --- CHARGEMENT DEPUIS SUPABASE ---
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

  // --- SAUVEGARDE AUTOMATIQUE VERS SUPABASE ---
  useEffect(() => { if (isLoaded) supabase.from('app_state').upsert({ id: 'poney_equipe', data: membresBase }).then(); }, [membresBase, isLoaded]);
  useEffect(() => { if (isLoaded) supabase.from('app_state').upsert({ id: 'poney_conges', data: conges }).then(); }, [conges, isLoaded]);
  useEffect(() => { if (isLoaded) supabase.from('app_state').upsert({ id: 'poney_evenements', data: evenements }).then(); }, [evenements, isLoaded]);
  useEffect(() => { if (isLoaded) supabase.from('app_state').upsert({ id: 'poney_notes', data: notes }).then(); }, [notes, isLoaded]);
  useEffect(() => { if (isLoaded) supabase.from('app_state').upsert({ id: 'poney_annee', data: anneeActuelle.toString() }).then(); }, [anneeActuelle, isLoaded]);

  // --- CALCULS ---
  const palefrenierIds = useMemo(() => new Set(membresBase.filter(m => m.role === 'Palefrenier').map(m => m.id)), [membresBase]);

  const equipeCalculee = useMemo(() => {
    return membresBase.map(membre => {
      const sesConges = conges.filter(c => c.userId === membre.id && c.date.startsWith(anneeActuelle.toString()));
      const joursPris = sesConges.reduce((total, conge) => total + (conge.periode === 'jour' ? 1 : 0.5), 0);
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

  // --- ACTIONS STAFF & CONGÉS ---
  const sauvegarderStaff = (e) => {
    e.preventDefault();
    if (staffForm.id) setMembresBase(membresBase.map(m => m.id === staffForm.id ? { ...staffForm, total: Number(staffForm.total) } : m));
    else setMembresBase([...membresBase, { ...staffForm, id: Date.now(), total: Number(staffForm.total) }]);
    setStaffForm({ id: null, nom: '', role: 'Palefrenier', total: 25, repos: '' });
  };
  const editerStaff = (membre) => setStaffForm(membre);
  const supprimerStaff = (id) => {
    if (window.confirm("Supprimer ce membre ? Ses congés seront aussi supprimés.")) {
      setMembresBase(membresBase.filter(m => m.id !== id));
      setConges(conges.filter(c => c.userId !== id));
      if (filtreEmploye === id) setFiltreEmploye(null);
    }
  };

  const ouvrirModalConge = (dateStr = '', congeExistant = null) => {
    if (congeExistant) setFormData({ ...congeExistant, dateDebut: congeExistant.date, dateFin: congeExistant.date });
    else setFormData({ id: null, userId: membresBase[0]?.id || '', dateDebut: dateStr, dateFin: dateStr, periode: 'jour', statut: 'provisoire' });
    setModalCongeOpen(true);
  };

  const sauvegarderConge = (e) => {
    e.preventDefault();
    
    // NOUVEAU : VÉRIFICATION DES CONFLITS AVEC LES CONCOURS
    if (formData.statut === 'valide') {
      let aUnConflit = false;
      let dateCouranteCheck = new Date(formData.dateDebut);
      const dateFinObjCheck = new Date(formData.dateFin || formData.dateDebut);
      
      while (dateCouranteCheck <= dateFinObjCheck) {
        const dateStrCheck = `${dateCouranteCheck.getFullYear()}-${String(dateCouranteCheck.getMonth() + 1).padStart(2, '0')}-${String(dateCouranteCheck.getDate()).padStart(2, '0')}`;
        if (evenements[dateStrCheck] && evenements[dateStrCheck].some(evt => evt.type === 'concours_oui')) {
          aUnConflit = true;
          break;
        }
        dateCouranteCheck.setDate(dateCouranteCheck.getDate() + 1);
      }

      if (aUnConflit) {
        const confirm = window.confirm("⚠️ ATTENTION : Un ou plusieurs jours de ce congé tombent pendant un CONCOURS du club.\n\nVoulez-vous vraiment valider cette absence ?");
        if (!confirm) return; // On annule la sauvegarde si l'utilisateur dit Non
      }
    }

    // Sauvegarde normale
    if (formData.id) {
      setConges(conges.map(c => c.id === formData.id ? { ...formData, userId: Number(formData.userId), date: formData.dateDebut } : c));
    } else {
      const nouveauxConges = [];
      let dateCourante = new Date(formData.dateDebut);
      const dateFinObj = new Date(formData.dateFin || formData.dateDebut);
      while (dateCourante <= dateFinObj) {
        const dateStr = `${dateCourante.getFullYear()}-${String(dateCourante.getMonth() + 1).padStart(2, '0')}-${String(dateCourante.getDate()).padStart(2, '0')}`;
        nouveauxConges.push({ id: Date.now() + Math.random(), userId: Number(formData.userId), date: dateStr, periode: formData.dateDebut !== formData.dateFin ? 'jour' : formData.periode, statut: formData.statut });
        dateCourante.setDate(dateCourante.getDate() + 1);
      }
      setConges([...conges, ...nouveauxConges]);
    }
    setModalCongeOpen(false);
  };

  const supprimerConge = () => {
    if (window.confirm("Supprimer ce congé ?")) {
      setConges(conges.filter(c => c.id !== formData.id));
      setModalCongeOpen(false);
    }
  };

  // --- ACTIONS ÉVÉNEMENTS ---
  const ouvrirModalEvt = (dateStr = '') => {
    setEvtForm({ dateDebut: dateStr, dateFin: dateStr, titre: '', type: 'concours_oui' });
    setModalEvtOpen(true);
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

  const supprimerEvenement = (dateStr, evtId) => {
    if (window.confirm(`Voulez-vous vraiment supprimer cet événement ?`)) {
      const nouveauxEvts = { ...evenements };
      nouveauxEvts[dateStr] = nouveauxEvts[dateStr].filter(e => e.id !== evtId);
      if (nouveauxEvts[dateStr].length === 0) delete nouveauxEvts[dateStr];
      setEvenements(nouveauxEvts);
    }
  };

  const sauvegarderNote = (e) => {
    e.preventDefault();
    const newNotes = { ...notes };
    if (noteText.trim() === "") delete newNotes[selectedDate];
    else newNotes[selectedDate] = noteText;
    setNotes(newNotes);
    setModalNoteOpen(false);
  };

  const getJoursMois = (mois, annee) => {
    const date = new Date(annee, mois, 1);
    const jours = [];
    let jourSemaine = date.getDay() === 0 ? 6 : date.getDay() - 1;
    for (let i = 0; i < jourSemaine; i++) jours.push(null);
    while (date.getMonth() === mois) { jours.push(new Date(date)); date.setDate(date.getDate() + 1); }
    return jours;
  };

  const getColorClassForEvent = (type) => {
    if (type === 'concours_oui') return "bg-[#8B5A2B]";
    if (type === 'concours_non') return "bg-gray-500";
    if (type === 'vacances_ge') return "bg-blue-500";
    if (type === 'jour_ferie') return "bg-purple-500";
    return "bg-black";
  };

  // --- CALENDRIER MÉMOISÉ ---
  const calendrierMemoise = useMemo(() => {
    return moisNoms.map((mois, index) => {
      const jours = getJoursMois(index, anneeActuelle);
      return (
        <div key={mois} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0DDCF] overflow-hidden break-inside-avoid">
          <div className="bg-[#CCD5AE] py-2 text-center font-bold text-[#3D4035] print:bg-gray-200 print:border-b print:border-gray-300">{mois}</div>
          <div className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#6B705C] mb-2">
              <div>LU</div><div>MA</div><div>ME</div><div>JE</div><div>VE</div><div>SA</div><div>DI</div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {jours.map((jour, jIndex) => {
                if (!jour) return <div key={`empty-${jIndex}`} className="h-8"></div>;
                const dateStr = `${jour.getFullYear()}-${String(jour.getMonth() + 1).padStart(2, '0')}-${String(jour.getDate()).padStart(2, '0')}`;
                
                const isPast = dateStr < todayStr;
                const isToday = dateStr === todayStr;

                const evtsDuJour = evenements[dateStr] || [];
                
                // NOUVEAU : On filtre les congés affichés si un employé est sélectionné à gauche
                let congesDuJour = congesParDate[dateStr] || [];
                if (filtreEmploye) {
                  congesDuJour = congesDuJour.filter(c => c.userId === filtreEmploye);
                }
                const hasConge = congesDuJour.length > 0;
                const noteDuJour = notes[dateStr];

                // L'alerte rouge globale est désactivée si on regarde le filtre d'une seule personne
                const palefreniersAbsentsCell = (congesParDate[dateStr] || []).filter(c => palefrenierIds.has(c.userId));
                const isAlertePalefrenierCell = !filtreEmploye && palefreniersAbsentsCell.length > 2;
                
                let baseClass = "bg-[#E9EDC9] hover:bg-[#CCD5AE] text-[#3D4035]";
                let borderClass = ""; 
                let icon = null;
                
                if (isPast && !hasConge && evtsDuJour.length === 0 && !isAlertePalefrenierCell) {
                  baseClass = "bg-[#E0DDCF]/50 text-gray-500 hover:bg-[#D4D0C0]";
                }

                if (isAlertePalefrenierCell) {
                  baseClass = "bg-red-500 text-white font-bold z-10 shadow-md";
                  borderClass = "border-2 border-red-700 ring-2 ring-red-300 print:border-red-500";
                } else if (isToday) {
                  baseClass = "bg-amber-100 text-amber-900 font-extrabold z-10 shadow-lg scale-[1.05] transition-transform print:scale-100";
                  borderClass = "ring-4 ring-amber-500 ring-inset print:ring-2 print:border-amber-500"; 
                }

                if (evtsDuJour.length > 0 && !isAlertePalefrenierCell && !hasConge) {
                  const firstEvt = evtsDuJour[0];
                  if (firstEvt.type === 'vacances_ge') baseClass = isToday ? baseClass : "bg-blue-100 text-blue-800";
                  if (firstEvt.type === 'jour_ferie') baseClass = isToday ? baseClass : "bg-purple-100 text-purple-800 font-bold";
                }

                const handleDayClick = () => {
                  setSelectedDate(dateStr);
                  setModalChoiceOpen(dateStr);
                };

                return (
                  <div key={jIndex} onClick={handleDayClick} title={evtsDuJour.map(e=>e.titre).join(', ') || (noteDuJour ? noteDuJour : '')}
                    className={`h-8 rounded flex items-center justify-center text-xs relative cursor-pointer overflow-hidden print:border print:border-gray-200 ${baseClass} ${borderClass}`}
                  >
                    {hasConge && !isAlertePalefrenierCell && (
                      <div className="absolute inset-0 flex flex-col opacity-95 z-0">
                        <div className={`h-1/2 w-full ${congesDuJour.some(c => (c.periode === 'jour' || c.periode === 'matin') && c.statut === 'valide') ? 'bg-[#4A5D23] print:bg-gray-400 print:border-b print:border-gray-500' : congesDuJour.some(c => (c.periode === 'jour' || c.periode === 'matin') && c.statut === 'provisoire') ? 'bg-[#E0E5EC]' : ''}`}></div>
                        <div className={`h-1/2 w-full ${congesDuJour.some(c => (c.periode === 'jour' || c.periode === 'apres-midi') && c.statut === 'valide') ? 'bg-[#4A5D23] print:bg-gray-400 print:border-t print:border-gray-500' : congesDuJour.some(c => (c.periode === 'jour' || c.periode === 'apres-midi') && c.statut === 'provisoire') ? 'bg-[#E0E5EC]' : ''}`}></div>
                      </div>
                    )}
                    {congesDuJour.some(c => c.statut === 'provisoire') && !isAlertePalefrenierCell && (
                      <div className="absolute inset-0 border-2 border-dashed border-[#A3B1C6] rounded z-0 print:border-gray-400"></div>
                    )}
                    
                    {evtsDuJour.length > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 flex flex-col z-20 opacity-90">
                        {evtsDuJour.map((e, idx) => (
                          <div key={idx} className={`h-1 w-full ${getColorClassForEvent(e.type)} print:bg-gray-800`}></div>
                        ))}
                      </div>
                    )}

                    <span className={`z-10 drop-shadow-sm ${congesDuJour.some(c => c.statut === 'valide') || isAlertePalefrenierCell ? 'text-white font-bold print:text-black' : ''}`}>{jour.getDate()}</span>
                    
                    {!isAlertePalefrenierCell && !hasConge && evtsDuJour.some(e => e.type === 'concours_oui') && <Award size={10} className="absolute -top-0.5 -right-0.5 text-[#8B5A2B] z-10 print:hidden" />}
                    {!isAlertePalefrenierCell && !hasConge && evtsDuJour.some(e => e.type === 'concours_non') && <Tent size={10} className="absolute -top-0.5 -right-0.5 text-gray-600 z-10 print:hidden" />}

                    {noteDuJour && !isAlertePalefrenierCell && (
                      <StickyNote size={10} className={`absolute top-0.5 left-0.5 opacity-80 print:hidden ${congesDuJour.some(c => c.statut === 'valide') ? 'text-yellow-300' : 'text-yellow-600'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    });
  }, [anneeActuelle, evenements, congesParDate, palefrenierIds, todayStr, notes, filtreEmploye]); 

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F1DE] flex-col gap-4">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-4 border-[#A3B18A] animate-pulse">
          <span className="text-3xl">🐴</span>
        </div>
        <h2 className="text-2xl font-bold text-[#8B5A2B]">Chargement du planning...</h2>
      </div>
    );
  }

  return (
    // NOUVEAU : classes 'print:h-auto overflow-visible' pour permettre l'impression de toute la page
    <div className="flex h-screen print:h-auto bg-[#F4F1DE] font-sans overflow-hidden print:overflow-visible text-[#3D4035] relative">
      
      {/* SIDEBAR (Cachée à l'impression) */}
      <aside className="w-80 bg-[#E0DDCF] shadow-xl flex flex-col z-20 border-r border-[#D4D0C0] relative print:hidden">
        <div className="p-6 bg-[#A3B18A] text-white flex flex-col items-center justify-center border-b-[6px] border-[#8B5A2B]">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-3 shadow-md overflow-hidden border-2 border-white">
            <img src="/logo.png" alt="Logo PCP" className="w-full h-full object-contain p-2" />
          </div>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#F4F1DE] bg-[#704822] px-3 py-1.5 rounded-lg mb-2 text-center shadow-md border border-[#F4F1DE]/20 w-full">
            Organisation des<br/>équipes Écurie
          </h2>
          <h1 className="text-xl font-bold tracking-wide text-center leading-tight drop-shadow-sm">Poney Club<br/>de Presinge</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-[#6B705C] uppercase flex items-center gap-2"><Users size={16} /> Équipe & Soldes</h3>
            <button onClick={() => setModalStaffOpen(true)} className="text-[#8B5A2B] hover:bg-[#D4D0C0] p-1.5 rounded-md transition-colors" title="Gérer l'équipe"><Settings size={16} /></button>
          </div>
          
          {/* NOUVEAU MESSAGE D'INFO POUR LE FILTRE */}
          <p className="text-[10px] text-gray-500 italic mb-4 leading-tight">Cliquez sur un nom pour filtrer le calendrier.</p>

          <div className="space-y-4">
            {rolesDisponibles.map(role => {
              const membresRole = equipeCalculee.filter(m => m.role === role);
              if (membresRole.length === 0) return null;
              
              return (
                <div key={role} className="mb-4">
                  <h4 className="text-[11px] font-bold text-[#8B5A2B] uppercase border-b border-[#8B5A2B]/20 mb-2 pb-1">{role}s</h4>
                  {membresRole.map(membre => {
                    const isSelected = filtreEmploye === membre.id;
                    return (
                      <div 
                        key={membre.id} 
                        onClick={() => setFiltreEmploye(isSelected ? null : membre.id)}
                        className={`p-2 rounded-lg mb-2 shadow-sm border flex justify-between items-center cursor-pointer transition-all ${isSelected ? 'bg-white border-[#8B5A2B] ring-1 ring-[#8B5A2B] scale-[1.02]' : 'bg-white/60 border-white hover:bg-white/90'}`}
                      >
                        <span className="font-semibold text-sm leading-tight flex flex-col">
                          {membre.nom}
                          {membre.repos && <span className="text-[10px] text-[#6B705C] font-normal mt-0.5">Repos : {membre.repos}</span>}
                        </span>
                        {membre.total > 0 ? (
                          <span className={`text-xs px-2 py-1 rounded-full font-bold ${membre.pris >= membre.total ? 'bg-red-100 text-red-700' : 'bg-[#CCD5AE] text-[#3D4035]'}`}>
                            {membre.pris} / {membre.total}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded-full">{membre.pris} j.</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-[#D4D0C0]/50 border-t border-[#D4D0C0] space-y-2">
          <button onClick={() => ouvrirModalConge()} className="w-full bg-[#8B5A2B] hover:bg-[#704822] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">
            <Plus size={18} /> Saisir un congé
          </button>
          <button onClick={() => ouvrirModalEvt()} className="w-full bg-[#A3B18A] hover:bg-[#8e9c76] text-white font-bold py-2 px-4 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 text-sm">
            <Flag size={16} /> Ajouter un événement
          </button>
        </div>
      </aside>

      {/* ZONE CENTRALE */}
      <main className="flex-1 flex flex-col h-full print:h-auto overflow-hidden print:overflow-visible relative bg-[#F4F1DE] print:bg-white">
        
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 opacity-[0.07] overflow-hidden print:opacity-[0.03]">
          <img src="/logo.png" alt="Filigrane" className="w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] object-contain grayscale" />
        </div>

        <header className="min-h-24 bg-white/60 backdrop-blur-md border-b border-[#D4D0C0] flex items-center justify-between px-8 py-3 shadow-sm shrink-0 relative z-10 print:hidden">
          <div className="flex items-center gap-6 shrink-0">
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
              <button onClick={() => setAnneeActuelle(a => a - 1)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronLeft size={20}/></button>
              <h2 className="text-xl font-bold text-[#3D4035] w-16 text-center">{anneeActuelle}</h2>
              <button onClick={() => setAnneeActuelle(a => a + 1)} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ChevronRight size={20}/></button>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-bold text-[#3D4035]">Planning</p>
              <p className="text-xs text-[#6B705C] flex items-center gap-1"><MapPin size={12} /> Genève</p>
            </div>
          </div>

          <div className={`flex-1 mx-4 py-2 px-4 rounded-lg border flex flex-col justify-center items-center text-center transition-colors shadow-sm ${isAlertePalefrenierHeader ? 'bg-red-500 border-red-700 text-white' : 'bg-white border-[#D4D0C0] text-[#3D4035]'}`}>
            <span className={`text-xs font-bold mb-1 uppercase tracking-wide opacity-90 ${isAlertePalefrenierHeader ? 'text-white' : ''}`}>
              {selectedDate === todayStr ? "Aujourd'hui" : `Sélection : ${new Date(selectedDate).toLocaleDateString('fr-CH')}`}
            </span>

            {evtsSelectionnes.length > 0 && (
              <div className="flex flex-wrap gap-3 justify-center mb-1">
                {evtsSelectionnes.map(e => (
                  <span key={e.id} className={`text-sm font-bold flex items-center gap-1.5 ${isAlertePalefrenierHeader ? 'text-white' : (e.type === 'vacances_ge' ? 'text-blue-700' : e.type === 'jour_ferie' ? 'text-purple-700' : 'text-[#8B5A2B]')}`}>
                    {e.type === 'vacances_ge' ? '🏖️ ' : e.type === 'jour_ferie' ? '🎉 ' : '🚩 '}{e.titre}
                  </span>
                ))}
              </div>
            )}

            {absentsDuJourSelectionne.length === 0 ? (
              <span className={`text-sm opacity-90 ${isAlertePalefrenierHeader ? 'text-white' : ''}`}>Effectif complet, aucun absent</span>
            ) : (
              <div className="text-sm font-semibold flex flex-wrap items-center justify-center gap-2">
                {isAlertePalefrenierHeader && <AlertCircle size={16} />} 
                <span>Absents ({absentsDuJourSelectionne.length}) :</span>
                {absentsDuJourSelectionne.map(c => {
                  const membre = membresBase.find(u => u.id === c.userId);
                  if (!membre) return null;
                  return (
                    <button key={c.id} onClick={() => ouvrirModalConge(selectedDate, c)}
                      className={`px-2 py-0.5 rounded shadow-sm border transition-colors text-xs flex items-center gap-1 cursor-pointer hover:scale-105 ${isAlertePalefrenierHeader ? 'bg-red-600 border-red-400 hover:bg-red-700 text-white' : 'bg-gray-100 border-gray-300 hover:bg-gray-200'}`}
                      title="Cliquez pour modifier ou supprimer"
                    >
                      {membre.nom} ({c.periode === 'jour' ? '1j' : '0.5j'}) <Edit size={10} />
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-1">
              {notes[selectedDate] ? (
                <div onClick={() => { setNoteText(notes[selectedDate]); setModalNoteOpen(true); }}
                     className={`px-3 py-1 text-xs rounded-md shadow-sm cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${isAlertePalefrenierHeader ? 'bg-red-800 text-white hover:bg-red-900 border border-red-900' : 'bg-yellow-100 border border-yellow-300 text-yellow-800 hover:bg-yellow-200'}`}
                     title="Modifier la note">
                  <StickyNote size={12} /> {notes[selectedDate]}
                </div>
              ) : (
                <button onClick={() => { setNoteText(''); setModalNoteOpen(true); }} className={`text-[10px] opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center gap-1 ${isAlertePalefrenierHeader ? 'text-white' : 'text-[#6B705C]'}`}>
                  <Plus size={10}/> Ajouter une note au jour
                </button>
              )}
            </div>
          </div>

          <div className="text-right shrink-0 flex items-center gap-4">
            {/* NOUVEAU BOUTON : IMPRIMER */}
            <button onClick={() => window.print()} className="p-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-gray-700 shadow-sm transition-colors" title="Imprimer le calendrier">
              <Printer size={18} />
            </button>
          </div>
        </header>

        {/* LÉGENDE */}
        <div className="bg-white/80 backdrop-blur-md px-8 py-3 flex gap-6 border-b border-[#D4D0C0] text-sm shrink-0 flex-wrap shadow-sm relative z-10 print:hidden">
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#4A5D23] rounded-sm"></div> Validé</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 bg-[#E0E5EC] border-2 border-dashed border-[#A3B1C6] rounded-sm"></div> Provisoire</div>
          <div className="flex items-center gap-2"><div className="w-4 h-1.5 bg-[#8B5A2B] rounded-sm"></div> Concours Club</div>
          <div className="flex items-center gap-2"><div className="w-4 h-1.5 bg-blue-500 rounded-sm"></div> Vacances GE</div>
          <div className="flex items-center gap-2"><div className="w-4 h-1.5 bg-purple-500 rounded-sm"></div> Jour Férié</div>
        </div>

        {/* Titre exclusif pour l'impression */}
        <div className="hidden print:block text-center pt-8 pb-4">
          <h1 className="text-3xl font-bold text-black">Planning Écurie - {anneeActuelle}</h1>
          {filtreEmploye && <h2 className="text-xl font-bold text-gray-600 mt-2">Filtre actif : {membresBase.find(m => m.id === filtreEmploye)?.nom}</h2>}
        </div>

        <div className="flex-1 overflow-y-auto print:overflow-visible p-8 relative z-10 print:p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 print:gap-4">
            {calendrierMemoise}
          </div>
        </div>
      </main>

      {/* --- MENU CHOIX AU CLIC SUR UN JOUR --- */}
      {modalChoiceOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 print:hidden">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm text-center space-y-4">
            <h3 className="font-bold text-lg text-[#3D4035] border-b pb-2 mb-4">
              {new Date(modalChoiceOpen).toLocaleDateString('fr-CH', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            
            <button onClick={() => { ouvrirModalConge(modalChoiceOpen, null); setModalChoiceOpen(null); }} className="w-full py-3 bg-[#A3B18A] hover:bg-[#8e9c76] text-white rounded-xl font-bold flex items-center justify-center gap-2">
              <Plus size={18}/> Ajouter une Absence
            </button>
            
            <button onClick={() => { ouvrirModalEvt(modalChoiceOpen); setModalChoiceOpen(null); }} className="w-full py-3 bg-[#8B5A2B] hover:bg-[#704822] text-white rounded-xl font-bold flex items-center justify-center gap-2">
              <Flag size={18}/> Ajouter un Événement
            </button>

            {evenements[modalChoiceOpen] && evenements[modalChoiceOpen].length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs text-gray-500 mb-2 uppercase font-bold tracking-wide">Supprimer un événement</p>
                {evenements[modalChoiceOpen].map(e => (
                  <button key={e.id} onClick={() => { supprimerEvenement(modalChoiceOpen, e.id); setModalChoiceOpen(null); }} className="w-full py-2 mb-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border border-red-200 transition-colors">
                    <Trash2 size={16}/> {e.titre}
                  </button>
                ))}
              </div>
            )}
            
            <button onClick={() => setModalChoiceOpen(null)} className="w-full py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-bold mt-2 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* --- NOUVEAU MODAL : AJOUT/MODIF D'UNE NOTE --- */}
      {modalNoteOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-yellow-400 px-6 py-3 flex justify-between items-center text-yellow-900">
              <h3 className="text-md font-bold flex items-center gap-2"><StickyNote size={18} /> Note du {new Date(selectedDate).toLocaleDateString('fr-CH')}</h3>
              <button onClick={() => setModalNoteOpen(false)} className="hover:bg-yellow-500 p-1 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={sauvegarderNote} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#6B705C] mb-2">Votre note (Post-it)</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg p-3 bg-yellow-50 outline-none focus:ring-2 focus:ring-yellow-400" 
                  value={noteText} 
                  onChange={(e) => setNoteText(e.target.value)} 
                  placeholder="Ex: Maréchal l'après-midi, Livraison foin..." 
                />
                <p className="text-xs text-gray-500 mt-2">Laissez vide pour supprimer la note existante.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModalNoteOpen(false)} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold">Annuler</button>
                <button type="submit" className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 text-yellow-900 rounded-lg font-bold shadow-sm">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL : AJOUT D'ÉVÉNEMENT (CONCOURS) --- */}
      {modalEvtOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#8B5A2B] px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-lg font-bold flex items-center gap-2"><Flag size={20} /> Nouvel Événement</h3>
              <button onClick={() => setModalEvtOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={sauvegarderEvenement} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-[#6B705C] mb-1">Du</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg p-2 outline-none" value={evtForm.dateDebut} onChange={(e) => setEvtForm({...evtForm, dateDebut: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[#6B705C] mb-1">Au (inclus)</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg p-2 outline-none" value={evtForm.dateFin} onChange={(e) => setEvtForm({...evtForm, dateFin: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#6B705C] mb-1">Titre</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2 outline-none" value={evtForm.titre} onChange={(e) => setEvtForm({...evtForm, titre: e.target.value})} required placeholder="Ex: CSO ou Férié..." />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#6B705C] mb-1">Type</label>
                <select className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none" value={evtForm.type} onChange={(e) => setEvtForm({...evtForm, type: e.target.value})}>
                  <option value="concours_oui">Participation du Club (Marron)</option>
                  <option value="concours_non">Sans participation (Gris)</option>
                  <option value="vacances_ge">Vacances Scolaires GE (Bleu)</option>
                  <option value="jour_ferie">Jour Férié (Violet)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4 mt-4 border-t border-gray-100">
                <button type="button" onClick={() => setModalEvtOpen(false)} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold">Annuler</button>
                <button type="submit" className="flex-1 py-2 bg-[#8B5A2B] hover:bg-[#704822] text-white rounded-lg font-bold">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL : GESTION DES CONGÉS --- */}
      {modalCongeOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#A3B18A] px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-lg font-bold flex items-center gap-2"><CalendarIcon size={20} />{formData.id ? "Modifier le congé" : "Saisir un congé"}</h3>
              <button onClick={() => setModalCongeOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
            </div>
            <form onSubmit={sauvegarderConge} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#6B705C] mb-1">Employé</label>
                <select className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none" value={formData.userId} onChange={(e) => setFormData({...formData, userId: e.target.value})} required>
                  {equipeCalculee.map(m => <option key={m.id} value={m.id}>{m.nom} ({m.role})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-[#6B705C] mb-1">Du</label><input type="date" className="w-full border border-gray-300 rounded-lg p-2 outline-none" value={formData.dateDebut} onChange={(e) => setFormData({...formData, dateDebut: e.target.value})} required /></div>
                <div><label className="block text-sm font-bold text-[#6B705C] mb-1">Au (inclus)</label><input type="date" className="w-full border border-gray-300 rounded-lg p-2 outline-none" value={formData.dateFin} onChange={(e) => setFormData({...formData, dateFin: e.target.value})} /></div>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#6B705C] mb-1">Période</label>
                <select className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none" value={formData.periode} onChange={(e) => setFormData({...formData, periode: e.target.value})} disabled={formData.dateDebut !== formData.dateFin && formData.dateFin !== ''}>
                  <option value="jour">Journée entière (1 j.)</option>
                  <option value="matin">Matin uniquement (0.5 j.)</option>
                  <option value="apres-midi">Après-midi uniquement (0.5 j.)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#6B705C] mb-1">Statut</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="statut" value="provisoire" checked={formData.statut === 'provisoire'} onChange={(e) => setFormData({...formData, statut: e.target.value})} className="text-gray-500 focus:ring-gray-400 w-4 h-4" /><span className="text-gray-500 font-bold">Provisoire</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="statut" value="valide" checked={formData.statut === 'valide'} onChange={(e) => setFormData({...formData, statut: e.target.value})} className="text-[#4A5D23] focus:ring-[#4A5D23] w-4 h-4" /><span className="text-[#6B705C] font-bold">Validé</span></label>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-6">
                {formData.id ? <button type="button" onClick={supprimerConge} className="text-red-500 hover:bg-red-50 p-2 rounded-lg flex items-center gap-1 text-sm font-bold"><Trash2 size={16} /> Supprimer</button> : <div></div>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModalCongeOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold">Annuler</button>
                  <button type="submit" className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#704822] text-white rounded-lg font-bold">Enregistrer</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL : GESTION DE L'ÉQUIPE (ADMIN) --- */}
      {modalStaffOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#8B5A2B] px-6 py-4 flex justify-between items-center text-white shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2"><Settings size={20} /> Paramètres de l'équipe</h3>
              <button onClick={() => setModalStaffOpen(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
            </div>
            
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              <div className="p-6 md:w-1/2 bg-gray-50 border-r border-gray-200 overflow-y-auto">
                <h4 className="font-bold text-[#3D4035] mb-4 border-b pb-2">{staffForm.id ? 'Modifier le membre' : 'Ajouter un nouveau membre'}</h4>
                <form onSubmit={sauvegarderStaff} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[#6B705C] mb-1">Prénom / Nom</label>
                    <input type="text" className="w-full border rounded-lg p-2 outline-none" value={staffForm.nom} onChange={e => setStaffForm({...staffForm, nom: e.target.value})} required placeholder="Ex: Jean" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#6B705C] mb-1">Rôle</label>
                    <select className="w-full border rounded-lg p-2 outline-none" value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})}>
                      {rolesDisponibles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#6B705C] mb-1">Jours de vacances par an</label>
                    <input type="number" min="0" step="0.5" className="w-full border rounded-lg p-2 outline-none" value={staffForm.total} onChange={e => setStaffForm({...staffForm, total: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#6B705C] mb-1">Jours de repos fixes</label>
                    <input type="text" className="w-full border rounded-lg p-2 outline-none" value={staffForm.repos} onChange={e => setStaffForm({...staffForm, repos: e.target.value})} placeholder="Ex: Lundi, Mardi" />
                  </div>

                  <div className="flex gap-2 pt-2">
                    {staffForm.id && <button type="button" onClick={() => setStaffForm({id: null, nom:'', role:'Palefrenier', total:25, repos: ''})} className="w-1/3 py-2 text-gray-500 bg-white border border-gray-300 rounded-lg font-bold">Annuler</button>}
                    <button type="submit" className="flex-1 py-2 bg-[#A3B18A] hover:bg-[#8e9c76] text-white rounded-lg font-bold shadow-sm">
                      {staffForm.id ? 'Mettre à jour' : '+ Ajouter à l\'équipe'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="p-6 md:w-1/2 overflow-y-auto bg-white">
                <h4 className="font-bold text-[#3D4035] mb-4 border-b pb-2">Membres actuels</h4>
                <div className="space-y-2">
                  {membresBase.map(membre => (
                    <div key={membre.id} className="flex justify-between items-center p-2 border border-gray-100 rounded-lg hover:bg-gray-50">
                      <div>
                        <p className="font-bold text-sm text-[#3D4035]">{membre.nom}</p>
                        <p className="text-xs text-[#6B705C]">{membre.role} • {membre.total > 0 ? `${membre.total}j/an` : 'Sans quota'} {membre.repos ? `• Repos: ${membre.repos}` : ''}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => editerStaff(membre)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                        <button onClick={() => supprimerStaff(membre.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}