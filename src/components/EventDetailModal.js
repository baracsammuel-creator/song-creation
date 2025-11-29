"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { onSnapshot, doc, collection, setDoc, deleteDoc } from 'firebase/firestore'; // Importăm deleteDoc direct
import { db, getEventsCollectionPath } from '@/firebase/firebaseConfig';

export default function EventDetailModal({ event, onClose, currentUser }) {
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Ascultă în timp real lista de participanți
    useEffect(() => {
        if (!event?.id) return;
        // Construim calea corectă către subcolecția de RSVP-uri
        const fullPath = `${getEventsCollectionPath()}/${event.id}/rsvps`;
        const rsvpsCollectionRef = collection(db, fullPath);
        const unsubscribe = onSnapshot(rsvpsCollectionRef, (snapshot) => {
            const rsvpList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setParticipants(rsvpList);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [event?.id]);

    const handleRsvp = useCallback(async () => {
        if (!currentUser || currentUser.isAnonymous || !event?.id) return;
        setIsSubmitting(true);
        try {
            const fullPath = `${getEventsCollectionPath()}/${event.id}/rsvps`;
            const rsvpDocRef = doc(db, fullPath, currentUser.uid);
            await setDoc(rsvpDocRef, {
                userName: currentUser.displayName || "Utilizator",
                userId: currentUser.uid,
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            console.error("Eroare la trimiterea RSVP:", err);
            alert("A apărut o eroare. Te rugăm să încerci din nou.");
        } finally {
            setIsSubmitting(false);
        }
    }, [currentUser, event?.id]);

    const handleCancelRsvp = useCallback(async () => {
        if (!currentUser || !event?.id) return;
        setIsSubmitting(true);
        try {
            const fullPath = `${getEventsCollectionPath()}/${event.id}/rsvps`;
            const rsvpDocRef = doc(db, fullPath, currentUser.uid);
            await deleteDoc(rsvpDocRef); // Acum folosim funcția corectă importată
        } catch (err) {
            console.error("Eroare la anularea RSVP:", err);
            alert("A apărut o eroare. Te rugăm să încerci din nou.");
        } finally {
            setIsSubmitting(false);
        }
    }, [currentUser, event?.id]);

    const isCurrentUserParticipating = useMemo(() => 
        participants.some(p => p.id === currentUser?.uid),
    [participants, currentUser]);

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition" aria-label="Închide">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>

                <h2 className="text-2xl font-bold text-indigo-700 mb-2">{event.title}</h2>
                <p className="text-gray-600 mb-1"><span className="font-semibold">Data:</span> {new Date(event.date).toLocaleDateString('ro-RO')}</p>
                <p className="text-gray-600 mb-4"><span className="font-semibold">Ora:</span> {event.time}</p>
                {event.description && <p className="text-gray-800 whitespace-pre-wrap border-t pt-4 mt-4">{event.description}</p>}

                {currentUser && !currentUser.isAnonymous && (
                    <div className="mt-6">
                        {isCurrentUserParticipating ? (
                            <button onClick={handleCancelRsvp} disabled={isSubmitting} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50">
                                {isSubmitting ? 'Se anulează...' : 'Renunță la participare'}
                            </button>
                        ) : (
                            <button onClick={handleRsvp} disabled={isSubmitting} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50">
                                {isSubmitting ? 'Se confirmă...' : 'Participă'}
                            </button>
                        )}
                    </div>
                )}

                <div className="mt-6 border-t pt-4">
                    <h3 className="text-lg font-semibold mb-2 text-indigo-700">Participanți ({participants.length})</h3>
                    {loading ? <p className="text-gray-600">Se încarcă...</p> : participants.length > 0 ? (
                        <ul className="space-y-1 max-h-32 overflow-y-auto">
                            {participants.map(p => (
                                <li key={p.id} className="bg-gray-100 p-1.5 rounded text-sm text-gray-800 font-medium">{p.userName}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-600 text-sm">Fii primul care participă!</p>
                    )}
                </div>
            </div>
        </div>
    );
}