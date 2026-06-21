import { readFile, writeFile } from 'node:fs/promises'

const CHECK_MODE = process.argv.includes('--check')

const paths = {
  packageJson: new URL('../package.json', import.meta.url),
  tauriConfig: new URL('../src-tauri/tauri.conf.json', import.meta.url),
  cargoToml: new URL('../src-tauri/Cargo.toml', import.meta.url),
}

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))

const updateCargoPackageVersion = (content, version) => {
  const packageSectionPattern = /(^\[package\][\s\S]*?^version\s*=\s*)"[^"]+"/m

  if (!packageSectionPattern.test(content)) {
    throw new Error('src-tauri/Cargo.toml の [package] version が見つかりません')
  }

  return content.replace(packageSectionPattern, `$1"${version}"`)
}

const main = async () => {
  const packageJson = await readJson(paths.packageJson)
  const version = packageJson.version

  if (!version) {
    throw new Error('package.json の version が見つかりません')
  }

  const tauriConfig = await readJson(paths.tauriConfig)
  const cargoToml = await readFile(paths.cargoToml, 'utf8')

  const nextTauriConfig = {
    ...tauriConfig,
    version,
  }
  const nextTauriConfigText = `${JSON.stringify(nextTauriConfig, null, 2)}\n`
  const currentTauriConfigText = await readFile(paths.tauriConfig, 'utf8')
  const nextCargoToml = updateCargoPackageVersion(cargoToml, version)

  const changedFiles = []

  if (currentTauriConfigText !== nextTauriConfigText) {
    changedFiles.push('src-tauri/tauri.conf.json')
  }

  if (cargoToml !== nextCargoToml) {
    changedFiles.push('src-tauri/Cargo.toml')
  }

  if (CHECK_MODE) {
    if (changedFiles.length > 0) {
      throw new Error(`アプリバージョンが package.json と同期されていません: ${changedFiles.join(', ')}`)
    }

    console.log(`アプリバージョンは ${version} で同期されています`)
    return
  }

  if (changedFiles.includes('src-tauri/tauri.conf.json')) {
    await writeFile(paths.tauriConfig, nextTauriConfigText)
  }

  if (changedFiles.includes('src-tauri/Cargo.toml')) {
    await writeFile(paths.cargoToml, nextCargoToml)
  }

  console.log(
    changedFiles.length > 0
      ? `アプリバージョンを ${version} に同期しました: ${changedFiles.join(', ')}`
      : `アプリバージョンは ${version} で同期済みです`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
