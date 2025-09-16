import { trackedFetch, createTrackedFetch } from '@/shared/utils/trackedFetch';

/**
 * Example HTTP client using tracked fetch for better error monitoring
 * Use this for all API calls that need error tracking
 */

/**
 * Create a tracked fetch instance with JSON headers
 */
const jsonFetch = createTrackedFetch({
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * GET request with tracking
 */
export async function getWithTracking<T>(url: string): Promise<T> {
  const response = await trackedFetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * POST request with tracking
 */
export async function postWithTracking<T>(url: string, data: any): Promise<T> {
  const response = await jsonFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * PUT request with tracking
 */
export async function putWithTracking<T>(url: string, data: any): Promise<T> {
  const response = await jsonFetch(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * DELETE request with tracking
 */
export async function deleteWithTracking(url: string): Promise<void> {
  const response = await trackedFetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

/**
 * Example: Using tracked fetch with Firebase Functions
 */
export async function callFirebaseFunction<T>(functionName: string, data?: any): Promise<T> {
  const url = `https://us-central1-your-project.cloudfunctions.net/${functionName}`;

  const response = await trackedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firebase function error: ${error}`);
  }

  return response.json();
}