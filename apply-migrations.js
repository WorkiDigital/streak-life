import fs from 'fs'
import path from 'path'

const projectRef = process.env.SUPABASE_PROJECT_REF
const accessToken = process.env.SUPABASE_ACCESS_TOKEN

if (!projectRef || !accessToken) {
  throw new Error('Configure SUPABASE_PROJECT_REF e SUPABASE_ACCESS_TOKEN no ambiente.')
}

async function runQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error: ${res.status} ${err}`)
  }
  return await res.json()
}

async function applyMigrations() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  const files = fs.readdirSync(migrationsDir).sort()

  for (const file of files) {
    if (!file.endsWith('.sql')) continue
    console.log(`Applying migration: ${file}`)
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    await runQuery(sql)
    console.log(`Successfully applied ${file}`)
  }
}

applyMigrations().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
