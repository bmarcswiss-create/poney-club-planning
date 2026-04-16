import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Circle, X, PlusCircle } from 'lucide-react';
import { supabase } from './supabaseClient';

const PlanningSorties: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [sorties, setSorties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'jour' | 'semaine'>('jour');
  
  // On définit les jours en minuscules pour la comparaison
  const joursRef = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const date = new Date();
  const jourActuel = joursRef[date.getDay()];
  const todayStr = date.toLocaleDateString('en-CA');

  const [newHorse, setNewHorse] = useState({ nom: '', jour: jourActuel, lieu: 'Manège' });

  useEffect(() => {
    fetchSorties();
  }, []);

  const fetchSorties = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('planning_sorties').select('*');
    if (!error) setSorties(data || []);
    setLoading(false);
  };

  const toggleCheck = async (id: number, lastDone: string) => {
    const isDoneToday = lastDone === todayStr;
    const { error } = await supabase
      .from('planning_sorties')
      .update({ last_done_at: isDoneToday ? null : todayStr })
      .eq('id', id);
    if (!error) fetchSorties();
  };

  const ajouterSortie = async () => {
    if (!newHorse.nom.trim()) return;
    const { error } = await supabase.from('planning_sorties').insert([{
      nom_cheval: newHorse.nom.toUpperCase(),
      jour: newHorse.jour, // On garde le format du sélecteur
      lieu: newHorse.lieu
    }]);
    if (!error) {
      setNewHorse({ ...newHorse, nom: '' });
      fetchSorties();
    }
  };

  const supprimerSortie = async (id: number) => {
    const { error } = await supabase.from('planning_sorties').delete().eq('id', id);
    if (!error) fetchSorties();
  };

  // FONCTION DE NETTOYAGE (La clé du problème)
  const comparerJours = (jourBase: string, jourCible: string) => {
    if (!jourBase || !jourCible) return false;
    return jourBase.trim().toLowerCase() === jourCible.trim().toLowerCase();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 font-sans text-[#1B2A49]">
      <header className="bg-[#1B2A49] px-6 pt-12 pb-10 rounded-b-[45px] shadow-xl relative text-white text-center">
        <button onClick={() => onNavigate('accueil')} className="absolute top-8 left-6 bg-white/10 p-2 rounded-xl text-white">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-black uppercase tracking-tighter text-xl text-white">Sorties Propriétaires</h1>
        <div className="flex bg-white/10 p-1 rounded-2xl mt-6 w-full max-w-[200px] mx-auto">
          <button onClick={() => setView('jour')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'jour' ? 'bg-[#8DC63F] text-[#1B2A49]' : 'text-white'}`}>Jour</button>
          <button onClick={() => setView('semaine')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${view === 'semaine' ? 'bg-[#8DC63F] text-[#1B2A49]' : 'text-white'}`}>Semaine</button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6">
        {loading ? (
          <div className="text-center p-10 opacity-20 font-black uppercase text-[10px]">Chargement...</div>
        ) : view === 'jour' ? (
          <div className="space-y-8 text-left">
            <h2 className="text-2xl font-black uppercase tracking-tighter ml-2 italic text-[#8DC63F]">{jourActuel}</h2>
            {['Manège', 'Marcheur'].map(lieu => {
              // On utilise la fonction de comparaison robuste
              const listeFiltree = sorties.filter(s => 
                comparerJours(s.jour, jourActuel) && s.lieu === lieu
              );

              return (
                <div key={lieu} className="space-y-3">
                  <h3 className="font-black uppercase text-xs tracking-widest opacity-40 ml-2">{lieu}</h3>
                  {listeFiltree.length === 0 ? (
                    <p className="text-[10px] text-gray-300 ml-4 italic">Aucune sortie pour ce lieu</p>
                  ) : (
                    listeFiltree.map(s => (
                      <div key={s.id} onClick={() => toggleCheck(s.id, s.last_done_at)} className={`flex items-center justify-between p-5 rounded-[30px] border-2 transition-all ${s.last_done_at === todayStr ? 'bg-gray-50 border-transparent opacity-40' : 'bg-white border-white shadow-sm'}`}>
                        <span className={`font-black uppercase ${s.last_done_at === todayStr ? 'line-through text-gray-400' : 'text-[#1B2A49]'}`}>{s.nom_cheval}</span>
                        {s.last_done_at === todayStr ? <CheckCircle2 className="text-[#8DC63F]" size={24} /> : <Circle className="text-gray-200" size={24} />}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[35px] shadow-xl border-2 border-[#8DC63F]/20 text-left">
              <h3 className="font-black uppercase text-xs mb-4 flex items-center gap-2">
                <PlusCircle size={16} className="text-[#8DC63F]" /> Ajouter une sortie
              </h3>
              <div className="space-y-3">
                <input type="text" value={newHorse.nom} onChange={e => setNewHorse({...newHorse, nom: e.target.value})} placeholder="NOM DU CHEVAL" className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-[#8DC63F]/30 uppercase" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={newHorse.jour} onChange={e => setNewHorse({...newHorse, jour: e.target.value})} className="bg-gray-50 p-3 rounded-xl font-bold text-[10px] uppercase outline-none">
                    {joursRef.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                  <select value={newHorse.lieu} onChange={e => setNewHorse({...newHorse, lieu: e.target.value})} className="bg-gray-50 p-3 rounded-xl font-bold text-[10px] uppercase outline-none">
                    <option value="Manège">Manège</option>
                    <option value="Marcheur">Marcheur</option>
                  </select>
                </div>
                <button onClick={ajouterSortie} className="w-full bg-[#1B2A49] text-white py-4 rounded-2xl font-black uppercase text-[10px] mt-2">Ajouter au planning</button>
              </div>
            </div>

            <div className="space-y-4">
               {joursRef.map(j => (
                 <div key={j} className="text-left">
                   <h4 className="font-black uppercase text-[9px] text-gray-400 mb-2 ml-2 tracking-widest">{j}</h4>
                   <div className="bg-white p-4 rounded-[25px] flex flex-wrap gap-2 shadow-sm border border-gray-100">
                      {sorties.filter(s => comparerJours(s.jour, j)).map(s => (
                        <div key={s.id} className="bg-gray-50 pl-3 pr-1 py-1 rounded-full flex items-center gap-1 border border-gray-100">
                          <span className="text-[9px] font-black text-[#1B2A49] uppercase">{s.nom_cheval}</span>
                          <button onClick={() => supprimerSortie(s.id)} className="p-1 text-red-300 hover:text-red-500"><X size={12} /></button>
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

export default PlanningSorties;