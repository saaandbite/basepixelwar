// Object Pool for Performance Optimization
// Pre-allocate and reuse objects to avoid garbage collection during gameplay

import type { Projectile, Particle } from '../types';

export class ObjectPool<T> {
    private pool: T[] = [];
    private factory: () => T;
    private reset: (obj: T) => void;

    constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 0) {
        this.factory = factory;
        this.reset = reset;
        this.preallocate(initialSize);
    }

    preallocate(count: number): void {
        for (let i = 0; i < count; i++) {
            this.pool.push(this.factory());
        }
    }

    acquire(): T {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }
        return this.factory();
    }

    release(obj: T): void {
        this.reset(obj);
        this.pool.push(obj);
    }

    releaseAll(objects: T[]): void {
        for (const obj of objects) {
            this.release(obj);
        }
    }

    get size(): number {
        return this.pool.length;
    }
}

// Projectile factory and reset functions
export const createProjectilePool = (initialSize: number = 50): ObjectPool<Projectile> => {
    return new ObjectPool<Projectile>(
        // Factory
        () => ({
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            team: 'blue',
            active: false,
            lifetime: 0,
        }),
        // Reset
        (p) => {
            p.x = 0;
            p.y = 0;
            p.vx = 0;
            p.vy = 0;
            p.team = 'blue';
            p.active = false;
            p.target = undefined;
            p.lifetime = 0;
        },
        initialSize
    );
};

// Particle factory and reset functions
export const createParticlePool = (initialSize: number = 100): ObjectPool<Particle> => {
    return new ObjectPool<Particle>(
        // Factory
        () => ({
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            life: 0,
            size: 0,
            color: '#FFFFFF',
            glow: false,
        }),
        // Reset
        (p) => {
            p.x = 0;
            p.y = 0;
            p.vx = 0;
            p.vy = 0;
            p.life = 0;
            p.size = 0;
            p.color = '#FFFFFF';
            p.glow = false;
        },
        initialSize
    );
};

// Global pool instances (singleton pattern)
let projectilePool: ObjectPool<Projectile> | null = null;
let particlePool: ObjectPool<Particle> | null = null;

export const getProjectilePool = (): ObjectPool<Projectile> => {
    if (!projectilePool) {
        projectilePool = createProjectilePool(50);
    }
    return projectilePool;
};

export const getParticlePool = (): ObjectPool<Particle> => {
    if (!particlePool) {
        particlePool = createParticlePool(100);
    }
    return particlePool;
};

// Helper to acquire and initialize a projectile
export const acquireProjectile = (
    x: number,
    y: number,
    vx: number,
    vy: number,
    team: 'blue' | 'red' | 'neutral',
    target?: { x: number; y: number }
): Projectile => {
    const p = getProjectilePool().acquire();
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.team = team;
    p.active = true;
    p.target = target;
    p.lifetime = 0;
    return p;
};

// Helper to acquire and initialize a particle
export const acquireParticle = (
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    color: string,
    glow: boolean = false
): Particle => {
    const p = getParticlePool().acquire();
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.size = size;
    p.color = color;
    p.glow = glow;
    return p;
};
