import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    deployment: 'v2-with-reports-fix',
    commit: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    message: 'Reports page fixes deployed'
  });
}
