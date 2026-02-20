import React, { createContext, useState, useContext } from 'react';

const UserContext = createContext();

const DEFAULT_EYE_SCORES = {
    age: '',
    familyHistory: false,
    logMAR: '',
    logCS: '',
    vfi: '',
    amsler: false,
};

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { id: 'user_001', role: 'mother' }
    const [eyeScores, setEyeScores] = useState({ ...DEFAULT_EYE_SCORES });

    const login = (id, role) => {
        setUser({ id, role });
    };

    const logout = () => {
        setUser(null);
    };

    const updateEyeScore = (key, value) => {
        setEyeScores(prev => ({ ...prev, [key]: value }));
    };

    const resetEyeScores = () => {
        setEyeScores({ ...DEFAULT_EYE_SCORES });
    };

    return (
        <UserContext.Provider value={{ user, login, logout, eyeScores, updateEyeScore, resetEyeScores }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
