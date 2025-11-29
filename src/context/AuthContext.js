// src/context/AuthContext.js
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase'; 

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

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
            // Force refresh token pentru a obține cele mai noi claims
            const token = await currentUser.getIdTokenResult(true); 
            const claims = token.claims;
            
            const newRole = claims.admin ? 'admin' : claims.lider ? 'lider' : 'adolescent';
            
            console.log('Role updated from token:', newRole);
            setRole(newRole);
        } catch (error) {
            console.error('Error updating role from token:', error);
            setRole('adolescent');
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
            setUser(currentUser);
            await updateRoleFromToken(currentUser);
            setLoading(false);
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