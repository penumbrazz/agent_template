import { NextResponse } from 'next/server'

import { getRuntimeConfigSync } from '@/lib/runtime-config'

export async function GET() {
  const config = getRuntimeConfigSync()
  return NextResponse.json({
    apiUrl: config.apiUrl,
    otelEnabled: config.otelEnabled,
    otelServiceName: config.otelServiceName,
    otelCollectorEndpoint: config.otelCollectorEndpoint,
    appVersion: config.appVersion,
  })
}
