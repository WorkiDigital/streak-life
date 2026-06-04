import fs from 'fs'

const projectRef = process.env.SUPABASE_PROJECT_REF
const accessToken = process.env.SUPABASE_ACCESS_TOKEN
const migrationFile = process.argv[2] || 'supabase/migrations/006_add_nota_to_habit_logs.sql'

if (!projectRef || !accessToken) {
  throw new Error('Configure SUPABASE_PROJECT_REF e SUPABASE_ACCESS_TOKEN no ambiente.')
}

const sql = fs.readFileSync(migrationFile, 'utf8')

fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
}).then(async res => {
  if (!res.ok) console.error(await res.text())
  else console.log(`Migration applied: ${migrationFile}`)
})
