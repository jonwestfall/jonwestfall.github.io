import type { ExampleDataset } from '../types'

interface LandingProps {
  onStart: () => void
  onLoadExample: (example: ExampleDataset) => void
  examples: ExampleDataset[]
}

export function Landing({ onStart, onLoadExample, examples }: LandingProps) {
  return (
    <section className="landing">
      <div className="hero">
        <p className="eyebrow">Different Enough?</p>
        <h1>Is that signal, or just noise?</h1>
        <p className="subtitle">
          A practical inferential statistics helper for curious data users. Decision support first, deeper
          teaching when you want it.
        </p>
        <button onClick={onStart} className="primary">Start an analysis</button>
      </div>

      <div className="panel-grid">
        <article className="panel">
          <h3>How it works</h3>
          <ol>
            <li>Pick a question path or data path.</li>
            <li>Map your variables and run a suitable test.</li>
            <li>Read plain-language output, trust checks, and APA report.</li>
          </ol>
        </article>
        <article className="panel">
          <h3>Important reminder</h3>
          <p>Statistical significance is not practical significance. Tiny effects can be real and still unimportant.</p>
        </article>
        <article className="panel">
          <h3>Privacy</h3>
          <p>Data stay in your browser unless you explicitly export a JSON file.</p>
        </article>
      </div>

      <section className="examples">
        <h2>Featured examples</h2>
        <div className="example-grid">
          {examples.map((example) => (
            <button key={example.id} className="example-card" onClick={() => onLoadExample(example)}>
              <h3>{example.title}</h3>
              <p className="muted">{example.subtitle}</p>
              <p>{example.description}</p>
            </button>
          ))}
        </div>
      </section>

      <footer className="links">
        <p>
          Links area: add your blog here in <code>src/components/Landing.tsx</code>.
        </p>
      </footer>
    </section>
  )
}
