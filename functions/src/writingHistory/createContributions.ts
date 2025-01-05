import { Timestamp } from "firebase-admin/firestore";
import { WritingHistory } from "../types/WritingHistory";
import { isSameDay, TimeZone } from "../dateUtils";   

type Contribution = {
    createdAt: Timestamp;
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
        createdAt: Timestamp.fromDate(workingDay),
        contentLength: history?.post?.contentLength ?? null
    };
}

export { createContributions, Contribution };