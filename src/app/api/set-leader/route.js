import { NextResponse } from 'next/server';
import admin from '@/lib/firebase-admin'; // <--- IMPORT CORECT (default export)

// Obține serviciul de autentificare o singură dată
const adminAuth = admin.auth(); 

// Funcție ajutătoare pentru a crea obiectul de claims
function getClaimsForRole(newRole) {
    let claims = {
        role: newRole,
        admin: false,
        lider: false,
        adolescent: false,
    };
    
    // Setează claim-ul specific rolului
    if (newRole === 'admin') {
        claims.admin = true;
    } else if (newRole === 'lider') {
        claims.lider = true;
    } else {
        claims.adolescent = true;
    }
    return claims;
}

export async function POST(req) {
    try {
        // Preluăm UID-ul utilizatorului țintă, rolul dorit și token-ul Adminului care face cererea
        const { targetUid, newRole, idToken } = await req.json(); 

        if (!targetUid || !newRole || !idToken) {
            return NextResponse.json({ message: 'Date insuficiente (UID, rol sau token lipsesc).' }, { status: 400 });
        }

        // 1. **VERIFICARE SECURITATE:** Decodăm token-ul Adminului
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        
        // Asigurăm-ne că doar utilizatorii cu rolul 'admin' pot executa această funcție
        if (!decodedToken.admin) {
            return NextResponse.json({ message: 'Acces neautorizat. Doar Adminii pot seta roluri.' }, { status: 403 });
        }
        
        // 2. Definirea Custom Claims
        const claims = getClaimsForRole(newRole);

        // 3. Setarea Noului Rol
        await adminAuth.setCustomUserClaims(targetUid, claims);

        // 4. Forțarea reîmprospătării token-ului utilizatorului vizat
        // Acest lucru obligă utilizatorul țintă să obțină un token nou cu noul rol.
        await adminAuth.revokeRefreshTokens(targetUid);
        
        return NextResponse.json({ 
            message: `Rolul setat cu succes: ${targetUid} este acum ${newRole}.`,
            success: true
        }, { status: 200 });

    } catch (error) {
        // Eroare specifică de token invalid (ex: expirat sau fals)
        if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
            return NextResponse.json({ message: 'Token-ul Adminului este invalid sau expirat. Re-încercați.', success: false }, { status: 401 });
        }
        
        console.error('Eroare internă la setarea rolului (API):', error.message);
        return NextResponse.json({ message: `Eroare internă: ${error.message}` }, { status: 500 });
    }
}