"use client";

import Link from 'next/link';
// 1. Importăm hook-ul usePathname pentru a detecta ruta curentă
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    // 2. Obținem calea URL-ului curent (ex: "/", "/events", "/dashboard")
    const pathname = usePathname();

    const { user, role, loading, refreshRole } = useAuth();

    // Funcție pentru a reîmprospăta rolul
    const handleRefreshRole = async () => {
        setIsRefreshing(true);
        try {
            await refreshRole();
            // Opțional: afișează un mesaj de succes
            console.log('Rol actualizat cu succes!');
        } catch (error) {
            console.error('Eroare la actualizarea rolului:', error);
        } finally {
            setTimeout(() => setIsRefreshing(false), 1000);
        }
    };

    const navItems = [
        { name: "Acasă", href: "/", isVisible: true },
        { name: "Despre", href: "/about", isVisible: true },
        // Noul link pentru Evenimente, vizibil pentru toți utilizatorii
        { name: "Evenimente", href: "/events", isVisible: true }, 
        // Link-ul Profilului, vizibil doar dacă utilizatorul este logat
        { name: "Profil", href: "/profile", isVisible: user && !loading }, 
        // Link-ul Dashboard-ului, vizibil pentru Lideri și Admini
        { name: "Dashboard", href: "/dashboard", isVisible: user && (role === 'admin' || role === 'lider') && !loading }, 
    ];

    // 3. Funcție ajutătoare pentru a genera clasele CSS în funcție de starea link-ului (activ/inactiv)
    const getLinkClassName = (href, isMobile = false) => {
        const isActive = pathname === href;

        if (isMobile) {
            const baseClasses = "block text-gray-700 px-3 py-2 rounded-md text-base font-medium transition";
            const activeClasses = "bg-theme-primary-light text-theme-primary-dark font-semibold";
            const inactiveClasses = "hover:bg-gray-100 hover:text-theme-primary";
            return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
        }

        const baseClasses = "text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition";
        const activeClasses = "text-theme-primary-dark font-bold bg-theme-primary-light";
        const inactiveClasses = "hover:text-theme-primary";
        return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
    };
    return (
        <header className="bg-white shadow-md sticky top-0 z-50">
            {/* CONTAINERUL PRINCIPAL: Vizibil pe toate ecranele */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
                
                {/* Logo / Numele Aplicației */}
                <Link href="/" className="text-2xl font-bold transition">
                    Connect App
                </Link>

                {/* 2. BUTONUL HAMBURGER (Vizibil DOAR pe mobil) */}
                <div className="sm:hidden flex items-center">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        type="button"
                        className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-theme-primary"
                        aria-controls="mobile-menu"
                        aria-expanded="false"
                    >
                        <span className="sr-only">Deschide meniul principal</span>
                        {/* Icoană Meniu (Hamburger sau X) */}
                        {isMenuOpen ? (
                            <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                            <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                        )}
                    </button>
                </div>

                {/* 3. NAVIGAȚIA PRINCIPALĂ (Ascunsă pe mobil, vizibilă pe sm+) */}
                <nav className="hidden sm:flex items-center space-x-4">
                    {navItems.map((item) => (
                        item.isVisible && (
                            <Link 
                                key={item.name} 
                                href={item.href} 
                                // 4. Aplicăm clasele dinamice pentru meniul de desktop
                                className={getLinkClassName(item.href)}
                            >
                                {item.name}
                            </Link>
                        )
                    ))}
                    {/* Buton Autentificare (pe desktop) */}
                    {!loading && user && (
                        <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-600 px-3 py-1 bg-gray-100 rounded-full">
                                Logat ca: {role.toUpperCase()}
                            </div>
                            <button
                                onClick={handleRefreshRole}
                                disabled={isRefreshing}
                                className={`p-2 rounded-full transition-all ${
                                    isRefreshing 
                                        ? 'bg-gray-200 text-gray-400 cursor-wait' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-theme-primary-light hover:text-theme-primary'
                                }`}
                                title="Reîmprospătează rolul"
                            >
                                <svg 
                                    className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                    )}
                </nav>
            </div>

            {/* 4. MENIUL PE MOBIL (Vizibil doar dacă isMenuOpen este TRUE) */}
            <div className={`sm:hidden ${isMenuOpen ? 'block' : 'hidden'}`} id="mobile-menu">
                <div className="px-2 pt-2 pb-3 space-y-1">
                    {navItems.map((item) => (
                        item.isVisible && (
                            <Link 
                                key={item.name} 
                                href={item.href} 
                                onClick={() => setIsMenuOpen(false)} // Închide meniul la click
                                // 5. Aplicăm clasele dinamice pentru meniul mobil
                                className={getLinkClassName(item.href, true)}
                            >
                                {item.name}
                            </Link>
                        )
                    ))}
                    {/* Afișează starea de logare/butonul de login în meniul vertical */}
                    {!loading && user && (
                        <div className="pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-100 rounded-md">
                                <span className="text-sm font-medium text-gray-600">
                                    Logat ca: {role.toUpperCase()}
                                </span>
                                <button
                                    onClick={handleRefreshRole}
                                    disabled={isRefreshing}
                                    className={`p-1.5 rounded-full transition-all ${
                                        isRefreshing 
                                            ? 'bg-gray-200 text-gray-400 cursor-wait' 
                                            : 'bg-white text-gray-600 hover:bg-theme-primary-light hover:text-theme-primary'
                                    }`}
                                    title="Reîmprospătează rolul"
                                >
                                    <svg 
                                        className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}