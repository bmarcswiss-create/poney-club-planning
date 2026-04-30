import React, { useState, useEffect } from 'react';
import { 
  Calendar, GraduationCap, Plus, X, CheckCircle2, Circle, Trash2, HeartPulse, 
  DoorOpen, Ban, Phone, FileText, Info, Forward, Pill, Edit3, BellRing, 
  AlertTriangle, Star, CloudSun 
} from 'lucide-react';
import { supabase } from './supabaseClient';

const LOGO_URL = "https://lnwvlyswsmtafyoepovq.supabase.co/storage/v1/object/public/logo/logo.png";

const Accueil = ({ onNavigate }) => {
  const [consignes, setConsignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [sortiesDone, setSortiesDone] = useState(false);
  const [statsSorties, setStatsSorties] = useState({ total: 0, fait: 0 });
  const [notifSoins, setNotifSoins] = useState(false);
  const [notifPlanning, setNotifPlanning] = useState(false);

  // États du formulaire
  const [newTexte, setNewTexte] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedDate, setSelectedDate] = useState(''); 
  const [selectedSection, setSelectedSection] = useState('Sortie');
  const [selectedAttribution, setSelectedAttribution] = useState('Tous');
  const [isUrgent, setIsUrgent] = useState(false);

  const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const jourActuel = joursSemaine[new Date().getDay()];
  const todayStr = new Date().toLocaleDateString('en-CA');
  const dateInfo = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  useEffect(() => {
    refreshAllData();
  }, []);

  const refreshAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchData(),
      checkNotifications(),
      checkAllSorties()
    ]);
    setLoading(false);
  };

  const fetchData = async () => {
    const { data } = await supabase.from('consignes').select('*').order('est_urgent', { ascending: false }).order('created_at', { ascending: false });
    if (data) setConsignes(data);
  };

  const checkAllSorties = async () => {
    const jourMajuscule = jourActuel.charAt(0).toUpperCase() + jourActuel.slice(1);
    const { data: dataProprios } = await supabase.from('planning_sorties').select('last_done_at').eq('jour', jourMajuscule);
    const { data: state } = await supabase.from('app_state').select('*');
    
    let totalClub = 0; let faitClub = 0;
    if (state) {
      const map = {}; state.forEach(r => map[r.id] = r.data);
      const chevauxClub = map.poney_chevaux_club || [];
      const historique = map.poney_sorties_club_history || [];
      const chevauxPrevusClub = chevauxClub.filter(c => c.planning?.[jourActuel]);
      totalClub = chevauxPrevusClub.length;
      faitClub = chevauxPrevusClub.filter(c => historique.some(h => h.key === `${todayStr}_${c.id}_VALIDATED`)).length;
    }
    const totalProprios = dataProprios?.length || 0;
    const faitProprios = dataProprios?.filter(s => s.last_done_at === todayStr).length || 0;
    
    const totalGlobal = totalProprios + totalClub;
    const faitGlobal = faitProprios + faitClub;
    setStatsSorties({ total: totalGlobal, fait: faitGlobal });
    setSortiesDone(totalGlobal > 0 && totalGlobal === faitGlobal);
  };

  const checkNotifications = async () => {
    try {
      const lastVisitSoins = localStorage.getItem('lastVisitSoins') || "0";
      const lastVisitPlanning = localStorage.getItem('lastVisitPlanning') || "0";
      const { data: lastSoin } = await supabase.from('soins').select('created_at').order('created_at', { ascending: false }).limit(1);
      setNotifSoins(lastSoin?.[0] && new Date(lastSoin[0].created_at).getTime() > parseInt(lastVisitSoins));
      const { data: lastState } = await supabase.from('app_state').select('created_at').order('created_at', { ascending: false }).limit(1);
      setNotifPlanning(lastState?.[0] && new Date(lastState[0].created_at).getTime() > parseInt(lastVisitPlanning));
    } catch (e) { console.log(e); }
  };

  const enregistrerTache = async () => {
    if (!newTexte.trim()) return;
    const dayToSave = selectedDate ? null : (selectedDay || null);
    const payload = { 
      texte: newTexte, notes: newNotes, section: selectedSection, 
      jour_semaine: dayToSave, date_precise: selectedDate || null, 
      attribution: selectedAttribution, est_urgent: isUrgent 
    };
    if (editingId) { await supabase.from('consignes').update(payload).eq('id', editingId); }
    else { await supabase.from('consignes').insert([{ ...payload, est_fait: false, last_done_at: null }]); }
    refreshAllData();
    setIsAdminOpen(false);
  };

  const toggleTache = async (id, currentLastDone, isActive) => {
    if (!isActive) return;
    const isDoneToday = currentLastDone === todayStr;
    await supabase.from('consignes').update({ last_done_at: isDoneToday ? null : todayStr }).eq('id', id);
    fetchData();
  };

  const supprimerTache = async (id) => {
    if (window.confirm("Supprimer cette fiche ?")) {
      await supabase.from('consignes').delete().eq('id', id);
      fetchData();
    }
  };

  const tasksActive = consignes.filter(t => {
    if (t.last_done_at === todayStr) return false;
    if (t.date_precise) return t.date_precise === todayStr;
    return !t.jour_semaine || t.jour_semaine === jourActuel || t.jour_semaine === 'permanent' || t.jour_semaine === 'execution';
  });

  const tasksFuture = consignes.filter(t => {
    if (t.last_done_at === todayStr) return false;
    if (t.date_precise && t.date_precise > todayStr) return true;
    return t.jour_semaine && t.jour_semaine !== jourActuel && t.jour_semaine !== 'permanent' && t.jour_semaine !== 'execution';
  });

  const TaskCard = ({ t, isActive }) => {
    const estFaitAujourdhui = t.last_done_at === todayStr;
    return (
      <div className={`flex flex-col p-4 rounded-3xl border-2 transition-all shadow-sm relative overflow-hidden ${isActive ? (t.est_urgent ? 'bg-red-50 border-red-500 shadow-red-100' : 'bg-white border-white') : 'bg-white/40 opacity-60'}`}>
        {t.est_urgent && isActive && <div className="absolute top-0 right-0 bg-red-500 text-white text-[7px] font-black px-3 py-1 rounded-bl-xl animate-pulse flex items-center gap-1"><AlertTriangle size={8}/> URGENT</div>}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1" onClick={() => toggleTache(t.id, t.last_done_at, isActive)}>
            {estFaitAujourdhui ? <CheckCircle2 className="text-gray-400" size={22} /> : (isActive ? <Circle className={t.est_urgent ? "text-red-300" : "text-gray-300"} size={22} /> : <Calendar className="text-gray-400" size={18} />)}
            <div className="flex flex-col text-left">
              <span className={`text-[15px] font-black leading-tight ${estFaitAujourdhui ? 'line-through text-gray-400' : 'text-[#1B2A49]'}`}>{t.texte}</span>
              <span className="text-[9px] font-black uppercase text-[#8DC63F]">
                {t.date_precise ? `Le ${new Date(t.date_precise).toLocaleDateString('fr-FR')}` : t.jour_semaine === 'permanent' ? "Rétablissement" : t.jour_semaine === 'execution' ? "Unique" : !t.jour_semaine ? "Aujourd'hui" : `Chaque ${t.jour_semaine}`}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => { setEditingId(t.id); setNewTexte(t.texte); setNewNotes(t.notes || ''); setSelectedSection(t.section); setSelectedDay(t.jour_semaine || ''); setSelectedDate(t.date_precise || ''); setSelectedAttribution(t.attribution || 'Tous'); setIsUrgent(t.est_urgent || false); setIsAdminOpen(true); }} className="text-gray-200 p-2"><Edit3 size={16} /></button>
            <button onClick={() => supprimerTache(t.id)} className="text-gray-200 p-2"><Trash2 size={16} /></button>
          </div>
        </div>
        {t.notes && <div className="mt-2 ml-10 p-2 bg-gray-50/50 rounded-xl border-l-4 border-[#8DC63F]/30 text-[11px] font-medium text-gray-600 italic text-left">{t.notes}</div>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-20 text-left font-sans text-[#1B2A49]">
      <header className="fixed top-0 left-0 right-0 bg-[#1B2A49] z-40 px-6 pt-12 pb-8 rounded-b-[45px] shadow-2xl flex flex-col items-center">
        <button onClick={() => { setEditingId(null); setNewTexte(''); setNewNotes(''); setSelectedSection('Sortie'); setSelectedDay(''); setSelectedDate(''); setSelectedAttribution('Tous'); setIsUrgent(false); setIsAdminOpen(true); }} className="absolute top-6 right-6 bg-[#8DC63F] text-[#1B2A49] p-3.5 rounded-2xl shadow-lg font-bold"><Plus size={24} /></button>
        <button onClick={() => { refreshAllData(); const img = document.getElementById('logo-refresh'); img.classList.add('animate-spin'); setTimeout(() => img.classList.remove('animate-spin'), 600); }} className="active:scale-90 transition-transform">
          <img id="logo-refresh" src={LOGO_URL} alt="Logo" className="h-16 w-16 rounded-full border-4 border-[#8DC63F] mb-3 bg-white" />
        </button>
        <h1 className="text-white font-black uppercase text-lg tracking-tighter text-center leading-none">Tableau de bord<br/><span className="text-[10px] text-[#8DC63F] font-bold tracking-widest">{dateInfo}</span></h1>
      </header>

      <main className="w-full max-w-md mx-auto px-6 pt-64 text-[#1B2A49]">
        {/* GRILLE REORGANISEE (Sans capsule bas) */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button onClick={() => onNavigate('urgences')} className="bg-white p-4 rounded-[30px] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-all">
            <div className="bg-red-500 p-2.5 rounded-2xl text-white"><Phone size={20} /></div>
            <span className="text-[8px] font-black uppercase tracking-tighter">Urgences</span>
          </button>
          <button onClick={() => { localStorage.setItem('lastVisitSoins', Date.now().toString()); onNavigate('soins'); }} className="bg-white p-4 rounded-[30px] shadow-sm flex flex-col items-center gap-2 relative active:scale-95 transition-all">
            <div className="bg-red-100 p-2.5 rounded-2xl text-red-600"><Pill size={20} /></div>
            <span className="text-[8px] font-black uppercase tracking-tighter">Soins</span>
            {notifSoins && <div className="absolute top-3 right-3 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />}
          </button>
          <button onClick={() => onNavigate('documents')} className="bg-white p-4 rounded-[30px] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-all">
            <div className="bg-[#1B2A49] p-2.5 rounded-2xl text-white"><FileText size={20} /></div>
            <span className="text-[8px] font-black uppercase tracking-tighter">Docs</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-10">
          <button onClick={() => onNavigate('meteo')} className="bg-white p-4 rounded-[30px] shadow-sm flex flex-row items-center justify-center gap-3 active:scale-95 transition-all">
            <div className="bg-blue-500 p-2.5 rounded-2xl text-white"><CloudSun size={20} /></div>
            <span className="text-[8px] font-black uppercase tracking-widest">Météo</span>
          </button>
          <button onClick={() => { localStorage.setItem('lastVisitPlanning', Date.now().toString()); onNavigate('planning-ecurie'); }} className="bg-white p-4 rounded-[30px] shadow-sm flex flex-row items-center justify-center gap-3 relative active:scale-95 transition-all">
            <div className="bg-purple-600 p-2.5 rounded-2xl text-white"><Calendar size={20} /></div>
            <span className="text-[8px] font-black uppercase tracking-widest leading-none">Planning<br/>Palefreniers</span>
            {notifPlanning && <div className="absolute top-3 right-3 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />}
          </button>
        </div>

        <div className="space-y-10">
          <div onClick={() => onNavigate('planning-sorties')} className={`p-6 rounded-[40px] flex items-center justify-between border-2 transition-all ${sortiesDone ? 'bg-[#8DC63F] border-[#8DC63F] text-white' : 'bg-white border-[#8DC63F] text-[#1B2A49]'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${sortiesDone ? 'bg-white text-[#1B2A49]' : 'bg-[#8DC63F]/10 text-[#8DC63F]'}`}><DoorOpen size={26} /></div>
              <div className="flex flex-col text-left"><span className="text-[16px] font-black uppercase leading-none">{sortiesDone ? 'TOUT EST FAIT' : 'SORTIES CHEVAUX'}</span><span className={`text-[10px] font-bold ${sortiesDone ? 'text-white/80' : 'text-[#8DC63F]'}`}>{statsSorties.fait} / {statsSorties.total} terminés</span></div>
            </div>
            <Forward size={24} />
          </div>

          {['Sortie', 'Arret', 'Soins', 'Autres'].map(sec => {
            const tasks = tasksActive.filter(t => t.section === sec);
            if (tasks.length === 0) return null;
            return (
              <div key={sec} className="pt-2">
                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-4 text-[#1B2A49] opacity-50 ml-2">{sec}</h3>
                <div className="space-y-3">{tasks.map(t => <TaskCard key={t.id} t={t} isActive={true} />)}</div>
              </div>
            );
          })}

          {tasksFuture.length > 0 && (
            <div className="mt-10 opacity-40">
              <h3 className="font-black text-[10px] uppercase tracking-[0.2em] mb-4 ml-2">À Venir</h3>
              <div className="space-y-3">{tasksFuture.map(t => <TaskCard key={t.id} t={t} isActive={false} />)}</div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL ADMIN */}
      {isAdminOpen && (
        <div className="fixed inset-0 bg-[#1B2A49]/95 z-[100] flex items-end justify-center px-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-10 shadow-2xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h2 className="font-black text-2xl uppercase">Consigne</h2><button onClick={() => setIsAdminOpen(false)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button></div>
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-2xl border-2 border-red-100"><input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="w-5 h-5 accent-red-500" /><label className="text-red-700 font-black uppercase text-[11px]">🚨 URGENT</label></div>
              <input type="text" value={newTexte} onChange={(e) => setNewTexte(e.target.value)} placeholder="Nom du cheval..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none uppercase" />
              <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Notes..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold h-20 outline-none" />
              <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-400 ml-2">Date précise :</label><input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); if(e.target.value) setSelectedDay(''); }} className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 font-bold" /></div>
              <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-400 ml-2">Ou Récurrence :</label><select value={selectedDay} onChange={(e) => { setSelectedDay(e.target.value); if(e.target.value) setSelectedDate(''); }} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold">
                <option value="">Aujourd'hui seulement</option>
                <optgroup label="ROUTINE">{joursSemaine.map(j => <option key={j} value={j}>Chaque {j}</option>)}</optgroup>
                <option value="permanent">Tous les jours</option>
              </select></div>
              <div className="grid grid-cols-2 gap-2">{['Sortie', 'Arret', 'Soins', 'Autres'].map(s => <button key={s} onClick={() => setSelectedSection(s)} className={`py-3 rounded-xl text-[9px] font-black uppercase ${selectedSection === s ? 'bg-[#1B2A49] text-white' : 'bg-gray-50 text-gray-400'}`}>{s}</button>)}</div>
              <button onClick={enregistrerTache} className="w-full bg-[#8DC63F] text-[#1B2A49] py-5 rounded-3xl font-black uppercase shadow-lg">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accueil;