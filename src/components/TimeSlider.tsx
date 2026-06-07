import { useMapStore } from '../store/mapStore'
import { calcMissionThroughput } from '../lib/throughput'

interface Props {
  isPlaying: boolean
  onPlayPause: () => void
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.floor(minutes % 60)
  return `T+${h}h ${m.toString().padStart(2, '0')}m`
}

export default function TimeSlider({ isPlaying, onPlayPause }: Props) {
  const {
    missionTime, setMissionTime,
    maxMissionTime, setMaxMissionTime,
    supplyNodes, fleet, nodes,
    selectedSupplyNodeId,
  } = useMapStore()

  // Compute aggregate stats for the selected supply node (or first available)
  const focusNode = supplyNodes.find((n) => n.id === selectedSupplyNodeId) ?? supplyNodes[0] ?? null
  const focusAircraft = focusNode ? fleet.filter((a) => a.supplyNodeId === focusNode.id) : []
  const focusMission =
    focusNode && focusAircraft.length > 0
      ? calcMissionThroughput(focusNode, focusAircraft, nodes, missionTime)
      : null

  return (
    <div
      className="flex-none border-t border-border"
      style={{
        background: 'var(--color-bg)',
        padding: '8px 16px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        minHeight: '64px',
      }}
    >
      {/* Slider row */}
      <div className="flex items-center gap-3">
        {/* Play/pause */}
        <button
          onClick={onPlayPause}
          title="Play/Pause simulation (Spacebar)"
          style={{
            background: isPlaying ? '#4488FF' : 'var(--color-surface)',
            border: `1px solid ${isPlaying ? '#4488FF' : 'var(--color-border)'}`,
            color: isPlaying ? 'var(--color-bg)' : 'var(--color-text-muted)',
            borderRadius: '4px',
            width: '26px',
            height: '26px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <span className="text-xs font-mono flex-none" style={{ color: 'var(--color-accent)', minWidth: '80px' }}>
          {formatTime(missionTime)}
        </span>

        <input
          type="range"
          min={0}
          max={maxMissionTime}
          step={10}
          value={missionTime}
          onChange={(e) => setMissionTime(Number(e.target.value))}
          style={{ flex: 1 }}
        />

        <div className="flex items-center gap-1 flex-none">
          <input
            type="number"
            min={1}
            max={240}
            step={1}
            value={Math.round(maxMissionTime / 60)}
            onChange={(e) => setMaxMissionTime(Math.max(1, Math.min(240, Number(e.target.value))) * 60)}
            title="Max mission time (hours)"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              fontSize: '11px',
              padding: '2px 4px',
              borderRadius: '3px',
              width: '36px',
              outline: 'none',
              textAlign: 'center',
            }}
          />
          <span className="text-muted text-xs">h max</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs flex-wrap">
        {focusMission ? (
          <>
            {focusNode && (
              <span className="text-muted">
                <strong style={{ color: '#FFCC00' }}>{focusNode.name}</strong>:
              </span>
            )}
            <span style={{ color: '#FFCC00' }}>
              Delivered:{' '}
              <strong>
                {focusMission.totalPayloadDelivered.toLocaleString('en-US', { maximumFractionDigits: 0 })} lbs
              </strong>
            </span>
            <span className="text-muted">|</span>
            <span className="text-muted">
              Trips: <strong style={{ color: 'var(--color-text-primary)' }}>{focusMission.totalTrips}</strong>
            </span>
            <span className="text-muted">|</span>
            <span className="text-muted">
              Aircraft: <strong style={{ color: 'var(--color-text-primary)' }}>{focusAircraft.length}</strong>
            </span>
            {supplyNodes.length > 1 && (
              <>
                <span className="text-muted">|</span>
                <span className="text-muted">
                  {supplyNodes.length} supply nodes total
                </span>
              </>
            )}
          </>
        ) : (
          <span className="text-muted">
            {supplyNodes.length > 0
              ? 'Select a supply node and assign aircraft to view mission stats'
              : 'Place a supply node on the map to begin'}
          </span>
        )}
      </div>
    </div>
  )
}
