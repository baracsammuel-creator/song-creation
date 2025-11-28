"use client";

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function HomePageContent() {
    const { user, role, loading } = useAuth();

    let welcomeMessage = "Bine ați revenit!";
    let callToAction = "Explorați secțiunile site-ului Connect.";
    let colorClass = "text-indigo-600";
    let icon = "👋";

    if (loading) {
        // Asigurăm că centrul este ocupat cât timp se încarcă
        return (
            <div className="flex justify-center items-center h-40">
                <div className="text-xl text-indigo-600 animate-pulse">Se încarcă datele...</div>
            </div>
        );
    }

    // Setăm mesajele pe baza rolului
    if (role === 'admin') {
        welcomeMessage = "Bun venit, Administrator!";
        callToAction = "Mergeți la Dashboard pentru a gestiona rolurile și evenimentele.";
        colorClass = "text-red-600";
        icon = "👑";
    } else if (role === 'lider') {
        welcomeMessage = "Bun venit, Lider Connect!";
        callToAction = "Verificați noutățile din Dashboard-ul echipei și planificați evenimente.";
        colorClass = "text-green-600";
        icon = "💡";
    } else if (user) { 
        // Utilizator logat, dar nu admin/lider (probabil 'adolescent')
        welcomeMessage = "Suntem bucuroși să te avem alături!";
        callToAction = "Începe prin a explora calendarul și resursele noastre.";
        colorClass = "text-blue-600";
        icon = "🌟";
    } else {
        // Utilizator neautentificat (vizitator)
        welcomeMessage = "Bun venit pe Connect Calendar!";
        callToAction = "Autentificați-vă pentru a vedea evenimentele și a interacționa cu platforma.";
        colorClass = "text-gray-600";
        icon = "🌐";
    }

    return (
        // Containerul principal este centrat și utilizează padding flexibil
        <div className="p-6 sm:p-10 bg-white shadow-2xl rounded-2xl max-w-xl w-full mx-auto text-center border-t-8 border-indigo-500/80 transform hover:shadow-3xl transition duration-300">
            <div className={`text-5xl sm:text-7xl mb-4 ${colorClass} animate-bounce-slow`}>{icon}</div>
            
            <h1 className={`text-3xl sm:text-4xl font-extrabold mb-2 ${colorClass} leading-tight`}>
                {welcomeMessage}
            </h1>
            
            <p className="text-md sm:text-xl text-gray-700 mb-4">
                {user ? `Ești logat ca: ${role.toUpperCase()}` : 'Ești un vizitator neautentificat.'}
            </p>
            
            <p className="text-base sm:text-lg text-gray-500 mb-8 max-w-sm mx-auto">
                {callToAction}
            </p>

            {/* Link-uri Condiționate */}
            <div className="flex flex-col space-y-3 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
                
                {/* Buton principal (Dashboard sau Login/Resurse) */}
                {
                    (role === 'admin' || role === 'lider') && 
                        <>
                        <Link
                            href="/dashboard"
                            className="w-full sm:w-auto inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition duration-200 shadow-lg transform hover:scale-[1.02]"
                        >
                        Accesează Dashboard-ul
                        </Link>
                        <Link
                            href="/events"
                            className="w-full sm:w-auto inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition duration-200 shadow-md transform hover:scale-[1.02]"
                        >
                            Vezi Calendarul
                        </Link>
                        </>
                }
                
            </div>
        </div>
    );
}