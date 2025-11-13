"use client"

import { useCallback, useEffect } from "react"
import ReactFlow, {
  Node,
  Edge,
  Background,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  useReactFlow,
} from "reactflow"
import "reactflow/dist/style.css"
import { Cloud, Server, Database, Shield, Box, Globe } from "lucide-react"

const nodeTypes = {
  custom: ({ data }: { data: any }) => {
    return (
      <div className="px-4 py-3 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg min-w-[180px] relative cursor-move hover:border-white/40 transition-colors">
        <Handle
          id="left"
          type="target"
          position={Position.Left}
          style={{ background: "#ffffff", width: 8, height: 8 }}
        />
        <Handle
          id="right"
          type="source"
          position={Position.Right}
          style={{ background: "#ffffff", width: 8, height: 8 }}
        />
        <Handle
          id="top"
          type="target"
          position={Position.Top}
          style={{ background: "#ffffff", width: 8, height: 8 }}
        />
        <Handle
          id="bottom"
          type="source"
          position={Position.Bottom}
          style={{ background: "#ffffff", width: 8, height: 8 }}
        />
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/10 rounded-lg">
            {data.icon}
          </div>
          <div>
            <div className="text-white font-semibold text-sm">{data.label}</div>
            {data.subtitle && (
              <div className="text-white/60 text-xs">{data.subtitle}</div>
            )}
          </div>
        </div>
        {data.description && (
          <div className="text-white/70 text-xs mt-2 pt-2 border-t border-white/10">
            {data.description}
          </div>
        )}
      </div>
    )
  },
}

const initialNodes: Node[] = [
  {
    id: "user",
    type: "custom",
    position: { x: 50, y: 180 },
    data: {
      label: "User",
      subtitle: "Browser",
      icon: <Globe className="w-5 h-5 text-white" />,
      description: "Voice input via microphone",
    },
  },
  {
    id: "nextjs",
    type: "custom",
    position: { x: 350, y: 180 },
    data: {
      label: "Next.js App",
      subtitle: "Railway",
      icon: <Cloud className="w-5 h-5 text-white" />,
      description: "React frontend + API routes",
    },
  },
  {
    id: "whisper",
    type: "custom",
    position: { x: 650, y: 250 },
    data: {
      label: "Whisper Service",
      subtitle: "AWS EC2",
      icon: <Server className="w-5 h-5 text-white" />,
      description: "FastAPI + OpenAI Whisper",
    },
  },
  {
    id: "docker",
    type: "custom",
    position: { x: 650, y: 80 },
    data: {
      label: "Docker Container",
      subtitle: "Always-on",
      icon: <Box className="w-5 h-5 text-white" />,
      description: "Pre-loaded model in memory",
    },
  },
  {
    id: "security",
    type: "custom",
    position: { x: 900, y: 250 },
    data: {
      label: "Security Group",
      subtitle: "AWS",
      icon: <Shield className="w-5 h-5 text-white" />,
      description: "Port 8000 access control",
    },
  },
  {
    id: "database",
    type: "custom",
    position: { x: 350, y: 380 },
    data: {
      label: "PostgreSQL",
      subtitle: "Railway",
      icon: <Database className="w-5 h-5 text-white" />,
      description: "User data & transcriptions",
    },
  },
]

const initialEdges: Edge[] = [
  {
    id: "user-nextjs",
    source: "user",
    target: "nextjs",
    label: "HTTPS",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#ffffff", strokeWidth: 2 },
    labelStyle: { fill: "#ffffff", fontWeight: 600 },
    labelBgStyle: { fill: "#00000080", fillOpacity: 0.8 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#ffffff",
    },
  },
  {
    id: "nextjs-whisper",
    source: "nextjs",
    target: "whisper",
    label: "WebSocket",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#ffffff", strokeWidth: 2 },
    labelStyle: { fill: "#ffffff", fontWeight: 600 },
    labelBgStyle: { fill: "#00000080", fillOpacity: 0.8 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#ffffff",
    },
  },
  {
    id: "docker-whisper",
    source: "docker",
    sourceHandle: "bottom",
    target: "whisper",
    targetHandle: "top",
    label: "Runs on",
    type: "smoothstep",
    style: { stroke: "#ffffff60", strokeWidth: 1.5 },
    labelStyle: { fill: "#ffffff80", fontWeight: 500 },
    labelBgStyle: { fill: "#00000060", fillOpacity: 0.6 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#ffffff60",
    },
  },
  {
    id: "security-whisper",
    source: "security",
    sourceHandle: "left",
    target: "whisper",
    targetHandle: "right",
    label: "Protects",
    type: "smoothstep",
    style: { stroke: "#ffffff60", strokeWidth: 1.5 },
    labelStyle: { fill: "#ffffff80", fontWeight: 500 },
    labelBgStyle: { fill: "#00000060", fillOpacity: 0.6 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#ffffff60",
    },
  },
  {
    id: "nextjs-database",
    source: "nextjs",
    target: "database",
    label: "Prisma ORM",
    type: "smoothstep",
    animated: true,
    style: { stroke: "#ffffff", strokeWidth: 2 },
    labelStyle: { fill: "#ffffff", fontWeight: 600 },
    labelBgStyle: { fill: "#00000080", fillOpacity: 0.8 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#ffffff",
    },
  },
]

function FlowContent() {
  const { fitView } = useReactFlow()

  useEffect(() => {
    // Fit view after nodes are rendered to ensure proper layout
    const timer = setTimeout(() => {
      fitView({ 
        padding: 0.3, 
        duration: 500,
        includeHiddenNodes: false,
        minZoom: 0.5,
        maxZoom: 1.2
      })
    }, 150)

    return () => clearTimeout(timer)
  }, [fitView])

  return null
}

export function ArchitectureDiagram() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onInit = useCallback((reactFlowInstance: any) => {
    // Fit view on initialization
    setTimeout(() => {
      reactFlowInstance.fitView({ 
        padding: 0.3, 
        duration: 500,
        includeHiddenNodes: false 
      })
    }, 100)
  }, [])

  const proOptions = { hideAttribution: true }

  return (
    <div className="w-full h-[500px] md:h-[600px] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        nodeTypes={nodeTypes}
        proOptions={proOptions}
        fitView
        fitViewOptions={{ padding: 0.3, duration: 500 }}
        className="bg-transparent"
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={[1, 2]}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background color="#ffffff20" gap={16} size={1} />
        <FlowContent />
      </ReactFlow>
    </div>
  )
}

