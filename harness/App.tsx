import React, { useRef, useState } from 'react'

import { diagnose, sampleCoordinateMap } from './diagnostics'
import { EXAMPLES } from './examples'
import { createPlugin, loadAndIntrospect } from './molstar'

import type { Diagnosis, Severity } from './diagnostics'
import type { Example } from './examples'
import type { LoadedStructure } from './molstar'
import type { PluginContext } from 'molstar/lib/mol-plugin/context'

// mirrors src/LaunchProteinView/utils/launchViewUtils.ts (inlined to avoid
// pulling JBrowse runtime deps into the harness)
const pdbUrl = (id: string) => `https://files.rcsb.org/download/${id}.cif`
const alphaFoldUrl = (acc: string) =>
  `https://alphafold.ebi.ac.uk/files/AF-${acc}-F1-model_v6.cif`

async function fetchUniProtSeq(acc: string) {
  const res = await fetch(`https://rest.uniprot.org/uniprotkb/${acc}.fasta`)
  if (!res.ok) {
    throw new Error(`UniProt ${acc}: ${res.status}`)
  }
  const text = await res.text()
  return text
    .split('\n')
    .filter(l => l && !l.startsWith('>'))
    .join('')
}

const sevColor: Record<Severity, string> = {
  error: '#b00020',
  warn: '#9a6700',
  ok: '#1a7f37',
}

export default function App() {
  const viewerRef = useRef<HTMLDivElement>(null)
  const pluginRef = useRef<PluginContext | null>(null)
  const [source, setSource] = useState<'pdb' | 'alphafold' | 'url'>('pdb')
  const [structureId, setStructureId] = useState('6M0J')
  const [customUrl, setCustomUrl] = useState('')
  const [uniprot, setUniprot] = useState('Q9BYF1')
  const [transcript, setTranscript] = useState('')
  const [loaded, setLoaded] = useState<LoadedStructure>()
  const [diag, setDiag] = useState<Diagnosis>()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const structureUrl =
    source === 'url'
      ? customUrl
      : source === 'alphafold'
        ? alphaFoldUrl(structureId)
        : pdbUrl(structureId)

  async function run() {
    setBusy(true)
    setDiag(undefined)
    setLoaded(undefined)
    try {
      if (!pluginRef.current && viewerRef.current) {
        setStatus('Initializing molstar…')
        pluginRef.current = await createPlugin(viewerRef.current)
      }
      const plugin = pluginRef.current!

      let seq = transcript.trim().replaceAll(/\s+/g, '')
      if (!seq && uniprot.trim()) {
        setStatus(`Fetching UniProt ${uniprot}…`)
        seq = await fetchUniProtSeq(uniprot.trim())
        setTranscript(seq)
      }
      if (!seq) {
        throw new Error('Provide a transcript/protein sequence or UniProt acc')
      }

      setStatus(`Loading ${structureUrl}…`)
      const result = await loadAndIntrospect({ url: structureUrl, plugin })
      setLoaded(result)

      setStatus('Diagnosing…')
      setDiag(
        diagnose({
          loaded: result,
          transcript: seq,
          algorithm: 'smith_waterman',
          isAlphaFold: source === 'alphafold',
        }),
      )
      setStatus('')
    } catch (e) {
      console.error(e)
      setStatus(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  function applyExample(ex: Example) {
    setSource(ex.source)
    setStructureId(ex.structureId)
    setUniprot(ex.uniprot)
    setTranscript('')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ width: 520, overflow: 'auto', padding: 16, borderRight: '1px solid #ddd' }}>
        <h2 style={{ marginTop: 0 }}>PDB ↔ transcript mapping harness</h2>
        <p style={{ color: '#555', fontSize: 13 }}>
          Loads a structure through the plugin's real molstar path and shows what
          its entity-[0]-only, label_seq_id mapping does to multi-chain / partial
          structures.
        </p>

        <div style={{ marginBottom: 12 }}>
          <strong>Examples</strong>
          {EXAMPLES.map(ex => (
            <div key={ex.label} style={{ margin: '6px 0' }}>
              <button onClick={() => applyExample(ex)} disabled={busy}>
                {ex.label}
              </button>{' '}
              <span
                style={{
                  fontSize: 10,
                  color: '#fff',
                  background: sevColor[ex.expectSeverity],
                  borderRadius: 3,
                  padding: '1px 4px',
                }}
              >
                {ex.expect}
              </span>
              <div style={{ fontSize: 11, color: '#666' }}>{ex.note}</div>
            </div>
          ))}
        </div>

        <fieldset style={{ marginBottom: 12 }}>
          <legend>Structure</legend>
          {(['pdb', 'alphafold', 'url'] as const).map(s => (
            <label key={s} style={{ marginRight: 8 }}>
              <input type="radio" checked={source === s} onChange={() => setSource(s)} />{' '}
              {s === 'pdb' ? 'PDB ID' : s === 'alphafold' ? 'AlphaFold UniProt' : 'URL'}
            </label>
          ))}
          <div style={{ marginTop: 6 }}>
            {source === 'url' ? (
              <input
                style={{ width: '100%' }}
                placeholder="https://…/structure.cif"
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
              />
            ) : (
              <input
                value={structureId}
                onChange={e => setStructureId(e.target.value)}
                placeholder={source === 'pdb' ? 'e.g. 6M0J' : 'e.g. P38398'}
              />
            )}
          </div>
        </fieldset>

        <fieldset style={{ marginBottom: 12 }}>
          <legend>Transcript / protein sequence</legend>
          <div>
            UniProt acc:{' '}
            <input value={uniprot} onChange={e => setUniprot(e.target.value)} placeholder="auto-fetch if box below empty" />
          </div>
          <textarea
            style={{ width: '100%', height: 70, marginTop: 6, fontFamily: 'monospace', fontSize: 11 }}
            placeholder="…or paste a protein sequence (overrides UniProt)"
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
          />
        </fieldset>

        <button onClick={() => void run()} disabled={busy} style={{ fontSize: 16, padding: '6px 16px' }}>
          {busy ? 'Working…' : 'Load & diagnose'}
        </button>
        {status ? <div style={{ marginTop: 8, color: '#b00020' }}>{status}</div> : null}

        {diag && loaded ? <Report diag={diag} loaded={loaded} transcript={transcript} /> : null}
      </div>

      <div ref={viewerRef} style={{ flex: 1, position: 'relative' }} />
    </div>
  )
}

function Report({
  diag,
  loaded,
  transcript,
}: {
  diag: Diagnosis
  loaded: LoadedStructure
  transcript: string
}) {
  const usedSeq = loaded.entities[diag.usedIndex]?.seq ?? ''
  const map = sampleCoordinateMap(transcript, usedSeq)
  const mapKeys = Object.keys(map).map(Number).sort((a, b) => a - b)
  const sample = mapKeys.slice(0, 8)

  return (
    <div style={{ marginTop: 16 }}>
      <h3>Verdicts</h3>
      {diag.verdicts.map(v => (
        <div
          key={v.code}
          style={{
            borderLeft: `4px solid ${sevColor[v.severity]}`,
            padding: '4px 8px',
            margin: '6px 0',
            background: '#fafafa',
            fontSize: 13,
          }}
        >
          <strong style={{ color: sevColor[v.severity] }}>{v.code}</strong>
          <div>{v.message}</div>
        </div>
      ))}

      <h3>Polymer entities ({loaded.entities.length})</h3>
      <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
        <thead>
          <tr>
            {['#', 'entity', 'chains', 'len', 'modeled', 'id%', 'tx-cov%', 'role'].map(h => (
              <th key={h} style={{ border: '1px solid #ccc', padding: '2px 4px', textAlign: 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {diag.alignments.map(a => {
            const used = a.entity.index === diag.usedIndex
            const best = a.entity.index === diag.bestIndex
            return (
              <tr key={a.entity.index} style={{ background: used ? '#fff3cd' : best ? '#d1f0d9' : undefined }}>
                <td style={cell}>{a.entity.index}</td>
                <td style={cell} title={a.entity.entityId}>{a.entity.description}</td>
                <td style={cell}>{a.entity.chains.join(',')}</td>
                <td style={cell}>{a.entity.seqLength}</td>
                <td style={cell}>{a.entity.observedCount}</td>
                <td style={cell}>{(a.identity * 100).toFixed(0)}</td>
                <td style={cell}>{(a.transcriptCoverage * 100).toFixed(0)}</td>
                <td style={cell}>{used ? 'USED[0]' : best ? 'best-match' : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {loaded.ligands.length ? (
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
          + non-polymer: {loaded.ligands.join(', ')}
        </div>
      ) : null}

      <h3>Coordinate map sample (entity [0])</h3>
      <div style={{ fontSize: 11, color: '#666' }}>
        structureSeqPos → transcriptPos, first {sample.length} of {mapKeys.length} mapped:
      </div>
      <code style={{ fontSize: 11 }}>
        {sample.map(k => `${k}→${map[k]}`).join('  ') || '(none — entity [0] does not map to this transcript)'}
      </code>
    </div>
  )
}

const cell: React.CSSProperties = { border: '1px solid #ccc', padding: '2px 4px' }
