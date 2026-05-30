import { createExtractorRegistry } from '../extractors/registry'
import type { SelectionArtifact, SelectionGeometry } from '../types'

const geometry: SelectionGeometry = {
  id: 'selection-1',
  path: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ],
  boundingBox: { x: 0, y: 0, width: 10, height: 10 },
  viewport: { width: 100, height: 100, scrollX: 0, scrollY: 0 },
  createdAt: '2026-05-30T00:00:00.000Z',
}

describe('createExtractorRegistry', () => {
  it('runs only semantic extractors in semantic mode', async () => {
    const artifact: SelectionArtifact = {
      id: 'artifact-1',
      kind: 'dom',
      label: '文本区域',
      geometry,
      summary: '文本区域',
      text: 'hello',
      testIds: [],
      roles: [],
    }
    const registry = createExtractorRegistry([
      {
        kind: 'dom',
        extract: jest.fn().mockResolvedValue([artifact]),
      },
      {
        kind: 'screenshot',
        extract: jest.fn().mockResolvedValue([]),
      },
    ])

    const result = await registry.extract(geometry, {
      mode: 'semantic',
      screenshotPolicy: 'never',
      screenshotDelivery: 'reference_only',
    })

    expect(result).toEqual([artifact])
  })

  it('runs screenshot extractor only on semantic miss when hybrid policy allows it', async () => {
    const screenshotArtifact: SelectionArtifact = {
      id: 'artifact-screenshot-1',
      kind: 'screenshot',
      label: '截图区域',
      geometry,
      summary: '截图区域',
      resourceId: 'selection://screenshot/1',
      delivery: 'reference_only',
    }
    const registry = createExtractorRegistry([
      {
        kind: 'dom',
        extract: jest.fn().mockResolvedValue([]),
      },
      {
        kind: 'screenshot',
        extract: jest.fn().mockResolvedValue([screenshotArtifact]),
      },
    ])

    const result = await registry.extract(geometry, {
      mode: 'hybrid',
      screenshotPolicy: 'on_extractor_miss',
      screenshotDelivery: 'reference_only',
    })

    expect(result).toEqual([screenshotArtifact])
  })
})
