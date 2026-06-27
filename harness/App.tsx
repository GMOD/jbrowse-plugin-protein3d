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

type Source = 'pdb' | 'alphafold' | 'url'

interface RunInput {
  source: Source
  structureId: string
  customUrl: string
  uniprot: string
  transcript: string
}

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
  const [source, setSource] = useState<Source>('pdb')
  const [structureId, setStructureId] = useState('6M0J')
  const [customUrl, setCustomUrl] = useState('')
  const [uniprot, setUniprot] = useState('Q9BYF1')
  const [transcript, setTranscript] = useState('')
  const [loaded, setLoaded] = useState<LoadedStructure>()
  const [diag, setDiag] = useState<Diagnosis>()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  // Takes explicit input so an example click can run immediately without
  // waiting for setState to flush.
  async function run(input: RunInput) {
    setBusy(true)
    setDiag(undefined)
    setLoaded(undefined)
    const url =
      input.source === 'url'
        ? input.customUrl
        : input.source === 'alphafold'
          ? alphaFoldUrl(input.structureId)
          : pdbUrl(input.structureId)
    try {
      if (!pluginRef.current && viewerRef.current) {
        setStatus('Initializing molstar…')
        pluginRef.current = await createPlugin(viewerRef.current)
      }
      const plugin = pluginRef.current!

      let seq = input.transcript.trim().replaceAll(/\s+/g, '')
      if (!seq && input.uniprot.trim()) {
        setStatus(`Fetching UniProt ${input.uniprot}…`)
        seq = await fetchUniProtSeq(input.uniprot.trim())
        setTranscript(seq)
      }
      if (!seq) {
        throw new Error('Provide a sequence or UniProt accession')
      }

      setStatus(`Loading ${url}…`)
      const result = await loadAndIntrospect({ url, plugin })
      setLoaded(result)
      setDiag(
        diagnose({
          loaded: result,
          transcript: seq,
          algorithm: 'smith_waterman',
          isAlphaFold: input.source === 'alphafold',
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

  function runCurrent() {
    void run({ source, structureId, customUrl, uniprot, transcript })
  }

  function applyExample(ex: Example) {
    setSource(ex.source)
    setStructureId(ex.structureId)
    setUniprot(ex.uniprot)
    setTranscript('')
    void run({
      source: ex.source,
      structureId: ex.structureId,
      customUrl: '',
      uniprot: ex.uniprot,
      transcript: '',
    })
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', fontSize: 13 }}>
      <div style={{ width: 460, overflow: 'auto', padding: 10, borderRight: '1px solid #ddd' }}>
        <div style={{ fontWeight: 'bold', marginBottom: 2 }}>
          PDB ↔ transcript mapping harness
        </div>
        <div style={{ color: '#666', fontSize: 11, marginBottom: 8 }}>
          Loads a structure through the plugin's real mapping code and flags what
          its entity-[0]-only, label_seq_id mapping does to multi-chain / partial
          structures.
        </div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 }}>
          <select value={source} onChange={e => setSource(e.target.value as Source)}>
            <option value="pdb">PDB ID</option>
            <option value="alphafold">AlphaFold</option>
            <option value="url">URL</option>
          </select>
          {source === 'url' ? (
            <input
              style={{ flex: 1, minWidth: 140 }}
              placeholder="https://…/structure.cif"
              value={customUrl}
              onChange={e => setCustomUrl(e.target.value)}
            />
          ) : (
            <input
              style={{ width: 90 }}
              value={structureId}
              onChange={e => setStructureId(e.target.value)}
              placeholder={source === 'pdb' ? '6M0J' : 'P38398'}
            />
          )}
          <input
            style={{ width: 90 }}
            value={uniprot}
            onChange={e => setUniprot(e.target.value)}
            placeholder="UniProt"
            title="UniProt accession — auto-fetched if the sequence box is empty"
          />
          <button onClick={() => runCurrent()} disabled={busy} style={{ fontWeight: 'bold' }}>
            {busy ? 'Working…' : 'Load'}
          </button>
        </div>
        <textarea
          style={{ width: '100%', height: 36, fontFamily: 'monospace', fontSize: 10, boxSizing: 'border-box' }}
          placeholder="optional: paste a protein sequence (overrides UniProt)"
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
        />
        {status ? <div style={{ color: '#b00020', fontSize: 12 }}>{status}</div> : null}

        <div style={{ fontWeight: 'bold', fontSize: 11, margin: '8px 0 2px' }}>
          Examples (click to load)
        </div>
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            onClick={() => applyExample(ex)}
            disabled={busy}
            title={ex.note}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              width: '100%',
              textAlign: 'left',
              border: '1px solid #ddd',
              background: '#fff',
              padding: '3px 6px',
              marginBottom: 2,
              cursor: busy ? 'default' : 'pointer',
              fontSize: 12,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: '#fff',
                background: sevColor[ex.expectSeverity],
                borderRadius: 3,
                padding: '1px 4px',
                whiteSpace: 'nowrap',
              }}
            >
              {ex.expect}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ex.label}
            </span>
          </button>
        ))}

        {diag && loaded ? <Report diag={diag} loaded={loaded} transcript={transcript} /> : null}
      </div>

      <div ref={viewerRef} style={{ flex: 1, position: 'relative' }} />
    </div>
  )
}

const sectionHead: React.CSSProperties = {
  fontWeight: 'bold',
  fontSize: 12,
  margin: '10px 0 3px',
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
    <div>
      <div style={sectionHead}>Verdicts</div>
      {diag.verdicts.map(v => (
        <div
          key={v.code}
          style={{
            borderLeft: `4px solid ${sevColor[v.severity]}`,
            padding: '3px 6px',
            margin: '3px 0',
            background: '#fafafa',
            fontSize: 12,
          }}
        >
          <strong style={{ color: sevColor[v.severity] }}>{v.code}</strong>
          <div>{v.message}</div>
        </div>
      ))}

      <div style={sectionHead}>Polymer entities ({loaded.entities.length})</div>
      <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
        <thead>
          <tr>
            {['#', 'entity', 'chains', 'len', 'modeled', 'id%', 'tx-cov%', 'role'].map(h => (
              <th key={h} style={{ ...cell, textAlign: 'left' }}>{h}</th>
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
                <td style={cell}>{used ? 'USED[0]' : best ? 'best' : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {loaded.ligands.length ? (
        <div style={{ fontSize: 10, color: '#666', marginTop: 3 }}>
          + non-polymer: {loaded.ligands.join(', ')}
        </div>
      ) : null}

      <div style={sectionHead}>Coordinate map sample (entity [0])</div>
      <div style={{ fontSize: 10, color: '#666' }}>
        structureSeqPos → transcriptPos, first {sample.length} of {mapKeys.length}:
      </div>
      <code style={{ fontSize: 10 }}>
        {sample.map(k => `${k}→${map[k]}`).join('  ') || '(none — entity [0] does not map to this transcript)'}
      </code>
    </div>
  )
}

const cell: React.CSSProperties = { border: '1px solid #ccc', padding: '1px 4px' }
