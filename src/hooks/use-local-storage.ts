
'use client';

import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      try {
        const item = window.localStorage.getItem(key);
        // Only parse if the item is a non-empty string
        setStoredValue(item && item !== 'undefined' ? JSON.parse(item) : initialValue);
      } catch (error) {
        console.error(`Error reading localStorage key “${key}”:`, error);
        setStoredValue(initialValue);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, key, initialValue]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    if (!isClient) {
      console.warn(`Tried to set localStorage key “${key}” on the server`);
      return;
    }
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (valueToStore === null || valueToStore === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, storedValue, isClient]);

  useEffect(() => {
    if (!isClient) return;
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== e.oldValue) {
        try {
          setStoredValue(e.newValue ? JSON.parse(e.newValue) : initialValue);
        } catch(error) {
          console.error(`Error parsing new localStorage value for “${key}”:`, error);
          setStoredValue(initialValue);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue, isClient]);

  return [storedValue, setValue];
}

export default useLocalStorage;
