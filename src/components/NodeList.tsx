import { useMapStore } from '../store/mapStore'

export default function NodeList() {
  const { nodes, selectedId, selectNode, deleteNode, fleet } = useMapStore()

  if (nodes.length === 0) {
    return (
      <div className="px-4 py-3 text-center text-muted text-xs leading-relaxed">
        No bases placed.<br />
        Use &quot;Place Base&quot; then click the map.
      </div>
    )
  }

  return (
    <div>
      {nodes.map((node) => {
        const acCount = fleet.filter((a) => a.baseId === node.id).length
        return (
          <div
            key={node.id}
            onClick={() => selectNode(node.id)}
            className="group flex items-center justify-between px-4 py-3 cursor-pointer transition-colors"
            style={{
              background: selectedId === node.id ? 'rgba(204,0,51,0.08)' : undefined,
              borderLeft: `2px solid ${selectedId === node.id ? 'var(--color-accent)' : 'transparent'}`,
            }}
            onMouseEnter={(e) => {
              if (selectedId !== node.id)
                (e.currentTarget as HTMLDivElement).style.background = 'var(--color-surface-hover)'
            }}
            onMouseLeave={(e) => {
              if (selectedId !== node.id)
                (e.currentTarget as HTMLDivElement).style.background = ''
            }}
          >
            <div className="min-w-0">
              <div
                className="text-xs font-medium truncate"
                style={{ color: selectedId === node.id ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
              >
                {node.name}
              </div>
              <div className="text-muted text-xs mt-0.5">
                {acCount} acft · {node.radiusNm} NM
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteNode(node.id)
              }}
              className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-accent text-base leading-none ml-2 flex-none transition-opacity"
              title="Delete base"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
