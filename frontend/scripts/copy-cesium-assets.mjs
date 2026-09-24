import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, 'node_modules/cesium/Build/Cesium')
const target = resolve(root, 'public/cesium')

rmSync(target, { recursive: true, force: true })
mkdirSync(target, { recursive: true })

for (const folder of ['Assets', 'ThirdParty', 'Widgets', 'Workers']) {
  cpSync(resolve(source, folder), resolve(target, folder), {
    recursive: true,
  })
}
