import { spawn } from 'child_process'
import { existsSync } from 'fs'

const INACTIVITY_MS = 30_000 // 30s of no output = hung

const child = spawn('node', ['node_modules/.bin/storybook', 'build', '--disable-telemetry'], {
  stdio: ['inherit', 'pipe', 'pipe'],
})

let lastOutput = Date.now()

child.stdout.on('data', (data) => {
  process.stdout.write(data)
  lastOutput = Date.now()
})

child.stderr.on('data', (data) => {
  process.stderr.write(data)
  lastOutput = Date.now()
})

const hangCheck = setInterval(() => {
  if (Date.now() - lastOutput < INACTIVITY_MS) return
  clearInterval(hangCheck)
  if (existsSync('storybook-static/index.html')) {
    console.log('\n✓ Storybook build completed (killing hung process)')
    child.kill('SIGKILL')
    process.exit(0)
  } else {
    console.error('\n✗ Storybook build timed out without completing')
    child.kill('SIGKILL')
    process.exit(1)
  }
}, 5_000)

child.on('exit', (code) => {
  clearInterval(hangCheck)
  process.exit(code ?? 0)
})
