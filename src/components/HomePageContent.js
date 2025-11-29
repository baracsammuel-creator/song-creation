"use client";

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { db, getEventsCollectionPath } from '@/firebase/firebaseConfig';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export default function HomePageContent() {
    const { user, role, loading } = useAuth();
    const [stats, setStats] = useState({
        monthlyEvents: 0,
        totalUsers: 0,
        userAttendance: 0,
        loading: true
    });

    // Fetch real statistics
    useEffect(() => {
        const fetchStats = async () => {
            if (!user) {
                setStats(prev => ({ ...prev, loading: false }));
                return;
            }

            try {
                const now = new Date();
                const monthStart = startOfMonth(now);
                const monthEnd = endOfMonth(now);

                // 1. Count events this month
                const eventsPath = getEventsCollectionPath();
                const eventsRef = collection(db, eventsPath);
                const monthStartStr = format(monthStart, 'yyyy-MM-dd');
                const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
                
                const eventsQuery = query(
                    eventsRef,
                    where('date', '>=', monthStartStr),
                    where('date', '<=', monthEndStr)
                );
                const eventsSnapshot = await getCountFromServer(eventsQuery);
                const monthlyEvents = eventsSnapshot.data().count;

                // 2. Count total users (from users collection)
                let totalUsers = 0;
                try {
                    const usersRef = collection(db, 'users');
                    const usersSnapshot = await getCountFromServer(usersRef);
                    totalUsers = usersSnapshot.data().count;
                } catch (error) {
                    console.log('Could not fetch users count:', error);
                    // Fallback: estimate based on role
                    totalUsers = 1; // Default value
                }

                // 3. Count user's total attendance (RSVP count across all events)
                let userAttendance = 0;
                if (user && !user.isAnonymous) {
                    try {
                        // Get all events
                        const allEventsSnapshot = await getDocs(eventsRef);
                        
                        // For each event, check if user has RSVP
                        for (const eventDoc of allEventsSnapshot.docs) {
                            const rsvpPath = `${eventsPath}/${eventDoc.id}/rsvps`;
                            const rsvpRef = collection(db, rsvpPath);
                            const userRsvpQuery = query(rsvpRef, where('userId', '==', user.uid));
                            const userRsvpSnapshot = await getDocs(userRsvpQuery);
                            userAttendance += userRsvpSnapshot.size;
                        }
                    } catch (error) {
                        console.log('Could not fetch user attendance:', error);
                    }
                }

                setStats({
                    monthlyEvents,
                    totalUsers,
                    userAttendance,
                    loading: false
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
                setStats(prev => ({ ...prev, loading: false }));
            }
        };

        if (!loading) {
            fetchStats();
        }
    }, [user, loading]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="text-xl text-theme-primary animate-pulse">Se încarcă datele...</div>
            </div>
        );
    }

    // Determinăm mesajele și stilurile bazate pe rol
    const getRoleConfig = () => {
        if (role === 'admin') {
            return {
                title: "Bun venit, Administrator!",
                subtitle: "Coordonează întâlnirile comunității",
                description: "Organizează și gestionează toate întâlnirile, ajută membrii să se conecteze și creează experiențe memorabile împreună.",
                gradient: "from-purple-600 to-blue-600",
                icon: "👑",
                badge: "Admin",
                badgeColor: "bg-purple-600"
            };
        } else if (role === 'lider') {
            return {
                title: "Bun venit, Lider Connect!",
                subtitle: "Inspiră și adună comunitatea",
                description: "Planifică întâlniri captivante, încurajează participarea și construiește relații autentice în grup.",
                gradient: "from-blue-600 to-cyan-600",
                icon: "💡",
                badge: "Lider",
                badgeColor: "bg-blue-600"
            };
        } else if (user) {
            return {
                title: "Bine ai revenit!",
                subtitle: "Hai să ne vedem din nou",
                description: "Descoperă următoarele întâlniri, confirmă-ți prezența și bucură-te de timp de calitate cu prietenii.",
                gradient: "from-cyan-600 to-teal-600",
                icon: "🌟",
                badge: "Adolescent",
                badgeColor: "bg-cyan-600"
            };
        } else {
            return {
                title: "Bun venit la Connect!",
                subtitle: "Unde prietenii se întâlnesc",
                description: "Autentifică-te pentru a vedea întâlnirile programate, a confirma participarea și a face parte din comunitate.",
                gradient: "from-blue-600 to-purple-600",
                icon: "🌐",
                badge: "Vizitator",
                badgeColor: "bg-gray-600"
            };
        }
    };

    const config = getRoleConfig();

    return (
        <div className="w-full">
            {/* Hero Section with Background */}
            <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                            backgroundImage: `url('https://images.pexels.com/photos/33332492/pexels-photo-33332492.jpeg')`,
                        }}
                    />
                    <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-90`} />
                    
                    {/* Animated Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent animate-[fadeIn_3s_ease-in-out_infinite]" />
                </div>

                {/* Floating Decorative Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]" />
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-[float_10s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
                    <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-[float_12s_ease-in-out_infinite]" style={{ animationDelay: '4s' }} />
                </div>

                {/* Main Content */}
                <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-strong mb-6 animate-[slideUp_0.6s_ease-out]">
                        <span className="text-3xl">{config.icon}</span>
                        <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${config.badgeColor}`}>
                            {config.badge}
                        </span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-4 leading-tight animate-[slideUp_0.8s_ease-out]" style={{ animationDelay: '0.1s' }}>
                        {config.title}
                    </h1>

                    {/* Subtitle */}
                    <p className="text-2xl sm:text-3xl text-white/90 font-semibold mb-6 animate-[slideUp_0.8s_ease-out]" style={{ animationDelay: '0.2s' }}>
                        {config.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed animate-[slideUp_0.8s_ease-out]" style={{ animationDelay: '0.3s' }}>
                        {config.description}
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-[slideUp_0.8s_ease-out]" style={{ animationDelay: '0.4s' }}>
                        {(role === 'admin' || role === 'lider') && (
                            <Link
                                href="/dashboard"
                                className="group relative px-8 py-4 bg-white text-gray-900 font-bold rounded-xl overflow-hidden hover-lift shadow-2xl"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Dashboard
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </Link>
                        )}
                        
                        <Link
                            href="/events"
                            className="group relative px-8 py-4 glass-strong text-white font-bold rounded-xl overflow-hidden hover-lift shadow-2xl border-2 border-white/30"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Vezi Calendarul
                            </span>
                        </Link>

                        {!user && (
                            <Link
                                href="/profile"
                                className="px-8 py-4 glass text-white font-bold rounded-xl hover-lift shadow-xl border border-white/20"
                            >
                                Autentifică-te
                            </Link>
                        )}
                    </div>

                    {/* Stats Cards - Only for logged in users */}
                    {user && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto animate-[fadeIn_1s_ease-out]" style={{ animationDelay: '0.6s' }}>
                            <StatsCard
                                icon="📅"
                                title="Întâlniri Luna Aceasta"
                                value={stats.loading ? '...' : stats.monthlyEvents.toString()}
                                description="Programate"
                                loading={stats.loading}
                            />
                            <StatsCard
                                icon="👥"
                                title="Prieteni Activi"
                                value={stats.loading ? '...' : stats.totalUsers.toString()}
                                description="În grup"
                                loading={stats.loading}
                            />
                            <StatsCard
                                icon="🎯"
                                title="Prezențe Tale"
                                value={stats.loading ? '...' : stats.userAttendance.toString()}
                                description="La întâlniri"
                                loading={stats.loading}
                            />
                        </div>
                    )}
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                    <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                </div>
            </div>

            {/* Features Section */}
            <div className="bg-gray-50 py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-4xl font-bold text-center mb-4 gradient-text">
                        De ce să ne întâlnim aici?
                    </h2>
                    <p className="text-center text-gray-600 mb-12 text-lg max-w-2xl mx-auto">
                        Locul unde planificăm întâlniri, ne conectăm și creăm amintiri împreună
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon="🚀"
                            title="Planificare Ușoară"
                            description="Organizează întâlniri rapid și simplu. Confirmă prezența cu un click și vezi cine vine."
                            gradient="from-blue-500 to-cyan-500"
                        />
                        <FeatureCard
                            icon="🔔"
                            title="Rămâi la Curent"
                            description="Primești notificări pentru întâlniri noi și modificări, ca să nu ratezi nimic important."
                            gradient="from-purple-500 to-pink-500"
                        />
                        <FeatureCard
                            icon="🤝"
                            title="Construim Împreună"
                            description="Mai mult decât un calendar - e locul unde prietenia se întâlnește cu organizarea."
                            gradient="from-orange-500 to-red-500"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Stats Card Component
function StatsCard({ icon, title, value, description, loading }) {
    return (
        <div className="glass-strong rounded-2xl p-6 text-white hover-lift">
            <div className="text-4xl mb-3">{icon}</div>
            <div className={`text-3xl font-bold mb-1 ${loading ? 'animate-pulse' : ''}`}>
                {value}
            </div>
            <div className="text-sm font-semibold mb-1">{title}</div>
            <div className="text-xs text-white/70">{description}</div>
        </div>
    );
}

// Feature Card Component
function FeatureCard({ icon, title, description, gradient }) {
    return (
        <div className="group relative bg-white rounded-2xl p-8 shadow-lg hover-lift overflow-hidden">
            {/* Gradient Background on Hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
            
            <div className="relative z-10">
                <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{description}</p>
            </div>

            {/* Decorative Element */}
            <div className={`absolute -bottom-2 -right-2 w-24 h-24 bg-gradient-to-br ${gradient} rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-300`} />
        </div>
    );
}