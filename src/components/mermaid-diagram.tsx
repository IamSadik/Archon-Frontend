"use client"

import { useEffect, useId, useState } from "react"
import mermaid from "mermaid"

type MermaidDiagramProps = {
  chart: string
}

let mermaidInitialized = false

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const [svg, setSvg] = useState("")
  const [error, setError] = useState("")
  const id = useId()

  useEffect(() => {
    async function renderChart() {
      try {
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "default",
            securityLevel: "strict",
          })
          mermaidInitialized = true
        }

        const renderId = `mermaid-${id.replace(/[:]/g, "")}`
        const { svg } = await mermaid.render(renderId, chart)
        setSvg(svg)
        setError("")
      } catch {
        setError("Unable to render flowchart.")
      }
    }

    renderChart()
  }, [chart, id])

  if (error) {
    return <div className="rounded-md border p-3 text-sm text-destructive">{error}</div>
  }

  if (!svg) {
    return <div className="rounded-md border p-3 text-sm text-muted-foreground">Rendering diagram...</div>
  }

  return <div className="overflow-x-auto rounded-md border bg-background p-4 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
}
