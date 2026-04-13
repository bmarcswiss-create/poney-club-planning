import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, ExternalLink, Plus, X, Trash2, Folder } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// CONNEXION DIRECTE
const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'sb_publishable_azT_rAkqeE-zsnvolYSY9w_7MtlnBVI';
const supabase = createClient(supabaseUrl, supabaseKey);

const Documents = ({ onNavigate }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const [newTitre, setNewTitre] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCat, setNewCat] = useState('Général');

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('categorie', { ascending: true });
      
      if (error) throw error;
      if (data) setDocs(data);
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  const ajouterDoc = async () => {
    if (!newTitre || !newUrl) {
      alert("Remplis le titre et l'URL !");
      return;
    }
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert([{ titre: newTitre, url: newUrl, categorie: newCat }])
        .select();
      
      if (error) throw error;
      if (data) {
        setDocs([...docs, data[0]]);
        setNewTitre(''); 
        setNewUrl(''); 
        setIsAdminOpen(false);
      }
    } catch (err) {
      alert("Erreur d'ajout : " + err.message);
    }
  };

  const supprimerDoc = async (id) => {
    if (window.confirm("Supprimer ce document ?")) {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (!error) setDocs(docs.filter(d => d.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 font-sans">
      <header className="bg-[#1B2A49] p-8 pt-12 rounded-b-[45px] shadow-xl text-center relative text-white">
        <button onClick={() => onNavigate('accueil')} className="absolute top-8 left-6 bg-white/10 p-2 rounded-xl">
          <ArrowLeft size={20} />
        </button>
        <FileText size={32} className="text-blue-400 mx-auto mb-2" />
        <h1 className="font-black uppercase text-xl tracking-tighter">Documents & Protocoles</h1>
      </header>

      <main className="max-w-md mx-auto p-6">
        <button 
          onClick={() => setIsAdminOpen(true)}
          className="w-full bg-white border-2 border-dashed border-gray-200 p-6 rounded-3xl text-gray-400 font-bold text-xs mb-8 flex flex-col items-center justify-center gap-2"
        >
          <Plus size={24} /> 
          <span>AJOUTER UN DOCUMENT</span>
        </button>

        {loading ? (
          <p className="text-center text-gray-400 font-bold text-[10px] uppercase animate-pulse">Chargement...</p>
        ) : (
          <div className="space-y-8">
            {['Sécurité', 'Soins', 'Général'].map(cat => {
              const list = docs.filter(d => d.categorie === cat);
              if (list.length === 0 && cat !== 'Général') return null;
              return (
                <div key={cat}>
                  <h3 className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-gray-400 mb-4 ml-2">
                    <Folder size={14} /> {cat}
                  </h3>
                  <div className="space-y-3">
                    {list.map(doc => (
                      <div key={doc.id} className="bg-white p-5 rounded-[25px] shadow-sm flex items-center justify-between border border-gray-50">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#1B2A49] text-sm">{doc.titre}</span>
                          <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-500 text-[10px] font-bold flex items-center gap-1 mt-1">
                            OUVRIR LE PDF <ExternalLink size={10} />
                          </a>
                        </div>
                        <button onClick={() => supprimerDoc(doc.id)} className="text-gray-200 hover:text-red-400 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {isAdminOpen && (
        <div className="fixed inset-0 bg-[#1B2A49]/95 z-50 flex items-end justify-center px-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-t-[40px] p-8 pb-10 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-xl uppercase text-[#1B2A49]">Nouveau Doc</h2>
              <button onClick={() => setIsAdminOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-400"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Titre du document</label>
                <input type="text" placeholder="Ex: Règlement intérieur" className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold mt-1 text-[#1B2A49]" value={newTitre} onChange={e => setNewTitre(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Lien Supabase (URL)</label>
                <input type="text" placeholder="https://..." className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold mt-1 text-blue-600" value={newUrl} onChange={e => setNewUrl(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Catégorie</label>
                <select className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 font-bold mt-1 text-[#1B2A49]" value={newCat} onChange={e => setNewCat(e.target.value)}>
                  <option value="Général">Général</option>
                  <option value="Sécurité">Sécurité</option>
                  <option value="Soins">Soins</option>
                </select>
              </div>
              <button onClick={ajouterDoc} className="w-full bg-blue-500 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-lg mt-4">ENREGISTRER</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;