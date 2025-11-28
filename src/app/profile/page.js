// src/app/profile/page.js

import UserProfile from '@/components/UserProfile';

export default function UserProfilePage() {
    return (
        <div className="min-h-[calc(100vh-70px)] bg-gray-50">
            <UserProfile />
        </div>
    );
}