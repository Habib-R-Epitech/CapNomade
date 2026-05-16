import '@testing-library/jest-dom/vitest';

// Ensure env defaults exist during unit tests (carbon factors are coerced).
process.env.NEXT_PUBLIC_APP_URL ??= 'http://localhost:3000';
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-test-key-test-test-test-test-test';
