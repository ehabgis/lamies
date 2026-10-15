import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MagicCursor() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [trail, setTrail] = useState([]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });

            const newSparkle = {
                id: `${Date.now()}-${Math.random()}`,
                x: e.clientX,
                y: e.clientY,
                emoji: ['', '', '', ''][Math.floor(Math.random() * 4)],
                color: ['#FFB8E1', '#9AD9FF', '#C6F5DD', '#FFE07A'][Math.floor(Math.random() * 4)]
            };

            setTrail(prev => [...prev.slice(-15), newSparkle]);
        };

        const handleClick = (e) => {
            const burstCount = 8;
            const burst = Array.from({ length: burstCount }).map((_, i) => ({
                id: `${Date.now()}-${i}-${Math.random()}`,
                x: e.clientX,
                y: e.clientY,
                vx: (Math.random() - 0.5) * 50, // Velocity X
                vy: (Math.random() - 0.5) * 50, // Velocity Y
                emoji: ['', '', '', ''][Math.floor(Math.random() * 4)],
                color: ['#FF8FCB', '#FFD07A', '#7AE6C5', '#9AD9FF'][Math.floor(Math.random() * 4)],
                isBurst: true
            }));
            setTrail(prev => [...prev, ...burst]);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('click', handleClick);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('click', handleClick);
        };
    }, []);

    // Clean up old sparkles
    useEffect(() => {
        const interval = setInterval(() => {
            setTrail(prev => prev.filter(sparkle => Date.now() - sparkle.id < 1000));
        }, 100);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
            <AnimatePresence>
                {trail.map(sparkle => (
                    <motion.div
                        key={sparkle.id}
                        initial={{ opacity: 1, scale: 0.5, x: sparkle.x, y: sparkle.y }}
                        animate={{
                            opacity: 0,
                            scale: 0,
                            x: sparkle.isBurst ? sparkle.x + sparkle.vx : sparkle.x,
                            y: sparkle.isBurst ? sparkle.y + sparkle.vy : sparkle.y + 20,
                            rotate: Math.random() * 360
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className="absolute text-xl origin-center"
                        style={{ color: sparkle.color }}
                    >
                        {sparkle.emoji}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
