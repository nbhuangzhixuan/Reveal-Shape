import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { toCanvas } from 'html-to-image'
import {
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node
} from '@xyflow/react'
import type { Plan, TreeNode } from '@shared/index'
import { downloadDataUrl, sanitizeFilename } from '../../lib/export/download'
import { PlanNode, type PlanNodeData } from './PlanNode'

const NODE_WIDTH = 224
const NODE_HEIGHT = 104
// 节点上如果补了图（呈现阶段手动上传的截图/示意图），要多留一块缩略图 + 图注行的高度，
// 不能所有节点都按统一行高排——大多数节点没有图，不该被没图的节点撑得一样高。
// 有图片就一定会渲染图注行（哪怕没写图注也会显示"+ 加图注"这行占位，只读模式下才会不显示），
// 所以这块高度跟着图片本身走，不需要再单独判断 imageCaption 是否有值
const NODE_IMAGE_EXTRA_HEIGHT = 90
// 根节点标题是重构阶段生成的完整主题句，比普通子节点的短标题长得多，需要更宽的卡片才放得下；
// 高度不固定——不给 style.height，让卡片跟着文字实际长度自动撑高/收窄，长句子多占几行，
// 短句子就是一行的高度，不会像固定高度那样底下空出一大截
const ROOT_NODE_WIDTH = 300
const RANK_GAP = 80 // 横向：相邻两层之间的间隙
const ROW_GAP = 24 // 纵向：相邻两行之间的间隙

function nodeHeight(n: TreeNode): number {
  return n.imageDataUrl ? NODE_HEIGHT + NODE_IMAGE_EXTRA_HEIGHT : NODE_HEIGHT
}
const EXPORT_PADDING = 48
// html-to-image 是把整块内容包进一个 SVG <foreignObject> 一次性栅格化——树很大、
// foreignObject 声明的尺寸很大时，离原点较远的那部分内容经常直接画不出来（不报错，直接是空的），
// 这跟"canvas 总像素上限"是两个不同的限制。解法是不要一次性画一整棵大树：
// 把树切成一块一块不超过这个安全尺寸的小图，分块单独渲染（每一块离各自的局部原点都很近，可靠），
// 再在自己完全掌控的普通 canvas 上按位置把这些小图拼起来
const EXPORT_TILE_SIZE = 2000
// 导出成品图相对屏幕原始像素的放大倍率——1 倍是屏幕原始分辨率，偏糊；2 倍能让文字在放大查看
// 或打印时依然清晰，是常见的"高清导出"标准倍率
const EXPORT_PIXEL_RATIO = 2

const nodeTypes = { planNode: PlanNode }

export interface TreeCanvasHandle {
  exportImage: () => Promise<void>
}

interface TreeCanvasProps {
  plan: Plan
  readOnly?: boolean
  onEditNode?: (nodeId: string, patch: { title?: string; description?: string; imageCaption?: string }) => void
  onDeleteNode?: (nodeId: string) => void
  onAddSiblingNode?: (afterNodeId: string) => void
  onSetNodeImage?: (nodeId: string, dataUrl: string | null) => void
  // 重构阶段：当前选中的节点 id 集合（支持多选，共享对话框的改写目标）+ 点选/取消点选回调
  selectedNodeIds?: string[]
  onSelectNode?: (nodeId: string) => void
}

/**
 * 自己算布局，不用通用图布局库：横向位置=真实树深度（不会算错列），
 * 纵向位置用经典分层树算法——叶子按访问顺序依次占一行，父节点纵坐标取子节点的中点。
 * 子节点按数组原本的顺序访问，"有先后顺序"的兄弟节点天然从上到下排对，不需要额外补丁。
 */
function layoutTree(
  root: TreeNode,
  readOnly: boolean,
  onEditNode: TreeCanvasProps['onEditNode'],
  onDeleteNode: TreeCanvasProps['onDeleteNode'],
  onAddSiblingNode: TreeCanvasProps['onAddSiblingNode'],
  onSetNodeImage: TreeCanvasProps['onSetNodeImage'],
  selectedNodeIds: string[] | undefined,
  onSelectNode: TreeCanvasProps['onSelectNode']
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  // 累计的纵向游标（像素）——不能再用"第几行 × 统一行高"这种算法，带图的节点比普通节点高，
  // 每放完一个叶子节点就按它实际占的高度往下推进游标，行与行之间的间距不再是固定值
  let cursorY = 0

  const visit = (n: TreeNode, parentId: string | null, depth: number, order?: number): number => {
    const isRoot = depth === 0
    // 根节点更宽，第一层子节点的横向起点要让在"根节点右边距 + 间隙"之后，不能直接套用统一列宽公式，
    // 否则根节点和第一层之间的间隙会不够（根节点比普通节点宽出来的部分会跟第一层重叠或挤在一起）
    const x = isRoot ? 0 : ROOT_NODE_WIDTH + RANK_GAP + (depth - 1) * (NODE_WIDTH + RANK_GAP)
    const data: PlanNodeData = {
      node: n,
      readOnly,
      onEditNode: onEditNode ?? (() => {}),
      // 根节点是整件事本身，不允许删；也不允许在根节点旁边加"兄弟节点"（根节点没有兄弟）
      onDeleteNode: parentId ? onDeleteNode : undefined,
      onAddSiblingNode: parentId ? onAddSiblingNode : undefined,
      onSetNodeImage: onSetNodeImage ?? (() => {}),
      selected: selectedNodeIds?.includes(n.id) ?? false,
      onSelectNode: onSelectNode ?? undefined,
      isRoot,
      order
    }
    const flowNode: Node = {
      id: n.id,
      type: 'planNode',
      position: { x, y: 0 },
      // 根节点不给 height，让它按文字实际内容自动撑高；其余节点按是否带图取对应固定高度
      style: isRoot ? { width: ROOT_NODE_WIDTH } : { width: NODE_WIDTH, height: nodeHeight(n) },
      data
    }
    nodes.push(flowNode)

    if (parentId) {
      edges.push({
        id: `${parentId}->${n.id}`,
        source: parentId,
        target: n.id,
        type: 'smoothstep',
        style: { stroke: '#cbd5c8', strokeWidth: 1.75 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#a3aca1', width: 16, height: 16 }
      })
    }

    let y: number
    if (n.children.length === 0) {
      y = cursorY
      cursorY += nodeHeight(n) + ROW_GAP
    } else {
      const childYs = n.children.map((child, i) => visit(child, n.id, depth + 1, n.childrenSequential ? i + 1 : undefined))
      y = (Math.min(...childYs) + Math.max(...childYs)) / 2
    }
    flowNode.position.y = y
    return y
  }

  visit(root, null, 0)
  return { nodes, edges }
}

const TreeCanvasInner = forwardRef<TreeCanvasHandle, TreeCanvasProps>(function TreeCanvasInner(
  { plan, readOnly = false, onEditNode, onDeleteNode, onAddSiblingNode, onSetNodeImage, selectedNodeIds, onSelectNode },
  ref
) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  // 用 hook 里自带的 getNodesBounds，而不是从包顶层单独 import 的那个同名函数——
  // 顶层那个缺少内部节点位置索引（nodeLookup），复杂/大的树会算出不准确、偏小的边界框，
  // 导致导出图片"看起来内容被裁掉了一部分"，其实是量的画布尺寸本身就是错的
  const { fitView, getNodes, getNodesBounds } = useReactFlow()
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!plan.root) return
    const { nodes: rawNodes, edges: rawEdges } = layoutTree(plan.root, readOnly, onEditNode, onDeleteNode, onAddSiblingNode, onSetNodeImage, selectedNodeIds, onSelectNode)
    setNodes(rawNodes)
    setEdges(rawEdges)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.root, selectedNodeIds])

  // 窗口大小变化（比如最大化/还原）后，React Flow 不会自己重新适配缩放，手动再 fit 一次
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => fitView({ padding: 0.2 }), 120)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [fitView])

  useImperativeHandle(ref, () => ({
    exportImage: async () => {
      const viewportEl = wrapperRef.current?.querySelector<HTMLElement>('.react-flow__viewport')
      if (!viewportEl) return

      try {
        const bounds = getNodesBounds(getNodes())
        // 下面这些尺寸/坐标都是"逻辑像素"（CSS px，屏幕原始分辨率）——切块位置按逻辑像素算，
        // 每一块实际截出来的图靠 pixelRatio 放大成 EXPORT_PIXEL_RATIO 倍，画到成品画布时
        // 也要落在放大后对应的像素位置上，两边的倍率必须统一，不然拼接位置会错位
        const totalWidth = Math.ceil(bounds.width + EXPORT_PADDING * 2)
        const totalHeight = Math.ceil(bounds.height + EXPORT_PADDING * 2)
        // 世界坐标里，这块画布左上角对应的实际坐标——每一小块要单独平移到这个原点对齐的位置再截
        const worldX0 = bounds.x - EXPORT_PADDING
        const worldY0 = bounds.y - EXPORT_PADDING

        const outputCanvas = document.createElement('canvas')
        outputCanvas.width = totalWidth * EXPORT_PIXEL_RATIO
        outputCanvas.height = totalHeight * EXPORT_PIXEL_RATIO
        const ctx = outputCanvas.getContext('2d')
        if (!ctx) throw new Error('无法创建画布上下文')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height)

        const cols = Math.ceil(totalWidth / EXPORT_TILE_SIZE)
        const rows = Math.ceil(totalHeight / EXPORT_TILE_SIZE)

        // 按小块依次截图再拼接——每一块单独声明一个不大的安全尺寸，用 CSS translate 把树的
        // 对应区域移到这块画布的左上角对齐，跟树整体多大完全无关，每次渲染负担都很小很可靠；
        // 每块用 pixelRatio 放大到目标清晰度，贴回成品画布时按同样的倍率换算贴图位置
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const tileWorldX = worldX0 + col * EXPORT_TILE_SIZE
            const tileWorldY = worldY0 + row * EXPORT_TILE_SIZE
            const tileWidth = Math.min(EXPORT_TILE_SIZE, totalWidth - col * EXPORT_TILE_SIZE)
            const tileHeight = Math.min(EXPORT_TILE_SIZE, totalHeight - row * EXPORT_TILE_SIZE)

            const tileCanvas = await toCanvas(viewportEl, {
              backgroundColor: '#ffffff',
              width: tileWidth,
              height: tileHeight,
              pixelRatio: EXPORT_PIXEL_RATIO,
              style: {
                width: `${tileWidth}px`,
                height: `${tileHeight}px`,
                transform: `translate(${-tileWorldX}px, ${-tileWorldY}px) scale(1)`
              }
            })
            ctx.drawImage(tileCanvas, col * EXPORT_TILE_SIZE * EXPORT_PIXEL_RATIO, row * EXPORT_TILE_SIZE * EXPORT_PIXEL_RATIO)
          }
        }

        downloadDataUrl(`${sanitizeFilename(plan.task)}.png`, outputCanvas.toDataURL('image/png'))
      } catch (err) {
        console.error('导出图片失败', err)
        window.alert('导出图片失败，请稍后重试')
      }
    }
  }), [getNodes, getNodesBounds, plan.task])

  if (!plan.root) return null

  return (
    <div ref={wrapperRef} className="h-full w-full overflow-hidden rounded-2xl bg-neutral-50/60">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  )
})

export const TreeCanvas = forwardRef<TreeCanvasHandle, TreeCanvasProps>(function TreeCanvas(props, ref) {
  return (
    <ReactFlowProvider>
      <TreeCanvasInner {...props} ref={ref} />
    </ReactFlowProvider>
  )
})
