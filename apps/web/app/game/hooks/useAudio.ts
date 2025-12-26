// Audio Hook - Web Audio API Sound Effects

import { useCallback, useRef } from 'react';

type SoundName = 'shoot' | 'meteor' | 'powerup' | 'explosion' | 'combo' | 'gameOver';

export function useAudio() {
    const audioContextRef = useRef<AudioContext | null>(null);
    const isSoundOnRef = useRef(true);

    const initAudio = useCallback(() => {
        if (!audioContextRef.current) {
            try {
                const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                audioContextRef.current = new AudioContextClass();
            } catch (e) {
                console.log('Audio not supported', e);
            }
        }
    }, []);

    const playSound = useCallback((name: string) => {
        if (!isSoundOnRef.current || !audioContextRef.current) return;

        const soundName = name as SoundName;

        const context = audioContextRef.current;

        // Resume audio context if suspended (needed for mobile)
        if (context.state === 'suspended') {
            context.resume();
        }

        try {
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);

            // Add slight randomization for more natural sound variation
            const randomFactor = 0.95 + Math.random() * 0.1; // 95% to 105% of base frequency

            switch (soundName) {
                case 'shoot':
                    osc.type = ['sine', 'square'][Math.floor(Math.random() * 2)] as OscillatorType;
                    osc.frequency.value = 600 * randomFactor;
                    gain.gain.value = 0.08 + Math.random() * 0.04; // 0.08 to 0.12
                    osc.start();
                    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);
                    osc.stop(context.currentTime + 0.1);
                    break;

                case 'meteor':
                    osc.type = 'triangle';
                    osc.frequency.value = 200 * randomFactor;
                    gain.gain.value = 0.18 + Math.random() * 0.04; // 0.18 to 0.22
                    osc.start();
                    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);
                    osc.frequency.exponentialRampToValueAtTime(100 * randomFactor, context.currentTime + 0.5);
                    osc.stop(context.currentTime + 0.5);
                    break;

                case 'powerup':
                    osc.type = 'sine';
                    osc.frequency.value = 800 * randomFactor;
                    gain.gain.value = 0.12 + Math.random() * 0.06; // 0.12 to 0.18
                    osc.start();
                    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
                    osc.frequency.exponentialRampToValueAtTime(1200 * randomFactor, context.currentTime + 0.2);
                    osc.stop(context.currentTime + 0.2);
                    break;

                case 'explosion':
                    osc.type = ['sawtooth', 'square'][Math.floor(Math.random() * 2)] as OscillatorType;
                    osc.frequency.value = 100 * randomFactor;
                    gain.gain.value = 0.25 + Math.random() * 0.1; // 0.25 to 0.35
                    osc.start();
                    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
                    osc.frequency.exponentialRampToValueAtTime(50 * randomFactor, context.currentTime + 0.3);
                    osc.stop(context.currentTime + 0.3);
                    break;

                case 'combo':
                    osc.type = 'square';
                    osc.frequency.value = 1000 * randomFactor;
                    gain.gain.value = 0.08 + Math.random() * 0.04; // 0.08 to 0.12
                    osc.start();
                    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.15);
                    osc.stop(context.currentTime + 0.15);
                    break;

                case 'gameOver':
                    osc.type = 'sine';
                    osc.frequency.value = 400 * randomFactor;
                    gain.gain.value = 0.18 + Math.random() * 0.04; // 0.18 to 0.22
                    osc.start();
                    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
                    osc.frequency.exponentialRampToValueAtTime(300 * randomFactor, context.currentTime + 0.4);
                    osc.stop(context.currentTime + 0.4);
                    break;
            }
        } catch (e) {
            console.log('Error playing sound', e);
        }
    }, []);

    const setSoundOn = useCallback((on: boolean) => {
        isSoundOnRef.current = on;
    }, []);

    const getSoundOn = useCallback(() => {
        return isSoundOnRef.current;
    }, []);

    return {
        initAudio,
        playSound,
        setSoundOn,
        getSoundOn,
    };
}
