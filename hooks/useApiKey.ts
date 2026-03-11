'use client';

/**
 * BLACK LINE PRO — BYOK (Bring Your Own Key) Hook
 *
 * Manages the user's Gemini API key stored in localStorage.
 * The key NEVER goes to the server unless the user explicitly generates something.
 * Even then, it travels as a request header (HTTPS) and is not persisted on the server.
 *
 * Storage keys:
 *   blp_gemini_key      — the API key itself
 *   blp_tutorial_done   — flag: user has completed the setup tutorial
 *   blp_key_validated   — flag: key was successfully validated at least once
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY        = 'blp_gemini_key';
const TUTORIAL_DONE_KEY  = 'blp_tutorial_done';
const KEY_VALIDATED_KEY  = 'blp_key_validated';

export interface UseApiKeyReturn {
  /** The stored Gemini API key, or null if not set */
  apiKey: string | null;
  /** True if a key is stored */
  hasKey: boolean;
  /** True if the user has completed the setup tutorial */
  hasSeenTutorial: boolean;
  /** True if the key was validated at least once (successful generation) */
  isValidated: boolean;
  /** True after localStorage has been read (prevents SSR flash) */
  isLoaded: boolean;
  /** Save a new API key and mark tutorial as done */
  setApiKey: (key: string) => void;
  /** Remove the API key (reset) */
  removeApiKey: () => void;
  /** Mark tutorial as seen without saving a key */
  dismissTutorial: () => void;
  /** Mark the key as validated (call after first successful generation) */
  markValidated: () => void;
}

export function useApiKey(): UseApiKeyReturn {
  const [apiKey,          setApiKeyState]    = useState<string | null>(null);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const [isValidated,     setIsValidated]    = useState(false);
  const [isLoaded,        setIsLoaded]       = useState(false);

  // Read from localStorage on mount (client-side only)
  useEffect(() => {
    const storedKey       = localStorage.getItem(STORAGE_KEY);
    const tutorialDone    = localStorage.getItem(TUTORIAL_DONE_KEY) === 'true';
    const keyValidated    = localStorage.getItem(KEY_VALIDATED_KEY) === 'true';

    setApiKeyState(storedKey);
    setHasSeenTutorial(tutorialDone);
    setIsValidated(keyValidated);
    setIsLoaded(true);

    // Sync across hook instances in the same tab
    const handleKeyChanged = (e: Event) => {
      const key = (e as CustomEvent).detail as string | null;
      setApiKeyState(key);
    };
    window.addEventListener('blp-apikey-changed', handleKeyChanged);
    return () => window.removeEventListener('blp-apikey-changed', handleKeyChanged);
  }, []);

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    localStorage.setItem(STORAGE_KEY,       trimmed);
    localStorage.setItem(TUTORIAL_DONE_KEY, 'true');
    setApiKeyState(trimmed);
    setHasSeenTutorial(true);
    // Notify other hook instances in the same tab
    window.dispatchEvent(new CustomEvent('blp-apikey-changed', { detail: trimmed }));
  }, []);

  const removeApiKey = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(KEY_VALIDATED_KEY);
    setApiKeyState(null);
    setIsValidated(false);
  }, []);

  const dismissTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_DONE_KEY, 'true');
    setHasSeenTutorial(true);
  }, []);

  const markValidated = useCallback(() => {
    localStorage.setItem(KEY_VALIDATED_KEY, 'true');
    setIsValidated(true);
  }, []);

  return {
    apiKey,
    hasKey:         !!apiKey,
    hasSeenTutorial,
    isValidated,
    isLoaded,
    setApiKey,
    removeApiKey,
    dismissTutorial,
    markValidated,
  };
}
