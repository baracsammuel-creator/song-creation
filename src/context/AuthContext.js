// src/context/AuthContext.js
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    updateProfile,
    signOut // Păstrăm signOut pentru o eventuală funcție de logout
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Login from '@/components/Login'; // Importăm componenta de Login

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// AVERTISMENT DE SECURITATE: Această parolă este aceeași pentru toți utilizatorii.
// A se folosi DOAR pentru aplicații interne, unde securitatea conturilor nu este o prioritate.
// Recomandare: Mutați parola într-un fișier .env.local
const GENERIC_PASSWORD = process.env.NEXT_PUBLIC_GENERIC_PASSWORD || "connect-12345";

export const AuthContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState('adolescent'); 
    const [loading, setLoading] = useState(true);

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
                console.warn("Sesiunea a fost revocată. Utilizatorul va fi delogat.");
                // Forțăm delogarea pentru a declanșa logica de re-autentificare din useEffect
                await signOut(auth);
            } else {
                console.error('Error updating role from token:', error);
                setRole('adolescent');
            }
        }
    }, []);

    // NOU: Funcția de login cu pseudo-email
    const loginWithName = useCallback(async (name) => {
        // 1. Sanitizează numele pentru a crea un email valid (fără diacritice, spații înlocuite cu punct)
        const sanitizedName = name.trim().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // elimină diacriticele
            .replace(/\s+/g, '.');
        const email = `${sanitizedName}@connect.ro`;

        try {
            // 2. Încearcă să te loghezi
            await signInWithEmailAndPassword(auth, email, GENERIC_PASSWORD);
            console.log(`Utilizator existent logat: ${email}`);
        } catch (error) {
            // 3. Dacă utilizatorul nu există, creează-l
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                console.log(`Utilizatorul ${email} nu există. Se creează un cont nou...`);
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, GENERIC_PASSWORD);
                    // Setează numele de afișaj (displayName) pentru noul utilizator
                    await updateProfile(userCredential.user, { displayName: name.trim() });
                    console.log(`Cont nou creat și logat pentru: ${email}`);
                } catch (creationError) {
                    console.error("Eroare la crearea contului:", creationError);
                    throw new Error("Nu s-a putut crea contul. Încearcă un alt nume.");
                }
            } else {
                // Alte erori de login
                console.error("Eroare la autentificare:", error);
                throw new Error("A apărut o eroare la autentificare.");
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
            if (currentUser) {
                setUser(currentUser);
                await updateRoleFromToken(currentUser);
            } else {
                // Utilizatorul este delogat, resetează starea
                setUser(null);
                setRole('adolescent');
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
    }, [updateRoleFromToken, refreshRole]); // Am scos loginWithName de aici

    // Provider-ul acum doar furnizează contextul.
    // Logica de afișare (loading, pagină de login, conținut protejat)
    // ar trebui gestionată în afara provider-ului, de ex. într-un layout component.

    return (
        <AuthContext.Provider value={{ user, loading, role, loginWithName, refreshRole }}>
            {children}
        </AuthContext.Provider>
    );
};