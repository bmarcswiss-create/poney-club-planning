import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle2, Circle, Plus, X, Zap, Edit2
} from 'lucide-react';
import { supabase } from './supabaseClient';

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const ACTIONS = ["", "Paddock", "Marcheur", "Longe", "Grand Manège", "Petit Manège"];

const GestionSorties = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('proprios'); 
  const [view, setView] = useState('jour'); 
  const [loading, setLoading] = useState(true);
  
  const [chevauxProprios, setChevauxProprios] = useState([]);
  const [chevauxClub, setChevauxClub] = useState([]);
  const [historiqueSortiesClub, setHistoriqueSortiesClub] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [originalName, setOriginalName] = useState(''); 
  const [newHorse, setNewHorse] = useState({ nom: '', joursSelectionnes: [], lieu: '' });

  const todayStr = new Date().toLocaleDateString('en-CA');
  const jourActuelNom = JOURS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
        const { data: dataProprios } = await supabase.from('planning_sorties').select('*');
        if (dataProprios) setChevauxProprios(dataProprios);

        const { data: state } = await supabase.from('app_state').select('*');
        if (state) {
          const map = {}; state.forEach(r => map[r.id] = r.data);
          setChevauxClub(map.poney_chevaux_club || []);
          setHistoriqueSortiesClub(map.poney_sorties_club_history || []);
        }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // FONCTION DE NETTOYAGE (Anti-accents et caractères spéciaux)
  const cleanString = (str) => {
    if (!str) return "";
    return str
      .normalize("NFD") // Sépare l'accent de la lettre
      .replace(/[\u0300-\u036f]/g, "") // Supprime l'accent
      .toUpperCase()
      .trim();
  };

  const handleAjouter = async () => {
    const cleanNom = cleanString(newHorse.nom);
    
    if (!cleanNom || newHorse.joursSelectionnes.length === 0) {
        alert("Nom et jours requis.");
        return;
    }
    
    if (activeTab === 'proprios') {
      if (editingId) {
        const nameToDelete = cleanString(originalName) || cleanNom;
        await supabase.from('planning_sorties').delete().eq('nom_cheval', nameToDelete);
      }

      const inserts = newHorse.joursSelectionnes.map(j => ({
        nom_cheval: cleanNom,
        jour: j,
        lieu: cleanString(newHorse.lieu) // Nettoyage du lieu aussi
      }));
      await supabase.from('planning_sorties').insert(inserts);
    } else {
      let newC;
      if (editingId) {
        newC = chevauxClub.map(c => c.id === editingId ? { 
          ...c, nom: cleanNom, 
          planning: newHorse.joursSelectionnes.reduce((acc, j) => ({...acc, [j]: 'Sortie'}), {}) 
        } : c);
      } else {
        newC = [...chevauxClub, { 
          id: Date.now(), nom: cleanNom, 
          planning: newHorse.joursSelectionnes.reduce((acc, j) => ({...acc, [j]: 'Sortie'}), {}) 
        }];
      }
      setChevauxClub(newC);
      await supabase.from('app_state').upsert([{ id: 'poney_chevaux_club', data: newC }]);
    }

    setNewHorse({ nom: '', joursSelectionnes: [], lieu: '' });
    setEditingId(null);
    setOriginalName('');
    setView('jour');
    fetchInitialData();
  };

  const handleEdit = (horse) => {
    setView('semaine');
    
    const nom = cleanString(horse?.nom_cheval || horse?.nom);
    let joursSelectionnes = [];
    
    if (activeTab === 'proprios') {
      joursSelectionnes = chevauxProprios
        .filter(h => cleanString(h.nom_cheval) === nom)
        .map(h => h.jour?.toLowerCase());
    } else {
      joursSelectionnes = Object.keys(horse?.planning || {}).filter(j => horse.planning[j]);
    }

    setNewHorse({ 
      nom, 
      joursSelectionnes, 
      lieu: horse?.lieu || '' 
    });
    setEditingId(horse?.id || Date.now());
    setOriginalName(nom);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSupprimer = async (id) => {
    if (!confirm("Supprimer ce cheval ?")) return;
    if (activeTab === 'proprios') {
      await supabase.from('planning_sorties').delete().eq('id', id);
    } else {
      const newC = chevauxClub.filter(c => c.id !== id);
      setChevauxClub(newC);
      await supabase.from('app_state').upsert([{ id: 'poney_chevaux_club', data: newC }]);
    }
    fetchInitialData();
  };

  const toggleFullValidation = async (horse) => {
    const key = `${todayStr}_${horse.id}_VALIDATED`;
    const isAlreadyValidated = activeTab === 'proprios' 
      ? horse.last_done_at === todayStr 
      : historiqueSortiesClub.some(h => h.key === key);

    if (activeTab === 'proprios') {
      await supabase.from('planning_sorties').update({ last_done_at: isAlreadyValidated ? null : todayStr }).eq('id', horse.id);
      fetchInitialData();
    } else {
      const newHistory = isAlreadyValidated 
        ? historiqueSortiesClub.filter(h => h.key !== key) 
        : [...historiqueSortiesClub, { key, horseId: horse.id, action: 'VALIDATED', date: todayStr }];
      setHistoriqueSortiesClub(newHistory);
      await supabase.from('app_state').upsert([{ id: 'poney_sorties_club_history', data: newHistory }]);
    }
  };

  const bulkValidate = async () => {
    const list = activeTab === 'proprios' 
      ? chevauxProprios.filter(h => (h.jour || "").toLowerCase() === jourActuelNom)
      : chevauxClub.filter(c => c.planning?.[jourActuelNom]);
    const allValidated = list.every(horse => activeTab === 'proprios' ? horse.last_done_at === todayStr : historiqueSortiesClub.some(h => h.key === `${todayStr}_${horse.id}_VALIDATED`));

    if (activeTab === 'proprios') {
      await supabase.from('planning_sorties').update({ last_done_at: allValidated ? null : todayStr }).in('id', list.map(h => h.id));
    } else {
      let newHistory = [...historiqueSortiesClub];
      list.forEach(horse => {
        const key = `${todayStr}_${horse.id}_VALIDATED`;
        if (allValidated) newHistory = newHistory.filter(h => h.key !== key);
        else if (!newHistory.some(h => h.key === key)) newHistory.push({ key, horseId: horse.id, action: 'VALIDATED', date: todayStr });
      });
      setHistoriqueSortiesClub(newHistory);
      await supabase.from('app_state').upsert([{ id: 'poney_sorties_club_history', data: newHistory }]);
    }
    fetchInitialData();
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1B2A49] pb-32 font-sans">
      <header className="bg-[#1B2A49] text-white px-6 pt-10 pb-8 rounded-b-[40px] shadow-xl text-center relative">
        <button onClick={() => onNavigate('accueil')} className="absolute top-8 left-6 bg-white/10 p-2 rounded-xl active:scale-90 transition-all"><ArrowLeft size={20}/></button>
        <button onClick={() => { setEditingId(null); setOriginalName(''); setNewHorse({ nom: '', joursSelectionnes: [], lieu: '' }); setView('semaine'); }} className="absolute top-8 right-6 bg-[#8DC63F] text-[#1B2A49] p-2.5 rounded-xl shadow-lg active:scale-90 transition-all border border-[#8DC63F]/50"><Plus size={20} strokeWidth={4} /></button>
        <h1 className="font-black uppercase tracking-tighter text-xl italic">SORTIES CHEVAUX</h1>
        <div className="flex bg-white/10 p-1 rounded-2xl mt-6 w-full max-sm mx-auto border border-white/10">
          <button onClick={() => setActiveTab('proprios')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'proprios' ? 'bg-[#8DC63F] text-[#1B2A49]' : 'text-white'}`}>propriétaires</button>
          <button onClick={() => setActiveTab('club')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'club' ? 'bg-[#8DC63F] text-[#1B2A49]' : 'text-white'}`}>Club</button>
        </div>
        <div className="flex bg-black/20 p-1 rounded-xl mt-4 w-full max-w-[160px] mx-auto border border-white/5">
          <button onClick={() => setView('jour')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${view === 'jour' ? 'bg-white text-[#1B2A49]' : 'text-white/60'}`}>Jour</button>
          <button onClick={() => setView('semaine')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${view === 'semaine' ? 'bg-white text-[#1B2A49]' : 'text-white/60'}`}>Semaine</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {view === 'jour' ? (
          <div className="space-y-4 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center px-4 mb-2">
              <h2 className="font-black uppercase text-xs text-[#8DC63F] italic">{jourActuelNom} {new Date().toLocaleDateString('fr-CH')}</h2>
              <button onClick={bulkValidate} className="flex items-center gap-2 bg-[#1B2A49] text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-[#8DC63F] transition-all shadow-md"><Zap size={14} /> Tout valider</button>
            </div>
            <div className="space-y-3">
              {(activeTab === 'proprios' ? chevauxProprios.filter(h => (h.jour || "").toLowerCase() === jourActuelNom) : chevauxClub.filter(c => c.planning?.[jourActuelNom])).map(horse => {
                const isValidated = activeTab === 'proprios' ? horse.last_done_at === todayStr : historiqueSortiesClub.some(h => h.key === `${todayStr}_${horse.id}_VALIDATED`);
                const spec = activeTab === 'proprios' ? horse.lieu : (horse.planning?.[jourActuelNom] !== 'Sortie' ? horse.planning?.[jourActuelNom] : null);
                return (
                  <div key={horse.id} className={`bg-white rounded-[30px] p-5 flex items-center justify-between shadow-sm border border-gray-100 transition-all ${isValidated ? 'opacity-40 bg-gray-50/50' : ''}`}>
                    <div className="flex flex-col text-left">
                      <span className={`font-black uppercase text-sm tracking-tight ${isValidated ? 'line-through text-gray-400' : 'text-[#1B2A49]'}`}>{horse.nom_cheval || horse.nom}</span>
                      {spec && spec !== 'Sortie' && (
                        <span className="text-[10px] font-bold text-[#8DC63F] italic uppercase mt-0.5">{spec}</span>
                      )}
                    </div>
                    <button onClick={() => toggleFullValidation(horse)} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border-4 ${isValidated ? 'bg-[#8DC63F] border-[#8DC63F] text-white shadow-lg' : 'bg-white border-gray-200 text-gray-200 active:scale-90'}`}><CheckCircle2 size={28} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-[#1B2A49] p-10 rounded-[50px] text-white shadow-2xl text-left border-b-[10px] border-[#8DC63F]">
                <h3 className="font-black uppercase text-xs mb-8 tracking-[0.2em] text-[#8DC63F]">{editingId ? "Modifier le cheval" : "Ajouter un cheval"}</h3>
                <div className="space-y-8">
                  <input type="text" value={newHorse.nom} onChange={e => setNewHorse({...newHorse, nom: e.target.value})} placeholder="NOM DU CHEVAL" className="w-full bg-white/5 p-5 rounded-3xl font-black text-xl border-2 border-transparent focus:border-[#8DC63F] outline-none uppercase transition-all" />
                  <div className="flex flex-wrap gap-2">
                    {JOURS.map(j => (
                      <button key={j} onClick={() => { const js = newHorse.joursSelectionnes; setNewHorse({...newHorse, joursSelectionnes: js.includes(j) ? js.filter(x => x !== j) : [...js, j]}); }} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${newHorse.joursSelectionnes.includes(j) ? 'bg-[#8DC63F] text-[#1B2A49]' : 'bg-white/5 text-white/30'}`}>{j.substring(0,3)}</button>
                    ))}
                  </div>
                  {activeTab === 'proprios' && (
                    <select value={newHorse.lieu} onChange={e => setNewHorse({...newHorse, lieu: e.target.value})} className="w-full bg-white/5 p-5 rounded-3xl font-black text-xs uppercase text-white border-2 border-transparent outline-none">
                      {ACTIONS.map(a => <option key={a} value={a} className="text-black">{a === "" ? "Rien (Standard)" : a}</option>)}
                    </select>
                  )}
                  <button onClick={handleAjouter} className="w-full bg-[#8DC63F] text-[#1B2A49] py-6 rounded-[30px] font-black uppercase shadow-xl active:scale-95 transition-transform">{editingId ? "Sauvegarder" : "Valider"}</button>
                </div>
             </div>
             <div className="space-y-6">
                {JOURS.map(j => (
                  <div key={j} className="text-left">
                    <h4 className="font-black uppercase text-[10px] text-gray-400 mb-3 ml-4 tracking-widest">{j}</h4>
                    <div className="bg-white p-5 rounded-[30px] flex flex-wrap gap-2 shadow-sm border border-gray-100">
                       {(activeTab === 'proprios' ? chevauxProprios.filter(s => (s.jour || "").toLowerCase() === j) : chevauxClub.filter(c => c.planning?.[j])).map(s => (
                         <div key={s.id} className="bg-gray-50 pl-4 pr-3 py-2 rounded-full flex items-center gap-2 border border-gray-100">
                           <span className="text-[10px] font-black text-[#1B2A49] uppercase">{s.nom_cheval || s.nom}</span>
                           {activeTab === 'proprios' && s.lieu && <span className="text-[8px] opacity-40 font-bold uppercase italic">{s.lieu}</span>}
                           
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleEdit(s); }} 
                             className="relative z-10 p-2 bg-[#8DC63F]/10 rounded-lg text-[#8DC63F] hover:bg-[#8DC63F] hover:text-white transition-all ml-2"
                           >
                             <Edit2 size={13} />
                           </button>
                           
                           <button onClick={() => handleSupprimer(s.id)} className="p-1 text-red-300 hover:text-red-500 transition-colors">
                             <X size={14} />
                           </button>
                         </div>
                       ))}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GestionSorties;