import type { ReactNode, ThHTMLAttributes } from 'react'

interface ResizableThProps extends Omit<ThHTMLAttributes<HTMLTableCellElement>, 'style'> {
  colKey: string
  width: number
  onResizeStart: (colKey: string, clientX: number) => void
  onResetWidth?: (colKey: string) => void
  children: ReactNode
  /** Extra style merged with width */
  style?: React.CSSProperties
}

/**
 * Table header cell with a drag handle on the right edge to resize the column.
 * Double-click the handle to reset that column's width.
 */
export function ResizableTh({
  colKey,
  width,
  onResizeStart,
  onResetWidth,
  children,
  className = '',
  style,
  onClick,
  ...rest
}: ResizableThProps) {
  return (
    <th
      className={`resizable-th ${className}`.trim()}
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        ...style,
      }}
      onClick={onClick}
      {...rest}
    >
      <div className="resizable-th-inner">{children}</div>
      <span
        className="col-resize-handle"
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${colKey} column`}
        title="Drag to resize · double-click to reset"
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          onResizeStart(colKey, e.clientX)
        }}
        onDoubleClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onResetWidth?.(colKey)
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </th>
  )
}
