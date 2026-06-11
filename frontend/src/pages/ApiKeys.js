import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiKeysAPI } from '../api/client';

const box = { background: '#1a1f3a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #00ff41' };
const input = { width: '100%', padding: '0.75rem', background: '#0a0e27', border: '1px solid #00ff41', color: '#00ff41', borderRadius: '4px', marginBottom: '1rem' };
const btn = { padding: '0.75rem 1.5rem', background: '#00ff41', border: 'none', color: '#0a0e27', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' };

export default function ApiKeys() {
  const { user, logout } = useAuth();
  const [keys, setKeys] = useState([]);
  const [form, setForm] = useState({ exchange: 'gemini', api_key: '', api_secret: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const loadKeys = async () => {
    try {
      const res = await apiKeysAPI.list();
      setKeys(res.data.keys || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadKeys(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await apiKeysAPI.store(form);
      setMessage('✅ API key saved (encrypted).');
      setForm({ ...form, api_key: '', api_secret: '' });
      loadKeys();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || err.message));
    }
    setBusy(false);
  };

  const handleTest = async () => {
    setBusy(true);
    setMessage('Testing connection...');
    try {
      const res = await apiKeysAPI.testConnection({ exchange: form.exchange });
      setMessage(res.data.success ? '✅ Connection successful.' : '❌ ' + res.data.error);
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || err.message));
    }
    setBusy(false);
  };

  const handleDelete = async (id) => {
    try {
      await apiKeysAPI.delete(id);
      loadKeys();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e27', color: '#00ff41' }}>
      <nav style={{ background: '#1a1f3a', padding: '1rem 2rem', borderBottom: '1px solid #00ff41', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>PRISM TRADE</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/" style={{ color: '#00ff41', textDecoration: 'none' }}>DASHBOARD</Link>
          <Link to="/strategies" style={{ color: '#00ff41', textDecoration: 'none' }}>STRATEGIES</Link>
          <Link to="/trading" style={{ color: '#00ff41', textDecoration: 'none' }}>TRADING</Link>
          <Link to="/api-keys" style={{ color: '#00ff41', textDecoration: 'none', fontWeight: 'bold' }}>API KEYS</Link>
          <span style={{ color: '#888' }}>{user?.username}</span>
          <button onClick={logout} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #00ff41', color: '#00ff41', cursor: 'pointer', borderRadius: '4px' }}>LOGOUT</button>
        </div>
      </nav>

      <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
        <h2>EXCHANGE API KEYS</h2>
        <p style={{ color: '#888' }}>Keys are encrypted at rest and used only to place trades on your behalf.</p>

        <div style={{ ...box, marginBottom: '2rem' }}>
          <form onSubmit={handleSave}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Exchange</label>
            <select name="exchange" value={form.exchange} onChange={handleChange} style={input}>
              <option value="gemini">Gemini</option>
              <option value="coinbase">Coinbase</option>
              <option value="binance">Binance</option>
              <option value="kraken">Kraken</option>
            </select>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>API Key</label>
            <input name="api_key" value={form.api_key} onChange={handleChange} style={input} autoComplete="off" required />
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>API Secret</label>
            <input name="api_secret" type="password" value={form.api_secret} onChange={handleChange} style={input} autoComplete="off" required />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" style={btn} disabled={busy}>SAVE KEY</button>
              <button type="button" onClick={handleTest} style={{ ...btn, background: 'transparent', color: '#00ff41', border: '1px solid #00ff41' }} disabled={busy}>TEST CONNECTION</button>
            </div>
          </form>
          {message && <div style={{ marginTop: '1rem' }}>{message}</div>}
        </div>

        <div style={box}>
          <h3 style={{ marginTop: 0 }}>SAVED KEYS</h3>
          {keys.length === 0 ? (
            <p style={{ color: '#888' }}>No API keys stored yet.</p>
          ) : (
            keys.map((k) => (
              <div key={k.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#0a0e27', borderRadius: '4px', marginBottom: '0.5rem' }}>
                <div>
                  <strong>{k.exchange.toUpperCase()}</strong>
                  <span style={{ color: k.is_active ? '#00ff41' : '#888', marginLeft: '1rem' }}>{k.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
                <button onClick={() => handleDelete(k.id)} style={{ padding: '0.4rem 0.8rem', background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '4px', cursor: 'pointer' }}>DELETE</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
