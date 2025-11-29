"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAuth } from 'firebase/auth';

const ROLES = ['adolescent', 'lider', 'admin'];

// Funcție utilitară pentru a scurta UID-ul pe mobil
const getShortUid = (uid) => {
    if (!uid) return 'N/A';
    return `${uid.substring(0, 4)}...${uid.substring(uid.length - 4)}`;
};

export default function DashboardContent() {
    const { user, role, loading } = useAuth();
    const [users, setUsers] = useState([]);
    const [fetchError, setFetchError] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [statusMessage, setStatusMessage] = useState(''); // Pentru mesaje de succes/eroare la schimbarea rolului

    const auth = getAuth();
    const isAdmin = role === 'admin';
    const isLider = role === 'lider';

    // Funcție pentru a prelua lista de utilizatori de la API
    const fetchUsers = useCallback(async () => {
        // Liderii și Adminii pot vedea panoul (deși doar Adminii au acces la lista completă)
        if (!isAdmin || !auth.currentUser) {
            setLoadingUsers(false);
            return;
        }

        setLoadingUsers(true);
        setFetchError('');
        
        try {
            // Obține token-ul Adminului pentru a securiza apelul API
            const idToken = await auth.currentUser.getIdToken();
            
            // NOTĂ: Endpoint-ul /api/users trebuie să fie implementat
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
        // Curăță mesajul de status după 5 secunde
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [loading, fetchUsers, statusMessage]);

    // Funcție pentru a schimba rolul unui utilizator
    const handleRoleChange = async (targetUid, newRole) => {
        if (!isAdmin || !auth.currentUser) return;

        setStatusMessage({ type: 'loading', text: `Se setează rolul "${newRole}" pentru ${getShortUid(targetUid)}...` });

        try {
            const idToken = await auth.currentUser.getIdToken();
            
            // NOTĂ: Endpoint-ul /api/set-leader trebuie să fie implementat
            const response = await fetch('/api/set-leader', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUid, newRole, idToken }),
            });
            
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Eroare la setarea rolului.');
            }
            
            setStatusMessage({ 
                type: 'success', 
                text: `Rolul setat cu succes: ${data.message}. Utilizatorul va vedea noul rol când reîmprospătează aplicația sau la următoarea autentificare.` 
            });

            // Reîmprospătează lista pentru a vedea noua stare
            setTimeout(() => {
                fetchUsers();
            }, 1000); 

        } catch (error) {
            setStatusMessage({ type: 'error', text: error.message || "Eroare la comunicarea cu serverul." });
        }
    };

    if (loading) {
        return <div className="text-center p-10 text-theme-primary animate-pulse">Se verifică rolul...</div>;
    }

    // Afișează conținutul Dashboard-ului în funcție de rol
    return (
        // Container fluid și padding adaptiv
        <div className="w-full">
            
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">Dashboard</h1>
            
            <p className={`text-lg font-semibold mb-6`}>
                Ești logat ca: {role.toUpperCase()}
            </p>

            {/* Secțiune vizibilă DOAR pentru Admin */}
            {isAdmin ? ( 
                <div className="bg-white shadow-2xl overflow-hidden rounded-xl p-4 sm:p-6 border-t-8 border-red-500">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4 border-b pb-2">Gestionarea Utilizatorilor</h2>
                    
                    {/* Afișarea stării operației (Mesaj adaptiv) */}
                    {statusMessage && (
                        <div className={`p-3 sm:p-4 mb-4 rounded-lg text-sm sm:text-base transition duration-300 ${
                            statusMessage.type === 'loading' ? 'bg-yellow-100 text-yellow-800' :
                            statusMessage.type === 'success' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                            {statusMessage.text}
                        </div>
                    )}
                    
                    {loadingUsers ? (
                        <p className="text-theme-primary p-4">Se încarcă lista de utilizatori...</p>
                    ) : fetchError ? (
                        <p className="text-theme-danger p-4">Eroare la preluarea listei: {fetchError}</p>
                    ) : (
                        // Container care permite derularea pe orizontală pe ecrane mici
                        <div className="overflow-x-auto shadow-md rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        {/* Coloanele sunt optimizate pentru vizibilitate pe mobil */}
                                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider min-w-[100px]">Nume</th>
                                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider min-w-[100px]">Rol</th>
                                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider min-w-[150px]">Acțiuni</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((u) => (
                                        <tr key={u.uid} className={u.role === 'admin' ? 'bg-red-50' : u.role === 'lider' ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                                            
                                            {/* UID - Afișează scurt pe mobil, complet pe desktop */}
                                            <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                <span className="sm:hidden">{getShortUid(u.nume)}</span>
                                                <span className="hidden sm:inline">{u.nume}</span>
                                                {u.isAnonymous && <span className="text-xs text-gray-500 ml-1">(Anonim)</span>}
                                            </td>

                                            {/* Rol Curent - Teme actualizate */}
                                            <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-sm font-semibold">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    u.role === 'admin' ? 'bg-red-200 text-red-800' : 
                                                    u.role === 'lider' ? 'bg-blue-200 text-blue-800' : 
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {u.role.toUpperCase()}
                                                </span>
                                            </td>

                                            {/* Schimbă Rolul (Dropdown) */}
                                            <td className="px-3 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                                                    className={`mt-1 block w-full py-2 px-2 border border-gray-300 bg-white rounded-md shadow-sm text-xs sm:text-sm 
                                                        focus:outline-none focus:ring-theme-primary focus:border-theme-primary transition duration-150
                                                        ${u.role === 'admin' ? 'bg-red-100/50 border-red-500' : u.role === 'lider' ? 'bg-blue-100/50 border-blue-500' : ''}`
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
                            <p className="p-4 text-sm text-gray-500">Total utilizatori: {users.length}</p>
                        </div>
                    )}
                </div>
            ) : isLider ? ( 
                // Conținut pentru Lideri - Temă Indigo
                <div className="bg-white shadow-2xl overflow-hidden rounded-xl p-4 sm:p-6 border-t-8 border-theme-primary">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4">Panoul de Control al Echipei</h2>
                    <p className="text-sm sm:text-base">Aici vei vedea informații relevante despre grupul tău de adolescenți și vei putea gestiona evenimentele viitoare. Liderii pot vedea și modifica doar evenimentele proprii.</p>
                </div>
            ) : (
                // Conținut pentru Adolescenți (dacă ajung accidental aici)
                <div className="bg-white shadow-2xl overflow-hidden rounded-xl p-4 sm:p-6 border-t-8 border-theme-primary">
                    <h2 className="text-xl sm:text-2xl font-bold mb-4">Bun venit în comunitate!</h2>
                    <p className="text-sm sm:text-base">Acest spațiu este rezervat pentru resursele și activitățile tale. Vizitează calendarul pentru a vedea evenimentele disponibile.</p>
                </div>
            )}
        </div>
    );
}