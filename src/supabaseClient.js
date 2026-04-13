import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lnwvlyswsmtafyoepovq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxud3ZseXN3c210YWZ5b2Vwb3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDg5NzYsImV4cCI6MjA4ODYyNDk3Nn0.Fc9m_KbT5soIP3jXS417-vTUMUDW-xFWes58mXchqpE';

export const supabase = createClient(supabaseUrl, supabaseKey);