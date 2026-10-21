import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.DEALIO_MCP_URL || !process.env.DEALIO_MCP_TOKEN) {
    return NextResponse.json(
      { error: 'Missing DEALIO_MCP_URL or DEALIO_MCP_TOKEN environment variables.' },
      { status: 500 }
    )
  }

  const response = await (anthropic.beta.messages as any).create(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system:
        'You are a data retrieval assistant. Use the DealioDesk tools to fetch the requested data. Return ONLY a raw JSON object — no markdown, no code blocks, no explanation.',
      messages: [
        {
          role: 'user',
          content:
            'Call my_pipeline with scope "mine" and my_tasks with scope "mine". Return exactly this JSON: {"pipeline": <my_pipeline result>, "tasks": <my_tasks result>}',
        },
      ],
      mcp_servers: [
        {
          type: 'url',
          url: process.env.DEALIO_MCP_URL,
          authorization_token: process.env.DEALIO_MCP_TOKEN,
        },
      ],
    },
    { headers: { 'anthropic-beta': 'mcp-client-2025-04-04' } }
  )

  const text = (response.content as any[])
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  try {
    const data = JSON.parse(text)
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to parse DealioDesk response', raw: text }, { status: 500 })
  }
}
