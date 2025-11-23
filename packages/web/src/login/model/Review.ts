import { Timestamp } from "firebase/firestore";

export interface Review {
    reviewer: {
        uid: string;
        nickname?: string;
    };
    keep?: string;
    problem?: string;
    try?: string;
    nps: number;
    willContinue: "yes" | "no";
    createdAt: Timestamp;
}
