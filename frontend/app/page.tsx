"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Layers, 
  Camera, 
  Activity, 
  ShieldAlert, 
  Cpu, 
  Upload, 
  Plus, 
  Folder, 
  Play, 
  StopCircle, 
  RefreshCw, 
  Sliders, 
  CheckCircle2, 
  X,
  FileSpreadsheet,
  AlertTriangle,
  UserCheck
} from "lucide-react";

// Types
interface AuditLog {
  id: string;
  user: string;
  role: string;
  action: string;
  target: string;
  timestamp: string;
  ip: string;
}

interface ImageItem {
  id: number;
  filename: string;
  url: string;
  status: "unlabelled" | "labelled";
  annotations: { label: string; bbox: number[] }[];
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "label" | "train" | "deployment" | "audit">("overview");
  
  // App State
  const [projects, setProjects] = useState([
    { id: 1, name: "Obra Yard AI-CWDAS", description: "Wagon damage detection and OCR text extraction", datasets: 1, models: 2 },
    { id: 2, name: "Biosel Solar Panel Quality", description: "Micro-crack detection in PV cells via EL imaging", datasets: 1, models: 1 }
  ]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(1);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  // Labeling Canvas State
  const [images, setImages] = useState<ImageItem[]>([
    { 
      id: 1, 
      filename: "freight_wagon_01.jpg", 
      url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop", 
      status: "unlabelled",
      annotations: [] 
    },
    { 
      id: 2, 
      filename: "freight_wagon_02.jpg", 
      url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=600&auto=format&fit=crop", 
      status: "labelled",
      annotations: [{ label: "bent_stanchion", bbox: [0.15, 0.3, 0.25, 0.4] }] 
    },
    {
      id: 3,
      filename: "freight_wagon_03.jpg",
      url: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=600&auto=format&fit=crop",
      status: "unlabelled",
      annotations: []
    }
  ]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [selectedClass, setSelectedClass] = useState("broken_door");
  const [points, setPoints] = useState<{x: number, y: number}[]>([]);
  const [loadingSAM, setLoadingSAM] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Training State
  const [epochs, setEpochs] = useState(30);
  const [batchSize, setBatchSize] = useState(16);
  const [modelSize, setModelSize] = useState("nano");
  const [trainingStatus, setTrainingStatus] = useState<"idle" | "training" | "completed">("idle");
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [epochLoss, setEpochLoss] = useState<number[]>([]);
  const [epochmAP, setEpochmAP] = useState<number[]>([]);

  // Inference Simulator State
  const [rtspUrl, setRtspUrl] = useState("rtsp://admin:railways123@10.201.44.80:554/stream1");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamAlerts, setStreamAlerts] = useState<{ id: string; time: string; type: string; details: string; conf: number }[]>([]);
  const [mockVideoFrameIndex, setMockVideoFrameIndex] = useState(0);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    { id: "LOG-9821", user: "Aditya Shah", role: "admin", action: "CREATE_PROJECT", target: "Project: Obra Yard AI-CWDAS", timestamp: "2026-07-29 12:05:12", ip: "192.168.1.52" },
    { id: "LOG-9820", user: "Labeler Worker 1", role: "labeler", action: "ADD_ANNOTATION", target: "Image: freight_wagon_02.jpg", timestamp: "2026-07-29 11:42:30", ip: "192.168.1.109" },
    { id: "LOG-9819", user: "Aditya Shah", role: "admin", action: "REGISTER_USER", target: "User: engineering-lead@bxt.com", timestamp: "2026-07-29 10:15:00", ip: "192.168.1.52" }
  ]);

  // Log custom actions to audit trace
  const addAuditLog = (action: string, target: string, user = "Aditya Shah", role = "admin") => {
    const newLog: AuditLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      user,
      role,
      action,
      target,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      ip: "192.168.1.52"
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Create Project
  const handleCreateProject = () => {
    if (!newProjectName) return;
    const newProj = {
      id: projects.length + 1,
      name: newProjectName,
      description: newProjectDesc,
      datasets: 1,
      models: 0
    };
    setProjects([...projects, newProj]);
    addAuditLog("CREATE_PROJECT", `Project: ${newProjectName}`);
    setNewProjectName("");
    setNewProjectDesc("");
    setShowNewProjectModal(false);
  };

  // SAM click-to-label simulation
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (loadingSAM) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Get normalized click coordinates (0 to 1)
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    setPoints([...points, { x: clickX, y: clickY }]);
    setLoadingSAM(true);

    // Call local mockup endpoint of SAM
    setTimeout(() => {
      // Simulate SAM bounding return box centering around the click
      const w = 0.22;
      const h = 0.22;
      const bbox = [Math.max(0, clickX - w/2), Math.max(0, clickY - h/2), w, h];
      
      const updatedImages = [...images];
      updatedImages[selectedImageIndex].annotations.push({
        label: selectedClass,
        bbox: bbox
      });
      updatedImages[selectedImageIndex].status = "labelled";
      
      setImages(updatedImages);
      setLoadingSAM(false);
      addAuditLog("ADD_ANNOTATION", `Image: ${images[selectedImageIndex].filename} (SAM bounding)`);
    }, 600);
  };

  // Redraw canvas image & annotations
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = images[selectedImageIndex].url;
    img.onload = () => {
      // Set canvas dimension based on container width
      canvas.width = 600;
      canvas.height = 400;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Draw existing annotations
      images[selectedImageIndex].annotations.forEach(ann => {
        const [x, y, w, h] = ann.bbox;
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 3;
        ctx.strokeRect(x * canvas.width, y * canvas.height, w * canvas.width, h * canvas.height);
        
        // Draw Class Tag
        ctx.fillStyle = "#3b82f6";
        ctx.font = "bold 12px sans-serif";
        const textWidth = ctx.measureText(ann.label).width;
        ctx.fillRect(x * canvas.width, (y * canvas.height) - 20, textWidth + 12, 20);
        
        ctx.fillStyle = "#ffffff";
        ctx.fillText(ann.label, (x * canvas.width) + 6, (y * canvas.height) - 6);
      });

      // Draw active clicks
      points.forEach(pt => {
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Border ring
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 8, 0, 2 * Math.PI);
        ctx.stroke();
      });
    };
  }, [images, selectedImageIndex, points]);

  // Clear current points and boxes
  const clearAnnotations = () => {
    const updatedImages = [...images];
    updatedImages[selectedImageIndex].annotations = [];
    updatedImages[selectedImageIndex].status = "unlabelled";
    setImages(updatedImages);
    setPoints([]);
    addAuditLog("CLEAR_ANNOTATIONS", `Image: ${images[selectedImageIndex].filename}`);
  };

  // Mock Model Training loop
  const triggerTraining = () => {
    if (trainingStatus === "training") return;
    setTrainingStatus("training");
    setTrainingProgress(0);
    setEpochLoss([]);
    setEpochmAP([]);
    addAuditLog("TRIGGER_TRAINING", `Model size: ${modelSize}, Epochs: ${epochs}`);
  };

  useEffect(() => {
    if (trainingStatus !== "training") return;
    
    let currentEpoch = 0;
    const interval = setInterval(() => {
      currentEpoch += 1;
      const progress = Math.min(100, Math.floor((currentEpoch / epochs) * 100));
      setTrainingProgress(progress);
      
      // Simulating metrics improving
      const simulatedLoss = 0.5 - (0.4 * (currentEpoch / epochs)) + (Math.random() * 0.05);
      const simulatedmAP = 0.4 + (0.48 * (currentEpoch / epochs)) - (Math.random() * 0.02);
      
      setEpochLoss(prev => [...prev, simulatedLoss]);
      setEpochmAP(prev => [...prev, simulatedmAP]);

      if (currentEpoch >= epochs) {
        clearInterval(interval);
        setTrainingStatus("completed");
        addAuditLog("FINISH_TRAINING", `Model validation mAP50: ${simulatedmAP.toFixed(3)}`);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [trainingStatus, epochs]);

  // RTSP Stream Simulator Loop
  useEffect(() => {
    if (!isStreaming) return;
    
    const interval = setInterval(() => {
      setMockVideoFrameIndex(prev => (prev + 1) % 4);
      
      // Simulate randomly detecting a wagon damage event
      if (Math.random() > 0.85) {
        const damageTypes = ["broken_door", "bent_stanchion", "hole_in_wagon_side"];
        const wagonNumbers = ["SECR-992381", "CR-440291", "WR-102948", "ER-901842"];
        const detectedDamage = damageTypes[Math.floor(Math.random() * damageTypes.length)];
        const wagonNum = wagonNumbers[Math.floor(Math.random() * wagonNumbers.length)];
        const confidence = parseFloat((0.74 + Math.random() * 0.2).toFixed(2));
        
        const newAlert = {
          id: `ALRT-${Math.floor(1000 + Math.random() * 9000)}`,
          time: new Date().toLocaleTimeString(),
          type: detectedDamage,
          details: `Wagon ${wagonNum} detected at examination gantry`,
          conf: confidence
        };
        setStreamAlerts(prev => [newAlert, ...prev].slice(0, 10)); // Limit to last 10 alerts
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  return (
    <div className="flex h-screen w-screen bg-[#030712] text-gray-100 overflow-hidden font-sans">
      
      {/* SIDEBAR PANEL */}
      <aside className="w-64 border-r border-border bg-[#090d16] flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-accent-blue to-accent-cyan flex items-center justify-center glow-blue shadow-lg shadow-blue-500/20">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-white tracking-wide">VisionEngine</h1>
              <p className="text-xs text-gray-500 font-medium tracking-wider">BXT LABS ENTERPRISE</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "overview" ? "bg-accent-blue/15 text-accent-blue border-l-2 border-accent-blue" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
            >
              <Activity className="h-4 w-4" />
              System Dashboard
            </button>
            <button 
              onClick={() => setActiveTab("label")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "label" ? "bg-accent-blue/15 text-accent-blue border-l-2 border-accent-blue" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
            >
              <Sliders className="h-4 w-4" />
              Annotation Canvas
            </button>
            <button 
              onClick={() => setActiveTab("train")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "train" ? "bg-accent-blue/15 text-accent-blue border-l-2 border-accent-blue" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
            >
              <Cpu className="h-4 w-4" />
              Model Registry
            </button>
            <button 
              onClick={() => setActiveTab("deployment")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "deployment" ? "bg-accent-blue/15 text-accent-blue border-l-2 border-accent-blue" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
            >
              <Camera className="h-4 w-4" />
              Edge Deployment
            </button>
            <button 
              onClick={() => setActiveTab("audit")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === "audit" ? "bg-accent-blue/15 text-accent-blue border-l-2 border-accent-blue" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}
            >
              <ShieldAlert className="h-4 w-4" />
              Audit Trace
            </button>
          </nav>
        </div>

        {/* User Card */}
        <div className="border-t border-border pt-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-accent-violet/20 flex items-center justify-center text-accent-violet font-semibold border border-accent-violet/30">
            AS
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold tracking-wider">ACTIVE USER</p>
            <h4 className="text-sm font-medium text-white">Aditya Shah</h4>
            <p className="text-xs text-gray-400">Enterprise Admin</p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-[#050912] p-8">
        
        {/* TOP BAR / PROJECT SELECTED */}
        <header className="flex items-center justify-between pb-6 border-b border-border mb-8">
          <div>
            <span className="text-xs text-accent-blue font-semibold tracking-wider uppercase">Active Workplace</span>
            <div className="flex items-center gap-3 mt-1">
              <Folder className="h-5 w-5 text-accent-cyan" />
              <select 
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(Number(e.target.value));
                  addAuditLog("SWITCH_PROJECT", `Switched to project ID ${e.target.value}`);
                }}
                className="bg-transparent text-xl font-semibold text-white focus:outline-none cursor-pointer"
              >
                {projects.map(proj => (
                  <option key={proj.id} value={proj.id} className="bg-[#090d16] text-white text-base">
                    {proj.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <button 
            onClick={() => setShowNewProjectModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-blue to-accent-cyan text-white text-sm font-medium rounded-lg hover:opacity-90 shadow-md shadow-blue-500/10 transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </button>
        </header>

        {/* ==================== OVERVIEW TAB ==================== */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            
            {/* Project Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-panel rounded-xl p-6 glass-card-hover">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Ingested Frames</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold text-white glow-blue">1,248</span>
                  <span className="text-xs text-accent-emerald font-semibold">+18% this week</span>
                </div>
              </div>
              
              <div className="glass-panel rounded-xl p-6 glass-card-hover">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Annotated Status</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold text-white glow-blue">84%</span>
                  <span className="text-xs text-gray-400">1,048 annotated</span>
                </div>
              </div>

              <div className="glass-panel rounded-xl p-6 glass-card-hover">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Active Edge Nodes</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold text-white glow-blue">4</span>
                  <span className="text-xs text-accent-cyan font-semibold">120 FPS throughput</span>
                </div>
              </div>

              <div className="glass-panel rounded-xl p-6 glass-card-hover">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Trained Backbones</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold text-white glow-blue">3</span>
                  <span className="text-xs text-accent-violet font-semibold">mAP50-95: 0.72</span>
                </div>
              </div>
            </div>

            {/* Quick-links and Live Exam Gantry Visualizer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* RTSP Stream Gantry Showcase */}
              <div className="lg:col-span-2 glass-panel rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-semibold text-white">Wayside Camera Stream Gantry</h3>
                      <p className="text-xs text-gray-400">Live examination simulator showing automated model inferencing</p>
                    </div>
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isStreaming ? "bg-accent-emerald" : "bg-red-500"}`}></span>
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isStreaming ? "bg-accent-emerald" : "bg-red-500"}`}></span>
                    </span>
                  </div>

                  {/* Image/Feed Viewer Container */}
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-gray-950 flex items-center justify-center">
                    {isStreaming ? (
                      <>
                        <img 
                          src={images[mockVideoFrameIndex].url} 
                          alt="RTSP camera frame" 
                          className="w-full h-full object-cover opacity-90 transition-all duration-300"
                        />
                        {/* Mock RTSP telemetry overlay */}
                        <div className="absolute top-4 left-4 font-mono text-[10px] bg-black/75 text-accent-cyan p-2 rounded border border-accent-cyan/20 space-y-0.5">
                          <div>SOURCE: CAMERA_GANTRY_EAST_01</div>
                          <div>DECODE: H.264 / 30.00 FPS</div>
                          <div>LATENCY: 14ms (TRT CUDA)</div>
                          <div>TIMESTAMP: {new Date().toLocaleTimeString()}</div>
                        </div>

                        {/* Automated YOLO/OCR Detection Box Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="border-2 border-accent-cyan bg-accent-cyan/15 rounded absolute w-1/3 h-1/3 flex flex-col justify-between p-2 glow-border animate-pulse-slow" style={{ top: "30%", left: "35%" }}>
                            <span className="text-[10px] bg-accent-cyan text-black font-bold px-1.5 py-0.5 self-start rounded">bent_stanchion: 89%</span>
                            <span className="text-[10px] bg-black/80 text-white font-bold px-1.5 py-0.5 self-end rounded font-mono">PLATE: SECR120489</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center space-y-3">
                        <Camera className="h-10 w-10 text-gray-600 mx-auto" />
                        <div>
                          <p className="text-sm font-medium text-gray-300">RTSP Stream Offline</p>
                          <p className="text-xs text-gray-500">Enable edge monitoring stream to run real-time inference</p>
                        </div>
                        <button 
                          onClick={() => {
                            setIsStreaming(true);
                            addAuditLog("START_STREAM", "Connected RTSP wayside stream");
                          }}
                          className="px-4 py-2 bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue text-xs font-semibold rounded-lg border border-accent-blue/30 transition-all"
                        >
                          Trigger Simulated RTSP Feed
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 mt-4 border-t border-border pt-4">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={rtspUrl}
                      onChange={(e) => setRtspUrl(e.target.value)}
                      disabled={isStreaming}
                      className="w-full bg-[#0c1220] border border-border rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-accent-blue/50" 
                    />
                  </div>
                  {isStreaming ? (
                    <button 
                      onClick={() => {
                        setIsStreaming(false);
                        addAuditLog("STOP_STREAM", "Disconnected RTSP stream");
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold rounded-lg border border-red-500/30 transition-all"
                    >
                      <StopCircle className="h-3.5 w-3.5" />
                      Disconnect
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setIsStreaming(true);
                        addAuditLog("START_STREAM", "Connected RTSP stream");
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue text-xs font-semibold rounded-lg border border-accent-blue/30 transition-all"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Connect Feed
                    </button>
                  )}
                </div>
              </div>

              {/* Edge Alert Event log */}
              <div className="glass-panel rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-white mb-2">Edge Gantry Alert Feed</h3>
                  <p className="text-xs text-gray-400 mb-4">Real-time alerts sent from container inference nodes</p>
                  
                  <div className="space-y-3 h-[250px] overflow-y-auto pr-1">
                    {streamAlerts.length === 0 ? (
                      <div className="text-center py-12 text-gray-600 text-xs font-medium space-y-1">
                        <AlertTriangle className="h-5 w-5 mx-auto text-gray-700" />
                        <p>No active anomalies flagged yet.</p>
                      </div>
                    ) : (
                      streamAlerts.map(alert => (
                        <div key={alert.id} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 flex items-start gap-3">
                          <div className="h-2 w-2 rounded-full bg-red-500 mt-1.5 animate-pulse"></div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-red-400 capitalize">{alert.type.replace('_', ' ')}</span>
                              <span className="text-[10px] text-gray-500 font-mono">{alert.time}</span>
                            </div>
                            <p className="text-[11px] text-gray-300 mt-0.5">{alert.details}</p>
                            <span className="text-[9px] bg-red-500/15 text-red-400 font-semibold px-1 rounded-sm mt-1 inline-block">Conf: {Math.floor(alert.conf * 100)}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t border-border pt-4 mt-4">
                  <button 
                    onClick={() => setActiveTab("deployment")}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-lg border border-border text-center transition-all"
                  >
                    Manage Edge Deployments
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================== ANNOTATION CANVAS ==================== */}
        {activeTab === "label" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">Segment Anything Model (SAM) Assisted Labelling</h2>
                <p className="text-xs text-gray-400">Click anywhere on the canvas. AI will auto-generate bounding contours.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={clearAnnotations}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-border text-xs font-medium rounded-lg transition-all"
                >
                  Clear Canvas
                </button>
                <button 
                  onClick={() => {
                    const updatedImages = [...images];
                    updatedImages[selectedImageIndex].status = "labelled";
                    setImages(updatedImages);
                    addAuditLog("SAVE_LABELS", `Image: ${images[selectedImageIndex].filename}`);
                    alert("Labels saved to database!");
                  }}
                  className="px-4 py-1.5 bg-accent-blue text-white text-xs font-medium rounded-lg hover:opacity-90 transition-all shadow-md shadow-blue-500/10"
                >
                  Save Annotations
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              {/* Tool Options & Labels selection */}
              <div className="glass-panel rounded-xl p-6 space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Target Label Class</h4>
                  <div className="space-y-2">
                    {["broken_door", "bent_stanchion", "hole_in_wagon_side", "missing_stanchion"].map(lbl => (
                      <button 
                        key={lbl}
                        onClick={() => setSelectedClass(lbl)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all ${selectedClass === lbl ? "bg-accent-blue/15 border-accent-blue text-accent-blue" : "border-border text-gray-400 hover:bg-white/5 hover:text-white"}`}
                      >
                        {lbl.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Automated SAM Aid</h4>
                  <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">Hover and click on target damages. Segment Anything API computes boundary masks and bounding coordinates locally in 30ms.</p>
                  <div className="flex items-center gap-2 text-xs font-medium text-accent-emerald">
                    <UserCheck className="h-4 w-4" />
                    SAM Microservice is Online
                  </div>
                </div>
              </div>

              {/* Canvas Interactive Screen */}
              <div className="lg:col-span-2 flex flex-col items-center">
                <div className="relative border border-border rounded-xl overflow-hidden bg-gray-950 glow-border shadow-2xl shadow-blue-500/5">
                  <canvas 
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="cursor-crosshair block"
                  />
                  {loadingSAM && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-xs">
                      <div className="flex items-center gap-2 bg-[#090d16] border border-border px-4 py-2.5 rounded-lg text-xs font-semibold text-white">
                        <RefreshCw className="h-4 w-4 text-accent-cyan animate-spin" />
                        SAM calculating boundaries...
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-3 italic text-center">Interactive Canvas (600x400). Dots represent SAM click coordinates.</p>
              </div>

              {/* Image List queue */}
              <div className="glass-panel rounded-xl p-6 flex flex-col">
                <h3 className="font-semibold text-white text-sm mb-3">Dataset Image Queue</h3>
                <div className="space-y-3 overflow-y-auto max-h-[350px]">
                  {images.map((img, idx) => (
                    <div 
                      key={img.id}
                      onClick={() => {
                        setSelectedImageIndex(idx);
                        setPoints([]);
                        addAuditLog("SELECT_IMAGE", `Inspecting image: ${img.filename}`);
                      }}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex gap-3 ${selectedImageIndex === idx ? "bg-accent-blue/10 border-accent-blue" : "border-border hover:bg-white/5"}`}
                    >
                      <img src={img.url} alt={img.filename} className="h-10 w-14 rounded object-cover border border-border" />
                      <div className="flex-1 overflow-hidden">
                        <h5 className="text-xs font-medium text-white truncate">{img.filename}</h5>
                        <div className="flex justify-between items-center mt-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${img.status === "labelled" ? "bg-accent-emerald/20 text-accent-emerald" : "bg-yellow-500/20 text-yellow-400"}`}>
                            {img.status}
                          </span>
                          <span className="text-[10px] text-gray-400">{img.annotations.length} tags</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================== MODEL TRAINING TAB ==================== */}
        {activeTab === "train" && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">YOLO Training Dashboard & Registry</h2>
                <p className="text-xs text-gray-400">Configure parameters, run model fine-tuning jobs, and compile outputs for the Edge.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Training config sidebar */}
              <div className="glass-panel rounded-xl p-6 space-y-6">
                <h3 className="font-semibold text-white text-sm border-b border-border pb-3">ML Engine Configurator</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>Training Epochs</span>
                      <span className="text-accent-blue font-bold">{epochs}</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="150" 
                      value={epochs} 
                      onChange={(e) => setEpochs(Number(e.target.value))}
                      disabled={trainingStatus === "training"}
                      className="w-full accent-accent-blue bg-[#0c1220] h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>Batch Size</span>
                      <span className="text-accent-blue font-bold">{batchSize}</span>
                    </div>
                    <select 
                      value={batchSize} 
                      onChange={(e) => setBatchSize(Number(e.target.value))}
                      disabled={trainingStatus === "training"}
                      className="w-full bg-[#0c1220] border border-border text-xs rounded-lg p-2.5 text-gray-300 focus:outline-none focus:border-accent-blue/50"
                    >
                      {[8, 16, 32, 64].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Model Size (Backbone weights)</label>
                    <select 
                      value={modelSize} 
                      onChange={(e) => setModelSize(e.target.value)}
                      disabled={trainingStatus === "training"}
                      className="w-full bg-[#0c1220] border border-border text-xs rounded-lg p-2.5 text-gray-300 focus:outline-none focus:border-accent-blue/50"
                    >
                      <option value="nano">YOLO11n (Nano) - 2.8M params</option>
                      <option value="small">YOLO11s (Small) - 9.4M params</option>
                      <option value="medium">YOLO11m (Medium) - 20.1M params</option>
                      <option value="large">YOLO11l (Large) - 25.3M params</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  {trainingStatus === "training" ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-300">
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent-cyan" />
                          GPU Processing...
                        </span>
                        <span>{trainingProgress}%</span>
                      </div>
                      <div className="w-full bg-[#0c1220] h-2 rounded-full overflow-hidden border border-border">
                        <div className="bg-gradient-to-r from-accent-blue to-accent-cyan h-full transition-all duration-200" style={{ width: `${trainingProgress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={triggerTraining}
                      className="w-full py-2.5 bg-gradient-to-r from-accent-blue to-accent-cyan hover:opacity-90 text-white text-xs font-semibold rounded-lg shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2"
                    >
                      <Cpu className="h-4 w-4" />
                      Initialize PyTorch Fine-Tuning
                    </button>
                  )}
                </div>
              </div>

              {/* Training progress charts */}
              <div className="lg:col-span-2 glass-panel rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-white text-sm mb-4">Automated Training Loss & Metric Plots</h3>
                  
                  {trainingStatus === "idle" && epochLoss.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 border border-dashed border-border rounded-lg text-xs text-gray-500">
                      <Activity className="h-8 w-8 text-gray-700 mb-2" />
                      <p>Trigger fine-tuning to plot live metrics from GPU training loop</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      {/* Loss Plot */}
                      <div className="space-y-2">
                        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Objectness Loss</p>
                        <div className="h-40 border border-border bg-[#090d16]/30 rounded-lg p-2 flex items-end gap-1">
                          {epochLoss.map((loss, idx) => (
                            <div 
                              key={idx} 
                              className="bg-accent-blue w-full rounded-t-xs"
                              style={{ height: `${(loss / 0.6) * 100}%` }}
                              title={`Epoch ${idx + 1}: ${loss.toFixed(4)}`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                          <span>Epoch 1</span>
                          <span>Epoch {epochLoss.length}</span>
                        </div>
                      </div>

                      {/* mAP50 Plot */}
                      <div className="space-y-2">
                        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">mAP (0.50 val)</p>
                        <div className="h-40 border border-border bg-[#090d16]/30 rounded-lg p-2 flex items-end gap-1">
                          {epochmAP.map((map, idx) => (
                            <div 
                              key={idx} 
                              className="bg-accent-cyan w-full rounded-t-xs"
                              style={{ height: `${map * 100}%` }}
                              title={`Epoch ${idx + 1}: ${map.toFixed(3)}`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                          <span>Epoch 1</span>
                          <span>Epoch {epochmAP.length}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4 mt-6 flex justify-between items-center text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent-emerald" />
                    CUDA Core 0 Active (NVIDIA RTX 4090)
                  </div>
                  <div>
                    {epochmAP.length > 0 && (
                      <span className="font-mono bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 px-2 py-0.5 rounded">
                        mAP50 Validation Peak: {epochmAP[epochmAP.length - 1]?.toFixed(3)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Model Registry List */}
            <div className="glass-panel rounded-xl p-6">
              <h3 className="font-semibold text-white text-sm mb-4">Model Registry (Registered weights)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#090d16] text-gray-400 uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="px-6 py-3">Model Tag</th>
                      <th className="px-6 py-3">Version</th>
                      <th className="px-6 py-3">Framework</th>
                      <th className="px-6 py-3">Validation mAP50</th>
                      <th className="px-6 py-3">Weights Export</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-white/2">
                      <td className="px-6 py-4 font-semibold text-white">cobra_yard_yolov8x_damage</td>
                      <td className="px-6 py-4 font-mono text-gray-400">v1.2.0</td>
                      <td className="px-6 py-4">PyTorch / YOLOv8-X</td>
                      <td className="px-6 py-4 text-accent-cyan font-bold">0.892</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-accent-blue/15 text-accent-blue border border-accent-blue/30 rounded font-semibold text-[10px] cursor-pointer hover:bg-accent-blue/20">
                          Export ONNX / TRT
                        </span>
                      </td>
                      <td className="px-6 py-4 text-accent-emerald font-medium">Active (Deployed)</td>
                    </tr>
                    <tr className="hover:bg-white/2">
                      <td className="px-6 py-4 font-semibold text-white">cobra_number_ocr_paddle</td>
                      <td className="px-6 py-4 font-mono text-gray-400">v1.0.1</td>
                      <td className="px-6 py-4">PaddleOCR / ResNet50</td>
                      <td className="px-6 py-4 text-accent-cyan font-bold">0.941</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-accent-blue/15 text-accent-blue border border-accent-blue/30 rounded font-semibold text-[10px] cursor-pointer hover:bg-accent-blue/20">
                          Export ONNX
                        </span>
                      </td>
                      <td className="px-6 py-4 text-accent-emerald font-medium">Active (Deployed)</td>
                    </tr>
                    {trainingStatus === "completed" && (
                      <tr className="hover:bg-white/2 animate-fade-in bg-accent-blue/5">
                        <td className="px-6 py-4 font-semibold text-white">cobra_yard_model_v{projects[selectedProjectId - 1]?.models + 1}</td>
                        <td className="px-6 py-4 font-mono text-gray-400">v1.3.0</td>
                        <td className="px-6 py-4">YOLO11 / PyTorch</td>
                        <td className="px-6 py-4 text-accent-cyan font-bold">{(epochmAP[epochmAP.length - 1] || 0.88).toFixed(3)}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-accent-blue/15 text-accent-blue border border-accent-blue/30 rounded font-semibold text-[10px] cursor-pointer">
                            Export ONNX / OpenVINO
                          </span>
                        </td>
                        <td className="px-6 py-4 text-accent-cyan font-medium">Ready</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== EDGE DEPLOYMENT TAB ==================== */}
        {activeTab === "deployment" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Edge Node Deployments (Air-Gapped/On-Premises)</h2>
              <p className="text-xs text-gray-400">Generate deployment docker compose scripts, manage local nodes, and audit edge throughput.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Docker compose script generator */}
              <div className="lg:col-span-2 glass-panel rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-white text-sm">Offline Docker Runtime Composer</h3>
                <p className="text-xs text-gray-400">Copy this shell block to spin up the BxT Inference container inside your localized, air-gapped server node.</p>
                
                <div className="relative rounded-lg bg-gray-950 p-4 border border-border font-mono text-xs text-accent-cyan overflow-x-auto leading-relaxed">
                  <pre>
{`# Docker deployment compose configuration for edge enclaves
version: '3.8'
services:
  bxt-vision-edge:
    image: bxt-vision-edge:latest
    container_name: bxt_edge_examination_01
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - EDGE_NODE_ID=CAM_GANTRY_EAST_01
      - LOCAL_MODEL_PATH=/app/models/wagon_damage_yolov8.onnx
      - OCR_MODEL_PATH=/app/models/wagon_number_ocr.onnx
      - ALERT_API_ENDPOINT=http://192.168.1.52/api/edge/alerts
    volumes:
      - ./models:/app/models
      - /dev/shm:/dev/shm # shared memory segment for fast RTSP frames buffer
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]`}
                  </pre>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText("Docker Compose Script copied.");
                      addAuditLog("COPY_DOCKER_COMPOSE", "Generated edge Docker Compose configuration");
                      alert("Docker script copied to clipboard!");
                    }}
                    className="absolute top-4 right-4 px-2 py-1 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded border border-border text-[10px] font-semibold tracking-wide"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Edge Node metrics stats */}
              <div className="glass-panel rounded-xl p-6 space-y-6">
                <h3 className="font-semibold text-white text-sm border-b border-border pb-3">Edge Node Status</h3>
                
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Node Identifier:</span>
                    <span className="font-mono text-white">CAM_GANTRY_EAST_01</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Connection Status:</span>
                    <span className="text-accent-emerald font-semibold flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-accent-emerald inline-block"></span>
                      Online (LAN)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Model Runtime:</span>
                    <span className="bg-accent-blue/15 text-accent-blue border border-accent-blue/30 px-2 py-0.5 rounded font-mono text-[10px]">TensorRT Cuda 12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Inference Speed:</span>
                    <span className="font-bold text-white">34.5 ms / Frame</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Camera FPS Capture:</span>
                    <span className="text-accent-cyan font-bold">29.8 FPS</span>
                  </div>
                </div>

                <div className="border-t border-border pt-4 mt-4 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Compliance Flags</h4>
                  <div className="p-3 bg-accent-emerald/5 border border-accent-emerald/10 rounded-lg text-xs text-accent-emerald flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Data Encrypted on Disk (AES-256)
                  </div>
                  <div className="p-3 bg-accent-cyan/5 border border-accent-cyan/10 rounded-lg text-xs text-accent-cyan flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    On-Prem Isolated. Zero cloud telemetry.
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================== AUDIT TAB ==================== */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-white">Compliance & Tamper-Proof Audit Trace</h2>
                <p className="text-xs text-gray-400">Immutable tracking of dataset modifications, annotation reviews, and deployment triggers.</p>
              </div>
              <button 
                onClick={() => {
                  addAuditLog("EXPORT_AUDIT_CSV", "Exported compliance logs report");
                  alert("Exporting audit CSV...");
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded-lg border border-border transition-all"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Export Audit Log
              </button>
            </div>

            {/* Audit Log table */}
            <div className="glass-panel rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#090d16] text-gray-400 uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="px-6 py-4">Log ID</th>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Action Event</th>
                      <th className="px-6 py-4">Target Resource</th>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/2">
                        <td className="px-6 py-4 font-mono font-bold text-gray-400">{log.id}</td>
                        <td className="px-6 py-4 font-medium text-white">{log.user}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            log.role === "admin" ? "bg-accent-violet/10 text-accent-violet border border-accent-violet/20" :
                            log.role === "labeler" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                            "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20"
                          }`}>
                            {log.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-200">{log.action}</td>
                        <td className="px-6 py-4 truncate max-w-[200px]" title={log.target}>{log.target}</td>
                        <td className="px-6 py-4 font-mono text-gray-400">{log.timestamp}</td>
                        <td className="px-6 py-4 font-mono text-gray-500">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* NEW PROJECT MODAL */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-white">Create New Vision Worksite</h3>
              <button 
                onClick={() => setShowNewProjectModal(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Project Name</label>
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Obra Yard AI-CWDAS"
                  className="w-full bg-[#0c1220] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-blue/50"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea 
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Summarize the core object recognition objectives..."
                  rows={3}
                  className="w-full bg-[#0c1220] border border-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-blue/50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowNewProjectModal(false)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded-lg border border-border"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateProject}
                className="px-4 py-1.5 bg-accent-blue text-white text-xs font-medium rounded-lg hover:opacity-90 shadow-md shadow-blue-500/10"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
