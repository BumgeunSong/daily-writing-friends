/**
 * Migration Configuration
 *
 * Shared configuration for Firebase Admin and Supabase clients.
 *
 * Required environment variables:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin access
 * - GOOGLE_APPLICATION_CREDENTIALS: Path to Firebase service account JSON (optional if using ADC)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

// ESM-compatible __dirname and require
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Firebase Admin initialization
function initializeFirebase() {
  if (getApps().length > 0) {
    return getFirestore();
  }

  // Try to use service account if GOOGLE_APPLICATION_CREDENTIALS is set
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (serviceAccountPath) {
    const serviceAccount = require(serviceAccountPath);
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Use Application Default Credentials (requires gcloud auth application-default login)
    initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'artico-app-4f9d4',
    });
  }

  return getFirestore();
}

// Supabase client initialization
function initializeSupabase(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const firestore = initializeFirebase();
export const supabase = initializeSupabase();

// Batch size for Firestore reads and Supabase writes
export const BATCH_SIZE = 500;

// Export directory for JSON files
export const EXPORT_DIR = path.resolve(__dirname, '../../data/migration-export');
