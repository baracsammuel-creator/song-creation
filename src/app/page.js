// src/app/page.js
import HomePageContent from '../components/HomePageContent'; 

export default function HomePage() {
    return (
        <div className="min-h-[calc(100vh-70px)] bg-gray-50 flex items-center justify-center">
            <HomePageContent />
        </div>
    );
}