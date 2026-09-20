'use client';
import { useEffect, useState } from 'react';
import { useMounted } from './core-motion';
import { PetMascot } from './core-mascot';
import { CoreSecrets } from './core-secrets';
import { CorePeeks } from './core-peeks';

const AWAY_TITLE = 'น้อง ๆ คิดถึงแล้วนะ… | PAWPAL';

export function CuteAmbient({ pet }: { pet: string }) {
  const mounted = useMounted();
  const [welcome, setWelcome] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('pawpal-store');
    return () => root.classList.remove('pawpal-store');
  }, []);

  useEffect(() => {
    let timer = 0;
    let saved: string | null = null;
    let leftAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        leftAt = Date.now();
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          saved = document.title;
          document.title = AWAY_TITLE;
        }, 3000);
        return;
      }
      window.clearTimeout(timer);
      if (saved !== null) {
        document.title = saved;
        saved = null;
      }
      if (leftAt && Date.now() - leftAt > 3000) setWelcome((n) => n + 1);
      leftAt = 0;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(timer);
      if (saved !== null) document.title = saved;
    };
  }, []);

  if (!mounted) return null;

  return (
    <>
      <PetMascot pet={pet} welcome={welcome} />
      <CoreSecrets />
      <CorePeeks />
    </>
  );
}
