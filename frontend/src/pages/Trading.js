import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tradingAPI } from '../api/client';

const box = { background: '#1a1f3a', padding: '1.5rem', borderRadius: '8px', border: '1px solid #00ff41' };
const input = { width: '100%', padding: '0.75rem', background: '#0a0e27', border: '1px solid #00ff41', color: '#00ff41', borderRadius: '4px', marginBottom: '1rem' };
const btn = { padding: '0.75rem 1.5rem', border: 'none', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' };

export default function Trading() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({ exchange: 'gemini', symbol: 'BTC/USD', amount: '', stop_loss_pct: '', take_profit_pct: '' });
  const [positions, setPositions] = useState([]);
  const [ticker, setTicker] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const loadPositions = async () => {
    try {
      const res = await tradingAPI.getPositions(form.exchange);
      setPositions(res.data.positions || []);
    } catch (err) {
      // No API key / no exchange connection yet — leave positions empty
      setPositions([]);
    }
  };

  useEffect(() => {
    loadPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleQuote = async () => {
    setBusy(true);
    setMessage('');
    try {
      const res = await tradingAPI.getTicker(form.symbol, form.exchange);
      setTicker(res.data.ticker);
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || err.message));
    }
    setBusy(false);
  };

  const placeOrder = async (side) => {
    if (!form.amount) { setMessage('❌ Enter an amount'); return; }
    setBusy(true);
    setMessage('');
    try {
      const payload = {
        exchange: form.exchange,
        symbol: form.symbol,
        amount: parseFloat(form.amount),
        stop_loss_pct: form.stop_loss_pct ? parseFloat(form.stop_loss_pct) : null,
        take_profit_pct: form.take_profit_pct ? parseFloat(form.take_profit_pct) : null,
      };
      const res = side === 'buy' ? await tradingAPI.buy(payload) : await tradingAPI.sell(payload);
      setMessage(res.data.success ? `✅ ${side.toUpperCase()} executed @ ${res.data.entry_price || res.data.exit_price}` : '❌ Order failed');
      loadPositions();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || err.message));
    }
    setBusy(false);
  };

  const closePosition = async (tradeId) => {
    setBusy(true);
    try {
      await tradingAPI.closePosition(tradeId, form.exchange);
      loadPositions();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || err.message));
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e27', color: '#00ff41' }}>
      <nav style={{ background: '#1a1f3a', padding: '1rem 2rem', borderBottom: '1px solid #00ff41', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>PRISM TRADE</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/" style={{ color: '#00ff41', textDecoration: 'none' }}>DASHBOARD</Link>
          <Link to="/strategies" style={{ color: '#00ff41', textDecoration: 'none' }}>STRATEGIES</Link>
          <Link to="/trading" style={{ color: '#00ff41', textDecoration: 'none', fontWeight: 'bold' }}>TRADING</Link>
          <Link to="/api-keys" style={{ color: '#00ff41', textDecoration: 'none' }}>API KEYS</Link>
          <span style={{ color: '#888' }}>{user?.username}</span>
          <button onClick={logout} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #00ff41', color: '#00ff41', cursor: 'pointer', borderRadius: '4px' }}>LOGOUT</button>
        </div>
      </nav>

      <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={box}>
          <h2 style={{ marginTop: 0 }}>PLACE ORDER</h2>
          <p style={{ color: '#888', fontSize: '0.85rem' }}>Requires a live exchange API key (add one under API KEYS).</p>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Exchange</label>
          <select name="exchange" value={form.exchange} onChange={handleChange} style={input}>
            <option value="gemini">Gemini</option>
            <option value="coinbase">Coinbase</option>
            <option value="binance">Binance</option>
            <option value="kraken">Kraken</option>
          </select>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Symbol</label>
          <input name="symbol" value={form.symbol} onChange={handleChange} style={input} />
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>Amount</label>
          <input name="amount" type="number" step="any" value={form.amount} onChange={handleChange} style={input} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Stop Loss %</label>
              <input name="stop_loss_pct" type="number" step="any" value={form.stop_loss_pct} onChange={handleChange} style={input} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Take Profit %</label>
              <input name="take_profit_pct" type="number" step="any" value={form.take_profit_pct} onChange={handleChange} style={input} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => placeOrder('buy')} style={{ ...btn, background: '#00ff41', color: '#0a0e27', flex: 1 }} disabled={busy}>BUY</button>
            <button onClick={() => placeOrder('sell')} style={{ ...btn, background: '#ff4444', color: '#fff', flex: 1 }} disabled={busy}>SELL</button>
          </div>
          <button onClick={handleQuote} style={{ ...btn, background: 'transparent', color: '#00ff41', border: '1px solid #00ff41', width: '100%', marginTop: '1rem' }} disabled={busy}>GET QUOTE</button>
          {ticker && <div style={{ marginTop: '1rem' }}>Last price: <strong>{ticker.last}</strong></div>}
          {message && <div style={{ marginTop: '1rem' }}>{message}</div>}
        </div>

        <div style={box}>
          <h2 style={{ marginTop: 0 }}>OPEN POSITIONS</h2>
          {positions.length === 0 ? (
            <p style={{ color: '#888' }}>No open positions.</p>
          ) : (
            positions.map((p) => (
              <div key={p.trade_id} style={{ padding: '1rem', background: '#0a0e27', borderRadius: '4px', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{p.symbol}</strong>
                  <span style={{ color: p.unrealized_pnl >= 0 ? '#00ff41' : '#ff4444' }}>
                    {p.unrealized_pnl >= 0 ? '+' : ''}{p.unrealized_pnl?.toFixed(2)} ({p.unrealized_pnl_pct?.toFixed(2)}%)
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#888', margin: '0.5rem 0' }}>
                  {p.side?.toUpperCase()} {p.amount} @ {p.entry_price} (now {p.current_price})
                </div>
                <button onClick={() => closePosition(p.trade_id)} style={{ ...btn, background: 'transparent', color: '#ff4444', border: '1px solid #ff4444' }} disabled={busy}>CLOSE</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
