import { createServer } from 'vite'

const server = await createServer({
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
})

try {
  await server.ssrLoadModule('/src/components/layout/WorkspaceShell.test.tsx')
} finally {
  await server.close()
}
