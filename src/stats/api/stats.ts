import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/firebase';
import { Posting } from '@/post/model/Posting';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';
import { mapDocumentToPosting } from '@/shared/utils/postingUtils';
import { fetchUserCommentingsByDateRange, fetchUserReplyingsByDateRange } from '@/user/api/commenting';
import { fetchUser } from '@/user/api/user';
import { User } from '@/user/model/User';

/**
 * Fetches posting data for a specific user
 */
export async function fetchPostingData(userId: string): Promise<Posting[]> {
    const postingsRef = collection(firestore, 'users', userId, 'postings');
    const q = query(postingsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => mapDocumentToPosting(doc));
}

/**
 * Fetches commenting data (comments + replies) for a specific user within a date range
 */
export async function fetchCommentingData(userId: string, numberOfDays: number = 20) {
    const workingDays = getRecentWorkingDays(numberOfDays);
    const dateRange = getDateRange(workingDays);

    const [commentings, replyings] = await Promise.all([
        fetchUserCommentingsByDateRange(userId, dateRange.start, dateRange.end),
        fetchUserReplyingsByDateRange(userId, dateRange.start, dateRange.end)
    ]);

    return { commentings, replyings };
}

/**
 * Creates a standardized user info object from User model
 */
export function createUserInfo(user: User) {
    return {
        id: user.uid,
        nickname: user.nickname || null,
        realname: user.realName || null,
        profilePhotoURL: user.profilePhotoURL || null,
        bio: user.bio || null
    };
}

/**
 * Calculates date range from working days array
 */
export function getDateRange(workingDays: Date[]): { start: Date; end: Date } {
    const start = workingDays[0];
    const end = new Date(workingDays[workingDays.length - 1]);
    end.setHours(23, 59, 59, 999); // Include end of last day
    return { start, end };
}


/**
 * Fetches posting data for contributions (limited to recent working days)
 */
export async function fetchPostingDataForContributions(userId: string, numberOfDays: number = 20): Promise<Posting[]> {
    const workingDays = getRecentWorkingDays(numberOfDays);
    const dateRange = getDateRange(workingDays);
    
    // For contributions, we still fetch all postings and filter by date range
    // This ensures we get accurate contribution data for the specific time period
    const postingsRef = collection(firestore, 'users', userId, 'postings');
    const q = query(postingsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const allPostings = querySnapshot.docs.map(doc => mapDocumentToPosting(doc));
    
    // Filter postings to only include those within the date range
    return allPostings.filter(posting => {
        const postingDate = posting.createdAt.toDate();
        return postingDate >= dateRange.start && postingDate <= dateRange.end;
    });
}


/**
 * Fetches user data with error handling
 */
export async function fetchUserSafely(userId: string): Promise<User | null> {
    try {
        return await fetchUser(userId);
    } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        return null;
    }
}