import type { Contribution } from "@/stats/model/WritingStats";

interface ProcessedContributions {
    matrix: (number | null)[][]
    maxValue: number
    recentContributions: Contribution[]
}

// 기여도 데이터 처리 로직을 별도 함수로 분리
const processContributions = (contributions: Contribution[]): ProcessedContributions => {
    const matrix: (number | null)[][] = Array.from({ length: 4 }, () => Array(5).fill(null));
    const recentContributions = contributions.slice(-20);
    
    recentContributions.forEach((contribution, index) => {
        const row = Math.floor(index / 5);
        const col = index % 5;
        matrix[row][col] = contribution.contentLength;
    });

    const maxValue = Math.max(...contributions.map(c => c.contentLength || 0));

    return { matrix, maxValue, recentContributions };
}

export default processContributions;