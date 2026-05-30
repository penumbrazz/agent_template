import type {
  SelectionArtifact,
  SelectionArtifactKind,
  SelectionContextPolicy,
  SelectionGeometry,
} from '../types'

export interface SelectionExtractor {
  kind: SelectionArtifactKind
  extract: (geometry: SelectionGeometry) => Promise<SelectionArtifact[]>
}

export function createExtractorRegistry(extractors: SelectionExtractor[]) {
  async function extract(
    geometry: SelectionGeometry,
    policy: SelectionContextPolicy,
  ): Promise<SelectionArtifact[]> {
    const semanticKinds = new Set<SelectionArtifactKind>([
      'dom',
      'table',
      'chart',
    ])
    const shouldRunScreenshot =
      policy.mode === 'screenshot' ||
      (policy.mode === 'hybrid' && policy.screenshotPolicy === 'always')

    const activeExtractors = extractors.filter((extractor) => {
      if (policy.mode === 'semantic') {
        return semanticKinds.has(extractor.kind)
      }
      if (policy.mode === 'screenshot') {
        return extractor.kind === 'screenshot'
      }
      return semanticKinds.has(extractor.kind) || shouldRunScreenshot
    })

    const semanticResults = (
      await Promise.all(
        activeExtractors.map((extractor) => extractor.extract(geometry)),
      )
    ).flat()

    if (
      policy.mode === 'hybrid' &&
      policy.screenshotPolicy === 'on_extractor_miss' &&
      semanticResults.length === 0
    ) {
      const screenshotExtractor = extractors.find(
        (extractor) => extractor.kind === 'screenshot',
      )
      return screenshotExtractor ? screenshotExtractor.extract(geometry) : []
    }

    return semanticResults
  }

  return { extract }
}
