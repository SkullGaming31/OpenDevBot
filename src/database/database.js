
const { createClient } = require('@supabase/supabase-js');
const config = require('../../config');

const supabaseUrl = config.PROJECT_URL;
const supabaseKey = config.POSTGRES_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);