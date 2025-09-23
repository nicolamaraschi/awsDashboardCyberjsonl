import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import './Search.css'; // Importo il nuovo file CSS

// Lista delle colonne su cui è permesso filtrare (deve corrispondere a quella del backend)
const ALLOWED_COLUMNS = [
  { value: 'log.destinationentityip', label: 'IP Destinazione' },
  { value: 'initiator', label: 'Utente' },
  { value: 'log.destinationport', label: 'Porta Destinazione' },
  { value: 'log.destinationparentname', label: 'Cliente' },
  { value: 'log.allowed', label: 'Consentito (true/false)' },
  { value: 'log.sourceip', label: 'IP Sorgente' },
  { value: 'log.protocolname', label: 'Protocollo' },
];

const ResultsTable = ({ data }) => {
    if (!data || data.length === 0) {
        return <p>Nessun dato da visualizzare.</p>;
    }

    const headers = Object.keys(data[0]);

    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        {headers.map(key => <th key={key}>{key}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i}>
                            {headers.map(header => <td key={`${i}-${header}`}>{row[header]}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

function Search() {
  const [filters, setFilters] = useState([{ field: ALLOWED_COLUMNS[0].value, value: '' }]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAddFilter = () => {
    setFilters([...filters, { field: ALLOWED_COLUMNS[0].value, value: '' }]);
  };

  const handleRemoveFilter = (index) => {
    const newFilters = filters.filter((_, i) => i !== index);
    setFilters(newFilters);
  };

  const handleFilterChange = (index, property, value) => {
    const newFilters = [...filters];
    newFilters[index][property] = value;
    setFilters(newFilters);
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    // Filtra solo i filtri che hanno un valore inserito
    const activeFilters = filters.filter(f => f.value.trim() !== '');

    try {
      const payload = { filters: activeFilters };
      const response = await axios.post(`${API_URL}/api/search`, payload);
      setResults(response.data);
    } catch (err) {
      setError('Impossibile eseguire la ricerca. Controlla la console per i dettagli.');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="search-page">
      <h1>Ricerca Dinamica</h1>
      
      <div className="filter-builder">
        <h3>Filtri</h3>
        {filters.map((filter, index) => (
          <div key={index} className="filter-row">
            <select 
              value={filter.field} 
              onChange={(e) => handleFilterChange(index, 'field', e.target.value)}
            >
              {ALLOWED_COLUMNS.map(col => <option key={col.value} value={col.value}>{col.label}</option>)}
            </select>
            <input 
              type="text" 
              placeholder="Valore da cercare..."
              value={filter.value} 
              onChange={(e) => handleFilterChange(index, 'value', e.target.value)} 
            />
            <button onClick={() => handleRemoveFilter(index)} className="remove-btn">Rimuovi</button>
          </div>
        ))}
        <button onClick={handleAddFilter} className="add-btn">Aggiungi Filtro</button>
      </div>

      <div className="search-actions">
        <button onClick={handleSearch} disabled={loading} className="search-btn">
          {loading ? 'Ricerca in corso...' : 'Cerca'}
        </button>
      </div>

      {loading && <div className="loader"></div>}
      {error && <p className="error">{error}</p>}
      
      {results && (
        <div className="results-section">
          <h2>Risultati</h2>
          <ResultsTable data={results} />
        </div>
      )}
    </div>
  );
}

export default Search;
