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

const expandHomePath = (value) => {
  if (!value.startsWith('~')) return value
  if (value === '~') return homedir()
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return resolve(homedir(), value.slice(2))
  }
  return value
}

const resolveFromProject = (value) => {
  const expanded = expandHomePath(value)
  return resolve(projectRoot, expanded)
}

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
  --public-key <value>   Skip key generation and only update src-tauri/tauri.conf.json pubkey
  --force                Overwrite an existing private key file
  --help                 Show this help

Examples:
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD='...' npm run signing:update -- --key-path "$HOME/.tauri/mytimes.key"
  npm run signing:update -- --public-key "dW50cnVzdGVk..."
`)
}

const redactArgs = (commandArgs) =>
  commandArgs.map((arg, index) => commandArgs[index - 1] === '--password' ? '<redacted>' : arg)

const run = (command, commandArgs, options = {}) =>
  new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, commandArgs, {
      cwd: projectRoot,
      env: {
        ...process.env,
        ...options.env,
      },
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

      rejectPromise(new Error(`${command} ${redactArgs(commandArgs).join(' ')} failed with code ${code}`))
    })
  })

const extractPublicKey = (output) => {
  const labeledMatch = output.match(/^Public key:\s*(.+)$/im) ?? output.match(/^Public:\s*(.+)$/im)
  if (labeledMatch?.[1]) return labeledMatch[1]

  const base64Match = output.match(/dW50cnVzdGVk[0-9A-Za-z+/=]+/)
  if (base64Match?.[0]) return base64Match[0]

  return ''
}

const isPublicKeyPath = (value) =>
  /\.pub$/i.test(value) ||
  value.startsWith('/') ||
  value.startsWith('./') ||
  value.startsWith('../') ||
  value.startsWith('~') ||
  /^[A-Za-z]:[\\/]/.test(value)

const resolvePublicKey = async (value) => {
  if (!value) return ''

  if (!isPublicKeyPath(value)) {
    return value
  }

  const publicKeyPath = resolveFromProject(value)
  return (await readFile(publicKeyPath, 'utf8')).trim()
}

const generatePublicKey = async ({ keyPath, password, force }) => {
  if (!password) {
    throw new Error('TAURI_SIGNING_PRIVATE_KEY_PASSWORD を指定してください')
  }

  const resolvedKeyPath = resolveFromProject(keyPath)
  const tauriCommand = resolve(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'tauri.cmd' : 'tauri')
  const generateArgs = [
    'signer',
    'generate',
    '--write-keys',
    resolvedKeyPath,
    '--password',
    password,
    '--ci',
  ]

  if (force) {
    generateArgs.push('--force')
  }

  const { stdout, stderr } = await run(tauriCommand, generateArgs)
  const generatedPublicKeyPath = `${resolvedKeyPath}.pub`
  const publicKey = await resolvePublicKey(generatedPublicKeyPath)
    .catch(async () => resolvePublicKey(extractPublicKey(`${stdout}\n${stderr}`)))

  if (!publicKey) {
    throw new Error('公開鍵を signer generate の出力から読み取れませんでした')
  }

  return { publicKey, keyPath: resolvedKeyPath }
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
  const password = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ?? ''
  const publicKeyOption = await resolvePublicKey(readOption('--public-key'))
  const generated = publicKeyOption
    ? { publicKey: publicKeyOption, keyPath: resolveFromProject(keyPath) }
    : await generatePublicKey({
      keyPath,
      password,
      force: hasFlag('--force'),
    })
  const publicKey = generated.publicKey
  const previousPubkey = await updateTauriPubkey(publicKey)

  console.log('')
  console.log('updater 公開鍵を更新しました')
  console.log(`- file: src-tauri/tauri.conf.json`)
  console.log(`- previous pubkey: ${previousPubkey ?? '(none)'}`)
  console.log(`- next pubkey: ${publicKey}`)

  if (!publicKeyOption) {
    console.log('')
    console.log('GitHub Secrets の更新例:')
    console.log('unset GITHUB_TOKEN')
    console.log(`gh secret set TAURI_SIGNING_PRIVATE_KEY --repo sintaro-katuta/MyTimes < "${generated.keyPath}"`)
    console.log('printf %s "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" | gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --repo sintaro-katuta/MyTimes')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
