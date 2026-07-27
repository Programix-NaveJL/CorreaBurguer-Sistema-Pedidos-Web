import { createClient } from '@supabase/supabase-js';

// TODO: reemplazar con los valores reales de tu proyecto Supabase.
// La anon key es pública por diseño (RLS es lo que protege los datos),
// así que sí puede vivir en este archivo committeado al repo.
const SUPABASE_URL = 'https://hmdjcrftgcxbkifbyxde.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtZGpjcmZ0Z2N4YmtpZmJ5eGRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NjIxNDcsImV4cCI6MjEwMDMzODE0N30.6lfbS70hkWQubS9ZbV7IFd7UMzQGua5zL5sg22W7DWQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// URL pública del bucket de R2 (no es secreta, es solo de lectura).
export const R2_PUBLIC_URL = 'https://pub-c14f3be6ade34e9791c59c52117f6919.r2.dev';