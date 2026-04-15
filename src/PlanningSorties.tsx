import React, { useState, useEffect } from 'react';
import { ArrowLeft, LayoutGrid, ClipboardList, CheckCircle2, Circle, Plus, X, Trash2 } from 'lucide-react';
import { supabase } from './supabaseClient';

const PlanningSorties = ({ onNavigate }) => {
  const [sorties, setSorties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('jour'); // 'jour' ou 'semaine'
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const [newSoin, setNewSoin] = useState({ nom: '', jour: 'Lundi', lieu: 'Manège' });

  const jourActuel = jours[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const todayStr = new Date().toLocaleDateString('en-CA');

  useEffect(() => {
    fetchSorties();
  }, []);

  const fetchSorties = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('planning_sorties').select('*');
    if (!error) setSorties(data);
    setLoading(false);
  };

  const toggleCheck = async (id, lastDone) => {
    const isDoneToday = lastDone === todayStr;
    const { error } = await supabase
      .from('planning_sorties')
      .update({ last_done_at: isDoneToday ? null : todayStr })
      .eq('id', id);
    if (!error) fetchSorties();
  };

  const ajouterSortie = async () => {
    if (!newSoin.nom) return;
    const { error } = await supabase.from('planning_sorties').insert([{
      nom_cheval: newSoin.nom.toUpperCase(),
      jour: newSoin.jour,
      lieu: newSoin.lieu
    }]);
    if (!error) {
      setNewSoin({ ...newSoin, nom: '' });
      fetchSorties();
    }
  };

  const supprimerSortie = async (id) => {
    const { error } = await supabase.from('planning_sorties').delete().eq('id', id);
    if (!error) fetchSorties();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 font-sans text-[#1B2A49]">
      <header className="bg-[#1B2A49] px-6 pt-12 pb-10 rounded-b-[45px] shadow-xl relative text-white text-center">
        <button onClick={() => onNavigate('accueil')} className="absolute top-8 left-6 bg-white/10 p-2 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        
        <h1 className="font-black uppercase tracking-tighter text-xl">Planning Sorties</h1>
        
        <div className="flex bg-white/10 p-1 rounded-2xl mt-6 w-full max-w-[200px] mx-auto">
          <button onClick={() => setView('jour')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'jour' ? 'bg-[#8DC63F] text-[#1B2A49]' : 'text-white'}`}>Jour</button>
          <button onClick={() => setView('semaine')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'semaine' ? 'bg-[#8DC63F] text-[#1B2A49]' : 'text-white'}`}>Semaine</button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6">
        {view === 'jour' ? (
          <div className="space-y-8 animate-in fade-in duration-300 text-left">
            <h2 className="text-2xl font-black uppercase tracking-tighter ml-2 italic text-[#8DC63F]">{jourActuel}</h2>
            
            {['Manège', 'Marcheur'].map(lieu => (
              <div key={lieu} className="space-y-3">
                <div className="flex items-center gap-2 mb-2 ml-2">
                   <div className="w-1.5 h-6 bg-[#8DC63F] rounded-full"></div>
                   <h3 className="font-black uppercase text-xs tracking-widest opacity-40">{lieu}</h3>
                </div>
                {sorties.filter(s => s.jour === jourActuel && s.lieu === lieu).map(s => {
                  const done = s.last_done_at === todayStr;
                  return (
                    <div key={s.id} onClick={() => toggleCheck(s.id, s.last_done_at)} className={`flex items-center justify-between p-5 rounded-[30px] border-2 transition-all ${done ? 'bg-gray-100 border-transparent opacity-40' : 'bg-white border-white shadow-sm'}`}>
                      <span className={`font-black uppercase ${done ? 'line-through' : ''}`}>{s.nom_cheval}</span>
                      {done ? <CheckCircle2 className="text-[#8DC63F]" size={24} /> : <Circle className="text-gray-200" size={24} />}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            {/* VUE SEMAINE POUR MODIFIER LE TABLEAU */}
            <div className="bg-white p-6 rounded-[35px] shadow-xl border-2 border-[#8DC63F]/20 mb-8">
              <h3 className="font-black uppercase text-sm mb-4">Ajout rapide</h3>
              <div className="space-y-3">
                <input type="text" value={newSoin.nom} onChange={e => setNewSoin({...newSoin, nom: e.target.value})} placeholder="NOM DU CHEVAL" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[#8DC63F]" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={newSoin.jour} onChange={e => setNewSoin({...newSoin, jour: e.target.value})} className="bg-gray-50 p-3 rounded-xl font-bold text-xs uppercase outline-none">
                    {jours.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                  <select value={newSoin.lieu} onChange={e => setNewSoin({...newSoin, lieu: e.target.value})} className="bg-gray-50 p-3 rounded-xl font-bold text-xs uppercase outline-none">
                    <option value="Manège">Manège</option>
                    <option value="Marcheur">Marcheur</option>
                  </select>
                </div>
                <button onClick={ajouterSortie} className="w-full bg-[#1B2A49] text-white py-4 rounded-2xl font-black uppercase text-xs mt-2">Ajouter au tableau</button>
              </div>
            </div>

            {jours.map(j => (
              <div key={j} className="text-left">
                <h4 className={`font-black uppercase text-[10px] tracking-[0.3em] mb-3 ml-4 ${j === jourActuel ? 'text-[#8DC63F]' : 'text-gray-300'}`}>{j}</h4>
                <div className="bg-white rounded-[30px] p-2 shadow-sm flex flex-wrap gap-2 border border-gray-100">
                  {sorties.filter(s => s.jour === j).map(s => (
                    <div key={s.id} className="bg-gray-50 px-4 py-2 rounded-full flex items-center gap-2 border border-gray-100">
                      <span className="text-[10px] font-black uppercase">{s.nom_cheval}</span>
                      <button onClick={() => supprimerSortie(s.id)}><X size={14} className="text-red-400" /></button>
                    </div>
                  ))}
                  {sorties.filter(s => s.jour === j).length === 0 && <span className="text-[9px] uppercase font-bold text-gray-300 p-3 italic">Aucune sortie</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default PlanningSorties;