"use client";

import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';

// --- Componenta Modală pentru Formularul de Eveniment (Editare/Creare) ---
export default function EventFormModal({ selectedDate, eventToEdit, onClose, onSave, onDelete, currentUserId, role }) {
    const isEditing = !!eventToEdit;
    
    const [title, setTitle] = useState(eventToEdit?.title || '');
    const [description, setDescription] = useState(eventToEdit?.description || '');
    const [eventTime, setEventTime] = useState(eventToEdit?.time || format(new Date(), 'HH:mm')); 
    const [error, setError] = useState('');
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    // Data afișată în modal
    const displayDate = isEditing 
        ? new Date(eventToEdit.date).toLocaleDateString('ro-RO')
        : selectedDate.toLocaleDateString('ro-RO');

    // Verifică dacă utilizatorul curent este creatorul evenimentului de editat sau are rol de admin/lider
    const canDelete = isEditing && (eventToEdit.createdBy === currentUserId || role === 'admin' || role === 'lider');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!title.trim()) {
            setError("Titlul evenimentului nu poate fi gol.");
            return;
        }
        if (!eventTime) {
            setError("Vă rugăm să selectați o oră.");
            return;
        }

        const data = {
            title,
            description,
            date: eventToEdit?.date || format(selectedDate, 'yyyy-MM-dd'), 
            time: eventTime, 
        };

        try {
            if (isEditing) {
                await onSave(eventToEdit.id, data);
            } else {
                await onSave(data);
            }
            onClose();
        } catch (err) {
            console.error(`Eroare la ${isEditing ? 'actualizarea' : 'adăugarea'} evenimentului:`, err);
            setError(`A apărut o eroare la salvare: ${err.message}. Încercați din nou.`);
        }
    };
    
    const handleDelete = async () => {
        if (!isConfirmingDelete) {
            setIsConfirmingDelete(true);
            return;
        }
        
        try {
            if (eventToEdit?.id) {
                await onDelete(eventToEdit.id);
                onClose();
            }
        } catch (err) {
            console.error("Eroare la ștergerea evenimentului:", err);
            setError(`A apărut o eroare la ștergere: ${err.message}.`);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition" aria-label="Închide">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                
                <h2 className="text-2xl font-bold mb-4 text-indigo-600">{isEditing ? 'Modifică Eveniment' : 'Creare Eveniment Nou'}</h2>
                <p className="mb-4 text-gray-700">Data evenimentului: <span className="font-semibold">{displayDate}</span></p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Titlu</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Oră</label>
                        <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descriere (Opțional)</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-gray-900" />
                    </div>

                    {error && <p className="text-red-500 text-sm p-2 bg-red-50 rounded-md border border-red-200">{error}</p>}

                    <div className="flex justify-between items-center pt-4">
                        {isEditing && canDelete && (
                            <button type="button" onClick={handleDelete} className={`px-4 py-2 text-sm font-medium rounded-lg transition shadow-md ${isConfirmingDelete ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                                {isConfirmingDelete ? 'CONFIRMĂ ȘTERGEREA?' : 'Șterge'}
                            </button>
                        )}
                        <div className={`flex space-x-3 ${!isEditing || !canDelete ? 'w-full justify-end' : 'ml-auto'}`}>
                            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow-md">
                                {isEditing ? 'Salvează Modificările' : 'Salvează Eveniment'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}