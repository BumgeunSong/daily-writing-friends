import { useMemo } from "react"
import { cn } from "@/shared/utils/cn"
import { ContributionItem } from "@/stats/components/ContributionItem"
import { Contribution } from "@/stats/model/WritingStats"
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils'

// 도메인별 union props
export type ContributionGraphProps =
  | { type: 'posting'; contributions: Contribution[]; className?: string }
  | { type: 'commenting'; contributions: CommentingContribution[]; className?: string }

export function ContributionGraph(props: ContributionGraphProps) {
  const { matrix, maxValue, recentContributions } = useMemo(() => {
    if (props.type === 'posting') {
      // 기존 로직 그대로
      const contributions = props.contributions as Contribution[];
      const matrix: (number | null)[][] = Array.from({ length: 4 }, () => Array(5).fill(null));
      const recent = contributions.slice(-20);
      recent.forEach((c, i) => {
        const row = Math.floor(i / 5);
        const col = i % 5;
        matrix[row][col] = c.contentLength;
      });
      const maxValue = Math.max(...contributions.map(c => c.contentLength ?? 0), 0);
      return { matrix, maxValue, recentContributions: recent };
    } else {
      // commenting
      const contributions = props.contributions as CommentingContribution[];
      const matrix: (number | null)[][] = Array.from({ length: 4 }, () => Array(5).fill(null));
      const recent = contributions.slice(-20);
      recent.forEach((c, i) => {
        const row = Math.floor(i / 5);
        const col = i % 5;
        matrix[row][col] = c.countOfCommentAndReplies;
      });
      const maxValue = Math.max(...contributions.map(c => c.countOfCommentAndReplies ?? 0), 0);
      return { matrix, maxValue, recentContributions: recent };
    }
  }, [props]);

  return (
    <div className={cn("w-full grid grid-rows-4 grid-flow-col gap-1", props.className)}>
      {matrix.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((value, colIndex) => {
            const contributionIndex = rowIndex * 5 + colIndex;
            const contribution = recentContributions[contributionIndex];
            return (
              <ContributionItem
                key={colIndex}
                contribution={contribution}
                value={value}
                maxValue={maxValue}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}