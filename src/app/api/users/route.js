import { NextResponse } from 'next/server';
import admin from '@/lib/firebase-admin'; // Importă Admin SDK-ul inițializat

const adminAuth = admin.auth(); 

/**
 * Gestionează cererea GET pentru listarea utilizatorilor.
 * Rută securizată: necesită un token de Admin valid.
 */
export async function GET(req) {
    try {
        const url = new URL(req.url);
        // Token-ul adminului este trimis ca parametru de căutare (sau header, dar param e mai simplu pt fetch)
        const idToken = url.searchParams.get('idToken');

        if (!idToken) {
            return NextResponse.json({ message: 'Token-ul de autentificare lipsește.' }, { status: 401 });
        }

        // 1. VERIFICARE SECURITATE: Decodăm token-ul pentru a verifica rolul
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        
        // Asigurăm-ne că doar utilizatorii cu rolul 'admin' pot executa această funcție
        if (!decodedToken.admin) {
            return NextResponse.json({ message: 'Acces neautorizat. Doar Adminii pot vizualiza lista de utilizatori.' }, { status: 403 });
        }
        
        // 2. Extrage toți utilizatorii din Firebase Auth (maximum 1000 la un singur apel)
        const listUsersResult = await adminAuth.listUsers();
        
        // 3. Maparea datelor pentru a returna doar informațiile relevante
        const users = listUsersResult.users.map(user => {
            // Extrage rolul din custom claims (default 'adolescent' dacă lipsește)
            const role = user.customClaims?.role || (user.isAnonymous ? 'adolescent' : 'necunoscut');

            return {
                uid: user.uid,
                email: user.email || (user.isAnonymous ? 'Anonim' : 'Fără Email'),
                isAnonymous: user.isAnonymous,
                creationTime: user.metadata.creationTime,
                role: role,
            };
        });

        return NextResponse.json({ 
            users: users,
            success: true
        }, { status: 200 });

    } catch (error) {
        console.error('Eroare la listarea utilizatorilor (API):', error.message);
        return NextResponse.json({ message: `Eroare internă: ${error.message}` }, { status: 500 });
    }
}