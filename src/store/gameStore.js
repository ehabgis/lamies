import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useGameStore = create(
  persist(
    (set) => ({
      playerName: '',
      totalPoints: 0,
      currentLevel: 1,
      visitedLocations: [],
      completedQuizzes: [],
      earnedBadges: [],
      completedLessons: [],
      currentLocation: null,
      showCharacter: false,
      characterDialog: null,
      soundEnabled: true,
      
      setPlayerName: (name) => set({ playerName: name }),
      addPoints: (points) => set((state) => ({
        totalPoints: state.totalPoints + points,
        currentLevel: Math.min(Math.floor((state.totalPoints + points) / 200) + 1, 5)
      })),
      visitLocation: (id) => set((state) => {
        if (state.visitedLocations.includes(id)) return state;
        return {
          visitedLocations: [...state.visitedLocations, id],
          totalPoints: state.totalPoints + 10
        };
      }),
      completeQuiz: (id, score) => set((state) => ({
        completedQuizzes: [...new Set([...state.completedQuizzes, id])],
        totalPoints: state.totalPoints + score
      })),
      earnBadge: (id) => set((state) => ({
        earnedBadges: [...new Set([...state.earnedBadges, id])],
        totalPoints: state.totalPoints + 25
      })),
      setCurrentLocation: (loc) => set({ currentLocation: loc }),
      showCharacterDialog: (dialog) => set({ showCharacter: true, characterDialog: dialog }),
      hideCharacter: () => set({ showCharacter: false, characterDialog: null }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled }))
    }),
    { name: 'ana-khareeta-storage' }
  )
);
