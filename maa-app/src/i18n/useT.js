import { useLanguage } from '../context/LanguageContext';
import { translations } from './translations';

export function useT() {
    const { language, setLanguage, isHindi, isEnglish, isBilingual } = useLanguage();

    const t = (key, params = {}) => {
        const entry = translations[key];
        if (!entry) {
            console.warn(`[useT] Missing translation key: ${key}`);
            return key; // Fallback to the key itself
        }

        let str = entry[language] || entry.en || entry.hi || key;

        // Replace any dynamic parameters (e.g., %name%, %num%)
        Object.keys(params).forEach(paramKey => {
            str = str.replace(new RegExp(`%${paramKey}%`, 'g'), params[paramKey]);
        });

        return str;
    };

    return { t, language, setLanguage, isHindi, isEnglish, isBilingual };
}
