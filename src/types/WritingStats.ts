export interface WritingStats {
    user: {
        id: string;
        nickname: string | null;
        realname: string | null;
        profilePhotoURL: string | null;
        bio: string | null;
    }
    contributions: Contribution[];
}

export type Contribution = {
    date: string;
    contentLength: number | null;
}