"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// Variabile Globale/Mediu: Citim variabilele folosind pattern-ul standard process.env.NEXT_PUBLIC_...
// Nota: __app_id este o variabilă specifică Canvas și rămâne accesată direct.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; 

// Accesăm variabilele de mediu folosind process.env, cu fallback la șir vid (''):
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '';
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '';
const MESSAGING_SENDER_ID = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '';
const APP_ID_CONFIG = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '';

// 1. Construim obiectul de configurare Firebase direct
const firebaseConfig = {
    apiKey: API_KEY,
    authDomain: AUTH_DOMAIN,
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
    messagingSenderId: MESSAGING_SENDER_ID,
    appId: APP_ID_CONFIG,
};

// 2. Inițializare Firebase (la nivel global)
let app;
let db;

// Inițializarea Firestore: verificăm dacă cheia esențială apiKey este prezentă
if (firebaseConfig.apiKey) {
    try {
        // --- DIAGNOSTIC: Vedeți acest obiect în Consola Browser-ului ---
        console.log("[DIAGNOSTIC FIREBASE] Configurația citită din variabilele de mediu:", firebaseConfig);
        // -----------------------------------------------------------

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("Firebase App și Firestore DB au fost inițializate folosind variabilele individuale.");
    } catch (error) {
        console.error("Eroare la inițializarea Firebase/Firestore:", error);
    }
} else {
    // Mesaj actualizat pentru a reflecta noua metodă de inițializare
    console.warn("ATENȚIE: Setările Firebase lipsesc (de exemplu, NEXT_PUBLIC_FIREBASE_API_KEY). Firestore nu va funcționa.");
    console.log("[DIAGNOSTIC FIREBASE] Configurația eșuată:", firebaseConfig);
}


// Imagine de profil implicită
const DEFAULT_AVATAR = "https://placehold.co/100x100/1D4ED8/FFFFFF?text=User";
// Limită maximă (ca măsură de siguranță, deși Base64 este redimensionat)
const MAX_FILE_SIZE_BYTES = 500 * 1024; 
// Dimensiunea țintă pentru avatar (pixeli)
const TARGET_SIZE = 100; 

export default function UserProfile() {
    const { user, role, loading } = useAuth();
    const [profile, setProfile] = useState({ name: '', photoURL: DEFAULT_AVATAR });
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState(''); // Status gol inițial
    const [dbInitialized, setDbInitialized] = useState(false);

    // Setează starea dbInitialized odată ce obiectul db este disponibil
    useEffect(() => {
        if (db) {
            setDbInitialized(true);
            // Curățăm statusul de configurare dacă inițializarea a reușit
            if (status.includes("Eroare de configurare")) {
                 setStatus('');
            }
        } else {
            // Caz de siguranță: dacă nu avem config validă
            console.error("Firebase configuration missing or invalid. Firestore is not available.");
        }
    }, []);

    // 1. Hook pentru citirea datelor de profil din Firestore
    useEffect(() => {
        // Acum, verificăm explicit dacă dbInitialized este true
        if (loading || !dbInitialized || !user || !user.uid) return;

        // Path privat pentru profilul utilizatorului: /artifacts/{appId}/users/{userId}/profile/userDoc
        const profilePath = `artifacts/${appId}/users/${user.uid}/profile/userDoc`;
        const profileRef = doc(db, profilePath); // Folosim db știind că este inițializat

        const unsubscribe = onSnapshot(profileRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setProfile({
                    name: data.name || '',
                    photoURL: data.photoURL || DEFAULT_AVATAR, 
                });
            } else {
                setProfile(prev => ({ ...prev, photoURL: DEFAULT_AVATAR }));
            }
        }, (error) => {
            console.error("Eroare la ascultarea profilului:", error);
            setStatus(`Eroare la încărcare: ${error.message}`);
        });

        // Curățare la demontarea componentei
        return () => unsubscribe();
    }, [loading, dbInitialized, user]);

    // Funcție pentru a citi fișierul, a-l redimensiona și a-l converti în Base64
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setStatus("Eroare: Vă rugăm să încărcați o imagine (JPEG, PNG etc.).");
            e.target.value = null; 
            return;
        }

        const reader = new FileReader();
        reader.onload = (readerEvent) => {
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement('canvas');
                
                // Dimensiunea țintă (e.g., 100x100)
                canvas.width = TARGET_SIZE;
                canvas.height = TARGET_SIZE;
                
                const ctx = canvas.getContext('2d');
                
                // Desenăm imaginea redimensionată și tăiată (cropping) pe canvas
                const originalRatio = image.width / image.height;
                let drawWidth = TARGET_SIZE;
                let drawHeight = TARGET_SIZE;
                let offsetX = 0;
                let offsetY = 0;

                if (originalRatio > 1) { // Lățime mai mare, tăiem din laterale
                    drawWidth = originalRatio * TARGET_SIZE;
                    offsetX = (TARGET_SIZE - drawWidth) / 2;
                } else if (originalRatio < 1) { // Înălțime mai mare, tăiem de sus/jos
                    drawHeight = TARGET_SIZE / originalRatio;
                    offsetY = (TARGET_SIZE - drawHeight) / 2;
                }
                
                // Desenăm imaginea pe canvas (redimensionare și tăiere automată)
                ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

                // Convertim canvas-ul redimensionat în Base64
                const resizedBase64 = canvas.toDataURL('image/png');

                // Verificare finală a Base64-ului. Deși redimensionat, nu strică.
                if (resizedBase64.length > 1.33 * MAX_FILE_SIZE_BYTES) {
                    setStatus(`Eroare: Imaginea redimensionată Base64 este încă prea mare. Limită Base64: ${(1.33 * MAX_FILE_SIZE_BYTES / 1024).toFixed(0)}KB`);
                    return;
                }

                setProfile(prev => ({ ...prev, photoURL: resizedBase64 }));
                setStatus(''); // Curățăm orice status anterior, deoarece poza a fost preluată vizual
            };
            image.src = readerEvent.target.result;
        };

        reader.onerror = () => {
            setStatus("Eroare la citirea fișierului.");
        };

        reader.readAsDataURL(file); // Citirea inițială ca Base64
    };


    // Funcție pentru salvarea datelor în Firestore
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        
        // 1. Verificare Autentificare
        if (!user) {
            setStatus("Eroare: Nu sunteți autentificat.");
            return;
        }

        // 2. Verificare explicită Baza de Date
        if (!dbInitialized) { 
            setStatus("Eroare: Baza de date (Firestore) nu a fost inițializată. Setările Firebase (NEXT_PUBLIC_...) lipsesc.");
            return;
        }

        setIsSaving(true);
        setStatus("Se salvează profilul..."); // Mesaj important păstrat

        try {
            // Path privat (identic cu cel din useEffect)
            const profilePath = `artifacts/${appId}/users/${user.uid}/profile/userDoc`;
            const profileRef = doc(db, profilePath);
            
            // Verificare finală a Base64-ului
            if (profile.photoURL && profile.photoURL.length > 1.33 * MAX_FILE_SIZE_BYTES * 4/3) { 
                setStatus(`Eroare de salvare: Imaginea este prea mare. Încercați o rezoluție mai mică.`);
                setIsSaving(false);
                return;
            }

            await setDoc(profileRef, profile, { merge: true });
            
            setStatus("Profil salvat cu succes!"); // Mesaj important păstrat
            // Facem mesajul de succes să dispară după 3 secunde
            setTimeout(() => setStatus(''), 3000);
        } catch (error) {
            console.error("Eroare la salvarea profilului:", error);
            setStatus(`Eroare la salvare: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Mesaj de Eroare Critic pentru Configurarea Bazei de Date ---
    if (!dbInitialized && !loading) {
        return (
            <div className="max-w-xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center p-10 text-red-600 bg-red-100 rounded-xl border-4 border-red-500 shadow-xl">
                    <h2 className="text-2xl font-bold mb-4">🚨 Eroare de Configurarea Firebase</h2>
                    <p className="mt-2 text-gray-700">
                        Baza de date (Firestore) nu a putut fi inițializată.
                    </p>
                    <p className="mt-2 text-sm text-red-700 font-semibold">
                        Aceasta indică faptul că una sau mai multe variabile de mediu (`NEXT_PUBLIC_FIREBASE_...`) lipsesc.
                    </p>
                    <p className="mt-4 text-xs text-gray-500">
                        Vă rugăm să vă asigurați că mediul de execuție furnizează setările Firebase necesare.
                    </p>
                </div>
            </div>
        );
    }
    
    if (loading) {
        return <div className="text-center p-10 text-indigo-600">Se verifică autentificarea...</div>;
    }

    if (!user) {
        return (
            <div className="text-center p-10 text-red-600 bg-red-50 rounded-lg">
                <h2 className="text-2xl font-bold">Autentificare Necesară</h2>
                <p className="mt-2">Vă rugăm să vă autentificați pentru a accesa și edita profilul.</p>
            </div>
        );
    }
    
    // Stilizare în funcție de rol
    const primaryColor = role === 'admin' ? 'red' : role === 'lider' ? 'green' : 'blue';

    // Afișarea formularului de profil
    return (
        <div className="max-w-xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className={`bg-white shadow-2xl rounded-xl p-8 border-t-4 border-${primaryColor}-500`}>
                <h1 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                    <span className="mr-3 text-4xl">👤</span> Profilul Tău
                </h1>
                
                {/* Status Message - AFISAT DOAR CAND STATUS NU E GOL */}
                {status && (
                    <div className={`p-3 mb-4 rounded-md text-sm ${
                        status.includes('Eroare') ? 'bg-red-100 text-red-800' : 
                        status.includes('succes') ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                    }`}>
                        {status}
                    </div>
                )}
                
                <p className="text-md text-gray-600 mb-6">Rol curent: <span className={`font-bold uppercase text-${primaryColor}-600`}>{role}</span></p>

                <div className="flex flex-col items-center mb-8">
                    <img 
                        src={profile.photoURL} 
                        alt="Poză de Profil" 
                        className={`w-24 h-24 rounded-full object-cover border-4 border-${primaryColor}-500 shadow-md mb-4`}
                        onError={(e) => e.target.src = DEFAULT_AVATAR}
                    />
                    <h2 className="text-xl font-semibold text-gray-800">{profile.name || 'Numele tău (nu este setat)'}</h2>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Numele Complet
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            placeholder="Ex: Ion Popescu"
                            required
                            // AICI am adăugat clasa text-gray-900
                            className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-${primaryColor}-500 focus:border-${primaryColor}-500 text-gray-900`}
                        />
                    </div>

                    <div>
                        <label htmlFor="photoUpload" className="block text-sm font-medium text-gray-700">
                            Încarcă Poză de Profil (Redimensionare automată la {TARGET_SIZE}x{TARGET_SIZE} px)
                        </label>
                        <input
                            id="photoUpload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            // AICI am adăugat clasa text-gray-900
                            className={`mt-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-gray-50 focus:outline-none focus:ring-${primaryColor}-500 focus:border-${primaryColor}-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-${primaryColor}-50 file:text-${primaryColor}-700 hover:file:bg-${primaryColor}-100`}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            *Imaginea va fi redimensionată la o dimensiune mică pentru a fi salvată în siguranță în baza de date.
                        </p>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-${primaryColor}-600 hover:bg-${primaryColor}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${primaryColor}-500 disabled:bg-${primaryColor}-400 transition`}
                        >
                            {isSaving ? 'Se Salvează...' : 'Salvează Profilul'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}