
'use client';

import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const isClient = typeof window !== 'undefined';

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!isClient) {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    if (!isClient) {
        console.warn('Tried to set localStorage value on the server.');
        return;
    }
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  }, [key, storedValue, isClient]);
  
  useEffect(() => {
    if(isClient) {
      const item = window.localStorage.getItem(key);
      if (item) {
        try {
            setStoredValue(JSON.parse(item));
        } catch(e) {
            console.error(e)
        }
      }
    }
  }, [key, isClient]);


  return [storedValue, setValue];
}

export default useLocalStorage;
