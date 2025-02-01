/**
 * 현재 시간을 기반으로 시드값을 생성합니다.
 * @returns {number} 시간 기반 시드값
 */
export const getHourBasedSeed = () => {
  const now = new Date();
  return now.getFullYear() * 10000 + 
         (now.getMonth() + 1) * 100 + 
         now.getDate() + 
         now.getHours();
};

/**
 * 시드값을 기반으로 난수를 생성합니다.
 * @param {number} seed - 시드값
 * @returns {number} 0과 1 사이의 난수
 */
export const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

/**
 * Fisher-Yates 알고리즘을 사용하여 배열을 섞습니다.
 * @param {T[]} array - 섞을 배열
 * @param {number} seed - 시드값
 * @returns {T[]} 섞인 배열
 */
export const shuffleArray = <T>(array: T[], seed: number): T[] => {
  const shuffled = [...array];
  let currentSeed = seed;
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(currentSeed) * (i + 1));
    currentSeed++;
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
};