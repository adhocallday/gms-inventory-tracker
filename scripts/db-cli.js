#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Make sure .env.local is loaded.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to run SQL queries
async function runQuery(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Error:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return null;
  }
}

// Helper commands
const commands = {
  '\\dt': async () => {
    console.log('\nList of relations:');
    const result = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (result.data) {
      result.data.forEach(t => console.log(`  ${t.table_name}`));
    }
  },

  '\\d': async (tableName) => {
    if (!tableName) {
      console.log('Usage: \\d table_name');
      return;
    }
    console.log(`\nTable "${tableName}":`);
    const result = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');

    if (result.data) {
      console.log('Column | Type | Nullable');
      console.log('-------|------|----------');
      result.data.forEach(c => {
        console.log(`${c.column_name} | ${c.data_type} | ${c.is_nullable}`);
      });
    }
  },

  'help': () => {
    console.log('\nAvailable commands:');
    console.log('  \\dt              - List all tables');
    console.log('  \\d <table>       - Describe a table');
    console.log('  \\q or exit       - Quit');
    console.log('  help             - Show this help');
    console.log('  SELECT ...       - Run any SQL query');
    console.log('');
  }
};

// Interactive mode
async function interactive() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'supabase> '
  });

  console.log('Supabase Database CLI');
  console.log('Type "help" for available commands, "\\q" to quit\n');

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    if (input === '\\q' || input === 'exit') {
      rl.close();
      return;
    }

    // Handle special commands
    if (input === '\\dt') {
      await commands['\\dt']();
    } else if (input.startsWith('\\d ')) {
      const tableName = input.substring(3).trim();
      await commands['\\d'](tableName);
    } else if (input === 'help') {
      commands.help();
    } else {
      // Run as SQL query
      const result = await runQuery(input);
      if (result !== null) {
        console.log(JSON.stringify(result, null, 2));
      }
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });
}

// Command-line mode
async function executeQuery(query) {
  const result = await runQuery(query);
  if (result !== null) {
    console.log(JSON.stringify(result, null, 2));
  }
  process.exit(result === null ? 1 : 0);
}

// Main
const args = process.argv.slice(2);
if (args.length > 0) {
  executeQuery(args.join(' '));
} else {
  interactive();
}
