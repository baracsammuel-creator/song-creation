// src/context/AuthContext.js
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState('adolescent'); 
    const [loading, setLoading] = useState(true);
    
    // Folosim useRef pentru a preveni rularea multiplă a logicii de inițializare
    const isInitializing = useRef(false);

    // Funcție pentru a actualiza rolul din token claims
    const updateRoleFromToken = useCallback(async (currentUser) => {
        if (!currentUser) {
            setRole('adolescent');
            return;
        }

        try {
            // Forțăm reîmprospătarea token-ului pentru a obține cele mai noi claims
            const token = await currentUser.getIdTokenResult(true);
            const claims = token.claims;
            
            const newRole = claims.admin ? 'admin' : claims.lider ? 'lider' : 'adolescent';
            
            console.log('Role updated from token:', newRole);
            setRole(newRole);
        } catch (error) {
            // AICI PRINDEM EROAREA DE REVOCARE
            if (error.code === 'auth/id-token-revoked' || error.code === 'auth/user-token-expired') {
                console.warn("Sesiunea a fost revocată. Se încearcă re-autentificarea...");
                
                const storedUid = localStorage.getItem('anonymousUid');
                if (storedUid) {
                    try {
                        // Cerem un token nou de la server pentru UID-ul nostru
                        const response = await fetch('/api/reauth', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ uid: storedUid }),
                        });
                        const data = await response.json();

                        if (data.success) {
                            // Ne re-autentificăm cu token-ul custom
                            await signInWithCustomToken(auth, data.token);
                            console.log("Re-autentificare reușită cu același UID:", storedUid);
                            // onAuthStateChanged se va declanșa din nou cu noul utilizator valid
                        } else {
                            throw new Error(data.message || 'Eroare la server reauth');
                        }
                    } catch (reauthError) {
                        console.error("Re-autentificarea a eșuat, se curăță starea:", reauthError);
                        localStorage.removeItem('anonymousUid');
                        await auth.signOut(); // Forțează delogarea completă
                    }
                }
            } else {
                console.error('Error updating role from token:', error);
                setRole('adolescent');
            }
        }
    }, []);

    // Funcție pentru a forța refresh-ul rolului (poate fi apelată manual)
    const refreshRole = useCallback(async () => {
        if (auth.currentUser) {
            await updateRoleFromToken(auth.currentUser);
        }
    }, [updateRoleFromToken]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Salvăm UID-ul pentru a-l putea folosi la re-autentificare
                localStorage.setItem('anonymousUid', currentUser.uid);
                await updateRoleFromToken(currentUser);
                setLoading(false);
                isInitializing.current = false;
            } else {
                // Dacă nu există utilizator și nu suntem deja în proces de inițializare
                if (!isInitializing.current) {
                    isInitializing.current = true;
                    console.log("Niciun utilizator. Se inițiază autentificarea anonimă...");
                    try {
                        await signInAnonymously(auth);
                        // onAuthStateChanged se va rula din nou, de data asta cu un utilizator
                    } catch (error) {
                        console.error("Eroare la signInAnonymously:", error);
                        setLoading(false);
                        isInitializing.current = false;
                    }
                }
            }
        });

        // Verifică periodic pentru actualizări de rol (la fiecare 5 minute)
        const roleRefreshInterval = setInterval(async () => {
            if (auth.currentUser) {
                console.log('Periodic role check...');
                await updateRoleFromToken(auth.currentUser);
            }
        }, 5 * 60 * 1000); // 5 minute

        // Listener pentru când aplicația devine vizibilă din nou (user revine la aplicație)
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && auth.currentUser) {
                console.log('App became visible, refreshing role...');
                await updateRoleFromToken(auth.currentUser);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            unsubscribe();
            clearInterval(roleRefreshInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [updateRoleFromToken]);

    return (
        <AuthContext.Provider value={{ user, loading, role, refreshRole }}> 
            {children}
        </AuthContext.Provider>
    );
};