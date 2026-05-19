'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { BRIDGE_WS, getToken } from '@/lib/constants'
import { ProjectRecord } from '@/lib/projects'
import { AgentRun } from '@/lib/runs'
import { GraphData, GraphNode, GraphifyStatusResponse } from '@/lib/graphify'
import { CatalogAttachment, listPromptAttachments, recordCatalogUsage, removeCatalogAttachment } from '@/lib/catalog'
import GlowCard from '@/components/ui/GlowCard'
import Badge from '@/components/ui/Badge'
import PageFrame from '@/components/ui/PageFrame'
import PageHeader from '@/components/ui/PageHeader'
import GraphCanvas from '@/components/coding/GraphCanvas'
import GraphExplorer from '@/components/coding/GraphExplorer'
import GraphReportViewer from '@/components/coding/GraphReportViewer'
import GraphifyPanel, { loadGraphifyAssets } from '@/components/coding/GraphifyPanel'
import ProjectSelector from '@/components/coding/ProjectSelector'
import ProjectSummary from '@/components/coding/ProjectSummary'
import RunHistoryPanel from '@/components/coding/RunHistoryPanel'
import RunReplay from '@/components/coding/RunReplay'
import PromptAttachmentPanel from '@/components/catalog/PromptAttachmentPanel'

const TerminalPane = dynamic(() => import('@/components/coding/TerminalPane'), { ssr: false })

type Provider = 'powershell' | 'claude' | 'codex'

export default function CodingPage() {
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null)
  const [provider, setProvider] = useState<Provider>('powershell')
  const [graphifyStatus, setGraphifyStatus] = useState<GraphifyStatusResponse | null>(null)
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] })
  const [selectedGraphNode, setSelectedGraphNode] = useState<GraphNode | null>(null)
  const [graphReport, setGraphReport] = useState('')
  const [graphHtml, setGraphHtml] = useState('')
  const [graphManifest, setGraphManifest] = useState<unknown>(null)
  const [promptAttachments, setPromptAttachments] = useState<CatalogAttachment[]>([])
  const [prompt, setPrompt] = useState('')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [historyRefresh, setHistoryRefresh] = useState(0)
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const projectPath = activeProject?.path || ''

  const loadProjectContext = (project: ProjectRecord) => {
    setActiveProject(project)
    setSelectedRun(null)
    setSelectedGraphNode(null)
    setGraph({ nodes: [], edges: [] })
    setGraphReport('')
    setGraphHtml('')
    setGraphManifest(null)
    setHistoryRefresh((value) => value + 1)
  }

  const runPrompt = () => {
    if (!prompt.trim() || running || provider === 'powershell' || !projectPath) return
    setRunning(true)
    setOutput('')
    const attachmentContext = promptAttachments.length
      ? `Use these selected workflow helpers if relevant:\n${promptAttachments.map((attachment) => `- ${attachment.item.kind}: ${attachment.item.name}`).join('\n')}\n\n`
      : ''
    const promptWithAttachments = `${attachmentContext}${prompt.trim()}`
    const token = getToken()
    const wsPath = provider === 'codex' ? '/ws/codex' : '/ws/claude'
    const ws = new WebSocket(`${BRIDGE_WS}${wsPath}`)
    wsRef.current = ws
    ws.onopen = () => {
      ws.send(JSON.stringify({ token, prompt: promptWithAttachments, projectPath }))
      for (const attachment of promptAttachments) {
        void recordCatalogUsage(attachment.item.id, activeProject?.id).catch(() => undefined)
      }
    }
    ws.onmessage = e => {
      let msg: { type: string; data: string }
      try {
        msg = JSON.parse(e.data) as { type: string; data: string }
      } catch {
        setOutput(prev => prev + e.data)
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
        return
      }
      if (msg.type === 'stdout' || msg.type === 'stderr') {
        setOutput(prev => prev + msg.data)
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
      }
      if (msg.type === 'done' || msg.type === 'error') {
        if (msg.type === 'error') setOutput(prev => prev + msg.data)
        setRunning(false)
        ws.close()
      }
    }
    ws.onerror = () => { setRunning(false); setOutput(prev => prev + '\n[connection error]') }
    ws.onclose = () => setRunning(false)
  }

  useEffect(() => () => { wsRef.current?.close() }, [])

  useEffect(() => {
    if (!activeProject?.id) return
    loadGraphifyAssets(activeProject.id)
      .then(({ report, html, manifest }) => {
        setGraphReport(report)
        setGraphHtml(html)
        setGraphManifest(manifest)
      })
      .catch(() => {
        setGraphReport('')
        setGraphHtml('')
        setGraphManifest(null)
      })
  }, [activeProject?.id, graphifyStatus?.updatedAt])

  useEffect(() => {
    if (!activeProject?.id) {
      setPromptAttachments([])
      return
    }
    listPromptAttachments(activeProject.id)
      .then(setPromptAttachments)
      .catch(() => setPromptAttachments([]))
  }, [activeProject?.id])

  const removePromptAttachment = async (id: number) => {
    await removeCatalogAttachment(id)
    if (activeProject?.id) {
      setPromptAttachments(await listPromptAttachments(activeProject.id))
    }
  }

  return (
    <PageFrame className="fade-up">
      <PageHeader
        kicker="LOCAL AGENT WORKSPACE"
        title="COMMAND CENTER"
        subtitle="Managed projects, live terminal, Graphify context, prompt attachments, and run replay."
      />

      <GlowCard color="amber" style={{ padding: '16px 20px' }}>
        <ProjectSelector activeProject={activeProject} onProjectChange={loadProjectContext} />
      </GlowCard>

      <div className="two-column-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <GlowCard color="teal" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'end', marginBottom: '14px' }}>
              <label style={{ minWidth: '220px' }}>
                <div style={labelStyle}>RUNNER</div>
                <select value={provider} onChange={e => setProvider(e.target.value as Provider)} style={{ width: '100%' }}>
                  <option value="powershell">PowerShell</option>
                  <option value="claude">Claude Code</option>
                  <option value="codex">Codex CLI</option>
                </select>
              </label>
              {activeProject && (
                <Badge label={(graphifyStatus?.status || activeProject.graphifyStatus).toUpperCase()} color={(graphifyStatus?.status || activeProject.graphifyStatus) === 'ready' ? 'teal' : (graphifyStatus?.status || activeProject.graphifyStatus) === 'stale' ? 'amber' : (graphifyStatus?.status || activeProject.graphifyStatus) === 'failed' ? 'red' : 'muted'} />
              )}
            </div>
            <TerminalPane
              projectId={activeProject?.id}
              projectPath={projectPath}
              provider={provider}
              onRunStarted={() => setHistoryRefresh((value) => value + 1)}
              onRunClosed={() => setHistoryRefresh((value) => value + 1)}
            />
          </GlowCard>

          <GlowCard color="purple" style={{ padding: '16px 20px' }}>
            <RunReplay run={selectedRun} />
          </GlowCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <GlowCard color="amber" style={{ padding: '16px 20px' }}>
            <div style={sectionTitle}>PROJECT SUMMARY</div>
            <ProjectSummary project={activeProject} graphNodes={graph.nodes.length} graphEdges={graph.edges.length} />
          </GlowCard>

          <GlowCard color="teal" style={{ padding: '16px 20px' }}>
            <RunHistoryPanel
              projectId={activeProject?.id}
              refreshKey={historyRefresh}
              selectedRunId={selectedRun?.id}
              onSelect={setSelectedRun}
            />
          </GlowCard>
        </div>
      </div>

      <GlowCard color="teal" style={{ padding: '16px 20px' }}>
        <div className="two-column-grid">
          <div>
            <div style={{ ...labelStyle, marginBottom: '10px' }}>
              KNOWLEDGE GRAPH - {graph.nodes.length} NODES / {graph.edges.length} EDGES
            </div>
            <GraphCanvas graph={graph} selectedNodeId={selectedGraphNode?.id} onSelectNode={setSelectedGraphNode} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <GraphifyPanel
              projectId={activeProject?.id}
              onGraphLoaded={(nextGraph) => {
                setGraph(nextGraph)
                if (!selectedGraphNode && nextGraph.nodes.length) setSelectedGraphNode(nextGraph.nodes[0])
              }}
              onStatusLoaded={setGraphifyStatus}
              onRunFinished={() => setHistoryRefresh((value) => value + 1)}
            />
            <GraphExplorer graph={graph} selectedNode={selectedGraphNode} onSelectNode={setSelectedGraphNode} />
          </div>
        </div>
      </GlowCard>

      <GlowCard color="purple" style={{ padding: '16px 20px' }}>
        <div style={{ ...labelStyle, marginBottom: '10px' }}>GRAPHIFY REPORTS</div>
        <GraphReportViewer report={graphReport} html={graphHtml} manifest={graphManifest} />
      </GlowCard>

      <GlowCard color="purple" style={{ padding: '16px 20px' }}>
        <div style={labelStyle}>
          ONE-SHOT {provider === 'codex' ? 'CODEX' : provider === 'claude' ? 'CLAUDE' : 'AGENT'} PROMPT
        </div>
        <div style={{ marginTop: '10px', marginBottom: '10px' }}>
          <PromptAttachmentPanel attachments={promptAttachments} onRemove={removePromptAttachment} />
        </div>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={!projectPath ? 'Select or add a project first...' : provider === 'powershell' ? 'Select Claude or Codex for one-shot prompt mode...' : `Ask ${provider} something about your project...`}
          rows={3}
          disabled={provider === 'powershell' || !projectPath}
          style={{ resize: 'vertical', marginBottom: '10px', marginTop: '10px' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {running && (
            <button onClick={() => { wsRef.current?.close(); setRunning(false) }} style={secondaryButton('red')}>STOP</button>
          )}
          <button onClick={runPrompt} disabled={running || !prompt.trim() || provider === 'powershell' || !projectPath} style={primaryButton('purple')}>
            {running ? 'RUNNING...' : 'RUN'}
          </button>
        </div>

        {output && (
          <div ref={outputRef} style={{
            marginTop: '14px', padding: '14px', background: 'rgba(0,0,0,0.5)',
            borderRadius: '3px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)',
            maxHeight: '320px', overflow: 'auto', whiteSpace: 'pre-wrap',
            lineHeight: 1.7, border: '1px solid var(--border)',
          }}>
            {output}
            {running && <span style={{ color: 'var(--amber)' }}>|</span>}
          </div>
        )}
      </GlowCard>
    </PageFrame>
  )
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  color: 'var(--text-muted)',
  letterSpacing: '0.14em',
}

const sectionTitle: React.CSSProperties = {
  ...labelStyle,
  marginBottom: '10px',
}

function primaryButton(color: 'purple'): React.CSSProperties {
  return {
    padding: '7px 18px',
    border: '1px solid var(--purple)',
    borderRadius: '3px',
    background: 'rgba(139,92,246,0.1)',
    color: 'var(--purple)',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    letterSpacing: '0.1em',
    cursor: 'pointer',
  }
}

function secondaryButton(color: 'teal' | 'red'): React.CSSProperties {
  const cssVar = color === 'teal' ? 'var(--teal)' : '#ef4444'
  return {
    padding: '6px 12px',
    border: `1px solid ${color === 'teal' ? 'rgba(20,184,166,0.4)' : 'rgba(239,68,68,0.4)'}`,
    borderRadius: '2px',
    background: 'transparent',
    color: cssVar,
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.1em',
    cursor: 'pointer',
  }
}
