"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameMonth, 
    isSameDay,
    addMonths,
    subMonths,
    parseISO, 
    startOfDay, 
} from 'date-fns';
import { ro } from 'date-fns/locale'; 

// Importăm noile componente modale
import EventFormModal from './EventFormModal';
import EventDetailModal from './EventDetailModal';

import {
    onSnapshot, 
    query, 
    eventsCollectionRef, 
    addEvent, 
    updateEvent, 
    deleteEvent, 
    dbInitialized,
    getEventsCollectionPath,
    collection,
    db
} from '@/firebase/firebaseConfig';
import { useAuth } from '@/context/AuthContext'; 

// --- Componenta Principală Calendar ---

export default function Calendar() {
    const { user, loading, role } = useAuth(); // Extragem user (cu uid) și role
    const today = new Date();
    
    // Starea pentru luna afișată
    const [currentMonth, setCurrentMonth] = useState(today); 
    
    // Starea pentru ziua pe care a dat clic utilizatorul (selectată)
    const [selectedDate, setSelectedDate] = useState(today); 
    
    // Stochează evenimentele sub formă { 'YYYY-MM-DD': [event1, event2] }
    const [events, setEvents] = useState({}); 
    // NOU: Stare pentru a stoca numărul de participanți { eventId: count }
    const [participantCounts, setParticipantCounts] = useState({});
    const [editModalState, setEditModalState] = useState({
        isOpen: false,
        eventToEdit: null, // Null pentru creare, obiect eveniment pentru editare
        selectedDateForNew: null, // Data pentru un eveniment nou
    });
    // NOU: Stare separată pentru modala de detalii/RSVP
    const [detailModalState, setDetailModalState] = useState({
        isOpen: false,
        event: null,
    });

    const [isFetching, setIsFetching] = useState(true);

    // NOU: Calculăm dacă ziua selectată este în trecut
    const isPastDate = useMemo(() => {
        // Compară doar ziua, ignorând ora
        const todayStart = startOfDay(new Date());
        const selectedDayStart = startOfDay(selectedDate);
        // Dacă ziua selectată este strict înainte de începutul zilei de azi
        return selectedDayStart < todayStart; 
    }, [selectedDate]); 


    // Funcție pentru a genera zilele din grila calendarului (42 de zile)
    const generateCalendarDays = (month) => {
        // Începem de la începutul săptămânii care conține prima zi a lunii
        const monthStart = startOfMonth(month);
        const startDay = startOfWeek(monthStart, { locale: ro }); 
        
        // Sfârșitul săptămânii care conține ultima zi a lunii
        const monthEnd = endOfMonth(month);
        const endDay = endOfWeek(monthEnd, { locale: ro });

        // Generăm un array cu toate zilele
        return eachDayOfInterval({ start: startDay, end: endDay });
    };

    // Generăm zilele calendarului pe baza lunii curente
    const calendarDays = useMemo(() => generateCalendarDays(currentMonth), [currentMonth]);

    // Funcție pentru sortarea evenimentelor după oră (format HH:mm)
    const sortEventsByTime = (eventA, eventB) => {
        if (!eventA.time || !eventB.time) return 0;
        // Comparăm șirurile de caractere (ex: '14:30' vs '09:00')
        return eventA.time.localeCompare(eventB.time); 
    };

    // Ascultarea evenimentelor din Firestore
    useEffect(() => {
        if (!dbInitialized) {
            console.warn("Firestore nu este inițializat. Omitere ascultare evenimente.");
            setIsFetching(false);
            return;
        }
        if (loading || !user) { 
            // Așteptăm autentificarea
            return; 
        }

        const eventsQuery = query(eventsCollectionRef);

        // 1. Declarăm activeListeners în scope-ul useEffect
        let activeListeners = {};

        const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
            const fetchedEvents = {};
            // 2. Curățăm listenerii vechi pentru a nu avea scurgeri de memorie
            Object.values(activeListeners).forEach(unsub => unsub());
            activeListeners = {}; // Resetăm obiectul
            snapshot.forEach(doc => {
                const event = doc.data();
                const dateKey = event.date; // Format YYYY-MM-DD
                
                if (!fetchedEvents[dateKey]) {
                    fetchedEvents[dateKey] = [];
                }
                // Adăugăm evenimentul, inclusiv câmpul 'time' și 'createdBy'
                fetchedEvents[dateKey].push({ id: doc.id, ...event });

                // NOU: Ascultăm numărul de participanți pentru fiecare eveniment
                const rsvpsPath = `${getEventsCollectionPath()}/${doc.id}/rsvps`;
                const rsvpsCollectionRef = collection(db, rsvpsPath);
                
                // Creăm un listener pentru sub-colecția de RSVP-uri
                activeListeners[doc.id] = onSnapshot(rsvpsCollectionRef, (rsvpSnapshot) => {
                    // Actualizăm starea cu numărul de documente (participanți)
                    setParticipantCounts(prevCounts => ({
                        ...prevCounts,
                        [doc.id]: rsvpSnapshot.size,
                    }));
                });

            });
            
            // Sortăm evenimentele în fiecare zi după oră
            Object.keys(fetchedEvents).forEach(dateKey => {
                fetchedEvents[dateKey].sort(sortEventsByTime);
            });

            setEvents(fetchedEvents);
            setIsFetching(false);
            console.log("Evenimente încărcate în timp real. Zile cu evenimente:", Object.keys(fetchedEvents).length);
        }, (error) => {
            console.error("Eroare la ascultarea evenimentelor Firestore:", error);
            setIsFetching(false);
        });

        // 3. Funcția de curățare are acum acces la activeListeners
        return () => {
            unsubscribe();
            Object.values(activeListeners).forEach(unsub => unsub());
        };
    }, [loading, user]); // Dependență adăugată pentru 'user'

    // Setează ziua selectată și actualizează luna afișată la luna zilei selectate
    const handleDayClick = (day) => {
        setSelectedDate(day);
        setCurrentMonth(day); 
    };

    // Funcții de navigare lună
    const goToPreviousMonth = () => {
        setCurrentMonth(prev => subMonths(prev, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(prev => addMonths(prev, 1));
    };
    
    // NOU: Funcție generală de verificare a permisiunilor de Modificare/Ștergere
    const isAuthorizedToModify = (event) => {
        if (!user) return false;
        
        // Admin sau Lider poate modifica orice
        if (role === 'admin' || role === 'lider') return true;
        
        // Creatorul evenimentului poate modifica propriul eveniment
        return event?.createdBy === user.uid;
    };


    // Deschide modalul pentru CREARE (Doar Admin/Lider poate crea)
    const isAuthorizedToCreate = user && (role === 'admin' || role === 'lider');

    const handleOpenNewEventModal = () => {
        if (!isAuthorizedToCreate) {
            console.error("Acces neautorizat. Utilizatorul nu are drepturi de adăugare.");
            return;
        }
        
        // NOU: Verifică dacă data selectată este în trecut (compară doar ziua, ignorând ora)
        const todayStart = startOfDay(new Date());
        const selectedDayStart = startOfDay(selectedDate);
        
        if (selectedDayStart < todayStart) {
            // Nu deschidem modalul pentru a crea evenimente în trecut (această logică este menținută pentru siguranță)
            console.warn("Încercare de a adăuga eveniment pentru o dată trecută. Operațiune blocată.");
            return;
        }
        
        setEditModalState({
            isOpen: true,
            eventToEdit: null,
            selectedDateForNew: selectedDate,
        });
    }

    // Deschide modalul pentru EDITARE (Admin/Lider SAU Creatorul Evenimentului)
    const handleOpenEditEventModal = (event) => {
        if (!isAuthorizedToModify(event)) {
            console.error("Acces neautorizat. Nu aveți permisiunea de a edita acest eveniment.");
            return;
        }
        setEditModalState({
            isOpen: true,
            eventToEdit: event,
            selectedDateForNew: null,
        });
    }

    // NOU: Funcții pentru a gestiona modala de detalii
    const handleOpenDetailModal = (event) => {
        setDetailModalState({ isOpen: true, event: event });
    };

    const handleCloseDetailModal = () => {
        setDetailModalState({ isOpen: false, event: null });
    };

    const handleCloseEditModal = () => {
        setEditModalState({
            isOpen: false,
            eventToEdit: null,
            selectedDateForNew: null,
        });
    }


    // Funcție pentru Creare/Salvare
    const handleSaveEvent = async (idOrData, dataIfUpdate) => {
        try {
            // Verificăm starea modalului de editare
            if (editModalState.eventToEdit) {
                // Mod de editare
                await updateEvent(idOrData, dataIfUpdate);
                console.log("Eveniment actualizat cu succes!");
            } else {
                // Mod de creare
                await addEvent(idOrData, role); // Am adăugat 'role' ca al doilea parametru
                console.log("Eveniment salvat cu succes!");
            }
        } catch (error) {
            console.error("Eroare la operațiunea de salvare/actualizare:", error);
            // Re-aruncăm eroarea pentru ca modalul să o poată afișa
            throw error; 
        }
    };
    
    // Funcție pentru Ștergere
    const handleDeleteEvent = async (id) => {
        try {
            await deleteEvent(id);
            console.log("Eveniment șters cu succes!");
        } catch (error) {
            console.error("Eroare la operațiunea de ștergere:", error);
            throw error; 
        }
    }

    // Evenimentele pentru ziua selectată
    const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
    const eventsForSelectedDay = events[selectedDateKey] || [];

    // Numele abreviate ale zilelor săptămânii în română (folosim `ro` locale)
    const romanianDayNamesFull = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
    const dayNames = romanianDayNamesFull.map((day, index) => format(new Date(2023, 0, index + 1), 'EEE', { locale: ro }));
    
    return (
        <div className="bg-white rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 w-full max-w-4xl mx-auto relative border-4 border-indigo-100">
            <h2 className="text-3xl font-extrabold mb-6 text-center text-gray-900">
                Calendar Evenimente
            </h2>
            
            {/* Stare de Încărcare */}
            {isFetching && (
                <div className="py-12 text-center text-indigo-600 font-semibold text-lg">
                    Se încarcă evenimentele în timp real...
                </div>
            )}
            
            {/* Secțiunea Calendar Grid */}
            {!isFetching && (
                <>
                {/* Antetul Calendarului cu Navigare */}
                <div className="flex flex-col items-center px-4 py-3 mb-4 text-xl font-extrabold text-gray-800 border-b-2 border-indigo-200">
                    <div className="flex justify-between items-center w-full max-w-sm">
                        <button 
                            onClick={goToPreviousMonth} 
                            className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <span className="text-xl sm:text-2xl font-extrabold text-indigo-700 capitalize">
                            {format(currentMonth, 'MMMM yyyy', { locale: ro })}
                        </span>
                        <button 
                            onClick={goToNextMonth} 
                            className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </div>
                </div>

                {/* Numele Zilelor Săptămânii */}
                    <div className="grid grid-cols-7 text-center font-bold text-gray-700 uppercase border-b border-indigo-300">
                        {romanianDayNamesFull.map((day, index) => (
                            <div 
                                key={day} 
                                className="h-10 flex items-center justify-center text-xs sm:text-sm" // Modificare aici
                            >
                                <span className="hidden sm:inline">{day}</span>
                                <span className="sm:hidden">{dayNames[index]}</span> {/* Presupunem că dayNames sunt inițialele */}
                            </div>
                        ))}
                    </div>

                {/* Grila Zilelor - Adaptată pentru mobil */}
                <div className="grid grid-cols-7 auto-rows-[4rem] sm:auto-rows-[6rem] gap-0.5 sm:gap-1 mt-1">
                    {calendarDays.map((day) => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const dayEvents = events[dateKey] || [];
                        const isSelected = isSameDay(day, selectedDate);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isToday = isSameDay(day, today);

                        let cellClasses = 'rounded-lg sm:rounded-xl h-full transition duration-300 border border-gray-100 cursor-pointer group shadow-sm';
                        
                        if (!isCurrentMonth) {
                            cellClasses += ' text-gray-400 bg-gray-50 opacity-70 pointer-events-none shadow-inner';
                        } else {
                            cellClasses += ' bg-white hover:bg-indigo-50 hover:shadow-lg';
                        }
                        
                        if (isToday && !isSelected) {
                            cellClasses = 'bg-indigo-100 text-indigo-800 shadow-xl relative overflow-hidden ring-2 ring-indigo-400/50';
                        }

                        if (isSelected) {
                            cellClasses = 'bg-indigo-600 text-white shadow-2xl relative overflow-hidden transform scale-[1.01] border-indigo-700 z-10';
                        }
                        
                        // Indicator eveniment (bulină roșie)
                        const hasEventsClass = dayEvents.length > 0 ? "relative after:absolute after:bottom-1 after:right-1 after:w-2 after:h-2 after:bg-red-500 after:rounded-full after:shadow-lg sm:after:w-3 sm:after:h-3" : "";

                        return (
                            <div
                                key={dateKey}
                                className={`${cellClasses} ${hasEventsClass} p-1`}
                                onClick={() => handleDayClick(day)}
                            >
                                <div className="flex flex-col items-start justify-start h-full w-full relative">
                                    <span className={`text-md sm:text-lg font-extrabold transition duration-300 ${isSelected ? 'text-white' : (isCurrentMonth ? 'text-gray-900 group-hover:text-indigo-800' : 'text-gray-500')}`}>
                                        {format(day, 'd')}
                                    </span>
                                    
                                    {dayEvents.length > 0 && (
                                        <div className="flex flex-col items-start mt-0.5 sm:mt-1 w-full max-h-8 sm:max-h-12 overflow-hidden px-0.5 sm:px-1 space-y-0.5">
                                            {dayEvents.slice(0, 1).map((event) => (
                                            <span
                                                className="text-xs sm:text-sm font-medium text-white bg-indigo-600 px-1.5 sm:px-2 py-0.5 rounded-full truncate w-full text-left sm:text-center shadow-md border border-indigo-700/50"
                                                title={event.title}
                                                key={event.time}
                                            >
                                                {event.time ? `${event.time} - ${event.title}` : event.title}
                                            </span>
                                            ))}
                                            {dayEvents.length > 1 && (
                                                <span className="text-[10px] sm:text-xs text-gray-600 bg-gray-200 rounded-full px-1.5 py-0.5 font-bold mt-0.5">
                                                    + {dayEvents.length - 1}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* --- Secțiunea de Afișare Evenimente pentru Ziua Selectată (Mobile-Friendly) --- */}
                <div className="mt-8 border-t-4 border-indigo-500/50 pt-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 flex justify-between items-center">
                        Evenimente pe {selectedDate.toLocaleDateString('ro-RO')}
                        {isAuthorizedToCreate && (
                            <button
                                onClick={!isPastDate ? handleOpenNewEventModal : undefined}
                                disabled={isPastDate}
                                className={`
                                    px-3 py-1 sm:px-4 sm:py-2 text-sm font-medium rounded-full transition shadow-lg flex items-center
                                    ${isPastDate 
                                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-70' // Stil pentru disabled
                                        : 'bg-green-500 text-white hover:bg-green-600' // Stil normal
                                    }
                                `}
                                title={isPastDate ? "Nu se pot adăuga evenimente în trecut" : "Adaugă un eveniment nou"}
                            >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                Adaugă
                            </button>
                        )}
                    </h3>
                    
                    {eventsForSelectedDay.length > 0 ? (
                        <ul className="space-y-3">
                            {eventsForSelectedDay.map((event) => (
                                <li 
                                    key={event.id}
                                    // Am adăugat cursor-pointer pentru a indica interactivitatea
                                    className="p-3 sm:p-4 bg-indigo-50 border-l-4 border-indigo-600 rounded-lg shadow-sm hover:shadow-md transition duration-200 flex justify-between items-start cursor-pointer"
                                    onClick={() => handleOpenDetailModal(event)} // Deschide modala de detalii
                                >
                                    <div className="flex-grow">
                                        <p className="text-base sm:text-lg font-semibold text-indigo-800">
                                            {event.time && <span className="font-extrabold mr-2 text-indigo-700 bg-indigo-200 px-2 py-0.5 rounded-md text-sm">{event.time}</span>}
                                            {event.title}
                                        </p>
                                        {event.description && <p className="text-gray-600 mt-1 text-sm">{event.description}</p>}
                                    </div>
                                    {/* NOU: Afișăm contorul de participanți */}
                                    <div className="bottom-2 right-2 flex items-center bg-indigo-200 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full">
                                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path></svg>
                                        <span>{participantCounts[event.id] || 0}</span>
                                    </div>
                                    {/* Afișăm butonul de editare doar dacă este autorizat */}
                                    {isAuthorizedToModify(event) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation(); // Previne deschiderea modalului de detalii
                                                handleOpenEditEventModal(event);
                                            }}
                                            className="ml-4 p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-200/50 rounded-full hover:bg-indigo-200 transition relative z-10"
                                            title="Modifică evenimentul"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-6 bg-gray-100 text-gray-600 rounded-xl text-center border border-dashed border-gray-300">
                            Nu există evenimente planificate pentru această dată.
                        </div>
                    )}

                    {!user && (
                        <p className="mt-4 text-center text-sm text-gray-500">
                            Vă rugăm să vă autentificați pentru a putea vizualiza/crea/edita evenimente.
                        </p>
                    )}
                    {user && !isAuthorizedToCreate && (
                        <p className="mt-4 text-center text-sm text-gray-500">
                            Sunteți autentificat! Doar utilizatorii cu rolul de Admin sau Lider pot adăuga evenimente noi. Puteți edita doar evenimentele pe care le-ați creat.
                        </p>
                    )}
                </div>
                </>
            )}
            
            {/* Modalul de Creare/Editare Eveniment */}
            {editModalState.isOpen && (
                <EventFormModal 
                    selectedDate={editModalState.selectedDateForNew}
                    eventToEdit={editModalState.eventToEdit}
                    onClose={handleCloseEditModal}
                    onSave={handleSaveEvent}
                    onDelete={handleDeleteEvent}
                    currentUserId={user?.uid} // Transmitem ID-ul utilizatorului curent
                    role={role} // Transmitem și rolul pentru verificări
                />
            )}

            {/* NOU: Modalul de Detalii/RSVP */}
            {detailModalState.isOpen && (
                <EventDetailModal
                    event={detailModalState.event}
                    onClose={handleCloseDetailModal}
                    currentUser={user}
                />
            )}
        </div>
    );
}