import React, { useState, useEffect } from 'react';
import { Calendar, GraduationCap, Plus, X, CheckCircle2, Circle, Trash2, HeartPulse, DoorOpen, Ban, Phone, FileText, Info, Forward, Pill, Edit3, BellRing, AlertTriangle, Archive, Star } from 'lucide-react';
import { supabase } from './supabaseClient';

const LOGO_URL = "https://lnwvlyswsmtafyoepovq.supabase.co/storage/v1/object/public/logo/logo.png";

const Accueil = ({ onNavigate }) => {
  const [consignes, setConsignes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState('');
  
  const [sortiesDone, setSortiesDone] = useState(false);
  const [statsSorties, setStatsSorties] = useState({ total: 0, fait: 0 });

  const [notifSoins, setNotifSoins] = useState(false);
  const [notifPlanning, setNotifPlanning] = useState(false);

  const [newTexte, setNewTexte] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSection, setSelectedSection] = useState('Sortie');
  const [selectedAttribution, setSelectedAttribution] = useState('Tous');
  const [isUrgent, setIsUrgent] = useState(false);

  const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const jourActuel = joursSemaine[new Date().getDay()];
  const isWeekDay = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'].includes(jourActuel);
  const todayStr = new Date().toLocaleDateString('en-CA');
  const dateInfo = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  useEffect(() => {
    fetchDataAndCheckAlerts();
    checkNotifications();
    checkSortiesProprios();
  }, []);

  const fetchDataAndCheckAlerts = async () => {
    setLoading(true);
    const lastCheck = parseInt(localStorage.getItem('consignes_last_check') || "0");
    const { data: dataConsignes } = await supabase.from('consignes').select('*').order('est_urgent', { ascending: false }).order('created_at', { ascending: false });
    if (dataConsignes) setConsignes(dataConsignes);

    const tables = [{ name: 'consignes', label: 'Tâche' }, { name: 'soins', label: 'Soin' }, { name: 'urgences', label: 'Urgence' }, { name: 'documents', label: 'Document' }];
    let mostRecentTime = 0;
    let mostRecentLabel = '';

    for (const table of tables) {
      const { data } = await supabase.from(table.name).select('created_at').order('created_at', { ascending: false }).limit(1);
      if (data?.[0]) {
        const time = new Date(data[0].created_at).getTime();
        if (time > mostRecentTime) { mostRecentTime = time; mostRecentLabel = table.label; }
      }
    }
    if (mostRecentTime > lastCheck) { setAlertType(mostRecentLabel); setShowAlert(true); }
    setLoading(false);
  };

  const checkSortiesProprios = async () => {
    const jourMajuscule = jourActuel.charAt(0).toUpperCase() + jourActuel.slice(1);
    const { data } = await supabase.from('planning_sorties').select('last_done_at, est_fait').eq('jour', jourMajuscule);
    if (data && data.length > 0) {
      const total = data.length;
      const fait = data.filter(s => s.last_done_at === todayStr || s.est_fait === true).length;
      setStatsSorties({ total, fait });
      setSortiesDone(total > 0 && total === fait);
    }
  };

  const closeAlert = () => { setShowAlert(false); localStorage.setItem('consignes_last_check', Date.now().toString()); };

  const checkNotifications = async () => {
    try {
      const lastVisitSoins = localStorage.getItem('lastVisitSoins') || "0";
      const lastVisitPlanning = localStorage.getItem('lastVisitPlanning') || "0";
      const { data: lastSoin } = await supabase.from('soins').select('created_at').order('created_at', { ascending: false }).limit(1);
      if (lastSoin?.[0] && new Date(lastSoin[0].created_at).getTime() > parseInt(lastVisitSoins)) setNotifSoins(true);
      const { data: lastState } = await supabase.from('app_state').select('created_at').order('created_at', { ascending: false }).limit(1);
      if (lastState?.[0] && new Date(lastState[0].created_at).getTime() > parseInt(lastVisitPlanning)) setNotifPlanning(true);
    } catch (e) { console.log(e); }
  };

  const handleNavigateWithNotif = (target) => {
    if (target === 'soins') localStorage.setItem('lastVisitSoins', Date.now().toString());
    if (target === 'planning-ecurie') localStorage.setItem('lastVisitPlanning', Date.now().toString());
    onNavigate(target);
  };

  const enregistrerTache = async () => {
    if (!newTexte.trim()) return;
    const payload = { texte: newTexte, notes: newNotes, section: selectedSection, jour_semaine: selectedDay || null, attribution: selectedAttribution, est_urgent: isUrgent };
    if (editingId) { await supabase.from('consignes').update(payload).eq('id', editingId); }
    else { await supabase.from('consignes').insert([{ ...payload, est_fait: false, last_done_at: null }]); }
    fetchDataAndCheckAlerts();
    setIsAdminOpen(false);
  };

  const toggleTache = async (id, currentLastDone, isActive) => {
    if (!isActive) return;
    const isDoneToday = currentLastDone === todayStr;
    await supabase.from('consignes').update({ last_done_at: isDoneToday ? null : todayStr }).eq('id', id);
    fetchDataAndCheckAlerts();
  };

  const supprimerTache = async (id) => {
    if (window.confirm("Supprimer cette fiche ?")) {
      await supabase.from('consignes').delete().eq('id', id);
      fetchDataAndCheckAlerts();
    }
  };

  const Badge = () => (<span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white"></span>);

  // LOGIQUE DE FILTRAGE AMÉLIORÉE
  const tasksActive = consignes.filter(t => {
    if (t.last_done_at === todayStr) return false;
    if (!t.jour_semaine) return true;
    if (t.jour_semaine === 'permanent' || t.jour_semaine === 'execution') return true;
    if (t.jour_semaine === 'semaine' && isWeekDay) return true;
    if (t.jour_semaine === jourActuel) return true;
    return false;
  });

  const tasksArchived = consignes.filter(t => t.last_done_at === todayStr);
  
  const tasksFuture = consignes.filter(t => {
    if (t.last_done_at === todayStr) return false;
    if (!t.jour_semaine || t.jour_semaine === 'permanent' || t.jour_semaine === 'execution') return false;
    if (t.jour_semaine === 'semaine') return !isWeekDay;
    return t.jour_semaine !== jourActuel;
  });

  const TaskCard = ({ t, isActive, isArchivedView = false }) => {
    const estFaitAujourdhui = t.last_done_at === todayStr;
    const getDayLabel = (val) => {
      if (!val) return "Aujourd'hui";
      if (val === 'semaine') return "Lun. au Ven.";
      if (val === 'permanent') return "Rétablissement";
      if (val === 'execution') return "Ponctuel";
      return val;
    };

    return (
      <div className={`flex flex-col p-4 rounded-3xl border-2 transition-all shadow-sm relative overflow-hidden ${isArchivedView ? 'bg-gray-100/50 border-transparent opacity-60 scale-[0.98]' : isActive ? (t.est_urgent ? 'bg-red-50 border-red-500' : 'bg-white border-white') : 'bg-white/40 opacity-60'}`}>
        {t.est_urgent && isActive && !isArchivedView && <div className="absolute top-0 right-0 bg-red-500 text-white text-[7px] font-black px-3 py-1 rounded-bl-xl animate-pulse flex items-center gap-1"><AlertTriangle size={8}/> URGENT</div>}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1" onClick={() => toggleTache(t.id, t.last_done_at, isActive)}>
            {estFaitAujourdhui ? <CheckCircle2 className="text-gray-400" size={22} /> : (isActive ? <Circle className={t.est_urgent ? "text-red-300" : "text-gray-300"} size={22} /> : <Calendar className="text-gray-400" size={18} />)}
            <div className="flex flex-col text-left">
              <span className={`text-[15px] font-black leading-tight ${estFaitAujourdhui ? 'line-through text-gray-400' : 'text-[#1B2A49]'}`}>{t.texte}</span>
              {!isArchivedView && (
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black uppercase text-[#8DC63F]">{getDayLabel(t.jour_semaine)}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${t.attribution === 'Palefreniers' ? 'bg-blue-100 text-blue-700' : t.attribution === 'Monitrices' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{t.attribution || 'Tous'}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => { setEditingId(t.id); setNewTexte(t.texte); setNewNotes(t.notes || ''); setSelectedSection(t.section); setSelectedDay(t.jour_semaine || ''); setSelectedAttribution(t.attribution || 'Tous'); setIsUrgent(t.est_urgent || false); setIsAdminOpen(true); }} className="text-gray-200 p-2"><Edit3 size={16} /></button>
            <button onClick={() => supprimerTache(t.id)} className="text-gray-200 p-2"><Trash2 size={16} /></button>
          </div>
        </div>
        {t.notes && !isArchivedView && <div className="mt-2 ml-10 p-2 bg-gray-50/50 rounded-xl border-l-4 border-[#8DC63F]/30 text-[11px] font-medium text-gray-600 italic text-left">{t.notes}</div>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-40 text-left">
      <header className="fixed top-0 left-0 right-0 bg-[#1B2A49] z-40 px-6 pt-12 pb-8 rounded-b-[45px] shadow-2xl flex flex-col items-center">
        <button onClick={() => { setEditingId(null); setNewTexte(''); setNewNotes(''); setSelectedSection('Sortie'); setSelectedDay(''); setSelectedAttribution('Tous'); setIsUrgent(false); setIsAdminOpen(true); }} className="absolute top-6 right-6 bg-[#8DC63F] text-[#1B2A49] p-3.5 rounded-2xl shadow-lg font-bold"><Plus size={24} /></button>
        <img src={LOGO_URL} alt="Logo" className="h-16 w-16 rounded-full border-4 border-[#8DC63F] mb-3 bg-white" />
        <h1 className="text-white font-black uppercase text-lg tracking-tighter text-center leading-none">Tableau de bord<br/><span className="text-[10px] text-[#8DC63F] font-bold tracking-widest">{dateInfo}</span></h1>
      </header>

      <main className="w-full max-w-md mx-auto px-6 pt-64">
        <div className="grid grid-cols-4 gap-2 mb-10">
          <button onClick={() => onNavigate('urgences')} className="bg-white p-3 rounded-[24px] flex flex-col items-center gap-2 shadow-sm"><div className="bg-red-500 p-2 rounded-xl text-white"><Phone size={16} /></div><span className="text-[7px] font-black uppercase">Urgences</span></button>
          <button onClick={() => handleNavigateWithNotif('soins')} className="bg-white p-3 rounded-[24px] flex flex-col items-center gap-2 relative shadow-sm"><div className="bg-red-100 p-2 rounded-xl text-red-600"><Pill size={16} /></div><span className="text-[7px] font-black uppercase text-[#1B2A49]">Soins</span>{notifSoins && <Badge />}</button>
          <button onClick={() => onNavigate('planning-sorties')} className="bg-white p-3 rounded-[24px] flex flex-col items-center gap-2 shadow-sm"><div className="bg-[#8DC63F]/20 p-2 rounded-xl text-[#1B2A49]"><DoorOpen size={16} /></div><span className="text-[7px] font-black uppercase text-center">Sorties Proprios</span></button>
          <button onClick={() => onNavigate('documents')} className="bg-white p-3 rounded-[24px] flex flex-col items-center gap-2 shadow-sm"><div className="bg-[#1B2A49] p-2 rounded-xl text-white"><FileText size={16} /></div><span className="text-[7px] font-black uppercase">Docs</span></button>
        </div>

        <div className="space-y-10">
          <div onClick={() => onNavigate('planning-sorties')} className={`p-5 rounded-[35px] flex items-center justify-between shadow-sm cursor-pointer transition-all duration-500 border-2 ${sortiesDone ? 'bg-[#8DC63F] border-[#8DC63F] scale-[1.02]' : 'bg-white border-[#8DC63F]'}`}>
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-2xl ${sortiesDone ? 'bg-white text-[#1B2A49]' : 'bg-[#8DC63F]/10 text-[#1B2A49]'}`}>
                {sortiesDone ? <Star size={24} className="fill-current" /> : <DoorOpen size={24} />}
              </div>
              <div className="flex flex-col">
                <span className={`text-[14px] font-black uppercase ${sortiesDone ? 'text-white' : 'text-[#1B2A49]'}`}>
                  {sortiesDone ? '🌟 LISTE PROPRIOS TERMINÉE' : 'Sorties Propriétaires'}
                </span>
                <span className={`text-[9px] font-bold uppercase ${sortiesDone ? 'text-white/80' : 'text-[#8DC63F]'}`}>
                  {sortiesDone ? 'Tous les chevaux de proprio sont sortis !' : `${statsSorties.fait} / ${statsSorties.total} chevaux sortis`}
                </span>
              </div>
            </div>
            <div className={sortiesDone ? 'text-white' : 'text-[#1B2A49]'}><Forward size={20} /></div>
          </div>

          <h2 className="font-black text-[12px] uppercase tracking-[0.3em] text-[#1B2A49] ml-2 -mb-6 italic opacity-50">Tâches à faire</h2>
          
          {loading ? ( <div className="text-center p-10 opacity-20 font-black uppercase text-[10px]">Chargement...</div> ) : (
            <>
              {[
                { id: 'Sortie', label: 'CHEVAUX CLUB À SORTIR', icon: DoorOpen, color: 'text-blue-600' },
                { id: 'Arret', label: 'Chevaux à l\'arrêt', icon: Ban, color: 'text-orange-500' },
                { id: 'Soins', label: 'Chevaux en soins', icon: HeartPulse, color: 'text-red-500' },
                { id: 'Autres', label: 'Autres consignes', icon: Info, color: 'text-purple-500' }
              ].map(section => {
                const tasks = tasksActive.filter(t => t.section === section.id);
                if (tasks.length === 0) return null;
                return (
                  <div key={section.id} className="pt-2">
                    <h3 className={`flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-4 ml-2 ${section.color}`}>{section.id === 'Sortie' ? <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-[10px] mr-1">CLUB</span> : <section.icon size={14} />}{section.label}</h3>
                    <div className="space-y-3">{tasks.map(t => <TaskCard key={t.id} t={t} isActive={true} />)}</div>
                  </div>
                );
              })}

              {tasksFuture.length > 0 && (
                <div className="mt-16 pt-10 border-t-2 border-gray-200/50 opacity-40">
                  <h3 className="flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-6 ml-2 text-gray-400"><Forward size={14} /> Prévisions de la semaine</h3>
                  <div className="space-y-3">{tasksFuture.map(t => <TaskCard key={t.id} t={t} isActive={false} />)}</div>
                </div>
              )}

              {(tasksArchived.length > 0 || sortiesDone) && (
                <div className="mt-16 pt-10 border-t-2 border-gray-200/50 pb-10">
                  <h3 className="flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-6 ml-2 text-gray-400"><Archive size={14} /> Terminé aujourd'hui</h3>
                  <div className="space-y-3">
                    {sortiesDone && (
                        <div className="bg-gray-100/50 p-4 rounded-3xl border-2 border-transparent flex items-center gap-4 opacity-60 scale-[0.98]">
                            <CheckCircle2 className="text-gray-400" size={22} />
                            <span className="text-[13px] font-black text-gray-400 uppercase tracking-tighter">✅ Chevaux Propriétaires : OK</span>
                        </div>
                    )}
                    {tasksArchived.map(t => <TaskCard key={t.id} t={t} isActive={true} isArchivedView={true} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 p-8 z-40 pointer-events-none text-center">
        <div className="max-w-xs mx-auto flex items-center justify-around bg-[#1B2A49] p-4 rounded-[32px] shadow-2xl border border-white/10 pointer-events-auto">
          <button onClick={() => onNavigate('accueil')} className="flex flex-col items-center text-[#8DC63F] flex-1"><DoorOpen size={20} /><span className="text-[7px] font-black uppercase mt-1">Tableau</span></button>
          <div className="h-6 w-[1px] bg-white/10"></div>
          <button onClick={() => handleNavigateWithNotif('planning-ecurie')} className="flex flex-col items-center text-white/40 flex-1 relative"><Calendar size={20} /><span className="text-[7px] font-black uppercase mt-1">Écurie</span>{notifPlanning && <Badge />}</button>
          <div className="h-6 w-[1px] bg-white/10"></div>
          <button onClick={() => onNavigate('planning-monitrices')} className="flex flex-col items-center text-white/40 flex-1"><GraduationCap size={20} /><span className="text-[7px] font-black uppercase mt-1">Cours</span></button>
        </div>
      </footer>

      {isAdminOpen && (
        <div className="fixed inset-0 bg-[#1B2A49]/95 z-[100] flex items-end justify-center px-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-10 shadow-2xl text-left overflow-y-auto max-h-[95vh]">
            <div className="flex justify-between items-center mb-6"><h2 className="font-black text-2xl uppercase text-[#1B2A49]">Nouvelle Tâche</h2><button onClick={() => setIsAdminOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={20}/></button></div>
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-2xl border-2 border-red-100">
                <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="w-5 h-5 accent-red-500" />
                <label className="text-red-700 font-black uppercase text-[11px]">🚨 Marquer comme URGENT</label>
              </div>
              <input type="text" value={newTexte} onChange={(e) => setNewTexte(e.target.value)} placeholder="Nom..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold outline-none" />
              <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Détails..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold h-20 outline-none" />
              <div className="space-y-2"><label className="text-[9px] font-black uppercase text-gray-400 ml-2">Assigner à :</label><div className="grid grid-cols-3 gap-2">{['Palefreniers', 'Monitrices', 'Tous'].map(a => (<button key={a} onClick={() => setSelectedAttribution(a)} className={`py-3 rounded-xl text-[8px] font-black uppercase transition-all ${selectedAttribution === a ? 'bg-[#1B2A49] text-white' : 'bg-gray-50 text-gray-400'}`}>{a}</button>))}</div></div>
              <div className="grid grid-cols-2 gap-2">{['Sortie', 'Arret', 'Soins', 'Autres'].map(s => <button key={s} onClick={() => setSelectedSection(s)} className={`py-3 rounded-xl text-[9px] font-black uppercase ${selectedSection === s ? 'bg-[#1B2A49] text-white' : 'bg-gray-50 text-gray-400'}`}>{s}</button>)}</div>
              <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold">
                <option value="">Aujourd'hui seulement</option>
                <option value="semaine">Du lundi au vendredi</option>
                <option value="execution">Ponctuel (jusqu'à exécution)</option>
                <option value="permanent">Jusqu'à rétablissement</option>
                {joursSemaine.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
              <button onClick={enregistrerTache} className="w-full bg-[#8DC63F] text-[#1B2A49] py-5 rounded-3xl font-black uppercase shadow-lg">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accueil;