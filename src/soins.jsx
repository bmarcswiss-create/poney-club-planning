import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X, Trash2, Pill, Clock, Edit3, AlertTriangle, Calendar as CalendarIcon, Apple } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'sb_publishable_azT_rAkqeE-zsnvolYSY9w_7MtlnBVI';
const supabase = createClient(supabaseUrl, supabaseKey);

const Soins = ({ onNavigate }) => {
  const [soins, setSoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    cheval: '', traitement: '', dosage: '',
    matin: false, midi: false, soir: false,
    date_debut: '', date_fin: '', notes: '', 
    type: 'soin', badge_alerte: ''
  });

  useEffect(() => {
    fetchSoins();
    localStorage.setItem('lastVisitSoins', Date.now().toString());
  }, []);

  const fetchSoins = async () => {
    try {
      const { data, error } = await supabase
        .from('soins')
        .select('*')
        .eq('termine', false)
        .order('cheval', { ascending: true });
      if (!error) setSoins(data || []);
    } catch (err) {
      console.error("Erreur fetch:", err);
    }
    setLoading(false);
  };

  const handleOpenModal = (soin = null) => {
    if (soin) {
      setEditingId(soin.id);
      setFormData({
        cheval: soin.cheval || '',
        traitement: soin.traitement || '',
        dosage: soin.dosage || '',
        matin: !!soin.matin,
        midi: !!soin.midi,
        soir: !!soin.soir,
        date_debut: soin.date_debut || '',
        date_fin: soin.date_fin || '',
        notes: soin.notes || '',
        type: soin.type || 'soin',
        badge_alerte: soin.badge_alerte || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        cheval: '', traitement: '', dosage: '',
        matin: false, midi: false, soir: false,
        date_debut: '', date_fin: '', notes: '', 
        type: 'soin', badge_alerte: ''
      });
    }
    setIsModalOpen(true);
  };

  const enregistrerSoin = async () => {
    if (!formData.cheval || !formData.traitement) return;
    
    const payload = { 
      ...formData, 
      date_debut: formData.date_debut === "" ? null : formData.date_debut,
      date_fin: formData.date_fin === "" ? null : formData.date_fin 
    };
    delete payload.id;

    let error;
    if (editingId) {
      const { error: err } = await supabase.from('soins').update(payload).eq('id', editingId);
      error = err;
    } else {
      const { error: err } = await supabase.from('soins').insert([payload]);
      error = err;
    }
    if (!error) { fetchSoins(); setIsModalOpen(false); }
  };

  const supprimerSoin = async (id) => {
    if (window.confirm("Supprimer cet élément ?")) {
      const { error } = await supabase.from('soins').delete().eq('id', id);
      if (!error) fetchSoins();
    }
  };

  const renderSoinCard = (s) => {
    const estFutur = s.date_debut && new Date(s.date_debut) > new Date().setHours(0,0,0,0);
    const estSoin = s.type === 'soin' || !s.type;
    
    return (
      <div key={s.id} className={`bg-white p-6 rounded-[35px] shadow-sm border-2 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all border-white ${estFutur ? 'opacity-60 scale-[0.98]' : ''}`}>
        
        <div className="flex-1 text-left flex items-start gap-4">
          <div className={`p-3 rounded-2xl ${estSoin ? 'bg-red-50 text-red-500' : 'bg-[#8DC63F]/10 text-[#8DC63F]'}`}>
            {estSoin ? <Pill size={24} /> : <Apple size={24} />}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-black text-xl text-[#1B2A49] uppercase tracking-tighter text-left">{s.cheval}</span>
              
              {s.badge_alerte && (
                <span className="bg-red-500 text-white text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-sm uppercase">
                  <AlertTriangle size={12}/> {s.badge_alerte}
                </span>
              )}

              {estFutur && (
                <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1 border border-blue-100 uppercase">
                  <CalendarIcon size={12}/> PRÉVU LE {new Date(s.date_debut).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className="text-blue-600 font-black text-sm uppercase">{s.traitement}</span>
              {s.dosage && <span className="text-gray-400 font-bold text-xs italic">{s.dosage}</span>}
            </div>

            {s.notes && (
              <div className="mt-4 text-[11px] font-bold text-[#1B2A49]/70 bg-gray-50/50 p-4 rounded-2xl border-l-4 border-blue-400 flex items-start gap-2 italic">
                <span className="text-blue-400 text-lg leading-none opacity-50 font-serif">"</span>
                <div className="whitespace-pre-line text-left">{s.notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['matin', 'midi', 'soir'].map(moment => s[moment] && (
            <div key={moment} className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-[10px] uppercase shadow-sm ${moment === 'matin' ? 'bg-orange-100 text-orange-600' : moment === 'midi' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
              <Clock size={14} /> {moment}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0">
          <div className="text-right px-4">
            <span className="block text-[8px] font-black uppercase text-gray-400 tracking-widest">Période</span>
            <span className="text-[10px] font-black text-[#1B2A49] uppercase">
              {s.date_fin ? `Jusqu'au ${new Date(s.date_fin).toLocaleDateString()}` : 'Continu'}
            </span>
          </div>
          <button onClick={() => handleOpenModal(s)} className="p-4 bg-gray-50 text-gray-400 hover:text-blue-500 rounded-2xl transition-all"><Edit3 size={20} /></button>
          <button onClick={() => supprimerSoin(s.id)} className="p-4 bg-gray-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all"><Trash2 size={20} /></button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-screen font-black text-gray-200 uppercase text-xs tracking-widest">Chargement...</div>;

  const listeTraitements = soins.filter(s => s.type === 'soin' || !s.type);
  const listeComplements = soins.filter(s => s.type === 'complement');

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-40">
      <header className="bg-[#1B2A49] p-8 pt-12 rounded-b-[45px] shadow-xl text-center relative text-white">
        <Pill size={32} className="text-red-400 mx-auto mb-2" />
        <h1 className="font-black uppercase text-xl tracking-tighter">Soins & Compléments</h1>
      </header>

      <main className="max-w-5xl mx-auto p-4 mt-4">
        <button onClick={() => handleOpenModal()} className="w-full bg-white border-2 border-dashed border-gray-200 p-8 rounded-[40px] text-gray-400 font-black text-[10px] mb-8 flex flex-col items-center gap-2 uppercase tracking-widest active:scale-95 transition-all">
          <Plus size={24}/> AJOUTER UN ÉLÉMENT
        </button>

        <section>
          <div className="flex items-center gap-3 mb-6 ml-4 text-left">
            <Pill size={20} className="text-red-500" />
            <h2 className="font-black text-xs uppercase tracking-widest text-[#1B2A49]">Traitements Médicaux</h2>
          </div>
          <div className="space-y-4">{listeTraitements.map(renderSoinCard)}</div>
        </section>

        <div className="my-14 border-t-2 border-dashed border-gray-200 relative">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#F8FAFC] px-6">
            <Apple size={24} className="text-[#8DC63F]" />
          </span>
        </div>

        <section>
          <div className="flex items-center gap-3 mb-6 ml-4 text-left">
            <Apple size={20} className="text-[#8DC63F]" />
            <h2 className="font-black text-xs uppercase tracking-widest text-[#1B2A49]">Compléments & Rations</h2>
          </div>
          <div className="space-y-4">{listeComplements.map(renderSoinCard)}</div>
        </section>
      </main>

      {/* CAPSULE DE RETOUR BOARD (Comme Urgences) */}
      <footer className="fixed bottom-8 left-0 right-0 p-8 z-40 flex justify-center pointer-events-none">
        <button 
          onClick={() => onNavigate('accueil')}
          className="bg-[#1B2A49] text-white px-8 py-4 rounded-full shadow-2xl pointer-events-auto active:scale-95 transition-all font-black uppercase text-[10px] tracking-widest border border-white/10 flex items-center gap-3"
        >
          <ArrowLeft size={16} /> Retour Board
        </button>
      </footer>

      {isModalOpen && (
        <div className="fixed inset-0 bg-[#1B2A49]/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[45px] p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-left">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-lg uppercase text-[#1B2A49] tracking-tighter">{editingId ? 'Modifier' : 'Nouveau'} Élément</h2>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-2 p-1.5 bg-gray-100 rounded-[22px]">
                <button onClick={() => setFormData({...formData, type: 'soin'})} className={`flex-1 py-3 rounded-[18px] font-black text-[10px] uppercase transition-all ${formData.type === 'soin' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>SOIN</button>
                <button onClick={() => setFormData({...formData, type: 'complement'})} className={`flex-1 py-3 rounded-[18px] font-black text-[10px] uppercase transition-all ${formData.type === 'complement' ? 'bg-white text-[#8DC63F] shadow-sm' : 'text-gray-400'}`}>COMPLÉMENT</button>
              </div>

              <input type="text" placeholder="NOM DU CHEVAL" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none uppercase" 
                value={formData.cheval} onChange={e => setFormData({...formData, cheval: e.target.value.toUpperCase()})} />
              
              <div className="flex gap-2">
                <input type="text" placeholder="BADGE ROUGE (ex: DOPANT)" className="w-1/2 bg-red-50 border-2 border-red-100 text-red-600 rounded-2xl p-4 font-black text-[10px] outline-none placeholder:text-red-200" 
                  value={formData.badge_alerte} onChange={e => setFormData({...formData, badge_alerte: e.target.value.toUpperCase()})} />
                <input type="text" placeholder="DOSAGE" className="w-1/2 bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none" 
                  value={formData.dosage} onChange={e => setFormData({...formData, dosage: e.target.value})} />
              </div>

              <input type="text" placeholder="MÉDICAMENT / COMPLÉMENT" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold text-blue-600 outline-none" 
                value={formData.traitement} onChange={e => setFormData({...formData, traitement: e.target.value})} />
              
              <div className="grid grid-cols-3 gap-2">
                {['matin', 'midi', 'soir'].map(m => (
                  <button key={m} onClick={() => setFormData({...formData, [m]: !formData[m]})}
                    className={`p-3 rounded-2xl font-black uppercase text-[10px] border-2 transition-all ${formData[m] ? 'bg-[#1B2A49] border-[#1B2A49] text-white shadow-lg' : 'bg-white border-gray-100 text-gray-300'}`}>
                    {m}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-left">
                  <label className="text-[8px] font-black uppercase text-gray-400 ml-2 tracking-widest">Date début (Optionnel)</label>
                  <input type="date" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 font-bold mt-1 text-xs outline-none" 
                    value={formData.date_debut} onChange={e => setFormData({...formData, date_debut: e.target.value})} />
                </div>
                <div className="text-left">
                  <label className="text-[8px] font-black uppercase text-gray-400 ml-2 tracking-widest">Date fin (Optionnel)</label>
                  <input type="date" className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 font-bold mt-1 text-xs outline-none" 
                    value={formData.date_fin} onChange={e => setFormData({...formData, date_fin: e.target.value})} />
                </div>
              </div>

              <textarea placeholder="CONSIGNES / ATTENTION..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold h-24 outline-none text-left" 
                value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />

              <button onClick={enregistrerSoin} className="w-full bg-[#1B2A49] text-white py-5 rounded-[25px] font-black uppercase tracking-widest shadow-xl mt-4 active:scale-95 transition-transform">
                ENREGISTRER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Soins;