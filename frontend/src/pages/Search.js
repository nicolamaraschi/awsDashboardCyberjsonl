import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { API_URL } from '../config';
import './Search.css';

// --- CONFIGURAZIONE PER TIPO DI RICERCA ---
const SEARCH_CONFIGS = {
  'flow-established': {
    title: 'Estrazione Flussi Stabiliti',
    fields: {
      'timestamp': { label: 'Timestamp' },
      'UserName': { label: 'User Name' },
      'UserNameGroup': { label: 'Gruppo Utente' },
      'DestinationIP': { label: 'IP Destinazione' },
      'DestinationPort': { label: 'Porta Destinazione' },
      'Customer': { label: 'Cliente' },
    },
    defaultSelect: ['timestamp', 'UserName', 'DestinationIP', 'DestinationPort', 'Customer'],
  },
  'domain-blocked': {
    title: 'Analisi Domini Bloccati',
    fields: {
      'timestamp': { label: 'Timestamp' },
      'parententityname': { label: 'Nome Utente' },
      'dominio_bloccato': { label: 'Dominio Bloccato' },
      'categoria_dominio': { label: 'Categoria Dominio' },
    },
    defaultSelect: ['timestamp', 'parententityname', 'dominio_bloccato', 'categoria_dominio'],
  },
};

// --- FUNZIONE DI UTILITÀ ---
const exportToXLSX = (data) => {
  if (!data || data.length === 0) {
    alert('Nessun dato da esportare.');
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Risultati");
  XLSX.writeFile(workbook, "export.xlsx");
};

const getHistory = (searchType) => {
  try {
    const item = localStorage.getItem(`filterHistory_${searchType}`);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    return [];
  }
};

const saveHistory = (searchType, history) => {
  try {
    localStorage.setItem(`filterHistory_${searchType}`, JSON.stringify(history));
  } catch (error) {
    console.error("Errore nel salvare la cronologia:", error);
  }
};

// --- COMPONENTI UI ---

const HistorySelector = ({ history, onLoad, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div className="column-selector" ref={wrapperRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="add-btn">Cronologia ({history.length})</button>
      {isOpen && (
        <div className="column-dropdown history-dropdown">
          {history.length === 0 ? (
            <div className="history-item">Nessuna ricerca salvata.</div>
          ) : (
            history.map((item, index) => (
              <div key={index} className="history-item">
                <span className="history-name" onClick={() => onLoad(item.filters)}>{item.name}</span>
                <button onClick={() => onDelete(index)} className="delete-history-btn">X</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const ColumnSelector = ({ config, selectedFields, setSelectedFields, onReset }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const handleCheckboxChange = (fieldKey) => {
    setSelectedFields(prev => prev.includes(fieldKey) ? prev.filter(key => key !== fieldKey) : [...prev, fieldKey]);
  };

  return (
    <div className="column-selector" ref={wrapperRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="add-btn">Seleziona Colonne ({selectedFields.length})</button>
      {isOpen && (
        <div className="column-dropdown">
          {Object.entries(config.fields).map(([key, { label }]) => (
            <label key={key}><input type="checkbox" checked={selectedFields.includes(key)} onChange={() => handleCheckboxChange(key)} /> {label}</label>
          ))}
          <button onClick={onReset} className="reset-btn">Reset Default</button>
        </div>
      )}
    </div>
  );
};

const ResultsTable = ({ data, headers, config }) => {
    if (!Array.isArray(data) || data.length === 0) return <p>Nessun dato da visualizzare.</p>;
    if (typeof data[0] !== 'object' || data[0] === null) return <p>I dati ricevuti non sono in un formato valido.</p>;

    return (
        <div className="table-container">
            <table>
                <thead><tr>{headers.map(key => <th key={key}>{config.fields[key]?.label || key}</th>)}</tr></thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i}>{headers.map(header => <td key={`${i}-${header}`}>{String(row[header] === undefined || row[header] === null ? '' : row[header])}</td>)}</tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- COMPONENTE PRINCIPALE ---
function Search() {
  const { type } = useParams();
  const config = SEARCH_CONFIGS[type] || SEARCH_CONFIGS['flow-established'];

  const [filters, setFilters] = useState([{ field: Object.keys(config.fields)[0], operator: '=', value: '' }]);
  const [selectedFields, setSelectedFields] = useState(config.defaultSelect);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(() => getHistory(type));

  useEffect(() => {
    const newConfig = SEARCH_CONFIGS[type] || SEARCH_CONFIGS['flow-established'];
    setFilters([{ field: Object.keys(newConfig.fields)[0], operator: '=', value: '' }]);
    setSelectedFields(newConfig.defaultSelect);
    setHistory(getHistory(type));
    setResults(null);
    setError(null);
  }, [type]);

  const updateHistory = (newFilters) => {
    const newHistoryEntry = {
      name: newFilters.map(f => `${f.field} ${f.operator} ${f.value}`).join(', ').substring(0, 50) + '...',
      filters: newFilters,
      date: new Date().toISOString(),
    };
    const currentHistory = getHistory(type);
    if (!currentHistory.some(h => JSON.stringify(h.filters) === JSON.stringify(newFilters))) {
      const updatedHistory = [newHistoryEntry, ...currentHistory].slice(0, 10);
      setHistory(updatedHistory);
      saveHistory(type, updatedHistory);
    }
  };

  const handleLoadFromHistory = (savedFilters) => setFilters(savedFilters);
  const handleDeleteFromHistory = (index) => {
    const updatedHistory = history.filter((_, i) => i !== index);
    setHistory(updatedHistory);
    saveHistory(type, updatedHistory);
  };

  const handleAddFilter = () => setFilters([...filters, { field: Object.keys(config.fields)[0], operator: '=', value: '' }]);
  const handleRemoveFilter = (index) => setFilters(filters.filter((_, i) => i !== index));
  const handleFilterChange = (index, property, value) => {
    const newFilters = [...filters];
    newFilters[index][property] = value;
    setFilters(newFilters);
  };
  const handleResetColumns = () => setSelectedFields(config.defaultSelect);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    const activeFilters = filters.filter(f => String(f.value).trim() !== '');

    try {
      const payload = { filters: activeFilters, selectFields: selectedFields };
      const response = await axios.post(`${API_URL}/api/${type}`, payload);
      setResults(response.data);
      if (response.data && activeFilters.length > 0) {
        updateHistory(activeFilters);
      }
    } catch (err) {
      setError('Impossibile eseguire la ricerca. Controlla la console per i dettagli.');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="search-page">
      <h1>{config.title}</h1>
      <div className="filter-builder">
        <div className="filter-header">
          <h3>Filtri</h3>
          <HistorySelector history={history} onLoad={handleLoadFromHistory} onDelete={handleDeleteFromHistory} />
        </div>
        {filters.map((filter, index) => (
          <div key={index} className="filter-row">
            <select value={filter.field} onChange={(e) => handleFilterChange(index, 'field', e.target.value)}>
              {Object.entries(config.fields).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <select value={filter.operator} onChange={(e) => handleFilterChange(index, 'operator', e.target.value)} className="operator-select">
              <option value="=">=</option>
              <option value="LIKE">LIKE</option>
            </select>
            <input type="text" placeholder="Valore (usa % per LIKE)..." value={filter.value} onChange={(e) => handleFilterChange(index, 'value', e.target.value)} />
            <button onClick={() => handleRemoveFilter(index)} className="remove-btn">Rimuovi</button>
          </div>
        ))}
        <button onClick={handleAddFilter} className="add-btn">Aggiungi Filtro</button>
      </div>

      <div className="search-actions">
        <ColumnSelector config={config} selectedFields={selectedFields} setSelectedFields={setSelectedFields} onReset={handleResetColumns} />
        <button onClick={handleSearch} disabled={loading} className="search-btn">{loading ? 'Ricerca in corso...' : 'Cerca'}</button>
      </div>

      {loading && <div className="loader"></div>}
      {error && <p className="error">{error}</p>}
      
      {results && (
        <div className="results-section">
          <div className="results-header">
            <h2>Risultati</h2>
            <button onClick={() => exportToXLSX(results)} className="add-btn">Esporta in XLSX</button>
          </div>
          <ResultsTable data={results} headers={selectedFields} config={config} />
        </div>
      )}
    </div>
  );
}

export default Search;
