import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
// Am adăugat 'updateDoc' și 'deleteDoc' în importul din 'firebase/firestore'
import { getFirestore, collection, doc, query, where, getDocs, onSnapshot, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// --- Variabile Next.js (Logica Cerută de Utilizator) ---
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '';
const MESSAGING_SENDER_ID = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '';
const APP_ID_CONFIG = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '';

// --- Construirea Obiectului de Configurare ---
const firebaseConfig = {
    apiKey: API_KEY,
    authDomain: AUTH_DOMAIN,
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
    messagingSenderId: MESSAGING_SENDER_ID,
    appId: APP_ID_CONFIG,
};

let app;
let db;
let auth;
const dbInitialized = !!firebaseConfig.apiKey; 

// --- Inițializare Firebase ---
if (dbInitialized) {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // Configurăm persistența pentru a păstra sesiunea între închideri de aplicație
        setPersistence(auth, browserLocalPersistence)
            .then(() => {
                console.log("Firebase Auth persistence set to LOCAL");
            })
            .catch((error) => {
                console.error("Eroare la setarea persistenței Firebase Auth:", error);
            });
        
        console.log("Firebase App și Firestore DB au fost inițializate.");
    } catch (error) {
        console.error("Eroare la inițializarea Firebase/Firestore:", error);
    }
} else {
    console.warn("ATENȚIE: Setările Firebase lipsesc. Firestore nu va funcționa.");
}


// Funcție pentru a obține calea către colecția publică de evenimente
export const getEventsCollectionPath = () => {
    // Evenimentele sunt date publice, vizibile tuturor utilizatorilor aplicației
    return `artifacts/${APP_ID_CONFIG}/public/data/events`;
};

// Obține referința la colecția de evenimente (doar dacă DB e inițializat)
export const eventsCollectionRef = dbInitialized ? collection(db, getEventsCollectionPath()) : null;

/**
 * Ascultă schimbările stării de autentificare.
 * @param {(user: import('firebase/auth').User | null) => void} callback 
 */
export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};


// Funcții CRUD simple pentru Evenimente

/**
 * Adaugă un nou eveniment în Firestore.
 * @param {object} eventData Datele evenimentului (nume, dată, descriere etc.)
 * @param {string} userRole Rolul utilizatorului care creează evenimentul.
 * @returns {Promise<import('firebase/firestore').DocumentReference>} Referința către documentul nou creat.
 */
export const addEvent = (eventData, userRole) => {
    if (!dbInitialized || !eventsCollectionRef) {
        console.error("Eroare: Nu se poate adăuga evenimentul. Firestore nu este inițializat.");
        return Promise.reject(new Error("Firestore nu este inițializat."));
    }

    // Adăugăm și timestamp-ul de creare și ID-ul utilizatorului
    const userId = auth.currentUser?.uid || 'anonymous';
    const newEventData = {
        ...eventData,
        createdAt: new Date().toISOString(),
        createdBy: userId,
        date: eventData.date || new Date().toISOString().split('T')[0], // Asigură-te că data e prezentă
    };
    if (userRole) newEventData.role = userRole; // Adăugăm rolul dacă este furnizat
    
    return addDoc(eventsCollectionRef, newEventData);
};

/**
 * Actualizează datele unui eveniment existent în Firestore.
 * @param {string} eventId ID-ul documentului evenimentului de actualizat.
 * @param {object} updatedData Obiectul cu datele de actualizat (ex: {title: "Nou titlu"}).
 * @returns {Promise<void>}
 */
export const updateEvent = (eventId, updatedData) => {
    if (!dbInitialized || !eventsCollectionRef) {
        console.error("Eroare: Nu se poate actualiza evenimentul. Firestore nu este inițializat.");
        return Promise.reject(new Error("Firestore nu este inițializat."));
    }
    
    // Obținem referința la documentul specific
    const eventDocRef = doc(eventsCollectionRef, eventId);
    
    // Adăugăm și un timestamp de actualizare
    const dataToUpdate = {
        ...updatedData,
        updatedAt: new Date().toISOString(),
    };
    
    // Actualizăm documentul
    return updateDoc(eventDocRef, dataToUpdate);
};

/**
 * Șterge un eveniment din Firestore.
 * @param {string} eventId ID-ul documentului evenimentului de șters.
 * @returns {Promise<void>}
 */
export const deleteEvent = (eventId) => {
    if (!dbInitialized || !eventsCollectionRef) {
        console.error("Eroare: Nu se poate șterge evenimentul. Firestore nu este inițializat.");
        return Promise.reject(new Error("Firestore nu este inițializat."));
    }
    
    // Obținem referința la documentul specific
    const eventDocRef = doc(eventsCollectionRef, eventId);
    
    // Ștergem documentul
    return deleteDoc(eventDocRef);
};


// Exportăm instanțele de bază pentru utilizare în alte părți ale aplicației
// Am adăugat 'updateEvent' și 'deleteEvent' la export pentru a fi disponibile global
export { app, db, auth, onSnapshot, collection, query, dbInitialized, where, getDocs, setDoc, doc, addDoc, updateDoc };