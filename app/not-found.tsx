"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.push('/src/login_page');
  }, [router]);

  return null;
}
