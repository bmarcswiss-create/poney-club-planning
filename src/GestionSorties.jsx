import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle2, Circle, Settings, Plus, Trash2, X, ClipboardList, LogOut, Check, Zap
} from 'lucide-react';
import { supabase } from './supabaseClient';

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const ACTIONS = ["Paddock", "Marcheur", "Longe", "Grand Manège", "Petit Manège"];

const GestionSorties = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('proprios'); 
  const [view, setView] = useState('jour'); 
  const [loading, setLoading] = useState(true);
  
  const [chevauxProprios, setChevauxProprios] = useState([]);
  const [chevauxClub, setChevauxClub] = useState([]);
  const [historiqueSortiesClub, setHistoriqueSortiesClub] = useState([]);

  const [newHorse, setNewHorse] = useState({ nom: '', joursSelectionnes: [], lieu: 'Grand Manège' });

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

  const handleAjouter = async () => {
    if (!newHorse.nom.trim() || newHorse.joursSelectionnes.length === 0) {
        alert("Indiquez le nom et au moins un jour.");
        return;
    }
    
    if (activeTab === 'proprios') {
      const lieuOld = newHorse.lieu.includes('Manège') ? 'Manège' : newHorse.lieu;
      const inserts = newHorse.joursSelectionnes.map(j => ({
        nom_cheval: newHorse.nom.toUpperCase(),
        jour: j,
        lieu: lieuOld
      }));
      await supabase.from('planning_sorties').insert(inserts);
    } else {
      const newC = [...chevauxClub, { 
        id: Date.now(), 
        nom: newHorse.nom.toUpperCase(), 
        planning: newHorse.joursSelectionnes.reduce((acc, j) => ({...acc, [j]: newHorse.lieu}), {}) 
      }];
      setChevauxClub(newC);
      await supabase.from('app_state').upsert([{ id: 'poney_chevaux_club', data: newC }]);
    }
    setNewHorse({ nom: '', joursSelectionnes: [], lieu: 'Grand Manège' });
    fetchInitialData();
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

  const toggleJourSelection = (jour) => {
    setNewHorse(prev => ({
      ...prev,
      joursSelectionnes: prev.joursSelectionnes.includes(jour) ? prev.joursSelectionnes.filter(j => j !== jour) : [...prev.joursSelectionnes, jour]
    }));
  };

  const handleCheckAction = async (horse, action) => {
    if (activeTab === 'proprios') {
      const isDone = horse.last_done_at === todayStr;
      await supabase.from('planning_sorties').update({ last_done_at: isDone ? null : todayStr }).eq('id', horse.id);
      fetchInitialData();
    } else {
      const key = `${todayStr}_${horse.id}_${action}`;
      const exists = historiqueSortiesClub.some(h => h.key === key);
      const newHistory = exists ? historiqueSortiesClub.filter(h => h.key !== key) : [...historiqueSortiesClub, { key, horseId: horse.id, action, date: todayStr }];
      setHistoriqueSortiesClub(newHistory);
      await supabase.from('app_state').upsert([{ id: 'poney_sorties_club_history', data: newHistory }]);
    }
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

    const allValidated = list.every(horse => {
        if (activeTab === 'proprios') return horse.last_done_at === todayStr;
        return historiqueSortiesClub.some(h => h.key === `${todayStr}_${horse.id}_VALIDATED`);
    });

    if (activeTab === 'proprios') {
      const ids = list.map(h => h.id);
      await supabase.from('planning_sorties').update({ last_done_at: allValidated ? null : todayStr }).in('id', ids);
    } else {
      let newHistory = [...historiqueSortiesClub];
      list.forEach(horse => {
        const key = `${todayStr}_${horse.id}_VALIDATED`;
        if (allValidated) { newHistory = newHistory.filter(h => h.key !== key); }
        else if (!newHistory.some(h => h.key === key)) { newHistory.push({ key, horseId: horse.id, action: 'VALIDATED', date: todayStr }); }
      });
      setHistoriqueSortiesClub(newHistory);
      await supabase.from('app_state').upsert([{ id: 'poney_sorties_club_history', data: newHistory }]);
    }
    fetchInitialData();
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1B2A49] pb-32 font-sans">
      <header className="bg-[#1B2A49] text-white px-6 pt-10 pb-8 rounded-b-[40px] shadow-xl text-center relative">
        <button onClick={() => onNavigate('accueil')} className="absolute top-8 left-6 bg-white/10 p-2 rounded-xl"><ArrowLeft size={20}/></button>
        
        {/* LE TITRE EST ICI - FORCÉ EN ORANGE POUR TESTER SI ÇA CHANGE */}
        <h1 className="font-black uppercase tracking-tighter text-xl italic text-orange-500">SORTIES CHEVAUX</h1>
        
        <div className="flex bg-white/10 p-1 rounded-2xl mt-6 w-full max-w-sm mx-auto border border-white/10">
          <button onClick={() => setActiveTab('proprios')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'proprios' ? 'bg-[#8DC63F] text-[#1B2A49]' : 'text-white'}`}>Écurie</button>
          <button onClick={() => setActiveTab('club')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'club' ? 'bg-[#8DC63F] text-[#1B2A49]' : 'text-white'}`}>Club</button>
        </div>

        <div className="flex bg-black/20 p-1 rounded-xl mt-4 w-full max-w-[160px] mx-auto border border-white/5">
          <button onClick={() => setView('jour')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${view === 'jour' ? 'bg-white text-[#1B2A49]' : 'text-white/60'}`}>Jour</button>
          <button onClick={() => setView('semaine')} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${view === 'semaine' ? 'bg-white text-[#1B2A49]' : 'text-white/60'}`}>Semaine</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {view === 'jour' ? (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-gray-50/50 border-b flex justify-between items-center">
              <h2 className="font-black uppercase text-xs text-[#8DC63F] italic">{jourActuelNom} {new Date().toLocaleDateString('fr-CH')}</h2>
              <button onClick={bulkValidate} className="flex items-center gap-2 bg-[#1B2A49] text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-[#8DC63F] hover:text-[#1B2A49] transition-all shadow-md">
                <Zap size={14} /> Tout valider
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="p-5 text-[10px] font-black uppercase text-gray-400">Cheval</th>
                    {ACTIONS.map(a => <th key={a} className="p-4 text-[9px] font-black uppercase text-gray-400 text-center">{a}</th>)}
                    <th className="p-5 text-[10px] font-black uppercase text-[#8DC63F] text-center bg-[#8DC63F]/5">OK</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'proprios' ? chevauxProprios.filter(h => (h.jour || "").toLowerCase() === jourActuelNom) : chevauxClub.filter(c => c.planning?.[jourActuelNom])).map(horse => {
                    const isValidated = activeTab === 'proprios' ? horse.last_done_at === todayStr : historiqueSortiesClub.some(h => h.key === `${todayStr}_${horse.id}_VALIDATED`);
                    return (
                      <tr key={horse.id} className={`border-b border-gray-50 transition-all ${isValidated ? 'opacity-30 bg-gray-50/50' : ''}`}>
                        <td className="p-5"><span className={`font-black uppercase text-sm ${isValidated ? 'line-through' : ''}`}>{horse.nom_cheval || horse.nom}</span></td>
                        {ACTIONS.map(action => {
                          let isDone = false; let isPlanned = false;
                          if (activeTab === 'proprios') {
                            const l = (horse.lieu || "").toLowerCase(); const a = action.toLowerCase();
                            isPlanned = (l.includes('march') && a.includes('march')) || (l.includes('man') && a.includes('grand'));
                            isDone = horse.last_done_at === todayStr && isPlanned;
                          } else {
                            isPlanned = horse.planning?.[jourActuelNom] === action;
                            isDone = historiqueSortiesClub.some(h => h.key === `${todayStr}_${horse.id}_${action}`);
                          }
                          return (
                            <td key={action} className="p-4 text-center">
                              <button onClick={() => handleCheckAction(horse, action)} className={`w-10 h-10 rounded-2xl flex items-center justify-center mx-auto transition-all ${isDone ? 'bg-[#8DC63F] text-[#1B2A49]' : isPlanned ? 'bg-amber-50 border-2 border-dashed border-amber-200 text-amber-500 shadow-sm' : 'bg-gray-50 text-gray-200 opacity-20'}`}><Check size={20} strokeWidth={4}/></button>
                            </td>
                          );
                        })}
                        <td className="p-5 text-center bg-[#8DC63F]/5">
                          <button onClick={() => toggleFullValidation(horse)} className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-all border-4 ${isValidated ? 'bg-[#8DC63F] border-[#8DC63F] text-white shadow-lg' : 'bg-white border-gray-200 text-gray-200'}`}><CheckCircle2 size={28} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-[#1B2A49] p-10 rounded-[50px] text-white shadow-2xl text-left border-b-[10px] border-[#8DC63F]">
                <h3 className="font-black uppercase text-xs mb-8 tracking-[0.2em] text-[#8DC63F]">Modifier le Planning</h3>
                <div className="space-y-8">
                  <input type="text" value={newHorse.nom} onChange={e => setNewHorse({...newHorse, nom: e.target.value})} placeholder="NOM DU CHEVAL" className="w-full bg-white/5 p-5 rounded-3xl font-black text-xl border-2 border-transparent focus:border-[#8DC63F] outline-none uppercase transition-all" />
                  <div className="flex flex-wrap gap-2">
                    {JOURS.map(j => (
                      <button key={j} onClick={() => toggleJourSelection(j)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${newHorse.joursSelectionnes.includes(j) ? 'bg-[#8DC63F] text-[#1B2A49]' : 'bg-white/5 text-white/30 hover:bg-white/10'}`}>{j.substring(0,3)}</button>
                    ))}
                    <button onClick={() => setNewHorse(p => ({...p, joursSelectionnes: JOURS}))} className="px-5 py-3 rounded-2xl text-[10px] font-black uppercase bg-[#8DC63F]/20 text-[#8DC63F] border border-[#8DC63F]/30 italic">Semaine complète</button>
                  </div>
                  <select value={newHorse.lieu} onChange={e => setNewHorse({...newHorse, lieu: e.target.value})} className="w-full bg-white/5 p-5 rounded-3xl font-black text-xs uppercase outline-none border-2 border-transparent text-white">
                    {ACTIONS.map(a => <option key={a} value={a} className="text-black">{a}</option>)}
                  </select>
                  <button onClick={handleAjouter} className="w-full bg-[#8DC63F] text-[#1B2A49] py-6 rounded-[30px] font-black uppercase tracking-widest shadow-xl transform active:scale-95 transition-transform">Valider le Planning</button>
                </div>
             </div>

             <div className="space-y-6">
                {JOURS.map(j => (
                  <div key={j} className="text-left">
                    <h4 className="font-black uppercase text-[10px] text-gray-400 mb-3 ml-4 tracking-widest">{j}</h4>
                    <div className="bg-white p-5 rounded-[30px] flex flex-wrap gap-2 shadow-sm border border-gray-100">
                       {(activeTab === 'proprios' ? chevauxProprios.filter(s => (s.jour || "").toLowerCase() === j) : chevauxClub.filter(c => c.planning?.[j])).map(s => (
                         <div key={s.id} className="bg-gray-50 pl-4 pr-2 py-2 rounded-full flex items-center gap-2 border border-gray-100 animate-in fade-in">
                           <span className="text-[10px] font-black text-[#1B2A49] uppercase">{s.nom_cheval || s.nom}</span>
                           <span className="text-[8px] opacity-40 font-bold uppercase italic">{s.lieu || s.planning?.[j]}</span>
                           <button onClick={() => handleSupprimer(s.id)} className="p-1 text-red-300 hover:text-red-500"><X size={14} /></button>
                         </div>
                       ))}
                       {(activeTab === 'proprios' ? chevauxProprios.filter(s => (s.jour || "").toLowerCase() === j).length : chevauxClub.filter(c => c.planning?.[j]).length) === 0 && (
                         <span className="text-[10px] text-gray-300 italic p-2">Rien de prévu</span>
                       )}
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