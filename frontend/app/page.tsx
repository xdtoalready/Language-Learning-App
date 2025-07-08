// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/useStore';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function HomePage() {
  const { isAuthenticated, isLoading, loadProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      // Проверяем токен в localStorage
      const token = localStorage.getItem('auth_token');
      
      if (token && !isAuthenticated) {
        try {
          await loadProfile();
          router.push('/dashboard');
        } catch {
          router.push('/auth');
        }
      } else if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/auth');
      }
    };

    checkAuth();
  }, [isAuthenticated, loadProfile, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Загрузка...</p>
      </div>
    </div>
  );
}