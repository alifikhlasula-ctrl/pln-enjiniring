'use client'
import React, { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey'
import { Edit2, RefreshCcw, Maximize2, Settings2, HelpCircle } from 'lucide-react'

// Constants
const MARGIN = { top: 40, right: 120, bottom: 40, left: 120 }
const MIN_NODE_HEIGHT = 15

export default function SankeyDashboard({ rawData }) {
  const containerRef = useRef(null)
  const svgRef = useRef(null)
  const [width, setWidth] = useState(1000)
  const [height, setHeight] = useState(600)
  
  // Simulation State
  const [simulationMode, setSimulationMode] = useState(false)
  const [simData, setSimData] = useState([])
  const [editingNode, setEditingNode] = useState(null)

  // Initialize simulation data from rawData
  useEffect(() => {
    if (!simulationMode) {
      setSimData(JSON.parse(JSON.stringify(rawData || [])))
    }
  }, [rawData, simulationMode])

  // Responsive dimensions
  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width } = entries[0].contentRect
        setWidth(width)
        // Dynamic height based on number of categories
        const numDepts = rawData?.length || 0
        setHeight(Math.max(600, numDepts * 40))
      }
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [rawData])

  // D3 Render Effect
  useEffect(() => {
    if (!svgRef.current || !simData.length || width === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove() // Clear previous

    const innerWidth = width - MARGIN.left - MARGIN.right
    const innerHeight = height - MARGIN.top - MARGIN.bottom

    // 1. Data Processing for Sankey
    const nodesMap = new Map()
    const links = []

    const addNode = (id, cat, extra = {}) => {
      if (!nodesMap.has(id)) nodesMap.set(id, { id, category: cat, ...extra })
    }

    addNode('Akan Masuk', 'source')
    addNode('Aktif', 'target')
    addNode('Akan Keluar', 'target')
    addNode('Selesai', 'target')

    simData.forEach(d => {
      // Create node for each department
      addNode(d.bidang, 'bidang', d)
      
      const vMasuk = d.masukCount || 0
      const vKeluar = d.keluarCount || 0
      const vSelesai = d.selesaiCount || 0
      const vAktif = Math.max(0, d.active - vKeluar) // Active staying long term

      if (vMasuk > 0) links.push({ source: 'Akan Masuk', target: d.bidang, value: vMasuk })
      if (vAktif > 0) links.push({ source: d.bidang, target: 'Aktif', value: vAktif })
      if (vKeluar > 0) links.push({ source: d.bidang, target: 'Akan Keluar', value: vKeluar })
      if (vSelesai > 0) links.push({ source: d.bidang, target: 'Selesai', value: vSelesai })
      
      // Handle isolated nodes (Sankey needs at least a dummy link to render properly)
      if (vMasuk === 0 && vAktif === 0 && vKeluar === 0 && vSelesai === 0) {
        // Add a tiny dummy link to force rendering if user wants to see 0-capacity nodes
        links.push({ source: d.bidang, target: 'Aktif', value: 0.001, isDummy: true })
      }
    })

    const graphData = {
      nodes: Array.from(nodesMap.values()),
      links: links
    }

    // Node id mapping for d3-sankey
    const nodeIndex = new Map(graphData.nodes.map((d, i) => [d.id, i]))
    graphData.links.forEach(l => {
      l.source = nodeIndex.get(l.source)
      l.target = nodeIndex.get(l.target)
    })

    // 2. Sankey Layout Initialization
    const sankeyLayout = sankey()
      .nodeId(d => d.index)
      .nodeAlign(sankeyJustify)
      .nodeWidth(200) // Wide nodes for Bullet Chart
      .nodePadding(30)
      .extent([[0, 0], [innerWidth, innerHeight]])

    let sankeyGraph
    try {
      sankeyGraph = sankeyLayout(graphData)
    } catch (e) {
      console.error("Sankey Layout Error:", e)
      return
    }

    // 3. Zoom Container (Google Maps Style LOD)
    const gMain = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
    
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (e) => {
        gMain.attr('transform', `translate(${e.transform.x + MARGIN.left},${e.transform.y + MARGIN.top}) scale(${e.transform.k})`)
        
        // LOD Logic: Fade links based on zoom scale
        const lodOpacity = Math.min(0.6, Math.max(0.05, (e.transform.k - 0.5) * 1.5))
        gMain.selectAll('.link-path').style('opacity', d => d.isDummy ? 0 : lodOpacity)
      })

    svg.call(zoom)

    // 4. Draw Links
    const linkGroup = gMain.append('g').attr('class', 'links')
    const pathGenerator = sankeyLinkHorizontal()

    const linkPaths = linkGroup.selectAll('path')
      .data(sankeyGraph.links)
      .join('path')
      .attr('class', 'link-path')
      .attr('d', pathGenerator)
      .style('fill', 'none')
      .style('stroke', d => {
        if (d.isDummy) return 'transparent'
        const t = d.target.category === 'target' ? d.target.id : d.target.category
        if (t === 'Aktif') return '#3b82f6'
        if (t === 'Akan Keluar') return '#ef4444'
        if (t === 'Selesai') return '#22c55e'
        return 'url(#gradient-' + d.source.index + '-' + d.target.index + ')'
      })
      .style('stroke-opacity', d => d.isDummy ? 0 : 0.3)
      .style('stroke-width', d => Math.max(1, d.width))

    // Gradients for links
    const defs = svg.append('defs')
    sankeyGraph.links.forEach(d => {
      if(d.isDummy) return
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${d.source.index}-${d.target.index}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', d.source.x1).attr('x2', d.target.x0)
        
      gradient.append('stop').attr('offset', '0%').attr('stop-color', '#a855f7')
      gradient.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6')
    })

    // Hover Interaction for Links
    linkPaths
      .on('mouseenter', function() { d3.select(this).style('stroke-opacity', 0.8) })
      .on('mouseleave', function() { d3.select(this).style('stroke-opacity', 0.3) })

    // 5. Draw Nodes
    const nodeGroup = gMain.append('g').attr('class', 'nodes')
    
    const nodes = nodeGroup.selectAll('g.node')
      .data(sankeyGraph.nodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .style('cursor', d => d.category === 'bidang' ? 'pointer' : 'default')
      .on('click', (event, d) => {
        if (simulationMode && d.category === 'bidang') {
          setEditingNode(d)
        }
      })

    // Node Backgrounds
    nodes.append('rect')
      .attr('height', d => Math.max(MIN_NODE_HEIGHT, d.y1 - d.y0))
      .attr('width', d => d.x1 - d.x0)
      .attr('rx', 6)
      .style('fill', d => {
        if (d.category === 'source') return 'rgba(168, 85, 247, 0.15)'
        if (d.category === 'target') return 'rgba(59, 130, 246, 0.15)'
        return 'var(--bg-card)'
      })
      .style('stroke', d => {
        if (d.category === 'source') return '#a855f7'
        if (d.category === 'target') return '#3b82f6'
        return d.overCapacity ? '#ef4444' : 'var(--border)'
      })
      .style('stroke-width', 2)
      .style('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))')

    // Node Labels (Smart Labeling Setup)
    const labels = nodes.append('text')
      .attr('x', d => d.category === 'source' ? -10 : d.category === 'target' ? (d.x1 - d.x0) + 10 : 10)
      .attr('y', d => d.category === 'bidang' ? 15 : (d.y1 - d.y0) / 2)
      .attr('dy', d => d.category === 'bidang' ? 0 : '0.35em')
      .attr('text-anchor', d => d.category === 'source' ? 'end' : d.category === 'target' ? 'start' : 'start')
      .style('font-size', d => d.category === 'bidang' ? '12px' : '14px')
      .style('font-weight', 'bold')
      .style('fill', 'var(--text-primary)')
      .style('pointer-events', 'none')
      .text(d => d.id)

    // 6. Bullet Charts inside 'Bidang' Nodes
    const bidangNodes = nodes.filter(d => d.category === 'bidang')
    
    // Calculate Bullet max width
    const bulletWidth = sankeyLayout.nodeWidth() - 20
    
    bidangNodes.each(function(d) {
      const g = d3.select(this)
      const h = Math.max(MIN_NODE_HEIGHT, d.y1 - d.y0)
      
      if (h < 40) return // Hide bullet if node is too compressed vertically

      // Max scale for bullet
      const maxVal = Math.max(d.quota || 0, d.active + (d.masukCount || 0)) * 1.2 || 10
      const scaleX = d3.scaleLinear().domain([0, maxVal]).range([0, bulletWidth])

      // Background Track
      g.append('rect')
        .attr('x', 10).attr('y', 25).attr('width', bulletWidth).attr('height', 8)
        .attr('rx', 4).style('fill', 'var(--bg-main)')

      // Capacity Bar
      const totalCapacity = d.active + (d.masukCount || 0)
      const color = d.overCapacity ? '#ef4444' : '#22c55e'
      
      g.append('rect')
        .attr('x', 10).attr('y', 25).attr('width', scaleX(totalCapacity)).attr('height', 8)
        .attr('rx', 4).style('fill', color)

      // Quota Line (Target)
      if (d.quota > 0) {
        g.append('line')
          .attr('x1', 10 + scaleX(d.quota)).attr('y1', 21)
          .attr('x2', 10 + scaleX(d.quota)).attr('y2', 37)
          .style('stroke', '#fff').style('stroke-width', 2)
      }

      // Stats Text
      g.append('text')
        .attr('x', 10).attr('y', 45)
        .style('font-size', '10px').style('fill', 'var(--text-muted)')
        .text(`Aktif: ${d.active} | Masuk: ${d.masukCount} | Quota: ${d.quota || '∞'}`)
    })

    // 7. Fisheye Zoom (Hover Expand)
    nodes.on('mouseenter.fisheye', function(event, d) {
      d3.select(this).transition().duration(200)
        .attr('transform', `translate(${d.x0 - 5},${d.y0 - 5}) scale(1.05)`)
      d3.select(this).select('rect').style('filter', 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))')
    })
    .on('mouseleave.fisheye', function(event, d) {
      d3.select(this).transition().duration(200)
        .attr('transform', `translate(${d.x0},${d.y0}) scale(1)`)
      d3.select(this).select('rect').style('filter', 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))')
    })

    // 8. Force Collision Detection for Labels (Micro d3-force)
    // Only apply force to source/target labels if they overlap
    const labelNodes = []
    labels.each(function(d) {
      if (d.category !== 'bidang') {
        const bbox = this.getBBox()
        labelNodes.push({ id: d.id, x: 0, y: d.y0 + d.y1 / 2, width: bbox.width, height: bbox.height, element: this })
      }
    })

    const simulation = d3.forceSimulation(labelNodes)
      .force('collide', d3.forceCollide().radius(d => d.height / 2 + 5).iterations(2))
      .force('y', d3.forceY(d => d.y).strength(1))
      .stop()

    for (let i = 0; i < 50; i++) simulation.tick()

    labelNodes.forEach(d => {
      d3.select(d.element)
        .transition().duration(300)
        .attr('y', d.y)
    })

  }, [simData, width, height, simulationMode])

  // Handlers for Simulation
  const handleUpdateSim = (e) => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const newMasuk = parseInt(fd.get('masukCount')) || 0
    const newQuota = parseInt(fd.get('quota')) || 0
    
    setSimData(prev => prev.map(d => {
      if (d.bidang === editingNode.bidang) {
        const updated = { ...d, masukCount: newMasuk, quota: newQuota }
        updated.overCapacity = updated.quota > 0 && (updated.active + updated.masukCount) > updated.quota
        return updated
      }
      return d
    }))
    setEditingNode(null)
  }

  return (
    <div style={{ background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
      
      {/* Dashboard Header */}
      <div style={{ padding:'1.5rem', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.02)' }}>
        <div>
          <h2 style={{ margin:0, fontSize:'1.2rem', display:'flex', alignItems:'center', gap:10 }}>
            <RefreshCcw size={20} color="var(--primary)" /> Hybrid Sankey-Bullet Analytics
          </h2>
          <p style={{ margin:'4px 0 0', fontSize:'0.85rem', color:'var(--text-muted)' }}>
            Visualisasi pergerakan talent. {simulationMode ? 'Mode Simulasi Aktif.' : 'Gunakan scroll untuk zoom in/out.'}
          </p>
        </div>
        <button 
          onClick={() => {
            setSimulationMode(!simulationMode)
            if (simulationMode) setEditingNode(null)
          }}
          style={{ 
            padding:'8px 16px', background: simulationMode ? '#ef4444' : 'var(--primary)', color:'#fff', 
            border:'none', borderRadius:8, fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', gap:8 
          }}
        >
          {simulationMode ? <><RefreshCcw size={16} /> Akhiri Simulasi</> : <><Edit2 size={16} /> Mode Simulasi</>}
        </button>
      </div>

      {/* Main Graph Area */}
      <div ref={containerRef} style={{ width:'100%', height:'600px', position:'relative', background:'var(--bg-main)' }}>
        <svg ref={svgRef} width="100%" height="100%" style={{ cursor: simulationMode ? 'crosshair' : 'grab' }} />
        
        {/* Simulation Floating Panel */}
        {simulationMode && editingNode && (
          <div style={{ position:'absolute', top:20, right:20, background:'var(--bg-card)', padding:'1.5rem', borderRadius:12, border:'1px solid var(--primary)', boxShadow:'0 10px 25px rgba(0,0,0,0.5)', width:300, zIndex:10 }}>
            <h3 style={{ margin:'0 0 1rem', fontSize:'1rem' }}>Edit Simulasi: {editingNode.bidang}</h3>
            <form onSubmit={handleUpdateSim} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div>
                <label style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Proyeksi Masuk Baru</label>
                <input name="masukCount" type="number" defaultValue={editingNode.masukCount} style={{ width:'100%', padding:'8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-main)', color:'#fff', marginTop:4 }} />
              </div>
              <div>
                <label style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>Sesuaikan Kuota</label>
                <input name="quota" type="number" defaultValue={editingNode.quota} style={{ width:'100%', padding:'8px', borderRadius:6, border:'1px solid var(--border)', background:'var(--bg-main)', color:'#fff', marginTop:4 }} />
              </div>
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button type="submit" style={{ flex:1, padding:'8px', background:'var(--primary)', color:'#fff', border:'none', borderRadius:6, cursor:'pointer' }}>Terapkan</button>
                <button type="button" onClick={() => setEditingNode(null)} style={{ flex:1, padding:'8px', background:'var(--bg-main)', color:'var(--text-muted)', border:'1px solid var(--border)', borderRadius:6, cursor:'pointer' }}>Batal</button>
              </div>
            </form>
          </div>
        )}

        {/* Info Legend */}
        <div style={{ position:'absolute', bottom:20, left:20, display:'flex', gap:16, background:'var(--bg-card)', padding:'8px 16px', borderRadius:8, border:'1px solid var(--border)', fontSize:'0.75rem', fontWeight:'bold' }}>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><div style={{ width:10, height:10, background:'#a855f7', borderRadius:2 }}/> Sumber Masuk</span>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><div style={{ width:10, height:10, background:'#3b82f6', borderRadius:2 }}/> Aktif & Stabil</span>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><div style={{ width:10, height:10, background:'#ef4444', borderRadius:2 }}/> Akan Keluar (60 Hr)</span>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><div style={{ width:10, height:10, background:'#22c55e', borderRadius:2 }}/> Selesai / Alumni</span>
          <span style={{ display:'flex', alignItems:'center', gap:6, marginLeft:10, color:'var(--text-muted)' }}><Maximize2 size={12}/> Scroll to Zoom</span>
        </div>
      </div>
    </div>
  )
}
