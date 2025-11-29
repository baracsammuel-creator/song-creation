// src/context/AuthContext.js
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
    onAuthStateChanged, 
    signInAnonymously,
    signOut
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// AVERTISMENT DE SECURITATE: Această parolă este aceeași pentru toți utilizatorii.
// A se folosi DOAR pentru aplicații interne, unde securitatea conturilor individuale nu este o prioritate.

export const AuthContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState('adolescent'); 
    const [loading, setLoading] = useState(true);
    const isInitializing = useRef(false); // Previne rulări multiple

    // Funcție pentru a actualiza rolul din token claims
    const updateRoleFromToken = useCallback(async (currentUser) => {
        if (!currentUser) {
            setRole('adolescent');
            return;
        }
        try {
            const token = await currentUser.getIdTokenResult(true);
            const claims = token.claims;
            // Rolul implicit este 'adolescent' dacă nu există altceva în claims
            const newRole = claims.admin ? 'admin' : claims.lider ? 'lider' : (claims.role || 'adolescent');
            console.log('Role updated from token:', newRole);
            setRole(newRole);
        } catch (error) {
            if (error.code === 'auth/id-token-revoked') {
                console.warn("Sesiunea a fost revocată. Se va încerca re-autentificarea la reîncărcare.");
                // Forțăm delogarea pentru a declanșa logica de re-autentificare din useEffect
                await signOut(auth);
            } else {
                console.error('Error updating role from token:', error);
                setRole('adolescent');
            }
        }
    }, []);

    const refreshRole = useCallback(async () => {
        if (auth.currentUser) {
            await updateRoleFromToken(auth.currentUser);
        }
    }, [updateRoleFromToken]);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            if (currentUser) {
                // Utilizator logat, salvăm UID-ul
                localStorage.setItem('persistentUid', currentUser.uid);
                setUser(currentUser);
                await updateRoleFromToken(currentUser);
                isInitializing.current = false;
            } else {
                // Niciun utilizator activ. Aici intervine logica de persistență.
                if (!isInitializing.current) {
                    isInitializing.current = true;
                    console.log("Niciun utilizator activ. Se inițiază autentificarea anonimă...");
                    try {
                        await signInAnonymously(auth);
                        // onAuthStateChanged se va rula din nou, de data asta cu un utilizator,
                        // și va intra pe ramura `if (currentUser)` de mai sus.
                    } catch (error) {
                        console.error("Eroare la signInAnonymously:", error);
                        isInitializing.current = false;
                    }
                }
            }
            setLoading(false);
        });

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && auth.currentUser) {
                console.log('App became visible, refreshing role...');
                await refreshRole();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            unsubscribe();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [updateRoleFromToken, refreshRole]);

    // Afișează un ecran de încărcare global
    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-gray-100 text-theme-primary">Se încarcă...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, loading, role, refreshRole }}> 
            {children}
        </AuthContext.Provider>
    );
};