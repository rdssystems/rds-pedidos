'use client';

import { useEffect, useRef, useState } from 'react';

export const useNotifications = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isLooping, setIsLooping] = useState(false);

    useEffect(() => {
        // Initialize audio
        audioRef.current = new Audio('/notification.mp3');
        audioRef.current.loop = true;

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const playAlert = () => {
        if (audioRef.current && !isLooping) {
            audioRef.current.play().catch(e => console.log('Autoplay blocked:', e));
            setIsLooping(true);
        }
    };

    const stopAlert = () => {
        if (audioRef.current && isLooping) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsLooping(false);
        }
    };

    return { playAlert, stopAlert, isLooping };
};
