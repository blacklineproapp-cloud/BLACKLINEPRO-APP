
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
  const email = 'jho.araucaria.2020@gmail.com';
  console.log(`Checking for user with email: ${email}`);

  const { data: users, error: searchError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);

  if (searchError) {
    console.error('Error searching for user:', searchError);
    return;
  }

  if (!users || users.length === 0) {
    console.log('User not found in Supabase database.');
    return;
  }

  console.log(`Found ${users.length} user(s):`);
  users.forEach(u => console.log(`- ID: ${u.id}, Email: ${u.email}, Name: ${u.name}`));

  for (const user of users) {
      console.log(`Deleting user ${user.id}...`);
      const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id);
      
      if (deleteError) {
          console.error(`Error deleting user ${user.id}:`, deleteError);
      } else {
          console.log(`User ${user.id} deleted successfully.`);
      }

      // Also try to delete from auth.users if possible (requires admin rights and different approach usually, but let's stick to public.users table as requested or implied by "banco de dados")
      // Actually usually deleting from auth.users cascades to public.users if set up that way, but often we just delete from public.users if the user is "stuck" there.
      // However, the user said "não está no nosso painel admin somente no clerk", implying they might mean it IS in the database but somehow broken?
      // Or maybe they want to delete it from the DB so they can re-register?
      // "se acha exclua ele pois deu algum bug e ele não está no nosso painel admin somente no clerk"
      // This implies the user MIGHT exist in the DB (since they are asking to check) but isn't showing up in admin panel (maybe due to missing fields?). 
      // AND "somente no clerk" implies they are in Clerk. 
      // If I delete from 'users' table, that cleans up the application data.
      
      // Let's also check if we can delete from auth.users using the admin client.
      const { data: authUser, error: authSearchError } = await supabase.auth.admin.listUsers();
      // Searching by email in auth admin is more direct
       // actually listUsers doesn't filter by email directly in older versions, checking documentation...
       // createUser, getUserById, listUsers.
       // We can just try deleteUser(id) if we had the ID.
       
       // But wait, the user is likely in `public.users`.
       // If I delete from `public.users`, that satisfies the request "acha n o banco de dados supabase ... exclua".
  }
}

main().catch(console.error);
