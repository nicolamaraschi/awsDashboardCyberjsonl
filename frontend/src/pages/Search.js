import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { ReactComponent as NoDataIcon } from '../assets/no-data-icon.svg';

const ReportTable = ({ data }) => (
  <div className="table-container">
    <table>
      <thead>
        <tr>{Object.keys(data[0]).map(key => <th key={key}>{key}</th>)}</tr>
      </thead>
      <tbody>
        {data.map((row, i) => <tr key={i}>{Object.values(row).map((val, j) => <td key={j}>{val}</td>)}</tr>)}
      </tbody>
    </table>
  </div>
);

function Search() {
  const { type } = useParams(); // 'user' or 'ip'
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState(null); // null per indicare nessuna ricerca ancora effettuata
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pageTitle = type === 'user' ? 'Cerca Attività per Utente' : 'Cerca Attività per IP';
  const placeholder = type === 'user' ? 'Inserisci email utente...' : 'Inserisci indirizzo IP...';

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setResults(null); // Resetta i risultati se la ricerca è vuota
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null); // Resetta i risultati prima di una nuova ricerca

    try {
      const response = await axios.get(`${API_URL}/api/reports/${type}/${searchTerm.trim()}`);
      setResults(response.data);
    } catch (err) {
      setError('Impossibile eseguire la ricerca.');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="search-page">
      <h1>{pageTitle}</h1>
      <form onSubmit={handleSearch} className="search-form">
        <input 
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Ricerca...' : 'Cerca'}
        </button>
      </form>

      {loading && <div className="loader"></div>}
      {error && <p className="error">{error}</p>}
      
      {/* Mostra i risultati solo se non in caricamento, senza errori e se results non è null */}
      {!loading && !error && results !== null && (
        results.length > 0 ? (
          <ReportTable data={results} />
        ) : (
          <div className="no-data-message">
            <NoDataIcon />
            <p>Nessun risultato trovato per "{searchTerm}".</p>
          </div>
        )
      )}
    </div>
  );
}

export default Search;