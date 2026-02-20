import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LanguageContext = createContext(null);
const LANGUAGE_KEY = '@maa_language';

export function LanguageProvider({ children }) {
    const [language, setLanguageState] = useState('bilingual');
    const [hasChosenLanguage, setHasChosenLanguage] = useState(false);
    const [isLanguageLoaded, setIsLanguageLoaded] = useState(false);

    useEffect(() => {
        const loadLanguage = async () => {
            try {
                const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
                if (storedLang) {
                    setLanguageState(storedLang);
                    setHasChosenLanguage(true);
                }
            } catch (e) {
                console.error('[LanguageContext] Failed to load language', e);
            } finally {
                setIsLanguageLoaded(true);
            }
        };
        loadLanguage();
    }, []);

    const setLanguage = useCallback(async (nextLanguage) => {
        // Validate
        const validLang = ['hi', 'en', 'bilingual'].includes(nextLanguage) ? nextLanguage : 'bilingual';
        setLanguageState(validLang);
        setHasChosenLanguage(true);
        try {
            await AsyncStorage.setItem(LANGUAGE_KEY, validLang);
        } catch (e) {
            console.error('[LanguageContext] Failed to save language', e);
        }
    }, []);

    const value = useMemo(
        () => ({
            language,
            setLanguage,
            hasChosenLanguage,
            isLanguageLoaded,
            isHindi: language === 'hi',
            isEnglish: language === 'en',
            isBilingual: language === 'bilingual',
        }),
        [language, setLanguage, hasChosenLanguage, isLanguageLoaded]
    );

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
}
