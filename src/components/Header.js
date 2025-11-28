"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
// Am eliminat importul de getAuth și signOut, deoarece nu mai sunt folosite
// import { getAuth, signOut } from 'firebase/auth'; 

export default function Header() {
    const { user, role, loading } = useAuth();
    // Am eliminat referința la getAuth()
    // const auth = getAuth(); 

    // Am eliminat funcția handleLogout
    /*
    const handleLogout = async () => {
        try {
            await signOut(auth);
            // Redirecționarea se va face automat prin hook-ul useAuth
        } catch (error) {
            console.error("Eroare la delogare:", error);
        }
    };
    */

    const navItems = [
        { name: "Acasă", href: "/", isVisible: true },
        { name: "Despre", href: "/about", isVisible: true },
        // Link-ul Profilului, vizibil doar dacă utilizatorul este logat
        { name: "Profil", href: "/profile", isVisible: user && !loading }, 
        // Link-ul Dashboard-ului, vizibil pentru Lideri și Admini
        { name: "Dashboard", href: "/dashboard", isVisible: user && (role === 'admin' || role === 'lider') && !loading }, 
    ];

    return (
        <header className="bg-white shadow-md sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
                
                {/* Logo / Numele Aplicației */}
                <Link href="/" className="text-2xl font-bold text-indigo-600 hover:text-indigo-800 transition">
                    Connect App
                </Link>

                {/* Navigația Principală */}
                <nav className="flex items-center space-x-4">
                    {navItems.map((item) => (
                        item.isVisible && (
                            <Link 
                                key={item.name} 
                                href={item.href} 
                                className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition"
                            >
                                {item.name}
                            </Link>
                        )
                    ))}

                    {/* Buton Autentificare (rămâne) */}
                    {!loading && (
                        user ? (
                            // AM ELIMINAT BUTONUL DE LOGOUT
                            <div className="text-sm font-medium text-gray-600 px-3 py-1 bg-gray-100 rounded-md">
                                Logat ca: {role.toUpperCase()}
                            </div>
                        ) : (
                            <Link 
                                href="/test" 
                                className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded-md text-sm font-medium transition"
                            >
                                Login Test
                            </Link>
                        )
                    )}
                </nav>
            </div>
        </header>
    );
}