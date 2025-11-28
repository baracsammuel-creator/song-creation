"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAuth } from 'firebase/auth';

const ROLES = ['adolescent', 'lider', 'admin'];

export default function DashboardContent() {
    const { user, role, loading } = useAuth();
    const [users, setUsers] = useState([]);
    const [fetchError, setFetchError] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [statusMessage, setStatusMessage] = useState(''); // Pentru mesaje de succes/eroare la schimbarea rolului

    const auth = getAuth();
    const isAdmin = role === 'admin';

    // Funcție pentru a prelua lista de utilizatori de la API
    const fetchUsers = useCallback(async () => {
        if (!isAdmin || !auth.currentUser) {
            setLoadingUsers(false);
            return;
        }

        setLoadingUsers(true);
        setFetchError('');
        
        try {
            // Obține token-ul Adminului pentru a securiza apelul API
            const idToken = await auth.currentUser.getIdToken();
            
            const response = await fetch(`/api/users?idToken=${idToken}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Eroare la preluarea utilizatorilor.');
            }

            // Sortează utilizatorii: Adminii primii, apoi Liderii, apoi Adolescenții
            const sortedUsers = data.users.sort((a, b) => {
                const roleOrder = { 'admin': 1, 'lider': 2, 'adolescent': 3, 'necunoscut': 4 };
                return roleOrder[a.role] - roleOrder[b.role];
            });

            setUsers(sortedUsers);
        } catch (err) {
            setFetchError(err.message);
        } finally {
            setLoadingUsers(false);
        }
    }, [isAdmin, auth]);

    // Apel inițial la încărcare
    useEffect(() => {
        if (!loading) {
            fetchUsers();
        }
    }, [loading, fetchUsers]);

    // Funcție pentru a schimba rolul unui utilizator
    const handleRoleChange = async (targetUid, newRole) => {
        if (!isAdmin || !auth.currentUser) return;

        setStatusMessage({ type: 'loading', text: `Se setează rolul "${newRole}" pentru ${targetUid}...` });

        try {
            const idToken = await auth.currentUser.getIdToken();
            
            const response = await fetch('/api/set-leader', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUid, newRole, idToken }),
            });
            
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Eroare la setarea rolului.');
            }
            
            setStatusMessage({ type: 'success', text: `Rolul setat cu succes: ${data.message}` });

            // Reîmprospătează lista pentru a vedea noua stare
            // Setăm un timeout mic pentru a da timp Firebase să proceseze
            setTimeout(() => {
                fetchUsers();
            }, 1000); 

        } catch (error) {
            setStatusMessage({ type: 'error', text: error.message || "Eroare la comunicarea cu serverul." });
        }
    };

    if (loading) {
        return <div className="text-center p-10">Se verifică rolul...</div>;
    }

    // Afișează conținutul Dashboard-ului în funcție de rol
    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Dashboard</h1>
            
            <p className={`text-xl font-semibold mb-6 ${role === 'admin' ? 'text-red-600' : 'text-green-600'}`}>
                Ești logat ca: {role.toUpperCase()}
            </p>

            {/* Secțiune vizibilă DOAR pentru Admin */}
            {isAdmin ? (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">Gestionarea Utilizatorilor</h2>
                    
                    {/* Afișarea stării operației */}
                    {statusMessage && (
                        <div className={`p-4 mb-4 rounded-md ${
                            statusMessage.type === 'loading' ? 'bg-yellow-100 text-yellow-800' :
                            statusMessage.type === 'success' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                            {statusMessage.text}
                        </div>
                    )}
                    
                    {loadingUsers ? (
                        <p className="text-indigo-600">Se încarcă lista de utilizatori...</p>
                    ) : fetchError ? (
                        <p className="text-red-500">Eroare la preluarea listei: {fetchError}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UID (Anonim)</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol Curent</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schimbă Rolul</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((u) => (
                                        <tr key={u.uid} className={u.role === 'admin' ? 'bg-red-50' : u.role === 'lider' ? 'bg-green-50' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {u.uid} {u.isAnonymous && <span className="text-xs text-gray-500">(Anonim)</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {u.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    u.role === 'admin' ? 'bg-red-200 text-red-800' : 
                                                    u.role === 'lider' ? 'bg-green-200 text-green-800' : 
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {u.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                                                    className={`mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm 
                                                        ${u.role === 'admin' ? 'bg-red-100 border-red-500' : u.role === 'lider' ? 'bg-green-100 border-green-500' : ''}`
                                                    }
                                                >
                                                    {ROLES.map((r) => (
                                                        <option key={r} value={r} disabled={r === u.role}>
                                                            {r.charAt(0).toUpperCase() + r.slice(1)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="mt-4 text-sm text-gray-500">Total utilizatori: {users.length}</p>
                        </div>
                    )}
                </div>
            ) : role === 'lider' ? (
                // Conținut pentru Lideri
                <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 border-t-4 border-green-500">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Panoul de Control al Echipei</h2>
                    <p className="text-gray-600">Aici vei vedea informații relevante despre grupul tău de adolescenți și vei putea gestiona evenimentele viitoare.</p>
                </div>
            ) : (
                // Conținut pentru Adolescenți (dacă ajung accidental aici)
                <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 border-t-4 border-blue-500">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Bun venit în comunitate!</h2>
                    <p className="text-gray-600">Acest spațiu este rezervat pentru resursele și activitățile tale.</p>
                </div>
            )}
        </div>
    );
}