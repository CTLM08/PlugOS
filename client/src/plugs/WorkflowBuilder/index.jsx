import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
  MarkerType,
  useUpdateNodeInternals
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Icon } from '@iconify/react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import useBodyScrollLock from '../../hooks/useBodyScrollLock';

// ============ Custom Node Components ============

function StartNode({ data }) {
  return (
    <div className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 border-2 border-emerald-400 shadow-lg shadow-emerald-500/20 min-w-[100px] text-center">
      <div className="flex items-center justify-center gap-2">
        <Icon icon="mdi:play-circle" className="w-5 h-5 text-white" />
        <span className="text-sm font-semibold text-white">{data.label || 'Start'}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-400 !w-3 !h-3" />
    </div>
  );
}

function EndNode({ data }) {
  return (
    <div className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-600 to-red-600 border-2 border-rose-400 shadow-lg shadow-rose-500/20 min-w-[100px] text-center">
      <Handle type="target" position={Position.Top} className="!bg-rose-400 !w-3 !h-3" />
      <div className="flex items-center justify-center gap-2">
        <Icon icon="mdi:stop-circle" className="w-5 h-5 text-white" />
        <span className="text-sm font-semibold text-white">{data.label || 'End'}</span>
      </div>
    </div>
  );
}

function TaskNode({ data, selected }) {
  const priorityColors = {
    Urgent: 'border-red-500 bg-red-500/10',
    High: 'border-orange-500 bg-orange-500/10',
    Medium: 'border-rose-500 bg-rose-500/10',
    Low: 'border-gray-500 bg-gray-500/10'
  };
  
  const statusColors = {
    'To Do': 'text-rose-400',
    'In Progress': 'text-blue-400',
    'Review': 'text-purple-400',
    'Completed': 'text-green-400'
  };

  return (
    <div className={`px-4 py-3 rounded-xl bg-[#1e1e1e] border-2 shadow-xl min-w-[180px] transition-all ${
      selected ? 'border-teal-400 shadow-teal-500/30' : 'border-[#3a3a3a] hover:border-teal-500/50'
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-teal-400 !w-3 !h-3" />
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0">
          <Icon icon="mdi:clipboard-check" className="w-4 h-4 text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{data.label || 'Task'}</p>
          {data.task ? (
            <>
              <p className="text-[10px] text-[#a0a0a0] truncate mt-0.5">{data.task.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[9px] font-medium ${statusColors[data.task.status] || 'text-gray-400'}`}>
                  {data.task.status}
                </span>
                {data.task.priority && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${priorityColors[data.task.priority] || ''}`}>
                    {data.task.priority}
                  </span>
                )}
              </div>
            </>
          ) : (
            <p className="text-[10px] text-[#666] mt-0.5">No task linked</p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-teal-400 !w-3 !h-3" />
    </div>
  );
}

function DecisionNode({ data, selected }) {
  // Default branches if none set
  const branches = data.branches || [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' }
  ];
  
  const branchCount = branches.length;
  const size = 120; // Base size
  const center = size / 2;
  const radius = size / 2 - 15;
  
  // Calculate polygon points based on branch count
  const getPolygonPoints = () => {
    const sides = Math.max(branchCount, 3); // Minimum triangle
    const points = [];
    const angleOffset = -Math.PI / 2; // Start from top
    
    for (let i = 0; i < sides; i++) {
      const angle = angleOffset + (2 * Math.PI * i) / sides;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  };
  
  // Get vertex position for handles and labels
  const getVertexPosition = (index) => {
    const sides = Math.max(branchCount, 3);
    const angleOffset = -Math.PI / 2;
    const angle = angleOffset + (2 * Math.PI * index) / sides;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
      angle: angle
    };
  };
  
  // Get label position (outside the polygon)
  const getLabelPosition = (index) => {
    const sides = Math.max(branchCount, 3);
    const angleOffset = -Math.PI / 2;
    const angle = angleOffset + (2 * Math.PI * index) / sides;
    const labelRadius = radius + 25;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle)
    };
  };
  
  // Shape names for display
  const shapeNames = {
    2: 'Diamond',
    3: 'Triangle',
    4: 'Square',
    5: 'Pentagon',
    6: 'Hexagon',
    7: 'Heptagon',
    8: 'Octagon'
  };

  return (
    <div 
      className={`relative transition-all ${selected ? 'scale-105' : ''}`} 
      style={{ width: size + 60, height: size + 60 }}
    >
      {/* Input handle at top */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-amber-400 !w-3 !h-3"
        style={{ left: '50%', top: 0 }}
      />
      
      {/* SVG Polygon - pointer-events none so handles are clickable */}
      <svg 
        width={size + 60} 
        height={size + 60} 
        className="absolute inset-0 pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={`gradient-${data.label || 'decision'}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Polygon shape */}
        <g transform={`translate(30, 30)`}>
          <polygon
            points={getPolygonPoints()}
            fill={`url(#gradient-${data.label || 'decision'})`}
            stroke={selected ? '#fcd34d' : '#f59e0b'}
            strokeWidth={selected ? 3 : 2}
            filter={selected ? 'url(#glow)' : ''}
          />
          
          {/* Center label */}
          <text
            x={center}
            y={center - 8}
            textAnchor="middle"
            className="text-xs font-semibold fill-white"
          >
            {data.label || 'Decision'}
          </text>
          <text
            x={center}
            y={center + 8}
            textAnchor="middle"
            className="text-[10px] fill-white/70"
          >
            {shapeNames[branchCount] || `${branchCount}-gon`}
          </text>
        </g>
        
        {/* Branch labels at vertices */}
        <g transform={`translate(30, 30)`}>
          {branches.map((branch, idx) => {
            const pos = getLabelPosition(idx);
            return (
              <g key={branch.id}>
                {/* Connection line */}
                <line
                  x1={getVertexPosition(idx).x}
                  y1={getVertexPosition(idx).y}
                  x2={pos.x}
                  y2={pos.y}
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="2,2"
                  opacity={0.5}
                />
                {/* Label background */}
                <rect
                  x={pos.x - 25}
                  y={pos.y - 8}
                  width={50}
                  height={16}
                  rx={8}
                  fill="#1e1e1e"
                  stroke="#f59e0b"
                  strokeWidth={1}
                />
                {/* Label text */}
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  className="text-[10px] font-medium fill-amber-400"
                >
                  {branch.label.length > 6 ? branch.label.slice(0, 6) + '..' : branch.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      
      {/* Output handles at each vertex */}
      {branches.map((branch, idx) => {
        const pos = getVertexPosition(idx);
        return (
          <Handle
            key={`source-${idx}`}
            type="source"
            position={Position.Bottom}
            id={`branch-${idx}`}
            className="!bg-amber-400 !w-3 !h-3 !border-2 !border-amber-200"
            style={{
              position: 'absolute',
              left: pos.x + 30,
              top: pos.y + 30,
              transform: 'translate(-50%, -50%)',
              zIndex: 50
            }}
            isConnectable={true}
          />
        );
      })}
    </div>
  );
}

// Note Node - Editable text block for annotations
function NoteNode({ data, selected }) {
  return (
    <div 
      className={`relative min-w-[180px] max-w-[280px] transition-all ${selected ? 'scale-105' : ''}`}
    >
      {/* Input handle */}
      <Handle type="target" position={Position.Top} className="!bg-purple-400 !w-3 !h-3" />
      
      {/* Note card */}
      <div 
        className="p-4 bg-gradient-to-br from-purple-900/80 to-violet-900/80 border-2 rounded-xl shadow-xl"
        style={{
          borderColor: selected ? '#a855f7' : 'rgba(168, 85, 247, 0.4)',
          boxShadow: selected ? '0 0 20px rgba(168, 85, 247, 0.3)' : 'none'
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <Icon icon="mdi:note-text" className="w-4 h-4 text-purple-300" />
          <span className="text-xs font-semibold text-purple-200">
            {data.label || 'Note'}
          </span>
        </div>
        
        {/* Note content */}
        <div className="text-sm text-white/90 whitespace-pre-wrap break-words">
          {data.content || 'Click to add note...'}
        </div>
      </div>
      
      {/* Output handle */}
      <Handle type="source" position={Position.Bottom} className="!bg-purple-400 !w-3 !h-3" />
    </div>
  );
}

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  task: TaskNode,
  decision: DecisionNode,
  note: NoteNode
};

// ============ Main Component ============

function WorkflowBuilderInner() {
  const { currentOrg, isManager, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data state
  const [workflows, setWorkflows] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  // React Flow state
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  
  // UI state
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'editor'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNodePanel, setShowNodePanel] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showTaskLinkModal, setShowTaskLinkModal] = useState(false);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  
  // React Flow hook for updating node handle positions
  const updateNodeInternals = useUpdateNodeInternals();

  // Permissions
  const canManage = isAdmin || isManager;

  // Fetch initial data
  useEffect(() => {
    if (currentOrg) {
      fetchWorkflows();
      fetchTasks();
    }
  }, [currentOrg]);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/workflows/org/${currentOrg.id}`);
      setWorkflows(res.data);
    } catch (err) {
      console.error('Fetch workflows error:', err);
      setError('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await api.get(`/tasks/org/${currentOrg.id}`);
      setTasks(res.data);
    } catch (err) {
      console.error('Fetch tasks error:', err);
    }
  };

  const loadWorkflow = async (workflow) => {
    try {
      const res = await api.get(`/workflows/org/${currentOrg.id}/${workflow.id}`);
      setSelectedWorkflow(res.data);
      setNodes(res.data.nodes || []);
      setEdges(res.data.edges || []);
      setViewMode('editor');
    } catch (err) {
      setError('Failed to load workflow');
    }
  };

  // React Flow handlers
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({
      ...params,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#14b8a6' },
      style: { stroke: '#14b8a6', strokeWidth: 2 },
      animated: true
    }, eds)),
    []
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setShowNodePanel(true);
    setContextMenu(null);
  }, []);

  // Right-click handlers
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'node',
      node
    });
    setSelectedNode(node);
  }, []);

  const onEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'edge',
      edge
    });
    setSelectedEdge(edge);
  }, []);

  const onPaneContextMenu = useCallback((event) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type: 'pane',
      position: { x: event.clientX, y: event.clientY }
    });
  }, []);

  const onPaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);


  // Add node at specific position
  const addNodeAtPosition = useCallback((type, position) => {
    const id = `${type}-${Date.now()}`;
    const defaultLabels = {
      start: 'Start',
      end: 'End',
      task: 'New Task',
      decision: 'Decision'
    };
    
    const newNode = {
      id,
      type,
      position,
      data: { label: defaultLabels[type] }
    };
    
    setNodes((nds) => [...nds, newNode]);
  }, []);

  // Add new node
  const addNode = useCallback((type) => {
    const id = `${type}-${Date.now()}`;
    const defaultLabels = {
      start: 'Start',
      end: 'End',
      task: 'New Task',
      decision: 'Decision',
      note: 'Note'
    };
    
    const newNode = {
      id,
      type,
      position: { x: 250 + Math.random() * 100, y: 100 + nodes.length * 80 },
      data: { label: defaultLabels[type] }
    };
    
    setNodes((nds) => [...nds, newNode]);
  }, [nodes.length]);

  // Save workflow
  const saveWorkflow = async () => {
    if (!selectedWorkflow) return;
    
    try {
      await api.put(`/workflows/org/${currentOrg.id}/${selectedWorkflow.id}`, {
        nodes,
        edges
      });
      setSuccess('Workflow saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save workflow');
    }
  };

  // Create new workflow
  const createWorkflow = async (name, description) => {
    try {
      const res = await api.post(`/workflows/org/${currentOrg.id}`, {
        name,
        description,
        nodes: [
          { id: 'start-1', type: 'start', position: { x: 250, y: 50 }, data: { label: 'Start' } },
          { id: 'end-1', type: 'end', position: { x: 250, y: 300 }, data: { label: 'End' } }
        ],
        edges: []
      });
      setShowCreateModal(false);
      fetchWorkflows();
      loadWorkflow(res.data);
      setSuccess('Workflow created!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to create workflow');
    }
  };

  // Delete workflow
  const deleteWorkflow = async (workflowId, e) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      await api.delete(`/workflows/org/${currentOrg.id}/${workflowId}`);
      setSuccess('Workflow deleted!');
      fetchWorkflows();
      if (selectedWorkflow?.id === workflowId) {
        setSelectedWorkflow(null);
        setViewMode('list');
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete workflow');
    }
  };

  // Update node data
  const updateNodeData = useCallback((nodeId, newData) => {
    // Check if branches are being updated (for decision nodes)
    const isBranchUpdate = newData.branches !== undefined;
    
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
    
    // Also update selectedNode if it's the one being edited
    setSelectedNode((prev) => {
      if (prev && prev.id === nodeId) {
        return { ...prev, data: { ...prev.data, ...newData } };
      }
      return prev;
    });
    
    // If branches changed, update node internals to recalculate handle positions
    if (isBranchUpdate) {
      // Use setTimeout to ensure state is updated before recalculating
      setTimeout(() => {
        updateNodeInternals(nodeId);
      }, 0);
    }
  }, [updateNodeInternals]);

  // Delete node
  const deleteNode = useCallback((nodeId) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setShowNodePanel(false);
    setSelectedNode(null);
  }, []);

  // Context menu action handler (must be after deleteNode)
  const handleContextMenuAction = useCallback((action) => {
    if (action === 'delete-node' && contextMenu?.node) {
      deleteNode(contextMenu.node.id);
    } else if (action === 'delete-edge' && contextMenu?.edge) {
      setEdges((eds) => eds.filter((e) => e.id !== contextMenu.edge.id));
    } else if (action.startsWith('add-')) {
      const type = action.replace('add-', '');
      const reactflowBounds = document.querySelector('.react-flow')?.getBoundingClientRect();
      if (reactflowBounds) {
        const x = contextMenu.x - reactflowBounds.left;
        const y = contextMenu.y - reactflowBounds.top;
        addNodeAtPosition(type, { x, y });
      }
    }
    setContextMenu(null);
  }, [contextMenu, deleteNode, addNodeAtPosition]);

  // Link task to node
  const linkTaskToNode = useCallback((task) => {
    if (!selectedNode) return;
    updateNodeData(selectedNode.id, { task, label: task.title });
    setShowTaskLinkModal(false);
  }, [selectedNode, updateNodeData]);

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center border border-teal-500/30">
            <Icon icon="mdi:sitemap" className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Workflow Builder</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              {viewMode === 'list' ? 'Create visual workflows for your tasks' : selectedWorkflow?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {viewMode === 'editor' && (
            <>
              <button
                onClick={() => { setViewMode('list'); setSelectedWorkflow(null); }}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-teal-500/30 transition-all flex items-center gap-2"
              >
                <Icon icon="mdi:arrow-left" className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={saveWorkflow}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-teal-900/20 flex items-center gap-2"
              >
                <Icon icon="mdi:content-save" className="w-4 h-4" />
                Save
              </button>
            </>
          )}
          {viewMode === 'list' && canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-teal-900/20 active:scale-[0.98]"
            >
              <Icon icon="mdi:plus" className="w-5 h-5" />
              New Workflow
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="animate-item mb-6 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:alert-circle" className="w-5 h-5" />
            {error}
          </div>
          <button onClick={() => setError('')} className="hover:text-red-300 transition-colors">
            <Icon icon="mdi:close" className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="animate-item mb-6 bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <Icon icon="mdi:check-circle" className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'list' ? (
        // Workflow List View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-24">
              <Icon icon="mdi:loading" className="w-10 h-10 text-teal-500 animate-spin" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="w-20 h-20 bg-teal-500/10 text-teal-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon icon="mdi:sitemap" className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold mb-2">No workflows yet</h3>
              <p className="text-[var(--color-text-muted)] max-w-sm mx-auto mb-6">
                Create your first workflow to visualize task dependencies and processes.
              </p>
              {canManage && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 px-5 rounded-xl transition-all"
                >
                  <Icon icon="mdi:plus" className="w-5 h-5" />
                  Create Workflow
                </button>
              )}
            </div>
          ) : (
            workflows.map((workflow, idx) => (
              <div
                key={workflow.id}
                onClick={() => loadWorkflow(workflow)}
                className="animate-item bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 cursor-pointer hover:border-teal-500/40 hover:shadow-lg hover:shadow-teal-500/5 transition-all group"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Icon icon="mdi:sitemap" className="w-5 h-5 text-teal-400" />
                  </div>
                  {canManage && (
                    <button
                      onClick={(e) => deleteWorkflow(workflow.id, e)}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                    >
                      <Icon icon="mdi:delete" className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <h3 className="font-semibold text-lg mb-1">{workflow.name}</h3>
                <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mb-4">
                  {workflow.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
                  <span className="flex items-center gap-1">
                    <Icon icon="mdi:vector-polyline" className="w-3.5 h-3.5" />
                    {workflow.node_count || 0} nodes
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon icon="mdi:clipboard-check" className="w-3.5 h-3.5" />
                    {workflow.task_count || 0} tasks
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // Editor View
        <div className="flex gap-4 h-[calc(100vh-200px)]">
          {/* Node Palette */}
          <div className="w-48 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-2">Add Nodes</h4>
            {[
              { type: 'start', icon: 'mdi:play-circle', label: 'Start', color: 'emerald' },
              { type: 'end', icon: 'mdi:stop-circle', label: 'End', color: 'rose' },
              { type: 'task', icon: 'mdi:clipboard-check', label: 'Task', color: 'teal' },
              { type: 'decision', icon: 'mdi:help-rhombus', label: 'Decision', color: 'amber' },
              { type: 'note', icon: 'mdi:note-text', label: 'Note', color: 'purple' }
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => addNode(item.type)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--color-border)] hover:border-${item.color}-500/50 hover:bg-${item.color}-500/10 transition-all text-left`}
              >
                <div className={`w-8 h-8 rounded-lg bg-${item.color}-500/20 flex items-center justify-center`}>
                  <Icon icon={item.icon} className={`w-4 h-4 text-${item.color}-400`} />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-[#0f0f0f] border border-[var(--color-border)] rounded-2xl overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onNodeContextMenu={onNodeContextMenu}
              onEdgeContextMenu={onEdgeContextMenu}
              onPaneContextMenu={onPaneContextMenu}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              fitView
              defaultEdgeOptions={{
                markerEnd: { type: MarkerType.ArrowClosed, color: '#14b8a6' },
                style: { stroke: '#14b8a6', strokeWidth: 2 }
              }}
            >
              <Background color="#333" gap={20} />
              <MiniMap 
                nodeColor={(node) => {
                  const colors = { start: '#10b981', end: '#f43f5e', task: '#14b8a6', decision: '#f59e0b', note: '#a855f7' };
                  return colors[node.type] || '#666';
                }}
                className="!bg-[#1a1a1a] !border-[#333] !rounded-xl"
              />
            </ReactFlow>
            
            {/* Context Menu */}
            {contextMenu && (
              <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                type={contextMenu.type}
                onAction={handleContextMenuAction}
                onClose={() => setContextMenu(null)}
              />
            )}
          </div>

          {/* Node Properties Panel */}
          {showNodePanel && selectedNode && (
            <div className="w-72 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">Node Properties</h4>
                <button
                  onClick={() => setShowNodePanel(false)}
                  className="p-1 hover:bg-[var(--color-bg-elevated)] rounded-lg transition-colors"
                >
                  <Icon icon="mdi:close" className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4 flex-1">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Label</label>
                  <input
                    type="text"
                    value={selectedNode.data?.label || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                    className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl text-sm"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Type</label>
                  <div className="px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl text-sm capitalize">
                    {selectedNode.type}
                  </div>
                </div>

                {selectedNode.type === 'task' && (
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)] mb-1 block">Linked Task</label>
                    {selectedNode.data?.task ? (
                      <div className="px-3 py-2 bg-teal-500/10 border border-teal-500/30 rounded-xl text-sm">
                        <p className="font-medium text-teal-400 truncate">{selectedNode.data.task.title}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{selectedNode.data.task.status}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowTaskLinkModal(true)}
                        className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-dashed border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-muted)] hover:border-teal-500/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Icon icon="mdi:link-plus" className="w-4 h-4" />
                        Link Task
                      </button>
                    )}
                  </div>
                )}

                {/* Decision Node Branches Editor */}
                {selectedNode.type === 'decision' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-[var(--color-text-muted)]">Decision Branches</label>
                      <button
                        onClick={() => {
                          const branches = selectedNode.data?.branches || [
                            { id: 'yes', label: 'Yes' },
                            { id: 'no', label: 'No' }
                          ];
                          const newId = `branch-${Date.now()}`;
                          updateNodeData(selectedNode.id, {
                            branches: [...branches, { id: newId, label: `Option ${branches.length + 1}` }]
                          });
                        }}
                        className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors flex items-center gap-1"
                      >
                        <Icon icon="mdi:plus" className="w-3 h-3" />
                        Add
                      </button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(selectedNode.data?.branches || [
                        { id: 'yes', label: 'Yes' },
                        { id: 'no', label: 'No' }
                      ]).map((branch, idx) => (
                        <div key={branch.id} className="flex gap-2">
                          <input
                            type="text"
                            value={branch.label}
                            onChange={(e) => {
                              const branches = [...(selectedNode.data?.branches || [
                                { id: 'yes', label: 'Yes' },
                                { id: 'no', label: 'No' }
                              ])];
                              branches[idx] = { ...branches[idx], label: e.target.value };
                              updateNodeData(selectedNode.id, { branches });
                            }}
                            className="flex-1 px-2 py-1.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg text-sm"
                            placeholder="Branch name"
                          />
                          {(selectedNode.data?.branches?.length || 2) > 2 && (
                            <button
                              onClick={() => {
                                const branches = (selectedNode.data?.branches || []).filter((_, i) => i !== idx);
                                updateNodeData(selectedNode.id, { branches });
                              }}
                              className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                            >
                              <Icon icon="mdi:close" className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-2">Min 2 branches required</p>
                  </div>
                )}

                {/* Note Content Editor */}
                {selectedNode.type === 'note' && (
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-2">Note Content</label>
                    <textarea
                      value={selectedNode.data?.content || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { content: e.target.value })}
                      placeholder="Enter your notes here..."
                      className="w-full px-3 py-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                      rows={5}
                    />
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-2">Add annotations or comments</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="mt-4 w-full px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
              >
                <Icon icon="mdi:delete" className="w-4 h-4" />
                Delete Node
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <CreateWorkflowModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createWorkflow}
        />
      )}

      {/* Task Link Modal */}
      {showTaskLinkModal && (
        <TaskLinkModal
          tasks={tasks}
          onClose={() => setShowTaskLinkModal(false)}
          onSelect={linkTaskToNode}
        />
      )}
    </>
  );
}

// ============ Sub Components ============

function CreateWorkflowModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  
  useBodyScrollLock(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onCreate(name, description);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-overlay" onClick={onClose} />
      <div className="relative bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-md p-6 animate-modal-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">New Workflow</h3>
          <button onClick={onClose} className="p-2 hover:bg-[var(--color-bg-elevated)] rounded-xl transition-colors">
            <Icon icon="mdi:close" className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-[var(--color-text-muted)] mb-2 block">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Onboarding Process"
              className="w-full px-4 py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-[var(--color-text-muted)] mb-2 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional workflow description..."
              rows={3}
              className="w-full px-4 py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-[var(--color-border)] rounded-xl font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Icon icon="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon icon="mdi:plus" className="w-4 h-4" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskLinkModal({ tasks, onClose, onSelect }) {
  const [search, setSearch] = useState('');
  
  useBodyScrollLock(true);

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-modal-overlay" onClick={onClose} />
      <div className="relative bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg p-6 animate-modal-slide-up max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Link Task</h3>
          <button onClick={onClose} className="p-2 hover:bg-[var(--color-bg-elevated)] rounded-xl transition-colors">
            <Icon icon="mdi:close" className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-4">
          <Icon icon="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredTasks.length === 0 ? (
            <p className="text-center text-[var(--color-text-muted)] py-8">No tasks found</p>
          ) : (
            filteredTasks.map(task => (
              <button
                key={task.id}
                onClick={() => onSelect(task)}
                className="w-full p-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-xl text-left hover:border-teal-500/50 transition-colors"
              >
                <p className="font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-muted)]">
                  <span>{task.status}</span>
                  <span>•</span>
                  <span>{task.priority}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Context Menu Component
function ContextMenu({ x, y, type, onAction, onClose }) {
  useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  const menuItems = {
    node: [
      { icon: 'mdi:delete', label: 'Delete Node', action: 'delete-node', color: 'text-red-400' }
    ],
    edge: [
      { icon: 'mdi:link-off', label: 'Delete Connection', action: 'delete-edge', color: 'text-red-400' }
    ],
    pane: [
      { icon: 'mdi:play-circle', label: 'Add Start', action: 'add-start', color: 'text-emerald-400' },
      { icon: 'mdi:stop-circle', label: 'Add End', action: 'add-end', color: 'text-rose-400' },
      { icon: 'mdi:clipboard-check', label: 'Add Task', action: 'add-task', color: 'text-teal-400' },
      { icon: 'mdi:help-rhombus', label: 'Add Decision', action: 'add-decision', color: 'text-amber-400' },
      { icon: 'mdi:note-text', label: 'Add Note', action: 'add-note', color: 'text-purple-400' }
    ]
  };

  const items = menuItems[type] || [];

  return (
    <div
      className="fixed z-50 bg-[#1e1e1e] border border-[var(--color-border)] rounded-xl shadow-2xl py-1 min-w-[180px] animate-modal-slide-up"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {type === 'pane' && (
        <div className="px-3 py-1.5 text-[10px] uppercase text-[var(--color-text-muted)] font-semibold border-b border-[var(--color-border)] mb-1">
          Add Node
        </div>
      )}
      {items.map((item) => (
        <button
          key={item.action}
          onClick={() => onAction(item.action)}
          className="w-full px-3 py-2 flex items-center gap-3 hover:bg-[var(--color-bg-elevated)] transition-colors text-left"
        >
          <Icon icon={item.icon} className={`w-4 h-4 ${item.color}`} />
          <span className="text-sm">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// Wrapper component to provide ReactFlow context for hooks
export default function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  );
}
