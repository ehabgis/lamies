/**
 * Particle Effects Utility
 * Creates interactive visual feedback particles for clicks, success, and celebrations
 */

export const createConfettiBurst = (x, y, count = 30, colors = null) => {
  const defaultColors = ['#FF69B4', '#87CEEB', '#FFD700', '#90EE90', '#FFB347', '#DDA0DD'];
  const finalColors = colors || defaultColors;

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    
    const angle = (Math.PI * 2 * i) / count;
    const velocity = 5 + Math.random() * 8;
    const tx = Math.cos(angle) * velocity * 100;
    const ty = Math.sin(angle) * velocity * 100;
    
    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.width = '8px';
    particle.style.height = '8px';
    particle.style.backgroundColor = finalColors[i % finalColors.length];
    particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '0%';
    
    document.body.appendChild(particle);
    
    setTimeout(() => particle.remove(), 800);
  }
};

export const createSparkles = (x, y, count = 15, delay = 0) => {
  const emojis = ['', '', '', '', ''];
  
  setTimeout(() => {
    for (let i = 0; i < count; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'sparkle-particle';
      sparkle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      sparkle.style.fontSize = '12px';
      sparkle.style.left = `${x}px`;
      sparkle.style.top = `${y}px`;
      
      const angle = (Math.PI * 2 * i) / count;
      const velocity = 3 + Math.random() * 5;
      const tx = Math.cos(angle) * velocity * 80;
      const ty = Math.sin(angle) * velocity * 80;
      
      sparkle.style.setProperty('--tx', `${tx}px`);
      sparkle.style.setProperty('--ty', `${ty}px`);
      
      document.body.appendChild(sparkle);
      setTimeout(() => sparkle.remove(), 600);
    }
  }, delay);
};

export const createRipple = (x, y, color = 'rgba(99, 102, 241, 0.5)') => {
  const ripple = document.createElement('div');
  ripple.className = 'ripple-effect';
  ripple.style.left = `${x - 50}px`;
  ripple.style.top = `${y - 50}px`;
  ripple.style.width = '100px';
  ripple.style.height = '100px';
  ripple.style.backgroundColor = color;
  
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
};

export const createFloatingEmoji = (x, y, emoji = '', duration = 8000) => {
  const floatDiv = document.createElement('div');
  floatDiv.className = 'float-emoji';
  floatDiv.textContent = emoji;
  floatDiv.style.fontSize = '2rem';
  floatDiv.style.left = `${x}px`;
  floatDiv.style.top = `${y}px`;
  floatDiv.style.opacity = '1';
  
  document.body.appendChild(floatDiv);
  setTimeout(() => floatDiv.remove(), duration);
};

export const createShineEffect = (element) => {
  if (!element) return;
  
  const shine = document.createElement('div');
  shine.className = 'shine-overlay';
  shine.style.borderRadius = window.getComputedStyle(element).borderRadius;
  
  element.style.position = 'relative';
  element.style.overflow = 'hidden';
  element.appendChild(shine);
  
  setTimeout(() => shine.remove(), 500);
};

export const triggerElementPulse = (element) => {
  if (!element) return;
  
  element.classList.add('animate-target-pulse');
  setTimeout(() => element.classList.remove('animate-target-pulse'), 500);
};

export const createStarburst = (element) => {
  if (!element) return;
  
  element.classList.add('animate-starburst');
  setTimeout(() => element.classList.remove('animate-starburst'), 600);
};

export const celebrationEffect = (x, y) => {
  // Confetti burst
  createConfettiBurst(x, y, 40);
  
  // Sparkles with slight delay
  createSparkles(x, y, 20, 100);
  
  // Ripple effect
  createRipple(x, y, 'rgba(255, 215, 0, 0.4)');
};

export const successEffect = (element) => {
  if (!element) return;
  
  element.classList.add('animate-celebration');
  triggerElementPulse(element);
  
  setTimeout(() => element.classList.remove('animate-celebration'), 800);
};

export const errorEffect = (element) => {
  if (!element) return;
  
  element.classList.add('animate-shake-kids');
  
  setTimeout(() => element.classList.remove('animate-shake-kids'), 600);
};
