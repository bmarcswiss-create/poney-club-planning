import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Circle, X } from 'lucide-react';
import { supabase } from './supabaseClient';

const PlanningSorties: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [sorties, setSorties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'jour' | 'semaine'>('jour');
  
  const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const jourActuel = jours[new Date().getDay()];
  const todayStr = new Date().toLocaleDateString('en-CA');

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

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 font-sans text-[#1B2A49]">
      <header className="bg-[#1B2A49] px-6 pt-12 pb-10 rounded-b-[45px] shadow-xl relative text-white text-center">
        <button onClick={() => onNavigate('accueil')} className="absolute top-8 left-6 bg-white/10 p-2 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-black uppercase tracking-tighter text-xl text-white">Planning Sorties</h1>
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
              const listeFiltree = sorties.filter(s => s.jour?.toLowerCase() === jourActuel.toLowerCase() && s.lieu === lieu);
              return (
                <div key={lieu} className="space-y-3">
                  <h3 className="font-black uppercase text-xs tracking-widest opacity-40 ml-2">{lieu}</h3>
                  {listeFiltree.map(s => (
                    <div key={s.id} onClick={() => toggleCheck(s.id, s.last_done_at)} className={`flex items-center justify-between p-5 rounded-[30px] border-2 transition-all ${s.last_done_at === todayStr ? 'bg-gray-50 border-transparent opacity-40' : 'bg-white border-white shadow-sm'}`}>
                      <span className={`font-black uppercase ${s.last_done_at === todayStr ? 'line-through text-gray-400' : 'text-[#1B2A49]'}`}>{s.nom_cheval}</span>
                      {s.last_done_at === todayStr ? <CheckCircle2 className="text-[#8DC63F]" size={24} /> : <Circle className="text-gray-200" size={24} />}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
             {jours.map(j => (
               <div key={j} className="text-left">
                 <h4 className="font-black uppercase text-[9px] text-gray-400 mb-2 ml-2 tracking-widest">{j}</h4>
                 <div className="bg-white p-4 rounded-[25px] flex flex-wrap gap-2 shadow-sm border border-gray-50">
                    {sorties.filter(s => s.jour?.toLowerCase() === j).map(s => (
                      <span key={s.id} className="bg-gray-50 px-3 py-1.5 rounded-full text-[10px] font-black text-[#1B2A49] border border-gray-100 uppercase">{s.nom_cheval}</span>
                    ))}
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