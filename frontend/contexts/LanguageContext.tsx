import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations, Language } from "../constants/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "@app_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<Language>("English");

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && (saved === "English" || saved === "Amharic" || saved === "French" || saved === "Spanish")) {
        setLang(saved as Language);
      }
    } catch (e) {
      console.error("Failed to load language", e);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
      setLang(lang);
    } catch (e) {
      console.error("Failed to save language", e);
    }
  };

  const t = (key: string): string => {
    try {
      return translations[language]?.[key] || translations["English"]?.[key] || key;
    } catch (e) {
      return key;
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
