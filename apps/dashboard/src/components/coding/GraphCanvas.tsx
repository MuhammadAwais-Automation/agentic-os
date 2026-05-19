'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as d3 from 'd3'
import { GraphData, GraphNode } from '@/lib/graphify'

interface GraphCanvasProps {
  graph: GraphData
  selectedNodeId?: string
  onSelectNode: (node: GraphNode) => void
}

export default function GraphCanvas({ graph, selectedNodeId, onSelectNode }: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const visibleGraph = useMemo(() => {
    const nodes = [...graph.nodes].sort((a, b) => b.connections - a.connections).slice(0, 300)
    const ids = new Set(nodes.map((node) => node.id))
    const edges = graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target))
    return { nodes, edges }
  }, [graph])

  useEffect(() => {
    const svg = d3.select(svgRef.current as SVGSVGElement)
    svg.selectAll('*').remove()
    if (!svgRef.current || !visibleGraph.nodes.length) return

    const width = svgRef.current.clientWidth || 760
    const height = 460
    const zoomLayer = svg.append('g')
    svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.25, 4]).on('zoom', (event) => {
      zoomLayer.attr('transform', event.transform)
    }))

    const nodes = visibleGraph.nodes.map((node) => ({ ...node }))
    const links = visibleGraph.edges.map((edge) => ({ source: edge.source, target: edge.target }))

    const simulation = d3.forceSimulation<any>(nodes)
      .force('link', d3.forceLink<any, any>(links).id((node) => node.id).distance(70).strength(0.35))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((node: any) => Math.max(8, Math.min(24, 5 + node.connections))))

    const link = zoomLayer.append('g')
      .attr('stroke', 'rgba(255,255,255,0.12)')
      .attr('stroke-width', 1)
      .selectAll('line')
      .data(links)
      .join('line')

    const color = d3.scaleOrdinal(d3.schemeTableau10)
    const dragBehavior = d3.drag<SVGCircleElement, any>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    const node = zoomLayer.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d) => Math.max(5, Math.min(18, 4 + d.connections)))
      .attr('fill', (d) => color(String(d.community)))
      .attr('stroke', (d) => d.id === selectedNodeId ? '#F59E0B' : 'rgba(255,255,255,0.45)')
      .attr('stroke-width', (d) => d.id === selectedNodeId ? 3 : 1)
      .style('cursor', 'pointer')
      .on('click', (_event, d) => onSelectNode(d))

    ;(node as any).call(dragBehavior)

    node.append('title').text((d) => `${d.label}\n${d.filePath}\n${d.connections} connections`)

    const label = zoomLayer.append('g')
      .selectAll('text')
      .data(nodes.filter((node) => node.connections >= 4).slice(0, 80))
      .join('text')
      .text((d) => d.label.slice(0, 28))
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', 9)
      .attr('fill', 'rgba(232,232,240,0.72)')
      .attr('pointer-events', 'none')

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)
      node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y)
      label.attr('x', (d: any) => d.x + 8).attr('y', (d: any) => d.y + 4)
    })

    return () => { simulation.stop() }
  }, [visibleGraph, selectedNodeId, onSelectNode])

  if (!graph.nodes.length) {
    return <div style={emptyStyle}>No graph nodes found yet.</div>
  }

  return (
    <svg ref={svgRef} viewBox="0 0 760 460" preserveAspectRatio="xMidYMid meet" style={{
      width: '100%',
      height: '460px',
      background: 'rgba(0,0,0,0.32)',
      border: '1px solid var(--border)',
      borderRadius: '3px',
    }} />
  )
}

const emptyStyle: React.CSSProperties = {
  height: '260px',
  display: 'grid',
  placeItems: 'center',
  border: '1px solid var(--border)',
  borderRadius: '3px',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
}
