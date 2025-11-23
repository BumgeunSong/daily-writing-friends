import { Timestamp } from 'firebase-admin/firestore';

/**
 * Real user data extracted from Firestore for user '1y06BmkauwhIEwZm9LQmEmgl6Al1'
 * This user has 166 postings with 150 working days but only shows 63-day streak
 * This data will be used to create a failing test and fix the data fetching limits
 */

// Sample of real postings data (truncated for test efficiency)
export const realUserPostings = [
  {
    id: "Pz0IPXEYWIjDX8VWsd1V",
    board: { id: "usjFgSCEQdO4oE2Lo3EZ" },
    post: { id: "4CKXYhY5i7fairyRx312", title: "내가 연애할 때 보는 것", contentLength: 968 },
    createdAt: Timestamp.fromDate(new Date("2025-08-04T12:14:56.933Z")),
    isRecovered: false
  },
  {
    id: "xgoMojRlkegTYq34Iib3",
    board: { id: "usjFgSCEQdO4oE2Lo3EZ" },
    post: { id: "cWssJCp76SwoDzMK5xCU", title: "모쏠이 뭐길래 그렇게들 재밌다는 거야", contentLength: 1148 },
    createdAt: Timestamp.fromDate(new Date("2025-08-01T14:59:16.261Z")),
    isRecovered: false
  },
  {
    id: "qaq8O2yEJThVkQEZ7RX4",
    board: { id: "usjFgSCEQdO4oE2Lo3EZ" },
    post: { id: "nTgDYJK6rD2dUXs6pKS1", title: "공개적으로 쓰기", contentLength: 415 },
    createdAt: Timestamp.fromDate(new Date("2025-07-31T02:34:18.269Z")),
    isRecovered: false
  },
  {
    id: "b1xv0aAohnvJSYjEyNAb",
    board: { id: "usjFgSCEQdO4oE2Lo3EZ" },
    post: { id: "BxqTVnzlPf3iAgMgoaDC", title: "남들 놀 때 노는 것 vs 남들 일할 때 노는 것", contentLength: 1980 },
    createdAt: Timestamp.fromDate(new Date("2025-07-30T01:20:19.724Z")),
    isRecovered: false
  },
  {
    id: "xuDps5HXBMBvkWdq1ssD",
    board: { id: "usjFgSCEQdO4oE2Lo3EZ" },
    post: { id: "4y3ewN2ircr8HIwIb3PV", title: "간단한 개발 회고", contentLength: 1140 },
    createdAt: Timestamp.fromDate(new Date("2025-07-29T13:14:01.665Z")),
    isRecovered: false
  },
  // Add more postings going back to show consecutive working days
  // This simulates what a high-streak user would have - many consecutive working day posts
  {
    id: "test_consecutive_1",
    board: { id: "usjFgSCEQdO4oE2Lo3EZ" },
    post: { id: "test1", title: "Test consecutive 1", contentLength: 100 },
    createdAt: Timestamp.fromDate(new Date("2025-07-26T10:00:00.000Z")), // Friday
    isRecovered: false
  },
  {
    id: "test_consecutive_2",
    board: { id: "usjFgSCEQdO4oE2Lo3EZ" },
    post: { id: "test2", title: "Test consecutive 2", contentLength: 100 },
    createdAt: Timestamp.fromDate(new Date("2025-07-25T10:00:00.000Z")), // Thursday
    isRecovered: false
  },
  {
    id: "test_consecutive_3",
    board: { id: "usjFgSCEQdO4oE2Lo3EZ" },
    post: { id: "test3", title: "Test consecutive 3", contentLength: 100 },
    createdAt: Timestamp.fromDate(new Date("2025-07-24T10:00:00.000Z")), // Wednesday
    isRecovered: false
  },
  {
    id: "test_consecutive_4",
    board: { id: "usjFgSCEQdO4oE2Lo3EZ" },
    post: { id: "test4", title: "Test consecutive 4", contentLength: 100 },
    createdAt: Timestamp.fromDate(new Date("2025-07-23T10:00:00.000Z")), // Tuesday
    isRecovered: false
  },
  {
    id: "test_consecutive_5",
    board: { id: "usjFgSCEQdO4oE2Lo3EZ" },
    post: { id: "test5", title: "Test consecutive 5", contentLength: 100 },
    createdAt: Timestamp.fromDate(new Date("2025-07-22T10:00:00.000Z")), // Monday
    isRecovered: false
  }
];

// Continue pattern for many more working days to simulate 100+ consecutive streak
// In real scenario, this user would have posts on most working days going back months

/**
 * Generate consecutive working day postings for testing high streaks
 * Generates postings going backwards from startDate
 */
export function generateConsecutiveWorkingDayPostings(
  startDate: Date,
  workingDaysCount: number
): typeof realUserPostings {
  const postings = [];
  let currentDate = new Date(startDate);
  let postingId = 1;
  
  // Start from the given date and go backwards, ensuring we hit working days
  for (let i = 0; i < workingDaysCount; i++) {
    // Ensure current date is a working day
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    }
    
    postings.push({
      id: `consecutive_${postingId++}`,
      board: { id: "usjFgSCEQdO4oE2Lo3EZ" },
      post: { 
        id: `post_${postingId}`, 
        title: `Consecutive post ${i + 1}`, 
        contentLength: 100 
      },
      createdAt: Timestamp.fromDate(new Date(currentDate)),
      isRecovered: false
    });
    
    // Move to previous working day
    do {
      currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    } while (currentDate.getDay() === 0 || currentDate.getDay() === 6); // Skip weekends
  }
  
  // Sort postings by date descending (most recent first) to match real data format
  return postings.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
}

/**
 * Real user metadata from extraction
 */
export const realUserMetadata = {
  userId: "1y06BmkauwhIEwZm9LQmEmgl6Al1",
  totalPostings: 166,
  workingDaysWithPosts: 150,
  dateRange: {
    earliest: "2024-12-30T03:38:46.736Z",
    latest: "2025-08-04T12:14:56.933Z"
  }
};