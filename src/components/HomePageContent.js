// src/components/HomePageContent.js
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
        return <div className="text-xl text-indigo-600">Se încarcă datele...</div>;
    }

    if (role === 'admin') {
        welcomeMessage = "Bun venit, Administrator!";
        callToAction = "Mergeți la Dashboard pentru a gestiona rolurile.";
        colorClass = "text-red-600";
        icon = "👑";
    } else if (role === 'lider') {
        welcomeMessage = "Bun venit, Lider Connect!";
        callToAction = "Verificați noutățile din Dashboard-ul echipei.";
        colorClass = "text-green-600";
        icon = "💡";
    } else { // Adolescent (sau nu complet setat)
        welcomeMessage = "Suntem bucuroși să te avem alături!";
        callToAction = "Începe prin a explora resursele noastre.";
        colorClass = "text-blue-600";
        icon = "🌟";
    }

    return (
        <div className="p-8 bg-white shadow-xl rounded-xl max-w-xl w-full text-center border-t-4 border-indigo-500">
            <div className={`text-6xl mb-4 ${colorClass}`}>{icon}</div>
            <h1 className={`text-4xl font-extrabold mb-2 ${colorClass}`}>
                {welcomeMessage}
            </h1>
            <p className="text-xl text-gray-700 mb-6">
                {user ? `Ești logat ca: ${role.toUpperCase()}` : 'Ești un vizitator nou.'}
            </p>
            <p className="text-lg text-gray-500 mb-8">
                {callToAction}
            </p>

            {/* Link condiționat pentru Dashboard */}
            {(role === 'admin' || role === 'lider') && (
                <Link 
                    href="/dashboard"
                    className="mt-4 inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg transition duration-150"
                >
                    Accesează Dashboard-ul
                </Link>
            )}
        </div>
    );
}