import { WritingHistory } from "../types/WritingHistory";
import { isSameDay, TimeZone } from "../dateUtils";   

type Contribution = {
    createdAt: string;
    contentLength: number | null;
}

function createContributions(workingDays: Date[], histories: WritingHistory[]): Contribution[] {
    return workingDays.map(day => createContribution(day, histories));
}

function createContribution(workingDay: Date, histories: WritingHistory[]): Contribution {
    const history = histories.find(history => 
        isSameDay(history.createdAt.toDate(), workingDay, TimeZone.KST)
    );

    return {
        createdAt: workingDay.toISOString(),
        contentLength: history?.post?.contentLength ?? null
    };
}

export { createContributions, Contribution };