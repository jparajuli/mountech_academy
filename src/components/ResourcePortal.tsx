import React, { useState, useEffect } from "react";
import { 
  BookOpen, FileText, Presentation, GitPullRequest, Link, ArrowRight, 
  Upload, Plus, Trash2, Search, ExternalLink, RefreshCw, Layers, 
  Database, Code, CheckCircle2, AlertCircle, Sparkles, FolderOpen,
  HelpCircle, ChevronRight, FileCode, Check, Copy
} from "lucide-react";
import { Course } from "../types";

interface Resource {
  id: string;
  title: string;
  category: "PDF Guide" | "Lecture Slides" | "Lecture Video" | "Assignment Brief" | "Cheat Sheet";
  courseId: string;
  courseTitle: string;
  fileSize?: string;
  uploadedAt: string;
  source: "Institutional" | "User Submitted";
  url?: string;
  description: string;
}

interface GitLabLink {
  id: string;
  assignmentId: string;
  assignmentName: string;
  gitlabRepoUrl: string;
  accessToken: string;
  status: "Connected" | "Running Builds" | "Failed Check" | "Synced & Verified";
  linkedAt: string;
  grade?: string;
  commitHash?: string;
}

interface ResourcePortalProps {
  courses: Course[];
  user: { email: string; name: string };
}

export default function ResourcePortal({ courses, user }: ResourcePortalProps) {
  // --- STATE FOR LECTURE RESOURCES ---
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("All");

  // --- STATE FOR RESOURCE UPLOADER ---
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<Resource["category"]>("PDF Guide");
  const [uploadCourseId, setUploadCourseId] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState("");

  // --- STATE FOR GITLAB INTEGRATION ---
  const [linkedRepos, setLinkedRepos] = useState<GitLabLink[]>([]);
  const [selectedGitLabCourse, setSelectedGitLabCourse] = useState("");
  const [gitlabUrlInput, setGitlabUrlInput] = useState("");
  const [patInput, setPatInput] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [syncingRepoId, setSyncingRepoId] = useState<string | null>(null);

  // Default preset resources to seed initial state
  const presetResources: Resource[] = [
    {
      id: "res-1",
      title: "Lecture 1 Notebook: Essential Prompt Directives & Boundary Handlers",
      category: "PDF Guide",
      courseId: "chatgpt-prompt-engineering",
      courseTitle: "ChatGPT Prompt Engineering for Developers",
      fileSize: "1.8 MB",
      uploadedAt: "2026-06-01T10:00:00.000Z",
      source: "Institutional",
      description: "Comprehensive notes covering the structural system prompts, delimiter rules (#, ```, ---), and methods to prevent jailbreaks."
    },
    {
      id: "res-2",
      title: "Lecture 1 Slides: The Anatomy of Large Language Modeling Systems",
      category: "Lecture Slides",
      courseId: "chatgpt-prompt-engineering",
      courseTitle: "ChatGPT Prompt Engineering for Developers",
      fileSize: "3.4 MB",
      uploadedAt: "2026-05-28T14:30:00.000Z",
      source: "Institutional",
      description: "Visual slides presenting tokenization theory, prompt decoding, hyper-parameter temperature bounds, and the attention weight paradigm."
    },
    {
      id: "res-3",
      title: "Lecture 2 Guide: Conversational Multi-Agent Coordination Design",
      category: "PDF Guide",
      courseId: "ai-agentic-design-patterns",
      courseTitle: "AI Agentic Design Patterns with AutoGen",
      fileSize: "2.1 MB",
      uploadedAt: "2026-06-05T09:15:00.000Z",
      source: "Institutional",
      description: "Detailed roadmap on splitting state managers between multiple agents, defining feedback interrupts, and configuring local environment runners."
    },
    {
      id: "res-4",
      title: "Lecture 2 Slides: Decomposing Goals into Standalone Tool Specialists",
      category: "Lecture Slides",
      courseId: "ai-agentic-design-patterns",
      courseTitle: "AI Agentic Design Patterns with AutoGen",
      fileSize: "4.8 MB",
      uploadedAt: "2026-06-03T11:00:00.000Z",
      source: "Institutional",
      description: "Slides outlining task decomposition schemas, routing logic inside Microsoft AutoGen, and implementing human validation loops."
    },
    {
      id: "res-5",
      title: "Lecture 3 Matrix: Deep Feed-Forward Architecture Fundamentals",
      category: "PDF Guide",
      courseId: "deep-learning-specialization",
      courseTitle: "Deep Learning Specialization",
      fileSize: "2.7 MB",
      uploadedAt: "2026-06-07T16:00:00.000Z",
      source: "Institutional",
      description: "Rigorous mathematical derivations for backpropagation pipelines, activation gradients (ReLU, Sigmoid, GeLU), and bias vectors."
    },
    {
      id: "res-6",
      title: "RAG Setup Sheet: Vector Chunking and Similarity Lookup Grids",
      category: "Cheat Sheet",
      courseId: "practical-rag-vector-databases",
      courseTitle: "Practical RAG with Vector Databases",
      fileSize: "920 KB",
      uploadedAt: "2026-06-10T13:45:00.000Z",
      source: "Institutional",
      description: "A quick reference index showing optimized chunk sizes, overlap parameters, cosine distance formulas, and query expansion structures."
    }
  ];

  // Default preset GitLab Projects that scholars can work on
  const sampleGitLabProjects = [
    {
      title: "Assignment A: LLM Prompter CLI Evaluation Suite",
      courseId: "chatgpt-prompt-engineering",
      desc: "Implement a python program that iterates across prompt system configurations, validates model output, and pushes logs into institutional sheets.",
      gitlabRepo: "https://gitlab.mountech.academy/coursework/prompt-engineering-cli.git",
      filesExpected: ["app.py", "evals.json", "requirements.txt"]
    },
    {
      title: "Assignment B: Autonomous Math Agentic Orchestrator",
      courseId: "ai-agentic-design-patterns",
      desc: "Develop a multi-agent system containing a coder agent, calculator executor, and verified reviewer. Ensure agent output contains zero hallucinations.",
      gitlabRepo: "https://gitlab.mountech.academy/coursework/autogen-math-agents.git",
      filesExpected: ["agents.py", "config.yaml", "test_agents.py"]
    },
    {
      title: "Assignment C: Neural Network Optimizer from Scratch",
      courseId: "deep-learning-specialization",
      desc: "Write a numpy-only neural net classifier with mini-batch RMSProp optimizer, Adam bounds, and cross-entropy evaluation. Train Centroid boundaries.",
      gitlabRepo: "https://gitlab.mountech.academy/coursework/neural-optimizer-scratch.git",
      filesExpected: ["nn_model.py", "optimizers.py", "dataset.csv"]
    }
  ];

  // Load and seed Resources & Linked Repos from LocalStorage
  useEffect(() => {
    const savedResources = localStorage.getItem("mountech_portal_resources");
    if (savedResources) {
      setResources(JSON.parse(savedResources));
    } else {
      setResources(presetResources);
      localStorage.setItem("mountech_portal_resources", JSON.stringify(presetResources));
    }

    const savedLinks = localStorage.getItem("mountech_portal_gitlab_links");
    if (savedLinks) {
      setLinkedRepos(JSON.parse(savedLinks));
    } else {
      const initialLinks: GitLabLink[] = [
        {
          id: "link-init",
          assignmentId: "chatgpt-prompt-engineering",
          assignmentName: "Assignment A: LLM Prompter CLI Evaluation Suite",
          gitlabRepoUrl: `https://gitlab.com/${user.email.split("@")[0]}/prompt-engineering-cli`,
          accessToken: "glpat-xxxx_SAMPLE_TOKEN_xxxx",
          status: "Synced & Verified",
          linkedAt: "2026-06-12T15:20:00.000Z",
          grade: "100 / 100",
          commitHash: "e4a2d8d8"
        }
      ];
      setLinkedRepos(initialLinks);
      localStorage.setItem("mountech_portal_gitlab_links", JSON.stringify(initialLinks));
    }

    if (courses && courses.length > 0) {
      setSelectedGitLabCourse(courses[0].id);
      setUploadCourseId(courses[0].id);
    }
  }, []);

  // Sync Resource List back to LocalStorage when changed
  const saveResourcesToStorage = (updatedResources: Resource[]) => {
    setResources(updatedResources);
    localStorage.setItem("mountech_portal_resources", JSON.stringify(updatedResources));
  };

  // Sync GitLab Link List to LocalStorage
  const saveGitLabLinksToStorage = (updatedLinks: GitLabLink[]) => {
    setLinkedRepos(updatedLinks);
    localStorage.setItem("mountech_portal_gitlab_links", JSON.stringify(updatedLinks));
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadFile(e.dataTransfer.files[0]);
      setUploadTitle(e.dataTransfer.files[0].name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      if (!uploadTitle) {
        setUploadTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  // Trigger resource creation
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      alert("Please specify a document title.");
      return;
    }

    const assignedCourse = courses.find(c => c.id === uploadCourseId);
    const sizeStr = uploadFile ? `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB` : "Link Reference";

    const newResource: Resource = {
      id: `user-res-${Date.now()}`,
      title: uploadTitle.trim(),
      category: uploadCategory,
      courseId: uploadCourseId,
      courseTitle: assignedCourse ? assignedCourse.title : "General Pathway",
      fileSize: sizeStr,
      uploadedAt: new Date().toISOString(),
      source: "User Submitted",
      url: uploadUrl.trim() || undefined,
      description: uploadDesc.trim() || "User uploaded supplementary lecture document."
    };

    const updated = [newResource, ...resources];
    saveResourcesToStorage(updated);

    // Clear and close
    setUploadTitle("");
    setUploadDesc("");
    setUploadUrl("");
    setUploadFile(null);
    setUploadSuccessMsg(`"Successfully added '${newResource.title}' to the Academic Resource Hub!`);
    setTimeout(() => {
      setUploadSuccessMsg("");
      setShowUploadModal(false);
    }, 1800);
  };

  // Delete resource
  const handleDeleteResource = (id: string) => {
    const updated = resources.filter(r => r.id !== id);
    saveResourcesToStorage(updated);
  };

  // GitLab Linking Simulation
  const handleLinkGitLab = (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError("");

    if (!gitlabUrlInput.trim()) {
      setLinkError("Please input your GitLab project / repository URL.");
      return;
    }
    if (!patInput.trim()) {
      setLinkError("A Personal Access Token is required to authenticate workspace synchronization.");
      return;
    }

    // Validate GitLab URL matches standard formats
    const isGitLabUrl = gitlabUrlInput.includes("gitlab.com") || gitlabUrlInput.includes("gitlab.");
    if (!isGitLabUrl) {
      setLinkError("The repository URL must be a valid GitLab path (e.g. https://gitlab.com/username/project).");
      return;
    }

    setIsLinking(true);

    // Simulate connection validation
    setTimeout(() => {
      const selectedProject = sampleGitLabProjects.find(p => p.courseId === selectedGitLabCourse);
      const assignTitle = selectedProject ? selectedProject.title : "GitLab Custom Workspace Repo";

      const newLink: GitLabLink = {
        id: `git-${Date.now()}`,
        assignmentId: selectedGitLabCourse,
        assignmentName: assignTitle,
        gitlabRepoUrl: gitlabUrlInput.trim(),
        accessToken: patInput.substring(0, 10) + "*****************",
        status: "Running Builds",
        linkedAt: new Date().toISOString(),
        grade: "Pending review",
        commitHash: Math.random().toString(16).substring(2, 8)
      };

      const currentLinks = [newLink, ...linkedRepos];
      saveGitLabLinksToStorage(currentLinks);

      setIsLinking(false);
      setGitlabUrlInput("");
      setPatInput("");

      // Simulate build pipeline running!
      setTimeout(() => {
        const pipelineSuccessIndex = currentLinks.findIndex(l => l.id === newLink.id);
        if (pipelineSuccessIndex !== -1) {
          const finalLinks = [...currentLinks];
          // Generous grades!
          const passGrades = ["92 / 100", "96 / 100", "100 / 100", "98 / 100"];
          finalLinks[pipelineSuccessIndex] = {
            ...finalLinks[pipelineSuccessIndex],
            status: "Synced & Verified",
            grade: passGrades[Math.floor(Math.random() * passGrades.length)]
          };
          saveGitLabLinksToStorage(finalLinks);
        }
      }, 4000);

    }, 1500);
  };

  // Remove linked gitlab repo
  const handleRemoveLink = (id: string) => {
    const updated = linkedRepos.filter(l => l.id !== id);
    saveGitLabLinksToStorage(updated);
  };

  // Re-sync GitLab Repo
  const handleSyncRepo = (id: string) => {
    setSyncingRepoId(id);
    setTimeout(() => {
      const updated = linkedRepos.map(l => {
        if (l.id === id) {
          const currentGrades = ["95 / 100", "98 / 100", "100 / 100"];
          return {
            ...l,
            status: "Synced & Verified" as const,
            linkedAt: new Date().toISOString(),
            grade: currentGrades[Math.floor(Math.random() * currentGrades.length)],
            commitHash: Math.random().toString(16).substring(2, 8)
          };
        }
        return l;
      });
      saveGitLabLinksToStorage(updated);
      setSyncingRepoId(null);
    }, 2000);
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(`https://${window.location.host}/api/gitlab/webhook`);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  // Filters compute
  const filteredResources = resources.filter(res => {
    const matchesSearch = 
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === "All" || res.category === selectedCategory;
    const matchesCourse = selectedCourseId === "All" || res.courseId === selectedCourseId;

    return matchesSearch && matchesCategory && matchesCourse;
  });

  return (
    <div id="resource-portal-main" className="space-y-12">
      
      {/* SECTION 1: TWO MAIN COLUMNS - PORTAL INTRODUCTION & REPOSITORY INTEGRATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Intro Control Card (Light background, premium border) */}
        <div className="lg:col-span-4 bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 bg-[#0070f3]/10 text-[#0070f3] rounded-xl border border-[#0070f3]/20">
                <BookOpen className="w-5 h-5" />
              </span>
              <span className="text-xs font-mono font-bold text-gray-400 tracking-wider uppercase">Institutional Vault</span>
            </div>
            
            <h2 className="text-xl font-sans font-extrabold text-gray-900 tracking-tight leading-snug">
              Academic Resource Portal & GitLab Classroom Hub
            </h2>
            
            <p className="text-gray-500 text-xs leading-relaxed mt-2.5">
              Welcome to the central document vault. Here, scholars can pull authoritative 
              lecture PDFs, slide transcripts, and supplementary files.
            </p>

            <p className="text-gray-500 text-xs leading-relaxed mt-2">
              Our automated build integration connects directly to <strong>GitLab</strong>. Syncing your localized homework projects lets you running automated syntax tests and stream grader summaries live to our institutional tracking spreadsheet.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 space-y-3.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400">Student Profile:</span>
              <span className="text-gray-900 font-bold">{user.name}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400">Linked Projects:</span>
              <span className="text-blue-600 font-bold">{linkedRepos.length} Connected</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400">Total Materials Loaded:</span>
              <span className="text-emerald-600 font-bold">{resources.length} active documents</span>
            </div>

            <button
              onClick={() => setShowUploadModal(true)}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-xs border border-gray-700"
            >
              <Upload className="w-4 h-4" />
              <span>Submit Supplemental Lecture Document</span>
            </button>
          </div>
        </div>

        {/* GitLab Assignment Classroom Instructions (Modern code look) */}
        <div className="lg:col-span-8 bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 text-white flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800 pb-5 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl">
                  <GitPullRequest className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    How GitLab Assignment Syncing Works
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Follow this workflow to connect repositories and auto-compile grades.</p>
                </div>
              </div>
              <span className="text-[10px] font-mono tracking-wider font-extrabold uppercase bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full border border-orange-500/20">
                Live Pipeline
              </span>
            </div>

            {/* Steps Timeline Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono font-bold text-[10px] rounded-full flex items-center justify-center shrink-0">1</span>
                  <h4 className="text-xs font-semibold text-gray-200">Fork & Workspace Clone</h4>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-400">
                  Select one of the validated institutional repositories below. Fork into your personal GitLab account, and clone down locally to write your solutions.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono font-bold text-[10px] rounded-full flex items-center justify-center shrink-0">2</span>
                  <h4 className="text-xs font-semibold text-gray-200">Configure Webhook</h4>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-400">
                  Inside your GitLab project settings, set a webhook linking to our gateway API. This alerts the portal automatically on every git commit.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono font-bold text-[10px] rounded-full flex items-center justify-center shrink-0">3</span>
                  <h4 className="text-xs font-semibold text-gray-200">Submit Project Link</h4>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-400">
                  Fill the Link Repository form by providing your Personal Access Token. Our portal will execute testing suites and stream marks to the sheet database.
                </p>
              </div>

            </div>
          </div>

          {/* Webhook details container */}
          <div className="mt-6 p-4 bg-gray-950 border border-gray-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-gray-400 block tracking-wider uppercase">PORTAL WEBHOOK GATEWAY URL</span>
              <code className="text-[11px] font-mono text-orange-400 select-all font-semibold">
                https://{window.location.host || "mountech.academy"}/api/gitlab/webhook
              </code>
            </div>
            
            <button
              onClick={copyWebhookUrl}
              className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-md text-[11.5px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-all border border-gray-700 whitespace-nowrap"
            >
              {copiedWebhook ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied Link!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Webhook</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* SECTION 2: VERIFIED CLASSROOM GITLAB ASSIGNMENT REPOSITORIES */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-gray-900" />
          <h3 className="text-lg font-sans font-extrabold text-[#111827] tracking-tight">
            Institutional GitLab Assignment Projects (Validated Classrooms)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sampleGitLabProjects.map((project, idx) => {
            const coincidesCourse = courses.find(c => c.id === project.courseId);
            return (
              <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-100">
                      GITLAB REPO
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      {coincidesCourse ? coincidesCourse.duration : ""}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-gray-900 leading-tight">
                    {project.title}
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {project.desc}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block">Expected Files Schema</span>
                    <div className="flex flex-wrap gap-1.5">
                      {project.filesExpected.map((fn, fidx) => (
                        <span key={fidx} className="text-[10px] font-mono bg-gray-100 border border-gray-150 text-gray-700 px-1.5 py-0.5 rounded">
                          {fn}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block">Git Clone URL</span>
                    <div className="flex items-center justify-between gap-1 bg-gray-50 border border-gray-150 rounded px-2 py-1 text-[10.5px] font-mono text-gray-600 truncate">
                      <span className="truncate">{project.gitlabRepo}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: REPOS LINKING CONSOLE (Interactive Form + Active Links) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Repository Linking Form */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <span className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
              <Link className="w-4 h-4" />
            </span>
            <h4 className="text-sm font-bold text-gray-900">
              Link Your Completed GitLab Repository
            </h4>
          </div>

          <form onSubmit={handleLinkGitLab} className="space-y-4 text-xs">
            {linkError && (
              <div className="p-3 bg-rose-50 border border-rose-150 text-rose-700 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="leading-relaxed">{linkError}</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-gray-700 font-semibold block">Target Course Assignment</label>
              <select
                value={selectedGitLabCourse}
                onChange={(e) => setSelectedGitLabCourse(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-gray-700 font-semibold block">GitLab Project Repository URL</label>
              <input
                type="url"
                required
                value={gitlabUrlInput}
                onChange={(e) => setGitlabUrlInput(e.target.value)}
                placeholder="https://gitlab.com/your-username/my-prompt-cli"
                className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <span className="text-[10px] text-gray-400 block leading-normal mt-1">
                Must be an active GitLab repository belonging to your verified account namespace.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-gray-700 font-semibold block flex items-center justify-between">
                <span>Personal Access Token (PAT)</span>
                <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-1 rounded block">Required</span>
              </label>
              <input
                type="password"
                required
                value={patInput}
                onChange={(e) => setPatInput(e.target.value)}
                placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <span className="text-[10px] text-gray-400 block leading-normal mt-1">
                Creates a read-only token to permit our compiler gateway to fetch and analyze your codebase.
              </span>
            </div>

            <button
              type="submit"
              disabled={isLinking}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold cursor-pointer disabled:opacity-50 transition-all select-none pt-2"
            >
              {isLinking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating Repository...</span>
                </>
              ) : (
                <>
                  <GitPullRequest className="w-4 h-4" />
                  <span>Authenticate & Link Repository</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Linked Repositories List Container */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-bold text-gray-900">
                My Linked Classroom Repositories
              </h4>
            </div>
            <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full border border-gray-150">
              {linkedRepos.length} Total
            </span>
          </div>

          {linkedRepos.length > 0 ? (
            <div className="space-y-4 max-h-[350px] overflow-y-auto scrollbar-thin">
              {linkedRepos.map((link) => {
                let statusBadge = "bg-yellow-50 text-yellow-600 border border-yellow-100";
                if (link.status === "Synced & Verified") {
                  statusBadge = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                } else if (link.status === "Running Builds") {
                  statusBadge = "bg-blue-50 text-blue-600 border border-blue-150 animate-pulse";
                }

                return (
                  <div key={link.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block">TARGET REQUISITE COURSE</span>
                        <h5 className="font-bold text-gray-900 leading-tight">
                          {link.assignmentName}
                        </h5>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap ${statusBadge}`}>
                        {link.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px] font-mono pt-2 border-t border-gray-150">
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase">Grade Output</span>
                        <span className={`font-bold ${link.grade?.includes("Pending") ? "text-gray-500" : "text-blue-600"}`}>
                          {link.grade || "Waiting test"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[9px] uppercase">Last Commit</span>
                        <span className="text-gray-600 font-semibold">{link.commitHash ? `sha-${link.commitHash}` : "No push"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400 block text-[9px] uppercase">GitLab URL</span>
                        <a href={link.gitlabRepoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block flex items-center gap-1">
                          <span className="truncate">{link.gitlabRepoUrl.replace("https://", "")}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </div>

                    {/* Operational row */}
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => handleSyncRepo(link.id)}
                        disabled={syncingRepoId === link.id}
                        className="px-2.5 py-1 text-[10.5px] font-semibold bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-md cursor-pointer flex items-center gap-1.5 transition-all select-none disabled:opacity-40"
                      >
                        <RefreshCw className={`w-3 h-3 ${syncingRepoId === link.id ? "animate-spin" : ""}`} />
                        <span>Re-Sync Pipeline</span>
                      </button>

                      <button
                        onClick={() => handleRemoveLink(link.id)}
                        className="p-1 px-2.5 text-[10.5px] font-semibold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-md cursor-pointer flex items-center gap-1 transition-all select-none"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Unlink</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <FolderOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500 font-medium">No active agricultural GitLab repositories linked yet.</p>
              <p className="text-[10px] text-gray-400 mt-1">Authenticate your credentials using the left panel to trigger initial pipeline evaluations.</p>
            </div>
          )}
        </div>

      </div>

      {/* SECTION 4: LECTURE MATERIALS VAULT (The central PDF, Slides, Assignment briefs portal) */}
      <div className="space-y-6 pt-4">
        
        {/* Header with quick categorization */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-1.5">
              <FolderOpen className="w-5 h-5 text-gray-900" />
              <h3 className="text-lg font-sans font-extrabold text-[#111827] tracking-tight">
                Lecture Notes, Slides & PDF Library Vault
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Download syllabus handouts, lecture slide notes, and companion documents synced from professor accounts.</p>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 h-9"
          >
            <Plus className="w-4 h-4" />
            <span>Upload My Document</span>
          </button>
        </div>

        {/* Filtering Grid Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-gray-50 p-4 border border-gray-200 rounded-xl">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents, topics, or course ties..."
              className="w-full bg-white border border-gray-350 rounded-lg py-2 pl-9 pr-4 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 placeholder-gray-400"
            />
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-2">
            
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-gray-400 uppercase">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg p-1.5 text-xs font-semibold text-gray-700 focus:outline-none"
              >
                <option value="All">All Formats</option>
                <option value="PDF Guide">PDF Guides</option>
                <option value="Lecture Slides">Lecture Slides</option>
                <option value="Cheat Sheet">Cheat Sheets</option>
                <option value="Lecture Video">Lecture Videos</option>
                <option value="Assignment Brief">Assignment Briefs</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-gray-400 uppercase">Course:</span>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="bg-white border border-gray-300 rounded-lg p-1.5 text-xs font-semibold text-gray-700 focus:outline-none max-w-[200px] truncate"
              >
                <option value="All">All Courses</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Resources Cards Grid */}
        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((res) => {
              let typeIcon = <FileText className="w-4 h-4" />;
              let badgeColor = "bg-blue-50 text-blue-600 border border-blue-100";
              
              if (res.category === "Lecture Slides") {
                typeIcon = <Presentation className="w-4 h-4" />;
                badgeColor = "bg-purple-50 text-purple-600 border border-purple-100";
              } else if (res.category === "PDF Guide") {
                typeIcon = <FileCode className="w-4 h-4" />;
                badgeColor = "bg-emerald-50 text-emerald-600 border border-emerald-100";
              } else if (res.category === "Cheat Sheet") {
                typeIcon = <Sparkles className="w-4 h-4" />;
                badgeColor = "bg-amber-50 text-amber-600 border border-amber-100";
              }

              return (
                <div key={res.id} className="bg-white border border-gray-200/80 rounded-2xl p-5 hover:border-gray-300 hover:shadow-sm transition-all flex flex-col justify-between space-y-4">
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${badgeColor}`}>
                        {typeIcon}
                        <span>{res.category}</span>
                      </span>

                      <span className="text-[10px] font-mono text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                        {res.fileSize || "Link"}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-gray-900 leading-snug">
                        {res.title}
                      </h4>
                      <span className="text-[10px] font-mono text-blue-600 font-bold block">
                        🎒 {res.courseTitle}
                      </span>
                      <p className="text-xs text-gray-500 leading-normal line-clamp-2">
                        {res.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono text-gray-400 block uppercase">Uploaded Time</span>
                      <span className="text-[10px] font-mono font-medium text-gray-600">
                        {new Date(res.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {res.source === "User Submitted" && (
                        <button
                          onClick={() => handleDeleteResource(res.id)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 cursor-pointer transition-colors"
                          title="Delete supplemental file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {res.url ? (
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <span>Open Attachment</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <button
                          onClick={() => alert(`Simulating file download: "${res.title}" (${res.fileSize || 'N/A'}). File extraction active.`)}
                          className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-gray-700 cursor-pointer"
                        >
                          <span>Download PDF</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 max-w-sm mx-auto p-6">
            <HelpCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h5 className="text-xs font-bold text-gray-900">No Matching Materials Found</h5>
            <p className="text-[11px] text-gray-500 mt-1">Adjust search parameters or choose another course category.</p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("All"); setSelectedCourseId("All"); }}
              className="mt-4 px-4 py-1.5 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

      </div>

      {/* --- ADD SUPPLEMENTARY RESOURCE MODAL --- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs select-none">
          <div className="bg-white border border-gray-200 shadow-2xl rounded-3xl w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-150 pb-3">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Submit Supplemental Academy Resource</span>
              </h4>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800 flex items-center justify-center font-bold font-sans cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {uploadSuccessMsg ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <Check className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-gray-900">{uploadSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                
                {/* Drag Drop Area */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                    dragActive ? "border-blue-500 bg-blue-50/40" : "border-gray-250 bg-gray-50 hover:bg-gray-100/60"
                  }`}
                  onClick={() => document.getElementById("file-picker")?.click()}
                >
                  <input 
                    type="file" 
                    id="file-picker"
                    className="hidden" 
                    onChange={handleFileSelect}
                    accept=".pdf,.pptx,.ppt,.docx,.xlsx,.txt"
                  />
                  
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  {uploadFile ? (
                    <div className="space-y-0.5">
                      <p className="font-bold text-blue-600 truncate max-w-xs mx-auto">
                        📄 {uploadFile.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        ({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB) - Ready to stage
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-gray-700">Drag & Drop file card, or click to browse</p>
                      <span className="text-[10px] text-gray-400 block">Supports PDF, PPTX or Word Handouts up to 20MB</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-gray-700 font-semibold block">Format / Category</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value as any)}
                      className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:outline-none"
                    >
                      <option value="PDF Guide">PDF Guide</option>
                      <option value="Lecture Slides">Lecture Slides</option>
                      <option value="Cheat Sheet">Cheat Sheet</option>
                      <option value="Lecture Video">Lecture Video</option>
                      <option value="Assignment Brief">Assignment Brief</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-700 font-semibold block">Syllabus Association</label>
                    <select
                      value={uploadCourseId}
                      onChange={(e) => setUploadCourseId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:outline-none"
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-700 font-semibold block">Document Title / Name</label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Lecture 4 Supplementary: Backprop matrix multiplications"
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-1">
                  <label className="text-gray-700 font-semibold block">External Resource URL (Optional)</label>
                  <input
                    type="url"
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    placeholder="https://gitlab.com/... or google drive sharing link..."
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-700 font-semibold block">Brief Description</label>
                  <textarea
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    placeholder="Summarize structural keypoints outlined in this supplemental material..."
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2 flex gap-3 justify-end text-xs">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold cursor-pointer"
                  >
                    Upload Document
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
