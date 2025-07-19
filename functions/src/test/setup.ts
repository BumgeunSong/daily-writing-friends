// Jest setup file for Firebase Functions testing
import { jest } from '@jest/globals';

// Mock Firebase Admin SDK
jest.mock('../admin', () => ({
  __esModule: true,
  default: {
    firestore: jest.fn(() => ({
      collection: jest.fn(),
      doc: jest.fn(),
      runTransaction: jest.fn()
    }))
  }
}));

// Mock Firebase Functions
jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: jest.fn(),
  onDocumentUpdated: jest.fn(),
  onDocumentDeleted: jest.fn()
}));

jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: jest.fn()
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.GCLOUD_PROJECT = 'test-project';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

// Global test timeout
jest.setTimeout(10000);