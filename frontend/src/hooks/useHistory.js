import { useCallback, useEffect, useState } from 'react';
import { HISTORY_KEY, MAX_HISTORY_ENTRIES } from '../config';

function read() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES)));
}

export function useHistory() {
  const [history, setHistory] = useState(read);

  useEffect(() => {
    const sync = () => setHistory(read());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const addEntry = useCallback((entry) => {
    setHistory((current) => {
      const next = [{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, ...entry }, ...current];
      write(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    write([]);
    setHistory([]);
  }, []);

  const removeEntry = useCallback((id) => {
    setHistory((current) => {
      const next = current.filter((item) => item.id !== id);
      write(next);
      return next;
    });
  }, []);

  return { history, addEntry, clearHistory, removeEntry };
}
