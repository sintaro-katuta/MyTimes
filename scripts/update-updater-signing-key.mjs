import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const tauriConfigPath = resolve(projectRoot, 'src-tauri/tauri.conf.json')
const defaultKeyPath = resolve(homedir(), '.tauri/mytimes.key')

const args = process.argv.slice(2)

const readOption = (name) => {
  const index = args.indexOf(name)
  if (index === -1) return null
  return args[index + 1] ?? ''
}

const hasFlag = (name) => args.includes(name)

const printHelp = () => {
  console.log(`Usage:
  npm run signing:update -- [options]

Options:
  --key-path <path>      Private key output path. Defaults to TAURI_SIGNING_PRIVATE_KEY_PATH or ~/.tauri/mytimes.key
  --password <value>     Private key password. Defaults to TAURI_SIGNING_PRIVATE_KEY_PASSWORD
  --public-key <value>   Skip key generation and only update src-tauri/tauri.conf.json pubkey
  --force                Overwrite an existing private key file
  --help                 Show this help

Examples:
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD='...' npm run signing:update -- --key-path "$HOME/.tauri/mytimes.key"
  npm run signing:update -- --public-key "dW50cnVzdGVk..."
`)
}

const run = (command, commandArgs) =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
      cwd: projectRoot,
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      stdout += text
      process.stdout.write(text)
    })

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      stderr += text
      process.stderr.write(text)
    })

    child.on('error', rejectPromise)
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr })
        return
      }

      rejectPromise(new Error(`${command} ${commandArgs.join(' ')} failed with code ${code}`))
    })
  })

const extractPublicKey = (output) => {
  const labeledMatch = output.match(/Public key:\s*([^\s]+)/i) ?? output.match(/Public:\s*([^\s]+)/i)
  if (labeledMatch?.[1]) return labeledMatch[1]

  const base64Match = output.match(/dW50cnVzdGVk[0-9A-Za-z+/=]+/)
  if (base64Match?.[0]) return base64Match[0]

  return ''
}

const generatePublicKey = async ({ keyPath, password, force }) => {
  if (!password) {
    throw new Error('TAURI_SIGNING_PRIVATE_KEY_PASSWORD または --password を指定してください')
  }

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const generateArgs = [
    'run',
    'tauri',
    '--',
    'signer',
    'generate',
    '--write-keys',
    keyPath,
    '--password',
    password,
    '--ci',
  ]

  if (force) {
    generateArgs.push('--force')
  }

  const { stdout, stderr } = await run(npmCommand, generateArgs)
  const publicKey = extractPublicKey(`${stdout}\n${stderr}`)

  if (!publicKey) {
    throw new Error('公開鍵を signer generate の出力から読み取れませんでした')
  }

  return publicKey
}

const updateTauriPubkey = async (publicKey) => {
  const config = JSON.parse(await readFile(tauriConfigPath, 'utf8'))
  const previousPubkey = config.plugins?.updater?.pubkey

  config.plugins ??= {}
  config.plugins.updater ??= {}
  config.plugins.updater.pubkey = publicKey

  await writeFile(tauriConfigPath, `${JSON.stringify(config, null, 2)}\n`)
  return previousPubkey
}

const main = async () => {
  if (hasFlag('--help')) {
    printHelp()
    return
  }

  const keyPath = readOption('--key-path') ?? process.env.TAURI_SIGNING_PRIVATE_KEY_PATH ?? defaultKeyPath
  const password = readOption('--password') ?? process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ?? ''
  const publicKeyOption = readOption('--public-key')
  const publicKey = publicKeyOption || await generatePublicKey({
    keyPath,
    password,
    force: hasFlag('--force'),
  })
  const previousPubkey = await updateTauriPubkey(publicKey)

  console.log('')
  console.log('updater 公開鍵を更新しました')
  console.log(`- file: src-tauri/tauri.conf.json`)
  console.log(`- previous pubkey: ${previousPubkey ?? '(none)'}`)
  console.log(`- next pubkey: ${publicKey}`)

  if (!publicKeyOption) {
    console.log('')
    console.log('GitHub Secrets の更新例:')
    console.log(`env -u GITHUB_TOKEN gh secret set TAURI_SIGNING_PRIVATE_KEY --repo sintaro-katuta/MyTimes < "${keyPath}"`)
    console.log('printf %s "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" | env -u GITHUB_TOKEN gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --repo sintaro-katuta/MyTimes')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
