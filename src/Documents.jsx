const ajouterDoc = async () => {
    if (!newTitre || !newUrl) return;
    // On utilise "titres" et "categories" pour correspondre à ta photo
    const { data, error } = await supabase
      .from('documents')
      .insert([{ titres: newTitre, url: newUrl, categories: newCat }]) 
      .select();
      
    if (!error) {
      setDocs([...docs, data[0]]);
      setNewTitre(''); 
      setNewUrl(''); 
      setIsAdminOpen(false);
    } else {
      alert("Erreur : " + error.message);
    }
  };