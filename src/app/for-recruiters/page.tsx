import Link from "next/link"
import Image from "next/image"
import { ArrowRight, BrainCircuit, Database, Network, ShieldCheck, Workflow } from "lucide-react"

import { MermaidDiagram } from "@/components/mermaid-diagram"
import { ModeToggle } from "@/components/mode-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

const architectureLayers = [
  {
    title: "Experience Layer",
    description: "Next.js interface with auth, dashboard, chat, planning, memory, and workspace controls.",
  },
  {
    title: "API & Realtime Layer",
    description: "Django REST API for CRUD + orchestration endpoints, and Channels WebSockets for live agent updates.",
  },
  {
    title: "Intelligence Layer",
    description: "Master Orchestrator routes intent to Planner and Autonomous Executor with checkpoints and callbacks.",
  },
  {
    title: "Knowledge Layer",
    description: "Hybrid memory (short-term + long-term) and Pinecone vector search for retrieval-augmented context.",
  },
]

const strengths = [
  "Multi-agent orchestration with planner/executor collaboration",
  "RAG + persistent memory for context continuity",
  "Asynchronous background execution with Celery and Redis",
  "Realtime user feedback with WebSocket event streams",
  "Project-aware coding workflows with context indexing and semantic retrieval",
  "Production-ready security setup with JWT auth, OTP recovery, and hardening",
]

const platformHighlights = [
  {
    icon: Workflow,
    title: "Autonomous Workflow Engine",
    description:
      "I designed Archon to go beyond chat: user intent is classified, decomposed into plans, executed in steps, and persisted for resumability.",
  },
  {
    icon: Database,
    title: "Memory + RAG Infrastructure",
    description:
      "Archon stores short-term and long-term memory, scores relevance, and injects retrieved context into prompts so answers remain coherent over time.",
  },
  {
    icon: Network,
    title: "Modular Service Architecture",
    description:
      "Backend apps are separated by domain (agents, planning, memory, chat, context, vector store), making the system easier to scale and maintain.",
  },
  {
    icon: ShieldCheck,
    title: "Production-focused Engineering",
    description:
      "The platform includes authentication flows, secure token handling, async workers, realtime channels, and deploy-ready configuration.",
  },
]

const screenshots = [
  { src: "/archon-ss/shot-landing.png", title: "Landing", caption: "Public entrypoint with product positioning and onboarding CTAs." },
  { src: "/archon-ss/shot-dashboard.png", title: "Dashboard", caption: "Operational center to manage projects, sessions, and progress." },
  { src: "/archon-ss/shot-agentic-chat.png", title: "Agentic Chat", caption: "Conversation interface with context-aware AI responses and actions." },
  { src: "/archon-ss/shot-agents.png", title: "Multi Agents", caption: "Agent sessions, execution states, and orchestration visibility." },
  { src: "/archon-ss/shot-memory.png", title: "Memory", caption: "Short-term and long-term memory system with retrieval workflows." },
  { src: "/archon-ss/shot-project-planning.png", title: "Project Planning", caption: "Feature and task decomposition driven by planner intelligence." },
  { src: "/archon-ss/shot-workspace.png", title: "Workspace", caption: "Project-aware context and codebase operations across files." },
  {
    src: "/archon-ss/shot-workspace-customization.png",
    title: "Workspace Customization",
    caption: "Configurable workspace behavior to match project and developer preferences.",
  },
]

export default function ArchonFeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="container flex h-14 items-center px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <span>Archon</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">
                Try Archon
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <ModeToggle />
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-4xl text-center">
              <Badge variant="outline" className="mb-4">
                Product and architecture walkthrough
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Archon Features: Autonomous Multi-Agent Engineering
              </h1>
              <p className="mt-6 text-base text-muted-foreground md:text-lg">
                I built Archon to act like a long-term engineering partner, not a one-shot chatbot. It combines orchestration, planning,
                memory, retrieval, and developer tooling so software work can be executed in reliable multi-step workflows.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Architecture at a glance</h2>
              <Badge variant="secondary">Backend + Frontend + Realtime</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {architectureLayers.map((layer) => (
                <Card key={layer.title}>
                  <CardHeader>
                    <CardTitle className="text-lg">{layer.title}</CardTitle>
                    <CardDescription>{layer.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <Card className="mt-6 border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Multi-agent workflow (Mermaid)</CardTitle>
                <CardDescription>Request lifecycle across orchestration, planning, execution, and realtime updates.</CardDescription>
              </CardHeader>
              <CardContent>
                <MermaidDiagram
                  chart={`flowchart TD
  A[User Request] --> B[REST or WebSocket Ingress]
  B --> C[Master Orchestrator]
  C --> D{Intent Type}
  D -->|Planning| E[Planner Orchestrator]
  D -->|Execution| F[Autonomous Executor]
  D -->|Query or Control| G[Session State and Controls]
  E --> H[Feature and Task Graph]
  F --> I[Tool Calls and Code Actions]
  I --> J[Context + Vector Search]
  J --> K[Memory Service STM and LTM]
  K --> L[LLM Response]
  L --> M[Realtime Events + Persistent History]`}
                />
              </CardContent>
            </Card>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Memory and RAG flow (Mermaid)</CardTitle>
                <CardDescription>How Archon captures, retrieves, and reuses context over time.</CardDescription>
              </CardHeader>
              <CardContent>
                <MermaidDiagram
                  chart={`flowchart TD
  A[Conversation and Execution Events] --> B[Short-Term Memory]
  B --> C[Importance and Category Scoring]
  C --> D[Long-Term Memory]
  D --> E[Embedding Generation]
  E --> F[Pinecone Vector Store]
  G[New User Query] --> H[Semantic Retrieval]
  F --> H
  D --> H
  H --> I[Prompt Context Builder]
  I --> J[LLM Response]
  J --> K[Store New Learnings Back to Memory]`}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y bg-muted/30 py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <h2 className="mb-8 text-2xl font-semibold">Core platform capabilities</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {platformHighlights.map((item) => (
                <Card key={item.title}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <item.icon className="h-5 w-5 text-primary" />
                      {item.title}
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Core engineering strengths</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {strengths.map((strength) => (
                  <div key={strength} className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
                    {strength}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container px-4 md:px-6">
            <h2 className="mb-2 text-2xl font-semibold">Product walkthrough screenshots</h2>
            <p className="mb-8 text-sm text-muted-foreground">
              These are real views from the deployed product and map directly to the architecture and workflow above.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {screenshots.map((shot) => (
                <Card key={shot.title} className="overflow-hidden">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button type="button" className="relative block aspect-[16/10] w-full bg-muted text-left">
                        <Image
                          src={shot.src}
                          alt={`Archon ${shot.title} screenshot`}
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover object-top transition duration-200 hover:scale-[1.02]"
                        />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-6xl p-3 sm:p-6">
                      <DialogHeader>
                        <DialogTitle>{shot.title}</DialogTitle>
                      </DialogHeader>
                      <div className="relative mt-2 h-[78vh] w-full overflow-auto rounded-md border bg-muted">
                        <Image
                          src={shot.src}
                          alt={`Archon ${shot.title} full screenshot`}
                          width={1800}
                          height={1100}
                          unoptimized
                          className="mx-auto h-full w-full object-contain object-center"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                  <CardHeader>
                    <CardTitle className="text-base">{shot.title}</CardTitle>
                    <CardDescription>{shot.caption}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t py-14">
          <div className="container px-4 md:px-6">
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle>Project quick summary</CardTitle>
                <CardDescription>
                  Archon is a full-stack AI engineering platform I built end-to-end using modern backend orchestration patterns and
                  production-grade frontend UX.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/register">Create account</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link href="/">Back to home</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}
