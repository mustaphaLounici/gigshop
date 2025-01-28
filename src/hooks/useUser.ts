'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import type { User } from '@/types';

export function useUser() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', authUser.id));
        if (userDoc.exists()) {
          setUser({
            ...userDoc.data(),
            id: authUser.id,
          } as User);
        } else {
          setError(new Error('User document not found'));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch user data'));
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchUser();
    }
  }, [authUser, authLoading]);

  return {
    user,
    loading: loading || authLoading,
    error,
  };
} 
