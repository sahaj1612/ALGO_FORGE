import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function AuthPage({ mode = 'login' }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const submit = async event => {
    event.preventDefault();
    const response = await fetch(`http://localhost:5000/api/auth/${mode === 'login' ? 'login' : 'register'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await response.json();
    if (!response.ok) return setError(data.message || 'Unable to continue.');
    localStorage.setItem('token', data.token); navigate('/dashboard');
  };
  return <main className="min-h-screen bg-black grid place-items-center p-6 text-white"><form onSubmit={submit} className="w-full max-w-sm bg-zinc-900 rounded-2xl p-8 border border-zinc-800"><h1 className="text-3xl text-red-500 font-bold">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>{mode === 'register' && <input required placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full mt-4 bg-black border border-zinc-700 rounded p-3"/>}<input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full mt-4 bg-black border border-zinc-700 rounded p-3"/><input required type="password" minLength="8" placeholder="Password (8+ characters)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full mt-4 bg-black border border-zinc-700 rounded p-3"/>{error && <p className="text-red-400 mt-3">{error}</p>}<button className="w-full mt-5 bg-red-600 p-3 rounded">{mode === 'login' ? 'Log in' : 'Sign up'}</button><a className="block text-center mt-4 text-zinc-400" href="http://localhost:5000/auth/google">Continue with Google</a><p className="mt-5 text-center text-sm">{mode === 'login' ? 'New here? ' : 'Already registered? '}<Link to={mode === 'login' ? '/signup' : '/login'} className="text-red-400">{mode === 'login' ? 'Sign up' : 'Log in'}</Link></p></form></main>;
}
